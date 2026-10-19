import { partyDate, passNumber, type PartyTheme } from "@/lib/party";

/**
 * Афиши вечеринок рисуются на canvas, а не вёрсткой: так один и тот же кадр видно на экране и пишется в видео
 * (canvas.captureStream) — на телефоне записать экран браузера нельзя (getDisplayMedia в iOS нет).
 * Размеры — в долях ширины кадра (u = w / 1080), поэтому сцена одинакова в 720p и 1080p.
 * Верх (~13%) и низ (~18%) кадра в Instagram закрыты интерфейсом сторис — всё важное лежит между 0.135h и 0.82h.
 */

export type SceneFonts = { display: string; mono: string; serif: string; script: string; sans: string };

export type SceneFrame = {
  /** Секунды с начала афиши — по ним идёт вступление (надписи появляются по очереди). */
  t: number;
  /** Пульс бита 0…1. */
  beat: number;
  w: number;
  h: number;
  /** «Афиша» — приглашение; «Я иду» — гость хвастается пропуском (без QR). */
  mode: "invite" | "going";
  guest: { name: string; number: number };
  reduced: boolean;
  fonts: SceneFonts;
};

type Ctx = CanvasRenderingContext2D;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** Сильный ease-out (ближе всего к cubic-bezier(0.23, 1, 0.32, 1)) — надписи «приезжают» быстро и мягко садятся. */
const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 4);
const reveal = (f: SceneFrame, start: number, dur = 0.9) => easeOut((f.t - start) / dur);
/** Детерминированный шум: одинаковый кадр при каждой отрисовке и в записи. */
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
/** Время для фонового движения: при «Уменьшить движение» фон стоит. */
const ambient = (f: SceneFrame) => (f.reduced ? 0 : f.t);

const widthCache = new Map<string, number[]>();

/** Текст с разрядкой (letterSpacing у canvas есть не во всех Safari) — ширины букв кэшируются. */
function spaced(ctx: Ctx, text: string, x: number, y: number, spacing: number, align: "left" | "center" | "right" = "center") {
  const key = `${ctx.font}|${text}`;
  const chars = Array.from(text);
  let widths = widthCache.get(key);
  if (!widths) {
    widths = chars.map((c) => ctx.measureText(c).width);
    if (widthCache.size > 400) widthCache.clear();
    widthCache.set(key, widths);
  }
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let cx = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
  const prev = ctx.textAlign;
  ctx.textAlign = "left";
  chars.forEach((c, i) => {
    ctx.fillText(c, cx, y);
    cx += widths[i] + spacing;
  });
  ctx.textAlign = prev;
  return total;
}

/** Кегль, при котором самая длинная строка влезает в maxW. */
function fitSize(ctx: Ctx, lines: string[], font: (size: number) => string, maxW: number, max: number) {
  ctx.font = font(max);
  const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
  return widest > maxW ? (max * maxW) / widest : max;
}

function star(ctx: Ctx, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

type InfoStyle = { ink: string; muted: string; accent: string; dateFont: (s: number) => string; smallFont: (s: number) => string };

/** Нижняя часть афиши (дата, место, дресс-код, подпись про пропуск) — общая для всех тем. */
function drawInfo(ctx: Ctx, f: SceneFrame, theme: PartyTheme, s: InfoStyle) {
  const { w, h } = f;
  const u = w / 1080;
  const ev = theme.event;
  const d = partyDate(ev.date);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  const rows: { y: number; draw: () => void }[] = [
    {
      y: h * 0.655,
      draw: () => {
        ctx.font = s.dateFont(150 * u);
        ctx.fillStyle = s.ink;
        ctx.fillText(d.dayMonth, w / 2, 0);
      },
    },
    {
      y: h * 0.7,
      draw: () => {
        ctx.font = s.smallFont(34 * u);
        ctx.fillStyle = s.ink;
        spaced(ctx, `${d.weekday} · ${d.time} · ${ev.city.toUpperCase()}`, w / 2, 0, 6 * u);
      },
    },
    {
      y: h * 0.735,
      draw: () => {
        ctx.font = s.smallFont(30 * u);
        ctx.fillStyle = s.muted;
        ctx.fillText(ev.placeHint, w / 2, 0);
      },
    },
    {
      y: h * 0.765,
      draw: () => {
        ctx.font = s.smallFont(28 * u);
        ctx.fillStyle = s.muted;
        ctx.fillText(`дресс-код: ${ev.dress}`, w / 2, 0);
      },
    },
    {
      y: h * 0.81,
      draw: () => {
        ctx.font = s.smallFont(25 * u);
        ctx.fillStyle = s.accent;
        const label =
          f.mode === "going"
            ? `ПРОПУСК № ${passNumber(f.guest.number, ev.capacity)}`
            : `ВХОД ТОЛЬКО ПО ПРОПУСКУ · ${ev.capacity} МЕСТ`;
        const tw = spaced(ctx, label, w / 2, 0, 5 * u);
        ctx.fillRect(w / 2 - tw / 2 - 90 * u, -9 * u, 60 * u, 2 * u);
        ctx.fillRect(w / 2 + tw / 2 + 30 * u, -9 * u, 60 * u, 2 * u);
      },
    },
  ];

  rows.forEach((row, i) => {
    // «Я иду»: вместо адреса и дресс-кода — штамп гостя (drawGoingStamp).
    if (f.mode === "going" && (i === 2 || i === 3)) return;
    const p = reveal(f, 0.75 + i * 0.08, 0.8);
    if (p <= 0) return;
    ctx.save();
    ctx.globalAlpha = p;
    ctx.translate(0, row.y + (f.reduced ? 0 : (1 - p) * 30 * u));
    row.draw();
    ctx.restore();
  });

  ctx.save();
  ctx.globalAlpha = 0.45 * reveal(f, 1.3);
  ctx.font = s.smallFont(20 * u);
  ctx.fillStyle = s.ink;
  spaced(ctx, "KELEBER", w / 2, h * 0.85, 8 * u);
  ctx.restore();
}

/** Штамп «Я иду» на месте адреса и дресс-кода — с «ударом»: появляется крупнее и садится на место, как печать. */
function drawGoingStamp(ctx: Ctx, f: SceneFrame, color: string, font: (s: number) => string, small: (s: number) => string, plate: string) {
  if (f.mode !== "going") return;
  const { w, h } = f;
  const u = w / 1080;
  const p = reveal(f, 1.1, 0.45);
  if (p <= 0) return;
  ctx.save();
  ctx.translate(w / 2, h * 0.757);
  ctx.rotate(-0.07);
  const scale = 0.7 * (f.reduced ? 1 : 1.35 - 0.35 * p);
  ctx.scale(scale, scale);
  ctx.globalAlpha = p;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 7 * u;
  ctx.beginPath();
  ctx.roundRect(-190 * u, -95 * u, 380 * u, 190 * u, 22 * u);
  ctx.fillStyle = plate;
  ctx.fill();
  ctx.fillStyle = color;
  ctx.stroke();
  ctx.lineWidth = 2 * u;
  ctx.beginPath();
  ctx.roundRect(-176 * u, -81 * u, 352 * u, 162 * u, 14 * u);
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.font = font(92 * u);
  ctx.fillText("Я ИДУ", 0, 18 * u);
  ctx.font = small(28 * u);
  spaced(ctx, f.guest.name.toUpperCase(), 0, 62 * u, 4 * u);
  ctx.restore();
}

function vignette(ctx: Ctx, f: SceneFrame, strength: number) {
  const g = ctx.createRadialGradient(f.w / 2, f.h / 2, f.h * 0.3, f.w / 2, f.h / 2, f.h * 0.75);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, f.w, f.h);
}

/* ───────────── Неон: рейв, лазеры, сетка-пол, глитч ───────────── */

function drawNeon(ctx: Ctx, f: SceneFrame, th: PartyTheme) {
  const { w, h } = f;
  const u = w / 1080;
  const a = ambient(f);
  const { accent, accent2, ink, bg } = th.colors;
  const horizon = h * 0.5;

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  let g = ctx.createRadialGradient(w / 2, horizon, 0, w / 2, horizon, w);
  g.addColorStop(0, `rgba(255,43,214,${0.32 + 0.22 * f.beat})`);
  g.addColorStop(1, "rgba(255,43,214,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Лазеры: по два из верхних углов, качаются и вспыхивают на ударе.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 4; i++) {
    const left = i < 2;
    const ox = left ? w * 0.08 : w * 0.92;
    const base = left ? 1.05 : Math.PI - 1.05;
    const ang = base + (left ? 1 : -1) * (0.28 * Math.sin(a * 0.8 + i * 1.9) + (i % 2) * 0.22);
    const len = h * 1.1;
    const spread = 0.012;
    const lg = ctx.createLinearGradient(ox, 0, ox + Math.cos(ang) * len, Math.sin(ang) * len);
    lg.addColorStop(0, `rgba(198,255,0,${0.55 + 0.35 * f.beat})`);
    lg.addColorStop(1, "rgba(198,255,0,0)");
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(ox, -10 * u);
    ctx.lineTo(ox + Math.cos(ang - spread) * len, Math.sin(ang - spread) * len);
    ctx.lineTo(ox + Math.cos(ang + spread) * len, Math.sin(ang + spread) * len);
    ctx.fill();
  }
  ctx.restore();

  // Пол-сетка уезжает к зрителю.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, horizon, w, h - horizon);
  ctx.clip();
  ctx.strokeStyle = accent2;
  ctx.lineWidth = 2.5 * u;
  ctx.globalAlpha = 0.75;
  for (let i = -14; i <= 14; i++) {
    ctx.beginPath();
    ctx.moveTo(w / 2 + i * w * 0.012, horizon);
    ctx.lineTo(w / 2 + i * w * 0.2, h);
    ctx.stroke();
  }
  const rows = 12;
  for (let k = 0; k < rows; k++) {
    const z = ((k + a * 1.4) % rows) / rows;
    const y = horizon + (h - horizon) * z * z;
    ctx.globalAlpha = 0.15 + 0.7 * z;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.restore();
  // Пол тонет в темноте к низу — под датой и подписями сетка едва видна.
  g = ctx.createLinearGradient(0, horizon, 0, h);
  g.addColorStop(0, "rgba(5,3,10,0)");
  g.addColorStop(0.25, "rgba(5,3,10,0.2)");
  g.addColorStop(0.5, "rgba(5,3,10,0.62)");
  g.addColorStop(1, "rgba(5,3,10,0.92)");
  ctx.fillStyle = g;
  ctx.fillRect(0, horizon, w, h - horizon);
  // Горизонт — светящаяся линия.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, "rgba(255,43,214,0)");
  g.addColorStop(0.5, `rgba(255,120,230,${0.8 + 0.2 * f.beat})`);
  g.addColorStop(1, "rgba(255,43,214,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, horizon - 2 * u, w, 4 * u);
  ctx.restore();

  // Ярлык сверху.
  const kp = reveal(f, 0.05, 0.6);
  ctx.save();
  ctx.globalAlpha = kp;
  ctx.font = `700 ${30 * u}px ${f.fonts.display}`;
  const tw = spaced(ctx, th.event.kicker, -9999, -9999, 8 * u);
  ctx.fillStyle = accent;
  ctx.fillRect(w / 2 - tw / 2 - 26 * u, h * 0.165 - 46 * u, tw + 52 * u, 66 * u);
  ctx.fillStyle = bg;
  spaced(ctx, th.event.kicker, w / 2, h * 0.165, 8 * u);
  ctx.restore();

  // Заголовок с RGB-расслоением и редкими глитч-сбоями.
  const lines = th.event.title.split("\n");
  const font = (s: number) => `900 ${s}px ${f.fonts.display}`;
  const size = fitSize(ctx, lines, font, w * 0.84, 220 * u);
  ctx.font = font(size);
  ctx.textAlign = "center";
  const slot = Math.floor(a * 7);
  const spike = !f.reduced && hash(slot) > 0.86 ? hash(slot + 7) : 0;
  lines.forEach((line, i) => {
    const p = reveal(f, 0.2 + i * 0.12, 0.8);
    if (p <= 0) return;
    const y = h * 0.29 + i * size * 0.98 + (f.reduced ? 0 : (1 - p) * 70 * u);
    const glitch = (1 - p) * 1.4 + spike;
    const dx = (4 + 16 * glitch + 5 * f.beat) * u;
    ctx.save();
    ctx.globalAlpha = p;
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "rgba(0,240,255,0.85)";
    ctx.fillText(line, w / 2 - dx, y);
    ctx.fillStyle = "rgba(255,43,214,0.85)";
    ctx.fillText(line, w / 2 + dx, y);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = p;
    ctx.shadowColor = accent2;
    ctx.shadowBlur = (24 + 30 * f.beat) * u;
    ctx.fillStyle = ink;
    if (glitch > 0.2) {
      // Сбой: заголовок режется на полосы со сдвигом.
      for (let s = 0; s < 6; s++) {
        const top = y - size * 0.8 + (s * size * 0.85) / 6;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, top, w, (size * 0.85) / 6 + 1);
        ctx.clip();
        ctx.fillText(line, w / 2 + (hash(s + slot * 13) - 0.5) * 60 * u * glitch, y);
        ctx.restore();
      }
    } else ctx.fillText(line, w / 2, y);
    ctx.restore();
  });

  const hp = reveal(f, 0.55, 0.8);
  ctx.save();
  ctx.globalAlpha = hp;
  ctx.font = `500 ${38 * u}px ${f.fonts.display}`;
  ctx.fillStyle = accent;
  ctx.textAlign = "center";
  ctx.fillText(th.event.host, w / 2, h * 0.29 + (lines.length - 1) * size * 0.98 + 75 * u);
  ctx.restore();

  drawGoingStamp(ctx, f, accent, (s) => `900 ${s}px ${f.fonts.display}`, (s) => `600 ${s}px ${f.fonts.display}`, "rgba(5,3,10,0.85)");
  drawInfo(ctx, f, th, {
    ink,
    muted: "rgba(244,241,255,0.7)",
    accent,
    dateFont: (s) => `900 ${s}px ${f.fonts.display}`,
    smallFont: (s) => `500 ${s}px ${f.fonts.display}`,
  });

  // Сканлайны.
  ctx.fillStyle = "rgba(0,0,0,0.16)";
  for (let y = 0; y < h; y += 6 * u) ctx.fillRect(0, y, w, 2 * u);
  vignette(ctx, f, 0.55);
}

/* ───────────── Диско: зеркальный шар, блики, хром ───────────── */

function drawMirrorBall(ctx: Ctx, cx: number, cy: number, r: number, rot: number, beat: number) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#3a2140";
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  const bands = 14;
  for (let j = 0; j < bands; j++) {
    const phi0 = -Math.PI / 2 + (j / bands) * Math.PI;
    const phi1 = -Math.PI / 2 + ((j + 1) / bands) * Math.PI;
    const y0 = cy + r * Math.sin(phi0);
    const y1 = cy + r * Math.sin(phi1);
    const ring = r * Math.cos((phi0 + phi1) / 2);
    const cols = Math.max(6, Math.round(28 * Math.cos((phi0 + phi1) / 2)));
    for (let k = 0; k < cols; k++) {
      const th0 = (k / cols) * Math.PI * 2 + rot;
      const th1 = ((k + 1) / cols) * Math.PI * 2 + rot;
      if (Math.cos((th0 + th1) / 2) <= 0) continue; // задняя сторона шара
      const x0 = cx + ring * Math.sin(th0);
      const x1 = cx + ring * Math.sin(th1);
      const light = 0.35 + 0.65 * hash(j * 97 + k) * (0.6 + 0.4 * Math.cos((th0 + th1) / 2 - 0.6));
      const flash = hash(j * 31 + k * 7 + Math.floor(rot * 6)) > 0.97 ? 0.4 + beat * 0.6 : 0;
      const v = Math.min(255, Math.round(120 + 135 * light + 255 * flash));
      ctx.fillStyle = `rgb(${v},${Math.round(v * 0.86)},${Math.round(v * 0.93)})`;
      ctx.fillRect(Math.min(x0, x1) + 0.8, y0 + 0.8, Math.abs(x1 - x0) - 1.6, y1 - y0 - 1.6);
    }
  }
  const shade = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
  shade.addColorStop(0, "rgba(255,255,255,0.35)");
  shade.addColorStop(0.55, "rgba(255,180,230,0)");
  shade.addColorStop(1, "rgba(40,0,40,0.6)");
  ctx.fillStyle = shade;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.restore();
}

function drawDisco(ctx: Ctx, f: SceneFrame, th: PartyTheme) {
  const { w, h } = f;
  const u = w / 1080;
  const a = ambient(f);
  const { accent, accent2, ink } = th.colors;

  let g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#2f0841");
  g.addColorStop(0.6, "#1a0423");
  g.addColorStop(1, "#0d0212");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Шар опускается на нитке с лёгким покачиванием пружины.
  const R = 170 * u;
  const target = h * 0.205;
  const k = f.reduced ? 1 : 1 - Math.exp(-4.5 * f.t) * Math.cos(6.5 * f.t);
  const by = -R + (target + R) * k;
  const bx = w / 2;

  // Лучи от шара.
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(a * 0.12);
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 16; i++) {
    ctx.rotate((Math.PI * 2) / 16);
    if (i % 2) continue;
    const rg = ctx.createLinearGradient(0, 0, 0, h * 1.2);
    rg.addColorStop(0, `rgba(255,122,200,${0.12 + 0.1 * f.beat})`);
    rg.addColorStop(1, "rgba(255,122,200,0)");
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-h * 0.12, h * 1.2);
    ctx.lineTo(h * 0.12, h * 1.2);
    ctx.fill();
  }
  ctx.restore();

  // Блики-звёздочки вокруг шара.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 38; i++) {
    const ang = i * 2.39996 + a * 0.22;
    const rad = R * 1.5 + hash(i) * w * 0.75;
    const x = bx + Math.cos(ang) * rad;
    const y = by + Math.sin(ang) * rad * 1.25;
    const tw = Math.max(0, Math.sin(a * 2.6 + i * 1.3));
    ctx.globalAlpha = (0.25 + 0.75 * tw) * reveal(f, 0.4, 1.2);
    ctx.fillStyle = i % 3 ? "#ffffff" : accent2;
    star(ctx, x, y, (8 + hash(i + 3) * 18) * u * (1 + 0.6 * f.beat));
  }
  ctx.restore();

  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 2 * u;
  ctx.beginPath();
  ctx.moveTo(bx, 0);
  ctx.lineTo(bx, by - R);
  ctx.stroke();
  drawMirrorBall(ctx, bx, by, R, a * 0.9, f.beat);

  // Ярлык.
  ctx.save();
  ctx.globalAlpha = reveal(f, 0.6, 0.6);
  ctx.font = `400 ${28 * u}px ${f.fonts.mono}`;
  ctx.fillStyle = accent2;
  ctx.textAlign = "center";
  spaced(ctx, th.event.kicker, w / 2, h * 0.335, 10 * u);
  ctx.restore();

  // «Disco» неоновой прописью + «FEVER» хромом.
  const p1 = reveal(f, 0.75, 0.8);
  ctx.save();
  ctx.globalAlpha = p1;
  ctx.translate(w / 2, h * 0.43 + (f.reduced ? 0 : (1 - p1) * 50 * u));
  ctx.rotate(-0.1);
  ctx.font = `400 ${190 * u}px ${f.fonts.script}`;
  ctx.textAlign = "center";
  ctx.shadowColor = accent;
  ctx.shadowBlur = (30 + 30 * f.beat) * u;
  ctx.fillStyle = accent;
  ctx.fillText("Disco", 0, 0);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffe3f3";
  ctx.globalAlpha = p1 * 0.55;
  ctx.fillText("Disco", 0, 0);
  ctx.restore();

  const p2 = reveal(f, 0.9, 0.8);
  const font = (s: number) => `400 ${s}px ${f.fonts.mono}`;
  const size = fitSize(ctx, [th.event.title], font, w * 0.84, 200 * u);
  const ty = h * 0.545 + (f.reduced ? 0 : (1 - p2) * 50 * u);
  ctx.save();
  ctx.globalAlpha = p2;
  ctx.font = font(size);
  ctx.textAlign = "center";
  const shine = 0.5 + 0.12 * Math.sin(a * 1.6);
  const chrome = ctx.createLinearGradient(0, ty - size * 0.8, 0, ty);
  chrome.addColorStop(0, "#ffffff");
  chrome.addColorStop(shine - 0.12, "#ffd1ec");
  chrome.addColorStop(shine, "#6b2c62");
  chrome.addColorStop(shine + 0.08, "#ffe9f6");
  chrome.addColorStop(1, "#ffffff");
  ctx.fillStyle = "rgba(60,0,50,0.8)";
  ctx.fillText(th.event.title, w / 2 + 8 * u, ty + 8 * u);
  ctx.fillStyle = chrome;
  ctx.fillText(th.event.title, w / 2, ty);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = reveal(f, 1.0, 0.8);
  ctx.font = `600 ${36 * u}px ${f.fonts.sans}`;
  ctx.fillStyle = ink;
  ctx.textAlign = "center";
  ctx.fillText(th.event.host, w / 2, h * 0.59);
  ctx.restore();

  drawGoingStamp(ctx, f, accent2, (s) => `400 ${s}px ${f.fonts.mono}`, (s) => `700 ${s}px ${f.fonts.sans}`, "rgba(26,4,35,0.85)");
  drawInfo(ctx, f, th, {
    ink,
    muted: "rgba(255,243,251,0.7)",
    accent: accent2,
    dateFont: (s) => `400 ${s * 0.85}px ${f.fonts.mono}`,
    smallFont: (s) => `600 ${s}px ${f.fonts.sans}`,
  });
  vignette(ctx, f, 0.5);
}

/* ───────────── Маскарад: дым, золотая пыль, рамка ар-деко, маска ───────────── */

function maskPath(ctx: Ctx, s: number) {
  ctx.beginPath();
  ctx.moveTo(-1 * s, -0.22 * s);
  ctx.bezierCurveTo(-0.62 * s, -0.58 * s, -0.22 * s, -0.46 * s, 0, -0.16 * s);
  ctx.bezierCurveTo(0.22 * s, -0.46 * s, 0.62 * s, -0.58 * s, 1 * s, -0.22 * s);
  ctx.bezierCurveTo(0.96 * s, 0.22 * s, 0.48 * s, 0.46 * s, 0.16 * s, 0.34 * s);
  ctx.bezierCurveTo(0.08 * s, 0.24 * s, -0.08 * s, 0.24 * s, -0.16 * s, 0.34 * s);
  ctx.bezierCurveTo(-0.48 * s, 0.46 * s, -0.96 * s, 0.22 * s, -1 * s, -0.22 * s);
  ctx.closePath();
  ctx.ellipse(-0.42 * s, 0.0, 0.22 * s, 0.1 * s, 0.18, 0, Math.PI * 2);
  ctx.ellipse(0.42 * s, 0.0, 0.22 * s, 0.1 * s, -0.18, 0, Math.PI * 2);
}

/** Прямоугольная рамка, нарисованная на долю p периметра (рамка «прорисовывается»). */
function partialRect(ctx: Ctx, x: number, y: number, w: number, h: number, p: number) {
  const per = 2 * (w + h);
  let left = per * clamp01(p);
  const pts: [number, number][] = [
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
    [x, y],
  ];
  ctx.beginPath();
  ctx.moveTo(x, y);
  let cx = x;
  let cy = y;
  for (const [nx, ny] of pts) {
    const len = Math.hypot(nx - cx, ny - cy);
    if (left >= len) {
      ctx.lineTo(nx, ny);
      left -= len;
      cx = nx;
      cy = ny;
    } else {
      ctx.lineTo(cx + ((nx - cx) * left) / len, cy + ((ny - cy) * left) / len);
      break;
    }
  }
  ctx.stroke();
}

function drawMasquerade(ctx: Ctx, f: SceneFrame, th: PartyTheme) {
  const { w, h } = f;
  const u = w / 1080;
  const a = ambient(f);
  const { accent, ink, bg } = th.colors;

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 4; i++) {
    const cx = w * (0.2 + 0.6 * hash(i)) + Math.sin(a * 0.25 + i * 2) * w * 0.15;
    const cy = h * (0.15 + 0.7 * hash(i + 4)) + Math.cos(a * 0.2 + i) * h * 0.06;
    const r = w * (0.5 + 0.3 * hash(i + 8));
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(217,179,106,${0.11 + 0.04 * f.beat})`);
    g.addColorStop(1, "rgba(217,179,106,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  // Золотая пыль поднимается вверх.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = accent;
  for (let i = 0; i < 70; i++) {
    const speed = (18 + hash(i + 9) * 40) * u;
    const y = h * 1.05 - ((hash(i + 50) * h * 1.1 + a * speed) % (h * 1.1));
    const x = hash(i) * w + Math.sin(a * 0.7 + i) * 18 * u;
    ctx.globalAlpha = (0.2 + 0.8 * Math.max(0, Math.sin(a * 1.8 + i * 2.1))) * reveal(f, 0.2, 1.5);
    ctx.beginPath();
    ctx.arc(x, y, (1.4 + hash(i + 3) * 3.6) * u, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Рамка ар-деко прорисовывается по периметру.
  const fp = f.reduced ? 1 : easeOut((f.t - 0.05) / 1.8);
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 3 * u;
  partialRect(ctx, 54 * u, 54 * u, w - 108 * u, h - 108 * u, fp);
  ctx.lineWidth = 1.2 * u;
  ctx.globalAlpha = 0.6;
  partialRect(ctx, 72 * u, 72 * u, w - 144 * u, h - 144 * u, fp);
  ctx.globalAlpha = 0.8 * clamp01((fp - 0.85) / 0.15);
  ctx.lineWidth = 2 * u;
  for (const [cx, cy, start] of [
    [54 * u, 54 * u, 0],
    [w - 54 * u, 54 * u, Math.PI / 2],
    [w - 54 * u, h - 54 * u, Math.PI],
    [54 * u, h - 54 * u, -Math.PI / 2],
  ] as const) {
    for (const r of [30, 48, 66]) {
      ctx.beginPath();
      ctx.arc(cx, cy, r * u, start, start + Math.PI / 2);
      ctx.stroke();
    }
  }
  ctx.restore();

  // Ярлык с линиями.
  ctx.save();
  ctx.globalAlpha = reveal(f, 0.3, 0.8);
  ctx.font = `500 ${28 * u}px ${f.fonts.serif}`;
  ctx.fillStyle = accent;
  const kw = spaced(ctx, th.event.kicker, w / 2, h * 0.165, 10 * u);
  ctx.fillRect(w / 2 - kw / 2 - 110 * u, h * 0.165 - 9 * u, 80 * u, 1.5 * u);
  ctx.fillRect(w / 2 + kw / 2 + 30 * u, h * 0.165 - 9 * u, 80 * u, 1.5 * u);
  ctx.restore();

  // Маска.
  const mp = reveal(f, 0.45, 1.1);
  ctx.save();
  ctx.translate(w / 2, h * 0.275 + Math.sin(a * 1.1) * 8 * u);
  ctx.globalAlpha = mp;
  const ms = 0.96 + 0.04 * mp;
  ctx.scale(ms, ms);
  const s = 230 * u;
  const gold = ctx.createLinearGradient(-s, -s * 0.5, s, s * 0.5);
  gold.addColorStop(0, "#8a6a2f");
  gold.addColorStop(0.35, "#f3d99a");
  gold.addColorStop(0.5 + 0.15 * Math.sin(a * 0.9), "#fff4cf");
  gold.addColorStop(0.7, "#c9a052");
  gold.addColorStop(1, "#7a5a22");
  maskPath(ctx, s);
  ctx.fillStyle = gold;
  ctx.fill("evenodd");
  ctx.strokeStyle = "rgba(255,240,200,0.7)";
  ctx.lineWidth = 2 * u;
  ctx.stroke();
  ctx.restore();

  const p = reveal(f, 0.8, 1);
  const font = (sz: number) => `italic 700 ${sz}px ${f.fonts.serif}`;
  const size = fitSize(ctx, [th.event.title], font, w * 0.78, 170 * u);
  const ty = h * 0.445 + (f.reduced ? 0 : (1 - p) * 40 * u);
  ctx.save();
  ctx.globalAlpha = p;
  ctx.font = font(size);
  ctx.textAlign = "center";
  const tg = ctx.createLinearGradient(w * 0.15, 0, w * 0.85, 0);
  tg.addColorStop(0, "#b48a3e");
  tg.addColorStop(0.5, "#fff1c9");
  tg.addColorStop(1, "#b48a3e");
  ctx.fillStyle = tg;
  ctx.fillText(th.event.title, w / 2, ty);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = reveal(f, 0.95, 0.9);
  ctx.font = `italic 400 ${40 * u}px ${f.fonts.serif}`;
  ctx.fillStyle = ink;
  ctx.textAlign = "center";
  ctx.fillText(th.event.host, w / 2, h * 0.49);
  ctx.font = `500 ${30 * u}px ${f.fonts.serif}`;
  ctx.fillStyle = accent;
  spaced(ctx, "ПАРОЛЬ НА ВХОДЕ  ●  ●  ●  ●", w / 2, h * 0.535, 4 * u);
  ctx.restore();

  drawGoingStamp(ctx, f, accent, (sz) => `italic 700 ${sz * 0.9}px ${f.fonts.serif}`, (sz) => `500 ${sz}px ${f.fonts.serif}`, "rgba(7,6,5,0.85)");
  drawInfo(ctx, f, th, {
    ink,
    muted: "rgba(246,234,208,0.68)",
    accent,
    dateFont: (sz) => `400 ${sz}px ${f.fonts.serif}`,
    smallFont: (sz) => `500 ${sz}px ${f.fonts.serif}`,
  });
  vignette(ctx, f, 0.6);
}

/* ───────────── Y2K: голография, хромовые пузыри, звёзды ───────────── */

function drawY2k(ctx: Ctx, f: SceneFrame, th: PartyTheme) {
  const { w, h } = f;
  const u = w / 1080;
  const a = ambient(f);
  const { accent, accent2, ink } = th.colors;

  const g = ctx.createLinearGradient(0, 0, w, h);
  for (let i = 0; i < 5; i++) g.addColorStop(i / 4, `hsl(${(250 + a * 18 + i * 42) % 360} 95% 87%)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Хромовые пузыри всплывают.
  for (let i = 0; i < 8; i++) {
    const r = (45 + hash(i + 20) * 120) * u;
    const cx = hash(i) * w;
    const cy = ((hash(i + 10) * h * 1.3 - a * (14 + hash(i) * 26) * u) % (h * 1.3) + h * 1.3) % (h * 1.3) - r;
    const bg = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.05, cx, cy, r);
    bg.addColorStop(0, "rgba(255,255,255,0.95)");
    bg.addColorStop(0.3, "rgba(236,226,255,0.6)");
    bg.addColorStop(0.75, "rgba(170,150,255,0.25)");
    bg.addColorStop(1, "rgba(123,92,255,0.08)");
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 2 * u;
    ctx.stroke();
  }

  for (let i = 0; i < 16; i++) {
    const tw = Math.max(0, Math.sin(a * 2.2 + i * 1.7));
    ctx.globalAlpha = (0.2 + 0.8 * tw) * reveal(f, 0.3, 1);
    ctx.fillStyle = i % 3 === 0 ? accent2 : i % 3 === 1 ? "#ffffff" : accent;
    star(ctx, hash(i + 30) * w, hash(i + 40) * h * 0.95, (12 + hash(i + 5) * 26) * u * (1 + 0.3 * f.beat));
  }
  ctx.globalAlpha = 1;

  // Ярлык-таблетка.
  ctx.save();
  ctx.globalAlpha = reveal(f, 0.05, 0.6);
  ctx.font = `700 ${28 * u}px ${f.fonts.display}`;
  const kw = spaced(ctx, th.event.kicker, -9999, -9999, 6 * u);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 3 * u;
  ctx.beginPath();
  ctx.roundRect(w / 2 - kw / 2 - 30 * u, h * 0.165 - 46 * u, kw + 60 * u, 68 * u, 34 * u);
  ctx.stroke();
  ctx.fillStyle = ink;
  spaced(ctx, th.event.kicker, w / 2, h * 0.165, 6 * u);
  ctx.restore();

  const [name, age] = th.event.title.split("\n");
  const p1 = reveal(f, 0.2, 0.8);
  ctx.save();
  ctx.globalAlpha = p1;
  ctx.font = `400 ${120 * u}px ${f.fonts.mono}`;
  ctx.textAlign = "center";
  ctx.fillStyle = ink;
  ctx.fillText(name, w / 2, h * 0.255 + (f.reduced ? 0 : (1 - p1) * 40 * u));
  ctx.restore();

  // Огромная цифра прыгает в такт.
  const p2 = reveal(f, 0.35, 0.9);
  ctx.save();
  ctx.translate(w / 2, h * 0.42);
  ctx.rotate(-0.07);
  const sc = (f.reduced ? 1 : 0.9 + 0.1 * p2) * (1 + 0.035 * f.beat);
  ctx.scale(sc, sc);
  ctx.globalAlpha = p2;
  ctx.font = `400 ${440 * u}px ${f.fonts.mono}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = accent;
  ctx.fillText(age, 16 * u, 16 * u);
  const fill = ctx.createLinearGradient(0, -220 * u, 0, 220 * u);
  fill.addColorStop(0, "#ffffff");
  fill.addColorStop(0.5, "#ffd6ea");
  fill.addColorStop(1, "#ffffff");
  ctx.fillStyle = fill;
  ctx.fillText(age, 0, 0);
  ctx.lineWidth = 9 * u;
  ctx.strokeStyle = ink;
  ctx.lineJoin = "round";
  ctx.strokeText(age, 0, 0);
  ctx.restore();
  ctx.textBaseline = "alphabetic";

  ctx.save();
  ctx.globalAlpha = reveal(f, 0.6, 0.8);
  ctx.font = `600 ${38 * u}px ${f.fonts.display}`;
  ctx.fillStyle = ink;
  ctx.textAlign = "center";
  ctx.fillText(th.event.host, w / 2, h * 0.585);
  ctx.restore();

  drawGoingStamp(ctx, f, accent2, (s) => `400 ${s * 0.85}px ${f.fonts.mono}`, (s) => `700 ${s}px ${f.fonts.display}`, "rgba(255,255,255,0.85)");
  drawInfo(ctx, f, th, {
    ink,
    muted: "rgba(27,19,64,0.68)",
    accent,
    dateFont: (s) => `400 ${s * 0.85}px ${f.fonts.mono}`,
    smallFont: (s) => `600 ${s}px ${f.fonts.display}`,
  });
}

const drawers: Record<PartyTheme["id"], (ctx: Ctx, f: SceneFrame, th: PartyTheme) => void> = {
  neon: drawNeon,
  disco: drawDisco,
  masquerade: drawMasquerade,
  y2k: drawY2k,
};

export function drawScene(ctx: Ctx, theme: PartyTheme, frame: SceneFrame) {
  ctx.save();
  ctx.textBaseline = "alphabetic";
  drawers[theme.id](ctx, frame, theme);
  ctx.restore();
}

/**
 * Кружок с камерой (как «кружки» в Telegram): зеркально, кадр по центру с обрезкой, белое кольцо и цветное
 * внешнее — во время записи внешнее дышит в такт.
 */
export function drawCameraBubble(
  ctx: Ctx,
  video: HTMLVideoElement,
  cx: number,
  cy: number,
  r: number,
  ring: string,
  recording: boolean,
  beat: number,
) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return;
  const side = Math.min(vw, vh);
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.06, r * 1.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(cx, cy);
  ctx.scale(-1, 1);
  ctx.drawImage(video, (vw - side) / 2, (vh - side) / 2, side, side, -r, -r, r * 2, r * 2);
  ctx.restore();
  ctx.save();
  ctx.lineWidth = r * 0.05;
  ctx.strokeStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = r * (recording ? 0.035 + 0.025 * beat : 0.03);
  ctx.strokeStyle = ring;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.07, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
