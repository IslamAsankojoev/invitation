import { NextResponse } from "next/server";
import sharp from "sharp";
import { tornStrips } from "@/lib/tornEdge";

/**
 * Полосы рваного края блока по зерну: GET /api/edges/torn?seed=…&side=top|bottom&layer=mask|paper&v=…
 * Картинка — чистая функция параметров, поэтому кэшируется навсегда (версия генератора — в v, см. TORN_VERSION).
 * Первый запрос зерна ~0.1 с (генерация и сжатие всех четырёх картинок), дальше — из памяти.
 */
const SIDES = ["top", "bottom"] as const;
const LAYERS = ["mask", "paper"] as const;
const MAX_CACHED = 400;

/** Готовые картинки «зерно:сторона:слой» (Map хранит порядок вставки — вытесняем самые старые). */
const cache = new Map<string, Buffer>();
/** Зерна, которые считаются прямо сейчас: маска и сердцевина приходят почти одновременно — считаем один раз. */
const pending = new Map<number, Promise<Map<string, Buffer>>>();

async function render(seed: number) {
  const { width, height, mask, paper } = tornStrips(seed);
  const encode = (pixels: Uint8Array, flip: boolean, lossless: boolean) => {
    const img = sharp(pixels, { raw: { width, height, channels: 4 } });
    return (flip ? img.flip() : img).webp(lossless ? { lossless: true, effort: 2 } : { quality: 88, alphaQuality: 90, effort: 2 }).toBuffer();
  };
  const entries = await Promise.all(
    SIDES.flatMap((side) =>
      LAYERS.map(async (layer) => [`${seed}:${side}:${layer}`, await encode(layer === "mask" ? mask : paper, side === "top", layer === "mask")] as const),
    ),
  );
  for (const [key, buf] of entries) cache.set(key, buf);
  while (cache.size > MAX_CACHED) cache.delete(cache.keys().next().value!);
  return new Map(entries);
}

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const raw = params.get("seed") ?? "";
  const seed = Number(raw);
  const side = params.get("side") as (typeof SIDES)[number];
  const layer = params.get("layer") as (typeof LAYERS)[number];
  if (!/^\d{1,10}$/.test(raw) || seed > 2147483646 || !SIDES.includes(side) || !LAYERS.includes(layer)) {
    return NextResponse.json({ error: "Нужны seed (0…2147483646), side (top|bottom), layer (mask|paper)" }, { status: 400 });
  }
  const key = `${seed}:${side}:${layer}`;
  let body = cache.get(key);
  if (!body) {
    let job = pending.get(seed);
    if (!job) {
      job = render(seed).finally(() => pending.delete(seed));
      pending.set(seed, job);
    }
    // Берём из результата, а не из кэша: его могли уже потеснить другие зёрна.
    body = (await job).get(key)!;
  }
  return new Response(new Uint8Array(body), {
    headers: { "content-type": "image/webp", "cache-control": "public, max-age=31536000, immutable" },
  });
}
