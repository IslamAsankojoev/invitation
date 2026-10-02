// Готовит фактуру для фона блока (public/library/surfaces/*.webp).
//
//   node scripts/surface-texture.mjs tint  <фото> <out.webp> [сила=10]   — серая «подкрашиваемая» фактура
//   node scripts/surface-texture.mjs color <фото> <out.webp>              — цветная (камень), как есть
//
// tint: убирает цвет и перепады освещения фотографии, среднюю яркость ставит почти в белый (≈242), а
// разброс — в «силу» (стандартное отклонение в уровнях 0–255). На странице фактура кладётся на цвет палитры
// через multiply, поэтому одна картинка подходит любой палитре.
// Источник и лицензию каждой фактуры записывай в public/library/CREDITS.md.
import sharp from "sharp";

const [, , mode, input, output, STRENGTH = "10"] = process.argv;
const SIZE = 1024;

if (mode === "color") {
  await sharp(input).resize(SIZE, SIZE, { fit: "cover" }).webp({ quality: 80, effort: 6 }).toFile(output);
} else {
  const base = sharp(input).resize(SIZE, SIZE, { fit: "cover" }).greyscale();
  const g = await base.clone().raw().toBuffer();
  // Освещение — сильно размытая копия; делим на неё, чтобы осталась только фактура.
  const light = await base.clone().blur(SIZE / 10).raw().toBuffer();
  const flat = new Float32Array(g.length);
  let sum = 0;
  for (let i = 0; i < g.length; i++) sum += flat[i] = g[i] / Math.max(1, light[i]);
  const mean = sum / g.length;
  let sq = 0;
  for (let i = 0; i < g.length; i++) sq += (flat[i] - mean) ** 2;
  const std = Math.sqrt(sq / g.length) || 1;
  const k = +STRENGTH / std;
  const out = Buffer.alloc(g.length);
  for (let i = 0; i < g.length; i++) out[i] = Math.max(0, Math.min(255, Math.round(242 + (flat[i] - mean) * k)));
  await sharp(out, { raw: { width: SIZE, height: SIZE, channels: 1 } }).webp({ quality: 78, effort: 6 }).toFile(output);
}
console.log(output);
