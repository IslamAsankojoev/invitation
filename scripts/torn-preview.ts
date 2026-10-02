// Превью рваного края (lib/tornEdge.ts) для подбора рисунка: каждое зерно — на фото, тёмной и светлой заливке
// поверх фона страницы, в натуральном размере 2×. Правишь генератор — подними TORN_VERSION в lib/edges.ts.
//
//   npx tsx scripts/torn-preview.ts out.png [зерно…]      без зёрен — три случайных
import { existsSync } from "node:fs";
import sharp from "sharp";
import { tornStrips } from "../src/lib/tornEdge";

const [out = "torn-preview.png", ...args] = process.argv.slice(2);
const seeds = args.length ? args.map(Number) : [0, 1, 2].map(() => Math.floor(Math.random() * 2147483646));
const W = 1200;
const ROW = 220;
const page = { r: 239, g: 232, b: 220 };
const photo = "public/uploads/test-venue.jpg";

async function fills() {
  const cover = existsSync(photo)
    ? sharp(photo).resize(W, ROW, { fit: "cover" })
    : sharp({ create: { width: W, height: ROW, channels: 3, background: "#6b7d5c" } });
  return [
    cover,
    sharp({ create: { width: W, height: ROW, channels: 3, background: "#1f2a44" } }),
    sharp({ create: { width: W, height: ROW, channels: 3, background: "#fbf8f1" } }),
  ];
}

async function main() {
  const rows: Buffer[] = [];
  for (const seed of seeds) {
    const { width, height, mask, paper } = tornStrips(seed);
    const paperPng = await sharp(paper, { raw: { width, height, channels: 4 } }).png().toBuffer();
    for (const fill of await fills()) {
      // Окрашенный слой: сплошной, в полосе края — по маске.
      const px = await fill.ensureAlpha().raw().toBuffer();
      const y0 = ROW - height;
      for (let y = 0; y < height; y++) for (let x = 0; x < W; x++) px[((y + y0) * W + x) * 4 + 3] = mask[(y * W + x) * 4 + 3];
      const layer = await sharp(px, { raw: { width: W, height: ROW, channels: 4 } }).png().toBuffer();
      rows.push(
        await sharp({ create: { width: W, height: ROW, channels: 3, background: page } })
          .composite([{ input: paperPng, left: 0, top: y0 }, { input: layer, left: 0, top: 0 }])
          .png()
          .toBuffer(),
      );
    }
  }
  await sharp({ create: { width: W, height: rows.length * (ROW + 16), channels: 3, background: page } })
    .composite(rows.map((input, i) => ({ input, left: 0, top: i * (ROW + 16) })))
    .png()
    .toFile(out);
  console.log(`${out}: зёрна ${seeds.join(", ")}`);
}

main();
