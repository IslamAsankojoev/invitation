// Видео шаблона для Instagram (Reels 9:16, 1080×1920): открывает скрытый показ /showcase/<ключ>/<шаблон>,
// нажимает на печать конверта и листает приглашение «пальцем» — как в эталонном ролике (замеры по кадрам):
// свайп 1,15 с (в эталоне 0,83 — медленнее плавнее), старт сразу на полной скорости, скорость гаснет как (1−t)^1,5
// (путь 1−(1−t)^2,5); каждый следующий блок встаёт к верху экрана, уже целиком видные пропускаются, высокий блок
// листается по частям (nextScrollTarget), пауза ~2,6 с; анкету заполняют (имя по буквам, «Приду», +2 гостя,
// «Подтвердить»). По умолчанию без звука; --audio — с музыкой приглашения, как её слышит гость: песня шаблона с
// нажатия на печать (момент нажатия + ~0,15 с — как у живого телефона; headless под съёмкой начинает играть на
// секунду позже, этот сдвиг в ролик не переносим; часы кадров и Node совпадают до мс), нарастание 2 с, фрагмент
// start…end с затуханием 1,5 с в конце и повтором (нарастание 0,8 с), в конце ролика — затухание. Права на песни из
// public/music не оформлены — для публикации это решает владелец.
//
//   npm run video -- <шаблон…|all> [--base http://localhost:3000] [--out videos] [--fps 30] [--bg "#1b2b27"] [--fullscreen]
//                    [--audio] [--name <файл.mp4>]   — имя ролика (только для одного шаблона; по умолчанию <шаблон>.mp4)
//
// Для админки (/admin) скрипт печатает в stdout служебные строки: «@stage open|record|encode», «@progress 0.42»
// (доля пролистанной страницы) и «@file <путь>» в конце ролика.
//
// По умолчанию — как в эталоне: телефон в рамке на тёмном фоне, экран 513×1133 в кадре 1080×1920 (вёрстка
// 390×862 CSS px). --fullscreen — приглашение на весь кадр (экран 405×720 CSS px).
//
// Нужны: запущенный сайт (npm run dev), SHOWCASE_KEY в .env, ffmpeg в PATH.
// Кадры снимаются screencast'ом Chrome с метками времени и склеиваются ffmpeg в постоянные 30 к/с.
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

try {
  process.loadEnvFile(".env");
} catch {
  // .env может не быть — тогда ключ из окружения
}

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args.splice(i, 2)[1] : def;
};
const base = opt("base", "http://localhost:3000");
const outDir = opt("out", "videos");
const fileName = opt("name", null);
if (fileName && !/^[\w.-]+\.mp4$/.test(fileName)) throw new Error(`--name: нужно имя файла вида ролик.mp4, а не «${fileName}»`);
/** Служебная строка для админки: этап и прогресс записи. */
const report = (...parts) => console.log(`@${parts.join(" ")}`);
const fps = Number(opt("fps", "30"));
const bgColor = opt("bg", "#1b2b27");
if (!/^#[0-9a-f]{6}$/i.test(bgColor)) throw new Error(`--bg: нужен цвет вида #1a1a1a, а не «${bgColor}»`);
const fullscreen = args.includes("--fullscreen");
/** VIDEO_DEBUG=1 — печатать шаги листания (где остановились, что нажали). */
const debug = (...a) => process.env.VIDEO_DEBUG && console.error("·", ...a);
if (fullscreen) args.splice(args.indexOf("--fullscreen"), 1);
const withAudio = args.includes("--audio");
if (withAudio) args.splice(args.indexOf("--audio"), 1);
const key = process.env.SHOWCASE_KEY;
if (!key) throw new Error("Нет SHOWCASE_KEY в .env — без него страницы показа не открываются");

/** Экран телефона в кадре 1080×1920 — замер по эталонному ролику (рамка 18 px, скругление ~52 px). */
const SCREEN = { x: 284, y: 417, width: 513, height: 1133, radius: 54, bezel: 18 };
// Вёрстка той же пропорции, снимаем с запасом по чёткости и уменьшаем до экрана. На весь кадр: 405×720 × 8/3.
const VIEW = fullscreen ? { width: 405, height: 720 } : { width: 390, height: Math.round((390 * SCREEN.height) / SCREEN.width) };
// Чёткость съёмки — с небольшим запасом к размеру экрана в кадре: выше — греет ноутбук и почти не видно разницы.
const DPR = fullscreen ? 8 / 3 : 1.6;

/** Тайминги эталонного ролика, мс. */
const T = { envelope: 2300, hero: 4200, flick: 1150, dwell: 2600, beforeRsvp: 900, afterThanks: 2600, end: 2400 };
/** Шаг свайпа по высокому блоку без подходящей части, доля экрана. */
const STEP = { fallback: 0.85 };

async function templateIds() {
  const res = await fetch(`${base}/showcase/${key}`);
  if (!res.ok) throw new Error(`Показ недоступен (${res.status}): сайт запущен и SHOWCASE_KEY совпадает?`);
  return [...new Set([...(await res.text()).matchAll(new RegExp(`/showcase/${key}/([a-z0-9-]+)`, "g"))].map((m) => m[1]))];
}

async function record(browser, id) {
  const context = await browser.newContext({
    viewport: VIEW,
    deviceScaleFactor: DPR,
    isMobile: true,
    hasTouch: true,
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  // Не ждать элемент по 30 с: если анкеты нет или что-то не нашлось — сразу ошибка, а не долгий прогон.
  page.setDefaultTimeout(8000);
  // Загрузке — своё время: dev-сервер при первом открытии компилирует страницу десятки секунд.
  page.setDefaultNavigationTimeout(90_000);
  // load, а не networkidle: у dev-сервера сеть не затихает (HMR), музыка тоже догружается.
  const res = await page.goto(`${base}/showcase/${key}/${id}`, { waitUntil: "load" });
  await page.getByRole("button", { name: "Открыть приглашение" }).waitFor({ timeout: 30_000 }).catch(() => {});
  // На порту может работать другой сайт или не тот ключ — тогда конверта нет; говорим сразу, а не ждём.
  const envelope = page.getByRole("button", { name: "Открыть приглашение" });
  if (!res?.ok() || !(await envelope.count())) {
    await context.close();
    throw new Error(
      `${base}/showcase/…/${id} — не показ шаблона (ответ ${res?.status() ?? "нет"}). ` +
        "Запущен ли сайт приглашений на этом адресе (--base), верны ли SHOWCASE_KEY и id шаблона?",
    );
  }
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500); // картинки и шрифты успевают проявиться до начала записи

  const cdp = await context.newCDPSession(page);
  const frames = [];
  cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
    frames.push({ data: Buffer.from(data, "base64"), t: metadata.timestamp });
    cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", {
    format: "jpeg",
    quality: 92,
    maxWidth: Math.round(VIEW.width * DPR),
    maxHeight: Math.round(VIEW.height * DPR),
    everyNthFrame: 2, // ~30 к/с — столько и в итоговом видео; каждый кадр Chrome вдвое тяжелее для ноутбука
  });

  report("stage", "record");
  // Заиграла ли песня после нажатия на печать — только проверка (звук ставим по моменту нажатия, см. шапку).
  if (withAudio)
    await page.evaluate(() => {
      const audio = document.querySelector('audio[data-testid="music"]');
      audio?.addEventListener("playing", () => (window.__musicPlayed = true), { once: true });
    });
  // Конверт: даём рассмотреть, «касание» пальцем по печати, приглашение открывается.
  await page.waitForTimeout(T.envelope);
  const openedAt = await tap(page, page.getByRole("button", { name: "Открыть приглашение" }));
  await page.waitForTimeout(T.hero);

  // Свайпы до конца страницы; положения блоков меряем заново (анкета после ответа меняет высоту).
  let rsvpDone = false;
  for (let guard = 0; guard < 60; guard++) {
    const { y, maxScroll, sections, photos } = await page.evaluate(() => {
      const box = (el) => {
        const r = el.getBoundingClientRect();
        return { top: r.top + scrollY, bottom: r.bottom + scrollY };
      };
      return {
        y: scrollY,
        maxScroll: document.documentElement.scrollHeight - innerHeight,
        // Фото (img и фото-заливки блоков) — их нижний край экрана резать не должен.
        photos: [...document.querySelectorAll('section[data-block] img, section[data-block] [data-testid*="photo"]')]
          .map(box)
          .filter((b) => b.bottom - b.top > 60),
        sections: [...document.querySelectorAll("section[data-block]")]
          .filter((s) => s.dataset.block !== "divider")
          .map((s) => ({
            block: s.dataset.block,
            ...box(s),
            // Части блока (то, что появляется анимацией, и фото) — по ним листается блок выше экрана.
            parts: [...s.querySelectorAll("[data-reveal], img")].map(box).filter((b) => b.bottom - b.top > 24),
          })),
      };
    });
    if (maxScroll > 0) report("progress", Math.min(1, y / maxScroll).toFixed(3));
    if (y >= maxScroll - 2) break;
    let target = avoidCutPhotos(nextScrollTarget(y, VIEW.height, sections, rsvpDone), y, VIEW.height, photos);
    target = Math.min(maxScroll, Math.max(0, target));
    const rsvpTop = sections.find((s) => s.block === "rsvp")?.top ?? null;
    debug(`свайп ${Math.round(y)} → ${Math.round(target)} (конец ${Math.round(maxScroll)})`);
    await flick(page, target);
    // Упёрлись в низ (в мобильной эмуляции расчётный конец страницы бывает дальше реального) — это конец.
    if (Math.abs((await page.evaluate(() => scrollY)) - y) < 2) break;
    const atRsvp = !rsvpDone && rsvpTop !== null && Math.abs(target - rsvpTop) < 4;
    if (atRsvp) {
      rsvpDone = true;
      await page.waitForTimeout(T.beforeRsvp);
      await fillRsvp(page);
      await page.waitForTimeout(T.afterThanks);
    } else {
      await page.waitForTimeout(T.dwell);
    }
  }
  await page.waitForTimeout(T.end - T.dwell);

  await cdp.send("Page.stopScreencast");
  // Музыка приглашения: файл, фрагмент, повтор и момент старта (мс по часам системы).
  const music = withAudio
    ? await page.evaluate(() => {
        const audio = document.querySelector('audio[data-testid="music"]');
        if (!audio) return null;
        const { start, end, loop } = audio.dataset;
        return { src: audio.currentSrc || audio.src, start: Number(start) || 0, end: end ? Number(end) : null, loop: loop !== undefined, played: !!window.__musicPlayed };
      })
    : null;
  if (music) music.at = openedAt + PLAY_LATENCY;
  await context.close();
  return { frames, music };
}

/** Допуск при сравнении границ блоков с краем экрана, px. */
const EDGE = 4;

/**
 * Куда листать: блоки, уже целиком видные на экране, пропускаем; первый блок, который виден не целиком, встаёт к
 * верху экрана — его анимации проигрываются целиком, а не за нижним краем. Блок выше экрана листается частями: к
 * верху встаёт первая его часть (фото, абзац), обрезанная снизу, — без неё ~0,85 экрана. Анкету не пропускаем, даже
 * если она уже видна: её надо заполнить.
 */
function nextScrollTarget(y, vh, sections, rsvpDone) {
  const rsvp = !rsvpDone && sections.find((s) => s.block === "rsvp" && s.top > y + EDGE);
  const s = sections.find((s) => s.bottom > y + vh + EDGE);
  if (rsvp && (!s || rsvp.top <= s.top)) return rsvp.top;
  if (!s) return Infinity; // всё видно — к концу страницы
  if (s.top > y + EDGE) return s.top;
  const cut = s.parts.filter((p) => p.top > y + vh * 0.15 && p.top < y + vh - EDGE && p.bottom > y + vh + EDGE).map((p) => p.top);
  const below = s.parts.filter((p) => p.top >= y + vh - EDGE).map((p) => p.top);
  let target = cut.length ? Math.min(...cut) - 16 : below.length ? Math.min(...below) - 16 : y + vh * STEP.fallback;
  // Не дальше экрана (иначе что-то пролетит невиденным) и не мельче четверти экрана.
  target = Math.min(target, y + vh * 0.95);
  return target < y + vh * 0.25 ? y + vh * STEP.fallback : target;
}

/**
 * Остановка не должна резать фото нижним краем экрана: его анимация проиграется наполовину за краем, а когда блок
 * доедет наверх, фото будет уже неподвижным. Лучше не долистать (фото ещё за краем), иначе — долистать до его низа;
 * оба варианта — только если шаг остаётся заметным и ничего не пролетает невиденным.
 */
function avoidCutPhotos(target, y, vh, photos) {
  if (!Number.isFinite(target)) return target;
  const cut = photos.filter((p) => p.top < target + vh - EDGE && p.bottom > target + vh + EDGE);
  if (!cut.length) return target;
  const before = Math.min(...cut.map((p) => p.top)) - vh - 8;
  if (before > y + vh * 0.25) return before;
  const after = Math.max(...cut.map((p) => p.bottom)) - vh + 8;
  return after - y <= vh * 0.95 ? after : target;
}

/**
 * Свайп как в эталонном ролике (чуть медленнее — плавнее): старт сразу на полной скорости, скорость гаснет как (1−t)^1,5 —
 * путь 1−(1−t)^2,5. Короткие поправки (меньше трети экрана) — чуть быстрее.
 */
async function flick(page, target) {
  await page.evaluate(
    ([target, ms]) =>
      new Promise((done) => {
        const from = scrollY;
        const dist = target - from;
        if (Math.abs(dist) < 2) return done();
        const duration = Math.abs(dist) < innerHeight / 3 ? ms * 0.6 : ms;
        document.documentElement.style.scrollBehavior = "auto";
        const t0 = performance.now();
        const step = (now) => {
          const u = Math.min(1, (now - t0) / duration);
          window.scrollTo(0, from + dist * (1 - (1 - u) ** 2.5));
          if (u < 1) requestAnimationFrame(step);
          else done();
        };
        requestAnimationFrame(step);
      }),
    [target, T.flick],
  );
}

/** Нажатие «пальцем»: след касания, затем само нажатие. Возвращает момент нажатия (мс, часы системы — как у кадров). */
async function tap(page, locator) {
  debug("нажатие", String(locator));
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  const box = await locator.boundingBox();
  if (box) await showTap(page, box.x + box.width / 2, box.y + box.height / 2);
  const at = Date.now();
  await locator.click();
  return at;
}

/** Анкета как в ролике: имя по буквам, «Приду», двое гостей сверху, отправка; держим кадр на «Спасибо!». */
async function fillRsvp(page) {
  const rsvp = page.locator('section[data-block="rsvp"]');
  const name = rsvp.getByPlaceholder("Имя и фамилия");
  if (!(await name.count())) return;
  await tap(page, name);
  await page.keyboard.type("Алия Сатыбалдиева", { delay: 95 });
  await page.waitForTimeout(500);
  await tap(page, rsvp.locator("label.inv-choice", { hasText: "Приду" })); // радио внутри подписи
  await page.waitForTimeout(600);
  for (let i = 0; i < 2; i++) {
    await tap(page, rsvp.getByRole("button", { name: "Добавить гостя" }));
    await page.waitForTimeout(450);
  }
  await page.waitForTimeout(500);
  // Кнопка отправки может быть ниже экрана — короткий свайп к ней, как пальцем.
  const submit = rsvp.locator('button[type="submit"]');
  const box = await submit.boundingBox();
  if (box && box.y + box.height > VIEW.height - 40) {
    await flick(page, await page.evaluate((dy) => scrollY + dy, box.y + box.height - VIEW.height * 0.7));
    await page.waitForTimeout(500);
  }
  await tap(page, submit);
}

/** Полупрозрачный след касания, как в записях экрана телефона. */
async function showTap(page, x, y) {
  await page.evaluate(
    ([x, y]) =>
      new Promise((done) => {
        const dot = document.createElement("div");
        Object.assign(dot.style, {
          position: "fixed",
          left: `${x - 22}px`,
          top: `${y - 22}px`,
          width: "44px",
          height: "44px",
          borderRadius: "50%",
          background: "rgba(255,255,255,.55)",
          boxShadow: "0 0 0 1px rgba(0,0,0,.12), 0 2px 10px rgba(0,0,0,.18)",
          zIndex: 2147483647,
          pointerEvents: "none",
        });
        document.body.append(dot);
        dot.animate(
          [
            { transform: "scale(.6)", opacity: 0 },
            { transform: "scale(1)", opacity: 1, offset: 0.3 },
            { transform: "scale(1.15)", opacity: 0 },
          ],
          { duration: 650, easing: "ease-out" },
        ).onfinish = () => dot.remove();
        setTimeout(done, 260);
      }),
    [x, y],
  );
}

/** #rrggbb × k (0–1): тот же оттенок, темнее. */
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v * k).toString(16).padStart(2, "0"));
  return `#${c.join("")}`;
}

/** Фон, тело телефона и маска экрана (PNG) для рамки как в эталоне. */
async function mockupLayers(dir) {
  const sharp = (await import("sharp")).default;
  const { x, y, width: w, height: h, radius: r, bezel: b } = SCREEN;
  // Края — тот же цвет, только темнее (виньетка), иначе любой --bg уходил бы в зелёный край эталона.
  const n = parseInt(bgColor.slice(1), 16);
  const light = 0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255) > 140;
  const edge = shade(bgColor, light ? 0.8 : 0.45); // светлый фон темнеет мягко, иначе края грязно-серые
  const bg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">
    <defs>
      <radialGradient id="g" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="${bgColor}"/><stop offset="1" stop-color="${bgColor}" stop-opacity="0"/></radialGradient>
      <filter id="s" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="38"/></filter>
    </defs>
    <rect width="1080" height="1920" fill="${edge}"/>
    <rect width="1080" height="1920" fill="url(#g)"/>
    <rect x="${x - b}" y="${y - b + 40}" width="${w + 2 * b}" height="${h + 2 * b}" rx="${r + b}" fill="#000" opacity=".55" filter="url(#s)"/>
    <rect x="${x - b}" y="${y - b}" width="${w + 2 * b}" height="${h + 2 * b}" rx="${r + b}" fill="#0a0a0a" stroke="#3a3d3c" stroke-width="2"/>
    <rect x="${x - b - 4}" y="${y + 220}" width="4" height="70" rx="2" fill="#26292a"/>
    <rect x="${x - b - 4}" y="${y + 310}" width="4" height="110" rx="2" fill="#26292a"/>
    <rect x="${x + w + b}" y="${y + 260}" width="4" height="150" rx="2" fill="#26292a"/>
  </svg>`;
  const mask = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#000"/><rect width="${w}" height="${h}" rx="${r}" fill="#fff"/></svg>`;
  // Камера поверх экрана — точка, как на эталоне.
  const top = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><circle cx="${x + w / 2}" cy="${y + 20}" r="9" fill="#050505"/><circle cx="${x + w / 2 + 2}" cy="${y + 18}" r="3" fill="#1d2a3a"/></svg>`;
  await sharp(Buffer.from(bg)).png().toFile(path.join(dir, "bg.png"));
  await sharp(Buffer.from(mask)).grayscale().png().toFile(path.join(dir, "mask.png"));
  await sharp(Buffer.from(top)).png().toFile(path.join(dir, "top.png"));
}

/** Как в lib/musicFragment.ts: короче фрагмент не бывает, и за сколько секунд до конца он затухает. */
const MIN_FRAGMENT = 3;
const FADE_OUT = 1.5;
/** Через сколько после нажатия на печать песня начинает звучать в живом браузере, мс. */
const PLAY_LATENCY = 150;
/** Нарастание при включении и при повторе — как в useInvitationMusic. */
const FADE_IN = 2;
const FADE_IN_REPEAT = 0.8;

/**
 * Дорожка музыки (часть filter_complex → [a]; метки не пересекаются с графом видео: [s] [m] [sr] [vo] [v]): песня с момента, когда заиграла у гостя, как её играет плеер
 * приглашения, — фрагмент, нарастание, затухание у конца фрагмента и повторы; в конце ролика — затухание.
 */
async function audioGraph(music, dir, input, t0, duration) {
  const res = await fetch(new URL(music.src, base));
  if (!res.ok) throw new Error(`Не удалось скачать песню ${music.src} (${res.status})`);
  const file = path.join(dir, `music${path.extname(new URL(music.src, base).pathname) || ".mp3"}`);
  writeFileSync(file, new Uint8Array(await res.arrayBuffer()));
  const track = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim());
  if (!Number.isFinite(track) || track <= 0) throw new Error(`Не удалось прочитать длину песни ${music.src}`);
  const start = Math.min(Math.max(0, music.start), Math.max(0, track - MIN_FRAGMENT));
  const end = music.end == null ? track : Math.min(track, Math.max(start + MIN_FRAGMENT, music.end));
  const fragment = end - start;
  const delay = Math.max(0, (music.at - t0) / 1000);
  const length = duration - delay;
  if (length <= 0.5) return null;
  const copies = music.loop ? Math.min(50, Math.ceil(length / fragment)) : 1;
  const labels = Array.from({ length: copies }, (_, i) => `[x${i}]`).join("");
  const parts = [`[${input}:a]aresample=48000${copies > 1 ? `,asplit=${copies}${labels}` : "[x0]"}`];
  for (let i = 0; i < copies; i++)
    parts.push(
      `[x${i}]atrim=start=${start.toFixed(3)}:end=${end.toFixed(3)},asetpts=PTS-STARTPTS,` +
        `afade=t=in:st=0:d=${i === 0 ? FADE_IN : FADE_IN_REPEAT},afade=t=out:st=${Math.max(0, fragment - FADE_OUT).toFixed(3)}:d=${FADE_OUT}[p${i}]`,
    );
  parts.push(copies > 1 ? `${Array.from({ length: copies }, (_, i) => `[p${i}]`).join("")}concat=n=${copies}:v=0:a=1[mus]` : "[p0]anull[mus]");
  parts.push(
    `[mus]atrim=end=${length.toFixed(3)},afade=t=out:st=${Math.max(0, length - FADE_OUT).toFixed(3)}:d=${FADE_OUT},` +
      `adelay=${Math.round(delay * 1000)}:all=1,apad[a]`,
  );
  return { file, graph: parts.join(";") };
}

/** Кадры с метками времени → MP4 с постоянной частотой (кадр держится, пока не придёт следующий); music — со звуком. */
async function encode(frames, file, music = null) {
  const dir = mkdtempSync(path.join(tmpdir(), "inv-video-"));
  try {
    const list = [];
    frames.forEach((f, i) => {
      const name = `f${String(i).padStart(5, "0")}.jpg`;
      writeFileSync(path.join(dir, name), f.data);
      const next = frames[i + 1]?.t ?? f.t + 1 / fps;
      list.push(`file '${name}'`, `duration ${Math.max(0.001, next - f.t).toFixed(4)}`);
    });
    list.push(`file 'f${String(frames.length - 1).padStart(5, "0")}.jpg'`);
    writeFileSync(path.join(dir, "list.txt"), list.join("\n"));
    const input = ["-f", "concat", "-safe", "0", "-i", "list.txt"];
    let filter;
    if (fullscreen) {
      filter = ["-filter_complex", `[0]fps=${fps},scale=1080:1920:flags=lanczos,format=yuv420p[v]`];
    } else {
      await mockupLayers(dir);
      // Картинки рамки зациклены (бесконечны) — длину ролика задаёт -t ниже, иначе ffmpeg не остановится.
      for (const img of ["bg.png", "mask.png", "top.png"]) input.push("-loop", "1", "-framerate", String(fps), "-i", img);
      const { x, y, width: w, height: h } = SCREEN;
      filter = [
        "-filter_complex",
        `[0]fps=${fps},scale=${w}:${h}:flags=lanczos,format=rgba[s];[2]format=gray,scale=${w}:${h}[m];[s][m]alphamerge[sr];` +
          `[1][sr]overlay=${x}:${y}:shortest=1[vo];[vo][3]overlay=0:0:shortest=1,format=yuv420p[v]`,
      ];
    }
    const duration = (frames.at(-1).t - frames[0].t + 1 / fps).toFixed(3);
    // Звук: песня — следующий вход, её граф дописывается к видео в тот же filter_complex.
    const audio = music ? await audioGraph(music, dir, input.filter((a) => a === "-i").length, frames[0].t * 1000, Number(duration)) : null;
    if (audio) {
      input.push("-i", audio.file);
      filter[1] += `;${audio.graph}`;
    }
    const maps = ["-map", "[v]", ...(audio ? ["-map", "[a]", "-c:a", "aac", "-b:a", "192k", "-ac", "2"] : [])];
    // nice и 4 потока — кодирование не забирает весь процессор; preset medium почти не уступает slow по качеству.
    execFileSync(
      "nice",
      ["-n", "15", "ffmpeg", "-y", "-loglevel", "error", "-filter_threads", "2", ...input, ...filter, ...maps, "-t", duration, "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-threads", "4", "-r", String(fps), "-movflags", "+faststart", path.resolve(file)],
      { cwd: dir, stdio: "inherit" },
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// --selftest: склейка на 30 искусственных кадрах (секунда работы) — проверка, что ffmpeg завершается и длина верная.
if (args.includes("--selftest")) {
  const sharp = (await import("sharp")).default;
  const w = Math.round(VIEW.width * DPR), h = Math.round(VIEW.height * DPR);
  const frames = [];
  for (let i = 0; i < 30; i++) {
    const data = await sharp({ create: { width: w, height: h, channels: 3, background: { r: 20 + i * 6, g: 60, b: 50 } } }).jpeg().toBuffer();
    frames.push({ data, t: i / 30 });
  }
  const file = path.join(tmpdir(), "inv-video-selftest.mp4");
  const t0 = Date.now();
  await encode(frames, file);
  const dur = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim();
  console.log(`selftest: ${dur} с видео (ожидалось ~1.0), ${Date.now() - t0} мс`);
  // --keep — сохранить кадр рядом, чтобы посмотреть фон и рамку.
  if (args.includes("--keep")) {
    mkdirSync(outDir, { recursive: true });
    const still = path.join(outDir, "selftest-frame.png");
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", "0.5", "-i", file, "-frames:v", "1", still]);
    console.log(`кадр: ${still}`);
  }
  rmSync(file, { force: true });
  process.exit(0);
}

const wanted = args.length === 0 || args.includes("all") ? await templateIds() : args;
if (fileName && wanted.length !== 1) throw new Error("--name — только для одного шаблона");
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
try {
  for (const id of wanted) {
    const started = Date.now();
    report("stage", "open", id);
    // Предохранитель: один ролик — около минуты; дольше 3 минут — значит, что-то зависло, не греем ноутбук зря.
    // Таймер снимаем: иначе после последнего ролика процесс ждал бы его ещё до 3 минут (админка — «Склеиваю видео…»).
    let guard;
    const { frames, music } = await Promise.race([
      record(browser, id),
      new Promise((_, fail) => (guard = setTimeout(() => fail(new Error(`${id}: съёмка дольше 3 минут — остановлено`)), 180_000))),
    ]).finally(() => clearTimeout(guard));
    const seconds = frames.at(-1).t - frames[0].t;
    const file = path.join(outDir, fileName ?? `${id}.mp4`);
    report("progress", "1");
    report("stage", "encode");
    if (withAudio && !music) console.error(`${id}: в приглашении нет музыки — ролик без звука`);
    else if (withAudio && !music.played) console.error(`${id}: песня не заиграла в браузере (файл не загрузился?) — звук всё равно наложен`);
    await encode(frames, file, music);
    report("file", file);
    console.log(`${file}  ${seconds.toFixed(1)} с, ${frames.length} кадров (~${(frames.length / seconds).toFixed(0)} к/с снято), ${((Date.now() - started) / 1000).toFixed(0)} с работы`);
  }
} finally {
  await browser.close();
}
