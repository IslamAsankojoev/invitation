// Вырезает растение со скана старинной гравюры/акварели для библиотеки (public/library/bot-*.webp):
// бумага → прозрачность (с вычищением её оттенка из краёв), подписи и мусор → прочь, обрезка, WebP ≤ 900 px.
//
//   node scripts/botanical-cutout.mjs <скан.jpg> <out.webp> [t0=16] [t1=48] [keep=0.12]
//
// Переменные окружения (подбираются по листу, смотри результат на светлом и тёмном фоне):
//   CROP=0.05    срезать поля листа с каждой стороны (рамки, края скана)
//   BOTTOM=0.1   дополнительно срезать снизу (подписи под рисунком)
//   CLOSE=0.012  радиус «закрытия» силуэта для заливки белил внутри цветка (доля ширины)
//   FILL=all     заливать внутри силуэта всё, а не только то, что светлее бумаги (кремовые пятна!)
//   JOIN=0.004   насколько склеивать части растения (больше — подписи тоже приклеятся)
// Лицензию и источник каждого листа записывай в public/library/CREDITS.md.
import sharp from "sharp";

const [, , input, output, T0 = "16", T1 = "48", KEEP = "0.12"] = process.argv;
const t0 = +T0, t1 = +T1, keepRatio = +KEEP;

// CROP — поля листа (доля с каждой стороны), BOTTOM — дополнительно срезать снизу (подписи).
const meta = await sharp(input).metadata();
const cm = +(process.env.CROP ?? 0), cb = +(process.env.BOTTOM ?? 0);
const img = sharp(input).rotate().removeAlpha().extract({
  left: Math.round(meta.width * cm), top: Math.round(meta.height * cm),
  width: Math.round(meta.width * (1 - 2 * cm)), height: Math.round(meta.height * (1 - 2 * cm - cb)),
});
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const px = (i) => [data[i * 3], data[i * 3 + 1], data[i * 3 + 2]];

// Цвет бумаги — медиана по полосе у краёв. Фон неравномерный, поэтому берём ещё и локальный фон:
// сильно размытая картинка, где тёмные (не бумажные) места заменены цветом бумаги.
const border = [];
const m = Math.round(Math.min(W, H) * 0.03);
for (let y = 0; y < H; y += 3) for (let x = 0; x < W; x += 3) {
  if (x < m || y < m || x >= W - m || y >= H - m) border.push(px(y * W + x));
}
const med = [0, 1, 2].map((c) => border.map((p) => p[c]).sort((a, b) => a - b)[border.length >> 1]);

const dist = (a, b) => Math.sqrt(0.3 * (a[0] - b[0]) ** 2 + 0.59 * (a[1] - b[1]) ** 2 + 0.11 * (a[2] - b[2]) ** 2) * 1.6;

// Локальный фон: пиксели, близкие к бумаге, как есть; остальные — медиана бумаги; затем сильное размытие.
const bgSrc = Buffer.alloc(W * H * 3);
for (let i = 0; i < W * H; i++) {
  const p = px(i);
  const q = dist(p, med) < t1 ? p : med;
  bgSrc[i * 3] = q[0]; bgSrc[i * 3 + 1] = q[1]; bgSrc[i * 3 + 2] = q[2];
}
const bg = await sharp(bgSrc, { raw: { width: W, height: H, channels: 3 } }).blur(Math.max(W, H) / 60).raw().toBuffer();

// Альфа по расстоянию до локального фона (плавный переход t0..t1).
const alpha = new Float32Array(W * H);
for (let i = 0; i < W * H; i++) {
  const d = dist(px(i), [bg[i * 3], bg[i * 3 + 1], bg[i * 3 + 2]]);
  const t = Math.min(1, Math.max(0, (d - t0) / (t1 - t0)));
  alpha[i] = t * t * (3 - 2 * t);
}

// Маска на половинном разрешении.
const S = 2, w = Math.ceil(W / S), h = Math.ceil(H / S);
const fg = new Uint8Array(w * h);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (alpha[y * W + x] > 0.35) fg[((y / S) | 0) * w + ((x / S) | 0)] = 1;

// Квадратное расширение (разделимое — быстро).
function dilate(src, r) {
  const tmp = new Uint8Array(w * h), dst = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) { let run = -1e9; for (let x = 0; x < w; x++) { if (src[y * w + x]) run = x; if (x - run <= r) tmp[y * w + x] = 1; }
    run = 1e9; for (let x = w - 1; x >= 0; x--) { if (src[y * w + x]) run = x; if (run - x <= r) tmp[y * w + x] = 1; } }
  for (let x = 0; x < w; x++) { let run = -1e9; for (let y = 0; y < h; y++) { if (tmp[y * w + x]) run = y; if (y - run <= r) dst[y * w + x] = 1; }
    run = 1e9; for (let y = h - 1; y >= 0; y--) { if (tmp[y * w + x]) run = y; if (run - y <= r) dst[y * w + x] = 1; } }
  return dst;
}
function flood(mask, seeds) {
  const lab = new Int32Array(w * h), areas = [0];
  for (const i of seeds) {
    if (!mask[i] || lab[i]) continue;
    const id = areas.length; let area = 0; const st = [i]; lab[i] = id;
    while (st.length) { const j = st.pop(); area += fg[j]; const x = j % w, y = (j / w) | 0;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) { const k = ny * w + nx;
        if (nx >= 0 && nx < w && ny >= 0 && ny < h && mask[k] && !lab[k]) { lab[k] = id; st.push(k); } } }
    areas.push(area);
  }
  return { lab, areas };
}

// 1) Части растения: слабое расширение, чтобы буквы подписи остались отдельными мелкими областями.
const joined = dilate(fg, Math.max(1, Math.round(w * +(process.env.JOIN ?? 0.004))));
const { lab, areas } = flood(joined, Array.from({ length: w * h }, (_, i) => i));
const biggest = Math.max(...areas);
const keepIds = new Set(areas.map((a, id) => (a >= biggest * keepRatio ? id : -1)).filter((id) => id > 0));
const kept = new Uint8Array(w * h);
for (let i = 0; i < w * h; i++) kept[i] = fg[i] && keepIds.has(lab[i]) ? 1 : 0;

// 2) Заливка пустот: всё, что закрыто силуэтом (после «закрытия» на r2), считается растением — белые лепестки.
const r2 = Math.max(2, Math.round(w * +(process.env.CLOSE ?? 0.012)));
const closedFg = dilate(kept, r2);
const notFg = closedFg.map((v) => 1 - v);
const edge = [];
for (let x = 0; x < w; x++) edge.push(x, (h - 1) * w + x);
for (let y = 0; y < h; y++) edge.push(y * w, y * w + w - 1);
const outside = flood(notFg, edge).lab.map((v) => (v ? 1 : 0));
const outsideGrown = dilate(outside, r2);
const inside = new Uint8Array(w * h);
for (let i = 0; i < w * h; i++) inside[i] = outsideGrown[i] ? 0 : 1;
const keepZone = dilate(kept, 1);
if (process.env.DEBUG) console.log("fg", fg.reduce((a, b) => a + b, 0), "kept", kept.reduce((a, b) => a + b, 0), "inside", inside.reduce((a, b) => a + b, 0), "of", w * h);
const insideSoft = await sharp(Buffer.from(inside.map((v) => v * 255)), { raw: { width: w, height: h, channels: 1 } })
  .resize(W, H, { fit: "fill" }).blur(1.2).toColourspace("b-w").raw().toBuffer();
const zoneFull = await sharp(Buffer.from(keepZone.map((v, i) => (v || inside[i]) * 255)), { raw: { width: w, height: h, channels: 1 } })
  .resize(W, H, { fit: "fill" }).toColourspace("b-w").raw().toBuffer();

// Итоговые пиксели: «вычищаем» цвет бумаги из полупрозрачных краёв, чтобы не было светлого ореола.
const out = Buffer.alloc(W * H * 4);
let minX = W, minY = H, maxX = 0, maxY = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x;
  // Внутри силуэта заливаем только то, что светлее бумаги (белила лепестков), а не саму бумагу между листьями.
  const q = px(i), lum = 0.3 * q[0] + 0.59 * q[1] + 0.11 * q[2];
  const bl = 0.3 * bg[i * 3] + 0.59 * bg[i * 3 + 1] + 0.11 * bg[i * 3 + 2];
  const lift = process.env.FILL === "all" ? 1 : Math.min(1, Math.max(0, (lum - bl - 3) / 10));
  let a = zoneFull[i] > 127 ? Math.max(alpha[i], (insideSoft[i] / 255) * lift) : 0;
  if (a < 0.03) a = 0;
  const p = px(i);
  for (let c = 0; c < 3; c++) {
    const b = bg[i * 3 + c];
    out[i * 4 + c] = a > 0 ? Math.min(255, Math.max(0, Math.round((p[c] - (1 - a) * b) / a))) : 0;
  }
  out[i * 4 + 3] = Math.round(a * 255);
  if (a > 0.2) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
}
const pad = Math.round(Math.max(W, H) * 0.01);
const left = Math.max(0, minX - pad), top = Math.max(0, minY - pad);
const cw = Math.min(W, maxX + pad) - left, ch = Math.min(H, maxY + pad) - top;

await sharp(out, { raw: { width: W, height: H, channels: 4 } })
  .extract({ left, top, width: cw, height: ch })
  .resize({ width: 900, height: 900, fit: "inside", withoutEnlargement: true })
  .webp({ quality: 82, alphaQuality: 90, effort: 6 })
  .toFile(output);
console.log(output, `${cw}x${ch}`, "paper", med.join(","), "parts", keepIds.size);
