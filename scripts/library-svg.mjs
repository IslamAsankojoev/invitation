// Генератор векторной части библиотеки (public/library/*.svg): рамки, арки, венки, разделители, ветки, акварель.
// Запуск: node scripts/library-svg.mjs. Всё детерминировано (свой генератор случайных чисел) — повторный
// запуск даёт те же файлы. Цвета — золото/зелень/акварель в духе test.rainbow.kg.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const out = join(dirname(fileURLToPath(import.meta.url)), "../public/library");
mkdirSync(out, { recursive: true });

const GOLD = "#b8955f";
const GOLD_LIGHT = "#d4b98a";
const SAGE = "#8a9a7b";
const OLIVE = "#6f7a4f";

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const r = (a, b) => a + rnd() * (b - a);
const f = (n) => Math.round(n * 10) / 10;

const svg = (w, h, body, defs = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${defs ? `<defs>${defs}</defs>` : ""}${body}</svg>\n`;

/** Лист: основание в (x, y), направлен под углом deg, длина len, ширина w. */
function leaf(x, y, deg, len, w, { fill = "none", stroke = GOLD, sw = 1.2, vein = true } = {}) {
  const d = `M0 0 C ${f(w * 0.6)} ${f(-len * 0.25)} ${f(w * 0.55)} ${f(-len * 0.75)} 0 ${f(-len)} C ${f(-w * 0.55)} ${f(-len * 0.75)} ${f(-w * 0.6)} ${f(-len * 0.25)} 0 0Z`;
  const v = vein ? `<path d="M0 0 L0 ${f(-len * 0.85)}" stroke="${stroke}" stroke-width="${sw * 0.6}" fill="none" opacity=".7"/>` : "";
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(deg)})"><path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>${v}</g>`;
}

/** Точки на квадратичной кривой Безье с углом касательной. */
function along(p0, p1, p2, n) {
  return Array.from({ length: n }, (_, i) => {
    const t = (i + 0.5) / n;
    const x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t ** 2 * p2[0];
    const y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t ** 2 * p2[1];
    const dx = 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]);
    const dy = 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
    return { x, y, t, deg: (Math.atan2(dy, dx) * 180) / Math.PI };
  });
}

/** Ветка вдоль кривой: стебель + листья попеременно, к концу мельче. */
function branch(p0, p1, p2, { n = 9, len = 26, w = 12, style = {}, spread = 50 } = {}) {
  const stem = `<path d="M${p0.join(" ")} Q${p1.join(" ")} ${p2.join(" ")}" fill="none" stroke="${style.stroke ?? GOLD}" stroke-width="${(style.sw ?? 1.2) * 1.1}" stroke-linecap="round"/>`;
  const leaves = along(p0, p1, p2, n)
    .map(({ x, y, t, deg }, i) => {
      const side = i % 2 ? 1 : -1;
      const k = 1 - t * 0.45;
      return leaf(x, y, deg + 90 + side * spread + r(-6, 6), len * k * r(0.9, 1.1), w * k, style);
    })
    .join("");
  const tip = leaf(p2[0], p2[1], along(p0, p1, p2, 1)[0].deg + 90, len * 0.6, w * 0.55, style);
  return stem + leaves + tip;
}

const files = {};

// ---------- Рамки и арки ----------
files["arch-line"] = svg(
  300,
  400,
  `<path d="M20 395 V150 A130 130 0 0 1 280 150 V395" fill="none" stroke="${GOLD}" stroke-width="1.6"/>` +
    `<path d="M34 395 V152 A116 116 0 0 1 266 152 V395" fill="none" stroke="${GOLD}" stroke-width=".8" opacity=".7"/>` +
    branch([150, 22], [105, 10], [70, 34], { n: 6, len: 18, w: 9 }) +
    branch([150, 22], [195, 10], [230, 34], { n: 6, len: 18, w: 9 }) +
    `<circle cx="150" cy="20" r="3.2" fill="${GOLD}"/>`,
);
files["arch-botanical"] = svg(
  300,
  400,
  `<path d="M24 398 V150 A126 126 0 0 1 276 150 V398" fill="none" stroke="${GOLD}" stroke-width="1.3"/>` +
    branch([30, 398], [4, 250], [60, 90], { n: 12, len: 24, w: 11, spread: 55 }) +
    branch([270, 398], [296, 250], [240, 90], { n: 12, len: 24, w: 11, spread: 55 }) +
    branch([150, 26], [110, 14], [84, 40], { n: 5, len: 16, w: 8 }) +
    branch([150, 26], [190, 14], [216, 40], { n: 5, len: 16, w: 8 }),
);
files["frame-oval"] = svg(
  300,
  380,
  `<ellipse cx="150" cy="185" rx="128" ry="168" fill="none" stroke="${GOLD}" stroke-width="1.5"/>` +
    `<ellipse cx="150" cy="185" rx="118" ry="158" fill="none" stroke="${GOLD}" stroke-width=".7" stroke-dasharray="2 5" opacity=".8"/>` +
    branch([150, 356], [100, 362], [62, 330], { n: 7, len: 20, w: 10 }) +
    branch([150, 356], [200, 362], [238, 330], { n: 7, len: 20, w: 10 }) +
    `<circle cx="150" cy="355" r="4" fill="${GOLD}"/><circle cx="150" cy="16" r="2.6" fill="${GOLD}"/>`,
);
const deco = (x, y, sx, sy) =>
  `<g transform="translate(${x} ${y}) scale(${sx} ${sy})" fill="none" stroke="${GOLD}" stroke-width="1.4">` +
  `<path d="M0 70 V20 H20 V0 H70"/><path d="M10 70 V30 H30 V10 H70" stroke-width=".7"/>` +
  `<path d="M0 0 L16 16" stroke-width=".9"/><circle cx="20" cy="20" r="2.5" fill="${GOLD}" stroke="none"/></g>`;
files["frame-deco"] = svg(
  300,
  380,
  deco(10, 10, 1, 1) +
    deco(290, 10, -1, 1) +
    deco(10, 370, 1, -1) +
    deco(290, 370, -1, -1) +
    `<path d="M80 10 H220 M80 370 H220 M10 80 V300 M290 80 V300" stroke="${GOLD}" stroke-width=".8" opacity=".8"/>` +
    `<path d="M150 4 l6 6 -6 6 -6 -6z M150 364 l6 6 -6 6 -6 -6z" fill="${GOLD}"/>`,
);
const scroll = (x, y, sx, sy) =>
  `<g transform="translate(${x} ${y}) scale(${sx} ${sy})" fill="none" stroke="${GOLD}" stroke-width="1.3" stroke-linecap="round">` +
  `<path d="M0 90 C0 30 30 0 90 0"/><path d="M14 90 C14 40 40 14 90 14" stroke-width=".7"/>` +
  `<path d="M30 30 C52 18 64 36 50 46 C40 53 30 44 36 36"/><path d="M90 0 C104 0 110 12 100 18"/><path d="M0 90 C0 104 12 110 18 100"/>` +
  `${leaf(58, 12, 60, 16, 8)}${leaf(12, 58, 30, 16, 8)}</g>`;
files["frame-corners"] = svg(300, 380, scroll(8, 8, 1, 1) + scroll(292, 8, -1, 1) + scroll(8, 372, 1, -1) + scroll(292, 372, -1, -1));

// ---------- Венки ----------
function laurel(cx, cy, rad, from, to, style, n = 14, spread = 40, size = 1) {
  const a0 = (from * Math.PI) / 180;
  const a1 = (to * Math.PI) / 180;
  let body = `<path d="M${f(cx + rad * Math.cos(a0))} ${f(cy + rad * Math.sin(a0))} A${rad} ${rad} 0 0 ${to > from ? 1 : 0} ${f(cx + rad * Math.cos(a1))} ${f(cy + rad * Math.sin(a1))}" fill="none" stroke="${style.stroke ?? GOLD}" stroke-width="1.3"/>`;
  for (let i = 0; i < n; i++) {
    const a = a0 + ((a1 - a0) * (i + 0.5)) / n;
    const x = cx + rad * Math.cos(a);
    const y = cy + rad * Math.sin(a);
    const tangent = (a * 180) / Math.PI + (to > from ? 90 : -90);
    const k = 1 - (i / n) * 0.35;
    body += leaf(x, y, tangent + 90 - spread, 26 * k * size, 11 * k * size, style) + leaf(x, y, tangent + 90 + spread - 180, 22 * k * size, 10 * k * size, style);
  }
  return body;
}
files["wreath-laurel"] = svg(300, 300, laurel(150, 150, 118, 100, 250, {}) + laurel(150, 150, 118, 80, -70, {}) + `<circle cx="150" cy="268" r="3.5" fill="${GOLD}"/>`);
files["wreath-round"] = svg(
  300,
  300,
  laurel(150, 150, 112, -90, 270, { fill: SAGE, stroke: "#6f7f62", sw: 0.7, vein: false }, 26, 22, 1.25) +
    laurel(150, 150, 118, -80, 280, { fill: "#a9b89b", stroke: "#7d8c72", sw: 0.6, vein: false }, 20, 30, 0.9) +
    Array.from({ length: 14 }, (_, i) => {
      const a = (i / 14) * Math.PI * 2 + 0.2;
      return `<circle cx="${f(150 + 128 * Math.cos(a))}" cy="${f(150 + 128 * Math.sin(a))}" r="${f(r(2.5, 4))}" fill="${GOLD_LIGHT}"/>`;
    }).join(""),
);
files["wreath-half"] = svg(300, 170, laurel(150, 10, 130, 175, 95, {}, 11) + laurel(150, 10, 130, 5, 85, {}, 11) + `<path d="M150 136 l5 6 -5 6 -5 -6z" fill="${GOLD}"/>`);

// ---------- Разделители ----------
files["divider-leaf"] = svg(
  360,
  60,
  `<path d="M10 30 H140 M220 30 H350" stroke="${GOLD}" stroke-width="1"/>` +
    branch([180, 30], [160, 30], [142, 30], { n: 4, len: 14, w: 7 }) +
    branch([180, 30], [200, 30], [218, 30], { n: 4, len: 14, w: 7 }) +
    `<circle cx="180" cy="30" r="3" fill="${GOLD}"/>`,
);
const heart = (x, y, s, fill) =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M0 6 C-8 -2 -14 -8 -8 -12 C-4 -15 0 -11 0 -8 C0 -11 4 -15 8 -12 C14 -8 8 -2 0 6Z" fill="${fill}"/>`;
files["divider-heart"] = svg(
  360,
  40,
  `<path d="M20 20 H150 M210 20 H340" stroke="${GOLD}" stroke-width="1"/>` +
    heart(180, 22, 1.1, GOLD) +
    [158, 166, 194, 202].map((x) => `<circle cx="${x}" cy="20" r="1.8" fill="${GOLD}"/>`).join("") +
    `<circle cx="20" cy="20" r="2.4" fill="${GOLD}"/><circle cx="340" cy="20" r="2.4" fill="${GOLD}"/>`,
);
files["divider-swirl"] = svg(
  360,
  60,
  `<g fill="none" stroke="${GOLD}" stroke-width="1.3" stroke-linecap="round">` +
    `<path d="M180 30 C150 6 120 54 90 30 C70 14 50 22 40 30 H10"/><path d="M180 30 C210 6 240 54 270 30 C290 14 310 22 320 30 H350"/>` +
    `<path d="M120 30 c6 -10 18 -8 16 0 c-2 6 -10 4 -8 -1"/><path d="M240 30 c-6 -10 -18 -8 -16 0 c2 6 10 4 8 -1"/></g>` +
    `<path d="M180 22 l7 8 -7 8 -7 -8z" fill="${GOLD}"/>`,
);
files["divider-dots"] = svg(
  360,
  24,
  Array.from({ length: 23 }, (_, i) => {
    const x = 26 + i * 14;
    return i === 11
      ? `<path d="M${x} 4 l8 8 -8 8 -8 -8z" fill="none" stroke="${GOLD}" stroke-width="1.2"/><circle cx="${x}" cy="12" r="2" fill="${GOLD}"/>`
      : `<circle cx="${x}" cy="12" r="${Math.abs(i - 11) % 3 === 0 ? 2.2 : 1.3}" fill="${GOLD}"/>`;
  }).join(""),
);

// ---------- Ветки ----------
files["branch-eucalyptus"] = svg(
  220,
  360,
  `<path d="M110 355 Q90 200 120 20" fill="none" stroke="#7d8c72" stroke-width="2"/>` +
    along([110, 355], [90, 200], [120, 20], 11)
      .map(({ x, y, t }, i) => {
        const side = i % 2 ? 1 : -1;
        const rr = 22 * (1 - t * 0.5);
        return `<ellipse cx="${f(x + side * rr * 0.9)}" cy="${f(y)}" rx="${f(rr)}" ry="${f(rr * 0.82)}" fill="${i % 3 ? "#9aab8c" : "#a9b89b"}" opacity=".92"/>` +
          `<path d="M${f(x)} ${f(y)} L${f(x + side * rr * 0.9)} ${f(y)}" stroke="#7d8c72" stroke-width=".8"/>`;
      })
      .join(""),
);
files["branch-olive"] = svg(
  360,
  200,
  branch([10, 170], [170, 150], [350, 30], { n: 14, len: 42, w: 13, spread: 38, style: { fill: OLIVE, stroke: "#5c6641", sw: 0.8, vein: true } }) +
    [
      [120, 140],
      [210, 108],
      [280, 70],
    ]
      .map(([x, y]) => `<ellipse cx="${x}" cy="${y + 12}" rx="7" ry="9.5" fill="#3f4a2c"/><ellipse cx="${x - 2}" cy="${y + 9}" rx="2" ry="3" fill="#8a9468" opacity=".7"/>`)
      .join(""),
);
files["branch-fern"] = svg(200, 380, branch([100, 375], [80, 200], [110, 10], { n: 22, len: 46, w: 7, spread: 62 }));

// ---------- Акварель ----------
function watercolor(id, colors, { w = 360, h = 300, speckles = 0 } = {}) {
  const blobs = colors
    .map(([c, o], i) => `<ellipse cx="${f(w / 2 + r(-50, 50))}" cy="${f(h / 2 + r(-40, 40))}" rx="${f(r(90, 140) - i * 10)}" ry="${f(r(70, 110) - i * 8)}" fill="${c}" opacity="${o}" filter="url(#${id}b)"/>`)
    .join("");
  const dots = Array.from({ length: speckles }, () => `<circle cx="${f(r(20, w - 20))}" cy="${f(r(20, h - 20))}" r="${f(r(1, 4))}" fill="${colors[0][0]}" opacity="${f(r(0.3, 0.8))}"/>`).join("");
  const defs =
    `<filter id="${id}b" x="-30%" y="-30%" width="160%" height="160%">` +
    `<feTurbulence type="fractalNoise" baseFrequency=".018" numOctaves="3" seed="${Math.round(r(1, 99))}"/>` +
    `<feDisplacementMap in="SourceGraphic" scale="46"/><feGaussianBlur stdDeviation="5"/></filter>`;
  return svg(w, h, `<g>${blobs}</g>${dots}`, defs);
}
files["wc-blush"] = watercolor("wb", [
  ["#e8b4b0", 0.55],
  ["#f0c9c2", 0.6],
  ["#d99a98", 0.35],
]);
files["wc-sage"] = watercolor("ws", [
  ["#b5c4a5", 0.55],
  ["#cad5bd", 0.6],
  ["#9fb08e", 0.35],
]);
files["wc-lavender"] = watercolor("wl", [
  ["#c7bbdc", 0.55],
  ["#d8cfe7", 0.6],
  ["#b3a4cf", 0.35],
]);
files["wc-gold"] = watercolor(
  "wg",
  [
    ["#d9bf8f", 0.5],
    ["#e8d5ae", 0.55],
    ["#c4a46c", 0.35],
  ],
  { speckles: 40 },
);

// ---------- Акценты ----------
files["monogram-ring"] = svg(
  260,
  260,
  `<circle cx="130" cy="130" r="96" fill="none" stroke="${GOLD}" stroke-width="1.4"/><circle cx="130" cy="130" r="88" fill="none" stroke="${GOLD}" stroke-width=".7" opacity=".7"/>` +
    laurel(130, 130, 108, 105, 240, {}, 9) +
    laurel(130, 130, 108, 75, -60, {}, 9),
);
files["ribbon-banner"] = svg(
  360,
  110,
  `<path d="M40 30 H320 L300 55 L320 80 H40 L60 55Z" fill="${GOLD_LIGHT}" opacity=".35"/>` +
    `<path d="M70 20 Q180 44 290 20 V70 Q180 94 70 70Z" fill="#f4ead8" stroke="${GOLD}" stroke-width="1.3"/>` +
    `<path d="M40 30 H70 M40 80 H70 M290 30 H320 M290 80 H320" stroke="${GOLD}" stroke-width="1"/>`,
);
const star = (x, y, s, o = 1) =>
  `<path transform="translate(${f(x)} ${f(y)}) scale(${f(s)})" d="M0 -10 L2 -2 L10 0 L2 2 L0 10 L-2 2 L-10 0 L-2 -2Z" fill="${GOLD}" opacity="${o}"/>`;
files["stars-gold"] = svg(
  300,
  220,
  Array.from({ length: 16 }, () => star(r(20, 280), r(20, 200), r(0.3, 1.3), f(r(0.5, 1)))).join("") +
    Array.from({ length: 30 }, () => `<circle cx="${f(r(10, 290))}" cy="${f(r(10, 210))}" r="${f(r(0.8, 2))}" fill="${GOLD_LIGHT}"/>`).join(""),
);
files["hearts-cluster"] = svg(
  240,
  200,
  Array.from({ length: 9 }, (_, i) => heart(r(30, 210), r(40, 180), r(0.6, 1.8), i % 3 ? "#d99a98" : GOLD)).join(""),
);

// ---------- Путешествие и море (шаблоны «Посадочный талон», «Морской берег»), шоколадный сургуч ----------
// Самолёт — контур lucide «plane» (ISC), нос смотрит вправо-вверх.
const PLANE =
  "M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z";
const CREAM_GOLD = "#dccaa4";
files["plane-route"] = svg(
  360,
  110,
  `<path d="M8 92 C70 26 132 104 196 66 S300 20 330 30" fill="none" stroke="${CREAM_GOLD}" stroke-width="1.6" stroke-dasharray="6 7" stroke-linecap="round"/>` +
    `<g transform="translate(340 26) rotate(28) scale(1.25) translate(-12 -12)"><path d="${PLANE}" fill="${CREAM_GOLD}" stroke="${CREAM_GOLD}" stroke-width="1.2" stroke-linejoin="round"/></g>`,
);
files["divider-wave"] = svg(
  400,
  60,
  `<path d="M2 42 C58 6 110 8 168 30 S292 60 398 16" fill="none" stroke="#c8a598" stroke-width="1.3" stroke-linecap="round"/>` +
    `<path d="M40 46 C92 20 140 22 190 38" fill="none" stroke="#c8a598" stroke-width=".7" stroke-linecap="round" opacity=".6"/>`,
);

/** Жемчужина: перламутр с розовым отливом, блик и мягкая тень. */
const pearlDefs =
  `<radialGradient id="pg" cx="36%" cy="32%" r="72%"><stop offset="0" stop-color="#ffffff"/><stop offset=".32" stop-color="#fbf6f1"/><stop offset=".72" stop-color="#e8d8ce"/><stop offset="1" stop-color="#c9b1a4"/></radialGradient>` +
  `<radialGradient id="pgi" cx="70%" cy="78%" r="55%"><stop offset="0" stop-color="#f1cfd0" stop-opacity=".8"/><stop offset="1" stop-color="#f1cfd0" stop-opacity="0"/></radialGradient>` +
  `<filter id="pgs" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.4"/></filter>`;
const pearl = (x, y, rr) =>
  `<ellipse cx="${f(x + rr * 0.18)}" cy="${f(y + rr * 0.86)}" rx="${f(rr * 0.92)}" ry="${f(rr * 0.34)}" fill="#8a6a5c" opacity=".22" filter="url(#pgs)"/>` +
  `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rr)}" fill="url(#pg)"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(rr)}" fill="url(#pgi)"/>` +
  `<ellipse cx="${f(x - rr * 0.33)}" cy="${f(y - rr * 0.38)}" rx="${f(rr * 0.24)}" ry="${f(rr * 0.14)}" fill="#fff" opacity=".92" transform="rotate(-32 ${f(x - rr * 0.33)} ${f(y - rr * 0.38)})"/>`;
files["pearls"] = svg(
  170,
  140,
  [
    [70, 74, 24],
    [112, 64, 17],
    [98, 102, 13],
    [42, 108, 11],
    [134, 94, 9],
    [76, 38, 9],
    [30, 76, 6],
    [142, 42, 5],
  ]
    .map(([x, y, rr]) => pearl(x, y, rr))
    .join(""),
  pearlDefs,
);
files["pearl-strand"] = svg(
  380,
  140,
  `<path d="M14 36 Q190 150 366 46" fill="none" stroke="#bfa89c" stroke-width=".8"/>` +
    along([14, 36], [190, 150], [366, 46], 26)
      .map(({ x, y, t }) => pearl(x, y, 7.4 + 1.6 * Math.sin(t * Math.PI)))
      .join(""),
  pearlDefs,
);

/** Сургучная печать: неровная капля золотистого воска, выдавленное кольцо и веточка. */
files["wax-seal"] = svg(
  220,
  220,
  `<g filter="url(#wsh)"><circle cx="110" cy="110" r="88" fill="url(#wsg)" filter="url(#wsb)"/></g>` +
    `<circle cx="110" cy="110" r="60" fill="url(#wsi)"/>` +
    `<circle cx="110" cy="110" r="60" fill="none" stroke="#7a5526" stroke-width="3" opacity=".45"/>` +
    `<circle cx="109" cy="109" r="60" fill="none" stroke="#f6e0b0" stroke-width="1.2" opacity=".7"/>` +
    `<g transform="translate(111 111)" opacity=".55">${branch([-34, 26], [-6, 8], [30, -30], { n: 7, len: 17, w: 8, style: { fill: "none", stroke: "#6e4b20", sw: 1.4, vein: false } })}</g>` +
    `<g transform="translate(109.4 109.4)" opacity=".45">${branch([-34, 26], [-6, 8], [30, -30], { n: 7, len: 17, w: 8, style: { fill: "none", stroke: "#fbe7bd", sw: 0.8, vein: false } })}</g>`,
  `<radialGradient id="wsg" cx="40%" cy="34%" r="70%"><stop offset="0" stop-color="#ecd29b"/><stop offset=".55" stop-color="#c79d5a"/><stop offset="1" stop-color="#8d6531"/></radialGradient>` +
    `<radialGradient id="wsi" cx="58%" cy="62%" r="70%"><stop offset="0" stop-color="#d9b675"/><stop offset="1" stop-color="#a77d41"/></radialGradient>` +
    `<filter id="wsb" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="11"/><feDisplacementMap in="SourceGraphic" scale="16"/></filter>` +
    `<filter id="wsh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#3b2a1f" flood-opacity=".35"/></filter>`,
);

for (const [name, content] of Object.entries(files)) writeFileSync(join(out, `${name}.svg`), content);
console.log(`Сгенерировано ${Object.keys(files).length} файлов в ${out}`);
