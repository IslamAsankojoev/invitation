/**
 * Фрагмент песни приглашения (music.start / music.end, секунды): какой кусок трека играет и что делать на его
 * конце. Чистые функции — их используют плеер приглашения (useInvitationMusic) и редактор «Музыки».
 */

/** Короче фрагмент не сделать — иначе повтор превратится в заикание. */
export const MIN_FRAGMENT = 3;
/** За сколько секунд до конца фрагмента громкость начинает плавно убывать — всегда, что бы ни звучало в этот момент. */
export const FADE_OUT = 1.5;

export type Fragment = { start: number; end: number };

/** Границы фрагмента для трека длиной duration: в пределах трека, конец не раньше начала + MIN_FRAGMENT. */
export function fragmentOf(music: { start?: number; end?: number | null }, duration: number): Fragment {
  if (!Number.isFinite(duration) || duration <= 0) return { start: music.start ?? 0, end: music.end ?? Infinity };
  const start = Math.min(Math.max(0, music.start ?? 0), Math.max(0, duration - MIN_FRAGMENT));
  const end = music.end == null ? duration : Math.min(duration, Math.max(start + MIN_FRAGMENT, music.end));
  return { start, end };
}

/** Выбран весь трек (фрагмента нет). */
export const isWholeTrack = (music: { start?: number; end?: number | null }) => !music.start && music.end == null;

/** Что делать плееру в момент time: дошли до конца фрагмента — к началу (повтор) или остановиться. */
export function fragmentStep(time: number, f: Fragment, loop: boolean): "restart" | "stop" | null {
  if (time < f.end - 0.05) return null;
  return loop ? "restart" : "stop";
}

/** Громкость у конца фрагмента: 1, а за FADE_OUT секунд до конца — плавно к 0. */
export function fadeOutVolume(time: number, f: Fragment): number {
  const left = f.end - time;
  if (!Number.isFinite(left) || left >= FADE_OUT) return 1;
  return Math.max(0, left / FADE_OUT);
}

/** 83.4 → «1:23». */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Пики волны: трек делится на bars кусков, в каждом — максимум |сэмпла|, нормировано к самому громкому (0–1). */
export function computePeaks(samples: Float32Array, bars: number): number[] {
  const size = Math.max(1, Math.floor(samples.length / bars));
  const peaks = Array.from({ length: bars }, (_, b) => {
    let max = 0;
    const from = b * size;
    // Каждый 4-й сэмпл: на миллионах сэмплов разница не видна, а считается в 4 раза быстрее.
    for (let i = from; i < Math.min(samples.length, from + size); i += 4) max = Math.max(max, Math.abs(samples[i]));
    return max;
  });
  const top = Math.max(...peaks, 1e-6);
  return peaks.map((p) => p / top);
}

/** Шаг ручек фрагмента, секунды. */
export const FRAGMENT_STEP = 0.5;
const snap = (t: number) => Math.round(t / FRAGMENT_STEP) * FRAGMENT_STEP;

/**
 * Новое положение ручки фрагмента (перетаскивание или клавиши): шаг 0.5 с, в пределах трека, между ручками —
 * не меньше MIN_FRAGMENT. end = null — до конца трека (если ручку довели до конца).
 */
export function moveHandle(f: Fragment, which: "start" | "end", time: number, duration: number): { start: number; end: number | null } {
  if (which === "start") {
    const start = Math.min(Math.max(0, snap(time)), f.end - MIN_FRAGMENT);
    return { start, end: f.end >= duration ? null : f.end };
  }
  const end = Math.max(Math.min(duration, snap(time)), f.start + MIN_FRAGMENT);
  return { start: f.start, end: end >= duration - FRAGMENT_STEP / 2 ? null : end };
}

/** 100.4 → «01:40» — как часы аудиоредактора (минуты двумя цифрами). */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Риски шкалы времени: шаг 15 с у коротких песен, 30 с — до 6 минут, дальше 60 с; без 0 и конца. */
export function timeTicks(duration: number): number[] {
  if (!Number.isFinite(duration) || duration <= 0) return [];
  const step = duration <= 90 ? 15 : duration <= 360 ? 30 : 60;
  const ticks: number[] = [];
  for (let t = step; t < duration - step / 3; t += step) ticks.push(t);
  return ticks;
}

/**
 * Контур волны для SVG (viewBox «0 0 peaks.length 100»): сверху — пики вверх от середины, снизу — зеркально.
 * Сплошная симметричная фигура, как в аудиоредакторах.
 */
export function wavePath(peaks: number[]): string {
  const h = (p: number) => Math.max(0.6, p * 46);
  const top = peaks.map((p, i) => `${i + 0.5},${(50 - h(p)).toFixed(2)}`);
  const bottom = peaks.map((p, i) => `${i + 0.5},${(50 + h(p)).toFixed(2)}`).reverse();
  return `M0,50 L${top.join(" L")} L${peaks.length},50 L${bottom.join(" L")} Z`;
}
