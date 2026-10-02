/**
 * Генератор рваного края бумаги (края блока «Рваная бумага», lib/edges.ts): по зерну — всегда новый обрыв.
 * Чистая функция без зависимостей: одно зерно → те же пиксели (сервер отдаёт их через /api/edges/torn).
 *
 * Полоса для НИЖНЕГО края (бумага сверху, верхний край — её отражение), бесшовная по горизонтали:
 *   mask  — силуэт окрашенного слоя (альфа): где кончаются фото/заливка блока;
 *   paper — белая сердцевина бумаги на разрыве: кромка переменной ширины, волокна и ворс, лёгкая тень.
 *           Лежит ПОД окрашенным слоем и видна только полоской вдоль разрыва.
 * Что повторено от настоящего разрыва:
 *   - силуэт — крупные пологие изгибы + «броуновские» ступеньки и косые участки + мелкая зазубренность;
 *   - у бумаги с печатью окрашенный слой рвётся короче сердцевины — вдоль края белая кромка, шире на косых
 *     участках, с языками цвета и белыми выкусами; внешний край ворсистый (ворс ложится вдоль края —
 *     длинные зубцы вниз читаются как сосульки);
 *   - тонкая кромка чуть просвечивает и лежит на соседнем слое с мягкой тенью (свет сверху).
 * Размер: 1200×96 px = 600×48 CSS px при 2×; силуэты и волокна — с супер-сэмплингом 4×. ~70 мс на зерно.
 */
export const TORN_W = 1200;
export const TORN_H = 96;
// Правишь рисунок — подними TORN_VERSION в lib/edges.ts: картинки кэшируются навсегда по URL.

const W = TORN_W;
const H = TORN_H;
const SS = 4;
const WS = W * SS;
const HS = H * SS;

type Rng = () => number;
type Fn1 = (x: number) => number;

function mulberry32(seed: number): Rng {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = (rng: Rng) => Math.sqrt(-2 * Math.log(rng() || 1e-9)) * Math.cos(2 * Math.PI * rng());
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const wrap = (i: number, n: number) => ((i % n) + n) % n;

/** Периодический шум: n опорных точек на период, сглаженный (Catmull-Rom) или ломаный (linear), −1..1. */
function noise1(rng: Rng, n: number, kind: "smooth" | "linear" = "smooth"): Fn1 {
  const v = Float64Array.from({ length: n }, () => rng() * 2 - 1);
  return (x) => {
    const u = wrap((x / W) * n, n);
    const i = Math.floor(u);
    const t = u - i;
    const a = v[i];
    const b = v[(i + 1) % n];
    if (kind === "linear") return a + (b - a) * t;
    const p = v[(i - 1 + n) % n];
    const q = v[(i + 2) % n];
    return 0.5 * (2 * a + (-p + b) * t + (2 * p - 5 * a + 4 * b - q) * t * t + (-p + 3 * a - 3 * b + q) * t * t * t);
  };
}

/** Периодическое броуновское блуждание со случайными скачками — ступеньки и косые участки разрыва, ±1. */
function brownian(rng: Rng, n: number, jumpP: number, jump: number): Fn1 {
  const inc: number[] = [];
  for (let i = 0; i < n; i++) {
    let g = gauss(rng);
    if (rng() < jumpP) g += (rng() < 0.5 ? -1 : 1) * jump * (0.6 + rng());
    inc.push(g);
  }
  const mean = inc.reduce((a, b) => a + b, 0) / n;
  const c = new Float64Array(n);
  let acc = 0;
  for (let i = 0; i < n; i++) {
    c[i] = acc;
    acc += inc[i] - mean; // сумма приращений = 0 → блуждание замыкается в период
  }
  const avg = c.reduce((a, b) => a + b, 0) / n;
  let max = 0;
  for (const x of c) max = Math.max(max, Math.abs(x - avg));
  for (let i = 0; i < n; i++) c[i] = (c[i] - avg) / (max || 1);
  return (x) => {
    const u = wrap((x / W) * n, n);
    const i = Math.floor(u);
    return c[i] + (c[(i + 1) % n] - c[i]) * (u - i);
  };
}

/** Выступы в одну сторону: частые мелкие, редкие — крупнее (r^power); smooth — округлые бугорки, иначе зубчики. */
function spikes(rng: Rng, n: number, power: number, height: number, smooth = false): Fn1 {
  const v = Float64Array.from({ length: n }, () => rng() ** power * height);
  return (x) => {
    const u = wrap((x / W) * n, n);
    const i = Math.floor(u);
    const t = u - i;
    const k = smooth ? t * t * (3 - 2 * t) : t;
    return v[i] + (v[(i + 1) % n] - v[i]) * k;
  };
}

/** Периодический 2D-шум (0..1) на сетке cellX×cellY — зерно и волокнистость кромки. */
function noise2(rng: Rng, cellX: number, cellY: number) {
  const nx = Math.round(W / cellX);
  const ny = Math.ceil(H / cellY) + 2;
  const g = Float64Array.from({ length: nx * ny }, () => rng());
  const s = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number) => {
    const u = wrap(x / (W / nx), nx);
    const v = y / cellY;
    const i = Math.floor(u);
    const j = Math.min(ny - 2, Math.floor(v));
    const tx = s(u - i);
    const ty = s(clamp(v - j, 0, 1));
    const a = g[j * nx + i];
    const b = g[j * nx + ((i + 1) % nx)];
    const c = g[(j + 1) * nx + i];
    const d = g[(j + 1) * nx + ((i + 1) % nx)];
    return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
  };
}

/** Доля пикселя выше кривой (кривая задана в субстолбцах 4×), с субстроками 4×. */
function coverage(edge: Float64Array) {
  const a = new Float32Array(W * H);
  for (let x = 0; x < W; x++) {
    for (let sx = 0; sx < SS; sx++) {
      const e = edge[x * SS + sx];
      for (let y = 0; y < H; y++) {
        const rows = clamp(Math.ceil((e - y) * SS - 0.5), 0, SS);
        if (rows) a[y * W + x] += rows / (SS * SS);
      }
    }
  }
  return a;
}

/** Мазок кисти в буфер 4×: мягкий круг, альфа — максимум (волокна не «копятся» в пятна). */
function splat(buf: Float32Array, cx: number, cy: number, r: number, alpha: number) {
  const R = Math.max(r, 0.7);
  for (let yy = Math.floor(cy - R - 1); yy <= Math.ceil(cy + R + 1); yy++) {
    if (yy < 0 || yy >= HS) continue;
    for (let xx = Math.floor(cx - R - 1); xx <= Math.ceil(cx + R + 1); xx++) {
      const dx = xx + 0.5 - cx;
      const dy = yy + 0.5 - cy;
      const cov = clamp(R + 0.5 - Math.sqrt(dx * dx + dy * dy), 0, 1);
      if (cov <= 0) continue;
      const i = yy * WS + wrap(xx, WS);
      buf[i] = Math.max(buf[i], alpha * cov);
    }
  }
}

/** Волокно: слегка изогнутая нить, к кончику тоньше и прозрачнее (координаты — px полосы). */
function fiber(buf: Float32Array, x0: number, y0: number, angle: number, len: number, curl: number, thick: number, alpha: number) {
  let x = x0;
  let y = y0;
  let a = angle;
  for (let s = 0; s <= len; s += 0.2) {
    const k = s / len;
    splat(buf, x * SS, y * SS, ((thick * SS) / 2) * (1 - 0.45 * k), alpha * (1 - 0.65 * k));
    x += Math.cos(a) * 0.2;
    y += Math.sin(a) * 0.2;
    a += curl * 0.2;
  }
}

/** Гауссово размытие буфера W×H (по x — с переносом: полоса бесшовная). */
function blur(src: Float32Array, sigma: number) {
  const r = Math.ceil(sigma * 3);
  const k = Array.from({ length: 2 * r + 1 }, (_, i) => Math.exp(-((i - r) ** 2) / (2 * sigma * sigma)));
  const sum = k.reduce((a, b) => a + b, 0);
  const tmp = new Float32Array(W * H);
  const out = new Float32Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let acc = 0;
      for (let i = -r; i <= r; i++) acc += src[y * W + wrap(x + i, W)] * k[i + r];
      tmp[y * W + x] = acc / sum;
    }
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let acc = 0;
      let ks = 0;
      for (let i = -r; i <= r; i++) {
        const yy = y + i;
        if (yy < 0 || yy >= H) continue;
        acc += tmp[yy * W + x] * k[i + r];
        ks += k[i + r];
      }
      out[y * W + x] = acc / ks;
    }
  return out;
}

export type TornStrips = { width: number; height: number; mask: Uint8Array; paper: Uint8Array };

/** Нормализует зерно к 0…2³¹−1 (так же проверяет его и API). */
export const normalizeSeed = (seed: number) => Math.abs(Math.trunc(seed)) % 2147483647;

/** Полосы рваного края по зерну (RGBA, для нижнего края). */
export function tornStrips(seed: number): TornStrips {
  const rng = mulberry32(normalizeSeed(seed) ^ 0x5bd1e995);
  // Характер обрыва тоже из зерна: размах, ступеньки, зазубренность, ширина кромки, ворс.
  const v = {
    amp: 12 + 10 * rng(),
    mid: 0.7 + 0.8 * rng(),
    fine: 0.85 + 0.4 * rng(),
    band: 0.75 + 0.65 * rng(),
    spikes: 0.8 + 0.5 * rng(),
  };
  const Y0 = 42; // средняя линия разрыва
  const sub = (i: number) => (i + 0.5) / SS;

  // Силуэт: крупные изгибы + ступеньки; затем приводим к размаху ±amp.
  const m1 = noise1(rng, 3);
  const m2 = noise1(rng, 7);
  const m3 = noise1(rng, 15);
  const br = brownian(rng, 90, 0.08, 3.2);
  const raw = Float64Array.from({ length: WS }, (_, i) => {
    const x = sub(i);
    return m1(x) + 0.55 * m2(x) + 0.3 * m3(x) + 0.45 * v.mid * br(x);
  });
  let lo = Infinity;
  let hi = -Infinity;
  for (const r of raw) {
    lo = Math.min(lo, r);
    hi = Math.max(hi, r);
  }
  const base = raw.map((r) => Y0 + ((r - (lo + hi) / 2) / ((hi - lo) / 2 || 1)) * v.amp);

  // Мелкая зазубренность; внешний край — с мелкой неровностью (без длинных зубцов вниз).
  const f1 = noise1(rng, 190, "linear");
  const f2 = noise1(rng, 460, "linear");
  const sp = spikes(rng, 700, 4, 1.6);
  const smooth = Float64Array.from({ length: WS }, (_, i) => base[i] + v.fine * (0.9 * f1(sub(i)) + 0.5 * f2(sub(i))));
  const outer = Float64Array.from({ length: WS }, (_, i) => smooth[i] + v.spikes * sp(sub(i)));

  // Окрашенный слой рвётся короче: кромка сердцевины переменной ширины, шире на косых участках;
  // край окрашенного слоя рваный — языки цвета и белые выкусы.
  const b1 = noise1(rng, 11);
  const b2 = noise1(rng, 31);
  const b3 = noise1(rng, 70, "linear");
  const j0 = noise1(rng, 60);
  const j1 = noise1(rng, 150, "linear");
  const j2 = noise1(rng, 380, "linear");
  const tongues = spikes(rng, 130, 5, 3.5, true);
  const bites = spikes(rng, 170, 7, 3, true);
  const inner = Float64Array.from({ length: WS }, (_, i) => {
    const x = sub(i);
    const B = clamp(0.45 + 0.45 * b1(x) + 0.3 * b2(x) + 0.15 * b3(x), 0, 1);
    const slope = Math.abs(base[wrap(i + 8, WS)] - base[wrap(i - 8, WS)]) / (16 / SS);
    const band = v.band * (2.2 + 11 * B ** 1.8) + 5 * Math.min(1, slope);
    const y = smooth[i] - band + 1.5 * j0(x) + 0.7 * j1(x) + 0.45 * j2(x) + tongues(x) - bites(x);
    return clamp(Math.min(y, smooth[i] - 0.8), 5, H);
  });

  // Волокна: длинные — редкие, тонкие и в разные стороны; ворс — частый, короткий, вдоль края.
  const fib = new Float32Array(WS * HS);
  const normalAt = (x: number) => {
    const i = wrap(Math.round(x * SS), WS);
    const s = (smooth[wrap(i + 6, WS)] - smooth[wrap(i - 6, WS)]) / (12 / SS);
    return Math.atan2(1, -s);
  };
  const edgeAt = (x: number) => smooth[wrap(Math.round(x * SS), WS)];
  for (let k = 0; k < 45; k++) {
    const x = rng() * W;
    fiber(fib, x, edgeAt(x) - 0.4 - rng() * 1.5, normalAt(x) + gauss(rng), 3 + 9 * rng() ** 2, gauss(rng) * 0.2, 0.3 + 0.3 * rng(), 0.3 + 0.35 * rng());
  }
  for (let k = 0; k < 1400; k++) {
    const x = rng() * W;
    const side = rng() < 0.5 ? -1 : 1;
    fiber(fib, x, edgeAt(x) - 0.2 - rng() * 0.9, normalAt(x) + side * (0.5 + rng() * 0.8), 0.5 + 1.3 * rng(), gauss(rng) * 0.3, 0.3 + 0.25 * rng(), 0.25 + 0.35 * rng());
  }
  const fibA = new Float32Array(W * H);
  for (let y = 0; y < HS; y++) {
    const row = ((y / SS) | 0) * W;
    for (let x = 0; x < WS; x++) fibA[row + ((x / SS) | 0)] += fib[y * WS + x] / (SS * SS);
  }

  const innerA = coverage(inner);
  const outerA = coverage(outer);
  const coreA = outerA.map((a, i) => 1 - (1 - a) * (1 - fibA[i]));
  // Тень — от силуэта сердцевины без ворса: волокна тени почти не дают.
  const shadow = blur(outerA, 2.6);
  const grainA = noise2(rng, 3.2, 1.1);
  const streak = noise2(rng, 0.9, 5); // волокна поперёк кромки
  const grainC = noise2(rng, 7, 5);

  const paper = new Uint8Array(W * H * 4);
  const mask = new Uint8Array(W * H * 4);
  const shade = [38, 30, 24];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const c = x * SS + SS / 2;
      const inn = inner[c];
      const out = smooth[c];
      const g = 0.35 * grainA(x, y) + 0.4 * streak(x, y) + 0.25 * grainC(x, y);

      // Сердцевина видна только ниже окрашенного слоя (с запасом 3 px под ним — без щелей).
      let a = coreA[i] * clamp((y + 0.5 - (inn - 3)) / 1.5, 0, 1);
      const d = out - (y + 0.5);
      if (d < 3) a *= 0.62 + 0.38 * clamp(d / 3, 0, 1); // тонкий край просвечивает
      a *= 0.8 + 0.2 * g;
      let L = 241 + 13 * g;
      const t = y + 0.5 - inn;
      if (t > -1 && t < 2) L -= 7 * (1 - clamp(t / 2, 0, 1)); // лёгкая тень от окрашенного слоя на кромке
      const rgb = [L, L - 2, L - 7];

      // Тень под бумагой — только снаружи края, чуть ниже.
      const sy = y - 2;
      const sA = sy >= 0 ? 0.26 * shadow[sy * W + x] * clamp(y + 0.5 - (out - 0.5), 0, 1) : 0;
      const A = a + sA * (1 - a);
      for (let ch = 0; ch < 3; ch++) paper[i * 4 + ch] = A > 0 ? Math.round((rgb[ch] * a + shade[ch] * sA * (1 - a)) / A) : 0;
      paper[i * 4 + 3] = Math.round(clamp(A, 0, 1) * 255);

      mask[i * 4] = mask[i * 4 + 1] = mask[i * 4 + 2] = 255;
      mask[i * 4 + 3] = Math.round(clamp(innerA[i], 0, 1) * 255);
    }
  return { width: W, height: H, mask, paper };
}
