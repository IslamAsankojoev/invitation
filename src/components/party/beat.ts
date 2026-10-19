import type { PartyThemeId } from "@/lib/party";

/**
 * Бит для афиши — синтезатор на Web Audio, а не песня: прав на треки нет, а свой бит знает темп, и афиша
 * пульсирует ровно в такт. Ноты ставятся с запасом ~0.12 с вперёд (setInterval сам по себе неточен).
 */

type Pattern = {
  /** Шаги 0…15 (шестнадцатые такта). */
  kick: number[];
  clap: number[];
  hat: number[];
  openHat: number[];
  bass: number[];
  /** Корень баса по тактам, Гц. */
  roots: number[];
  octaveBass?: boolean;
  bassCutoff: number;
};

const A1 = 55;
const F1 = 43.65;
const G1 = 49;
const D2 = 73.42;
const C2 = 65.41;
const E1 = 41.2;

const patterns: Record<PartyThemeId, Pattern> = {
  neon: {
    kick: [0, 4, 8, 12],
    clap: [4, 12],
    hat: [2, 6, 10, 14],
    openHat: [],
    bass: [1, 3, 5, 7, 9, 11, 13, 15],
    roots: [A1, A1, F1, G1],
    bassCutoff: 700,
  },
  disco: {
    kick: [0, 4, 8, 12],
    clap: [4, 12],
    hat: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    openHat: [2, 6, 10, 14],
    bass: [0, 2, 4, 6, 8, 10, 12, 14],
    roots: [D2, D2, C2, C2],
    octaveBass: true,
    bassCutoff: 1400,
  },
  masquerade: {
    kick: [0, 7, 10],
    clap: [4, 12],
    hat: [2, 6, 10, 14],
    openHat: [],
    bass: [0, 10],
    roots: [E1, E1, C2 / 2, G1],
    bassCutoff: 380,
  },
  y2k: {
    kick: [0, 4, 8, 12],
    clap: [4, 12],
    hat: [2, 6, 10, 14],
    openHat: [14],
    bass: [2, 6, 10, 14, 15],
    roots: [A1 * 1.5, A1 * 1.5, F1 * 1.5, G1 * 1.5],
    bassCutoff: 1100,
  },
};

export type Beat = {
  /** Выход бита: его подключают к колонкам и к дорожке записи. */
  output: GainNode;
  /** Запускает бит; возвращает performance.now() первой доли — по нему пульсирует афиша. */
  start: () => number;
  stop: () => void;
};

let noise: AudioBuffer | null = null;

function noiseBuffer(ac: BaseAudioContext) {
  if (noise && noise.sampleRate === ac.sampleRate) return noise;
  noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return noise;
}

function envelope(ac: BaseAudioContext, out: AudioNode, t: number, peak: number, decay: number) {
  const g = ac.createGain();
  g.gain.setValueAtTime(peak, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  g.connect(out);
  return g;
}

function kick(ac: BaseAudioContext, out: AudioNode, t: number) {
  const o = ac.createOscillator();
  o.frequency.setValueAtTime(160, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
  o.connect(envelope(ac, out, t, 1, 0.38));
  o.start(t);
  o.stop(t + 0.4);
}

function noiseHit(ac: BaseAudioContext, out: AudioNode, t: number, type: BiquadFilterType, freq: number, peak: number, decay: number) {
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac);
  const f = ac.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  src.connect(f);
  f.connect(envelope(ac, out, t, peak, decay));
  src.start(t, Math.random() * 0.5);
  src.stop(t + decay + 0.02);
}

function bassNote(ac: BaseAudioContext, out: AudioNode, t: number, freq: number, len: number, cutoff: number) {
  const o = ac.createOscillator();
  o.type = "sawtooth";
  o.frequency.value = freq;
  const f = ac.createBiquadFilter();
  f.type = "lowpass";
  f.Q.value = 7;
  f.frequency.setValueAtTime(cutoff * 2, t);
  f.frequency.exponentialRampToValueAtTime(cutoff * 0.4, t + len);
  o.connect(f);
  f.connect(envelope(ac, out, t, 0.32, len));
  o.start(t);
  o.stop(t + len + 0.02);
}

export function createBeat(ac: AudioContext, theme: PartyThemeId, bpm: number): Beat {
  const p = patterns[theme];
  const output = ac.createGain();
  output.gain.value = 0.7;
  const comp = ac.createDynamicsCompressor();
  comp.connect(output);
  const stepDur = 60 / bpm / 4;
  let timer: ReturnType<typeof setInterval> | null = null;
  let step = 0;
  let next = 0;

  function schedule() {
    while (next < ac.currentTime + 0.12) {
      const s = step % 16;
      const bar = Math.floor(step / 16) % p.roots.length;
      if (p.kick.includes(s)) kick(ac, comp, next);
      if (p.clap.includes(s)) noiseHit(ac, comp, next, "bandpass", 1500, 0.55, 0.16);
      if (p.hat.includes(s)) noiseHit(ac, comp, next, "highpass", 8000, 0.22, 0.045);
      if (p.openHat.includes(s)) noiseHit(ac, comp, next, "highpass", 7000, 0.18, 0.22);
      if (p.bass.includes(s)) {
        const octave = p.octaveBass && s % 4 === 2 ? 2 : 1;
        bassNote(ac, comp, next, p.roots[bar] * octave, stepDur * 1.6, p.bassCutoff);
      }
      next += stepDur;
      step++;
    }
  }

  return {
    output,
    start() {
      if (timer) clearInterval(timer);
      step = 0;
      next = ac.currentTime + 0.06;
      const zero = performance.now() + 60;
      schedule();
      timer = setInterval(schedule, 25);
      return zero;
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
    },
  };
}
