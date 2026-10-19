"use client";

import {
  Camera,
  CameraOff,
  Download,
  ImageDown,
  Link2,
  Mic,
  MicOff,
  Music,
  RotateCcw,
  Send,
  Share2,
  Ticket,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  beatPulse,
  bubbleCorner,
  formatTimer,
  partyThemes,
  pickRecordingMime,
  rubberBand,
  STORY_MAX_MS,
  videoExtension,
  type Bounds,
  type PartyTheme,
  type PartyThemeId,
} from "@/lib/party";
import { telegramShareUrl, whatsappShareUrl } from "@/lib/share";
import { createBeat, type Beat } from "./beat";
import styles from "./party.module.css";
import { drawCameraBubble, drawScene, type SceneFonts } from "./scenes";

type Mode = "invite" | "going";
type Phase = "idle" | "countdown" | "recording" | "review";
type CameraState = "off" | "requesting" | "on" | "denied";
type Result = { url: string; blob: Blob; type: string; ms: number };

type Props = {
  theme: PartyTheme;
  onTheme: (id: PartyThemeId) => void;
  mode: Mode;
  onMode: (mode: Mode) => void;
  fonts: SceneFonts;
  guest: { name: string; number: number };
  inviteUrl: string;
  onOpenPass: () => void;
};

/** Радиус кружка камеры — доля ширины кадра. */
const R = 0.13;
const RY = R * (9 / 16);
/** Центр кружка — только в «безопасной» зоне сторис: верх и низ закрывает интерфейс Instagram. */
const BOUNDS: Bounds = { minX: R + 0.045, maxX: 1 - R - 0.045, minY: 0.135 + RY + 0.01, maxY: 0.82 - RY - 0.01 };
const SAFE_TOP = 0.135;
const SAFE_BOTTOM = 0.18;
const TRANSITION_MS = 450;

const easeOut = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 4);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function StoryStudio({ theme, onTheme, mode, onMode, fonts, guest, inviteUrl, onOpenPass }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [count, setCount] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [camera, setCamera] = useState<CameraState>("off");
  const [micOn, setMicOn] = useState(true);
  const [musicOn, setMusicOn] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [previewMuted, setPreviewMuted] = useState(false);
  const [ready, setReady] = useState(false);

  // Значения для цикла отрисовки — в ref, чтобы rAF не перезапускался на каждый рендер.
  const live = useRef({ theme, mode, reduced: false, recording: false, camera: false, musicOn });
  useLayoutEffect(() => {
    live.current.theme = theme;
    live.current.mode = mode;
    live.current.camera = camera === "on";
    live.current.musicOn = musicOn;
  }, [theme, mode, camera, musicOn]);

  const sceneStart = useRef(0);
  const beatZero = useRef(0);
  const transition = useRef<{ snap: HTMLCanvasElement; start: number } | null>(null);
  // Сначала кружок справа внизу: справа вверху его закрывают кнопки студии.
  const bubble = useRef({ x: BOUNDS.maxX, y: BOUNDS.maxY, vx: 0, vy: 0, tx: BOUNDS.maxX, ty: BOUNDS.maxY, dragging: false, pid: -1, ox: 0, oy: 0, rawX: 0, rawY: 0, lastT: 0 });

  const streamRef = useRef<MediaStream | null>(null);
  const audio = useRef<{ ac: AudioContext; rec: MediaStreamAudioDestinationNode; mic: GainNode; beat: Beat | null } | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelled = useRef(false);

  /** Снимок текущего кадра — он растворяется поверх новой афиши (смена темы или режима). */
  const crossfade = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;
    const snap = document.createElement("canvas");
    snap.width = canvas.width;
    snap.height = canvas.height;
    snap.getContext("2d")?.drawImage(canvas, 0, 0);
    transition.current = { snap, start: performance.now() };
    sceneStart.current = performance.now();
  }, [ready]);

  // Шрифты canvas не подгружает сам: ждём их, потом запускаем вступление с начала.
  useEffect(() => {
    let alive = true;
    const families = [fonts.display, fonts.mono, fonts.serif, fonts.script, fonts.sans];
    const loads = families.flatMap((f) => [document.fonts.load(`700 40px ${f}`), document.fonts.load(`italic 700 40px ${f}`)]);
    Promise.race([Promise.allSettled(loads), wait(2500)]).then(() => {
      if (!alive) return;
      sceneStart.current = performance.now();
      beatZero.current = performance.now();
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [fonts]);

  // «Уменьшить движение»: фон стоит, надписи только проявляются.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => (live.current.reduced = mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Цикл отрисовки: афиша → растворение старого кадра → кружок камеры (пружиной к своему углу).
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !ready) return;
    const big = window.innerWidth * window.devicePixelRatio >= 1000;
    canvas.width = big ? 1080 : 720;
    canvas.height = big ? 1920 : 1280;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const L = live.current;
      const { width: w, height: h } = canvas;
      const beat = beatPulse((now - beatZero.current) / 1000, L.theme.bpm);
      drawScene(ctx, L.theme, { t: (now - sceneStart.current) / 1000, beat, w, h, mode: L.mode, guest, reduced: L.reduced, fonts });

      const tr = transition.current;
      if (tr) {
        const p = (now - tr.start) / TRANSITION_MS;
        if (p >= 1 || L.reduced) transition.current = null;
        else {
          const s = 1 + 0.04 * easeOut(p);
          ctx.save();
          ctx.globalAlpha = 1 - easeOut(p);
          ctx.translate(w / 2, h / 2);
          ctx.scale(s, s);
          ctx.drawImage(tr.snap, -w / 2, -h / 2, w, h);
          ctx.restore();
        }
      }

      // Пружина с лёгким перелётом: кружок «садится» в угол, как картинка-в-картинке в FaceTime.
      const b = bubble.current;
      if (!b.dragging) {
        if (L.reduced) {
          b.x = b.tx;
          b.y = b.ty;
        } else {
          const k = 320;
          const c = 2 * Math.sqrt(k) * 0.78;
          b.vx += (k * (b.tx - b.x) - c * b.vx) * dt;
          b.vy += (k * (b.ty - b.y) - c * b.vy) * dt;
          b.x += b.vx * dt;
          b.y += b.vy * dt;
        }
      }
      const video = videoRef.current;
      if (L.camera && video && video.readyState >= 2)
        drawCameraBubble(ctx, video, b.x * w, b.y * h, R * w, L.theme.colors.accent, L.recording, beat);

      const el = handleRef.current;
      if (el) {
        const cw = canvas.clientWidth;
        const ch = canvas.clientHeight;
        el.style.transform = `translate3d(${b.x * cw - R * cw}px, ${b.y * ch - R * cw}px, 0)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ready, fonts, guest]);

  // Смена темы или режима — растворение и вступление заново; у бита — свой темп.
  const prevKey = useRef(`${theme.id}|${mode}`);
  useEffect(() => {
    const key = `${theme.id}|${mode}`;
    if (key === prevKey.current) return;
    const themeChanged = !prevKey.current.startsWith(`${theme.id}|`);
    prevKey.current = key;
    crossfade();
    if (themeChanged && audio.current?.beat) startBeat();
    // startBeat читает только ref — в зависимостях не нужен.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme.id, mode, crossfade]);

  // Выбранная тема всегда видна в ленте (в том числе после «Я иду» из пропуска).
  const chipsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const chip = chipsRef.current?.querySelector<HTMLElement>('[aria-checked="true"]');
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    chip?.scrollIntoView({ inline: "center", block: "nearest", behavior: smooth ? "smooth" : "auto" });
  }, [theme.id]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  // Уход со страницы — камера и звук выключаются, ссылки на видео освобождаются.
  useEffect(
    () => () => {
      cancelled.current = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audio.current?.beat?.stop();
      audio.current?.ac.close();
      if (stopTimer.current) clearTimeout(stopTimer.current);
    },
    [],
  );
  useEffect(() => () => void (result && URL.revokeObjectURL(result.url)), [result]);

  /** AudioContext — только после нажатия (иначе браузер его не запустит). */
  function ensureAudio() {
    if (audio.current) {
      void audio.current.ac.resume();
      return audio.current;
    }
    const ac = new AudioContext();
    const rec = ac.createMediaStreamDestination();
    const mic = ac.createGain();
    mic.gain.value = micOn ? 1 : 0;
    mic.connect(rec);
    audio.current = { ac, rec, mic, beat: null };
    return audio.current;
  }

  function startBeat() {
    const a = audio.current;
    if (!a) return;
    a.beat?.stop();
    a.beat?.output.disconnect();
    const beat = createBeat(a.ac, live.current.theme.id, live.current.theme.bpm);
    beat.output.connect(a.ac.destination);
    beat.output.connect(a.rec);
    a.beat = beat;
    beatZero.current = beat.start();
  }

  function stopBeat() {
    audio.current?.beat?.stop();
    audio.current?.beat?.output.disconnect();
    if (audio.current) audio.current.beat = null;
  }

  /** Первое нажатие где угодно в студии включает бит (если не выключен) — автозапуск звука браузеры запрещают. */
  function onFirstGesture() {
    if (musicOn && !audio.current?.beat) {
      ensureAudio();
      startBeat();
    }
  }

  function toggleMusic() {
    const next = !musicOn;
    setMusicOn(next);
    if (next) {
      ensureAudio();
      startBeat();
    } else stopBeat();
  }

  async function toggleCamera() {
    if (camera === "on") {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setCamera("off");
      return;
    }
    setCamera("requesting");
    const video = { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } };
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video, audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      // Микрофон запретили — кружок всё равно можно, просто без голоса.
      stream = await navigator.mediaDevices.getUserMedia({ video }).catch(() => null);
    }
    if (!stream) {
      setCamera("denied");
      setNotice("Нет доступа к камере — запишем афишу без кружка");
      return;
    }
    streamRef.current = stream;
    const el = videoRef.current;
    if (el) {
      el.srcObject = new MediaStream(stream.getVideoTracks());
      await el.play().catch(() => {});
    }
    const track = stream.getAudioTracks()[0];
    if (track) {
      const a = ensureAudio();
      a.ac.createMediaStreamSource(new MediaStream([track])).connect(a.mic);
    } else setMicOn(false);
    setCamera("on");
  }

  function toggleMic() {
    const next = !micOn;
    setMicOn(next);
    if (audio.current) audio.current.mic.gain.value = next ? 1 : 0;
  }

  async function startRecording() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (typeof MediaRecorder === "undefined" || typeof canvas.captureStream !== "function") {
      setNotice("Этот браузер не умеет записывать видео — сохраните картинку");
      return;
    }
    const a = ensureAudio();
    cancelled.current = false;
    setPhase("countdown");
    for (const n of [3, 2, 1]) {
      setCount(n);
      await wait(700);
      if (cancelled.current) return;
    }

    // Запись начинается со вступления афиши и с первой доли бита.
    sceneStart.current = performance.now();
    transition.current = null;
    if (live.current.musicOn) startBeat();
    const stream = canvas.captureStream(30);
    a.rec.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    const mime = pickRecordingMime((m) => MediaRecorder.isTypeSupported(m));
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 8_000_000 } : undefined);
    } catch {
      setPhase("idle");
      setNotice("Не получилось начать запись — сохраните картинку");
      return;
    }
    const chunks: Blob[] = [];
    const startedAt = performance.now();
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      stream.getVideoTracks().forEach((t) => t.stop());
      live.current.recording = false;
      if (cancelled.current) return;
      const type = rec.mimeType || mime || "video/webm";
      const blob = new Blob(chunks, { type });
      setResult({ url: URL.createObjectURL(blob), blob, type, ms: performance.now() - startedAt });
      setPreviewMuted(false);
      setPhase("review");
    };
    recorder.current = rec;
    rec.start(250);
    live.current.recording = true;
    setElapsed(0);
    setPhase("recording");
    stopTimer.current = setTimeout(stopRecording, STORY_MAX_MS);
  }

  function stopRecording() {
    if (stopTimer.current) clearTimeout(stopTimer.current);
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  function cancelCountdown() {
    cancelled.current = true;
    setPhase("idle");
  }

  useEffect(() => {
    if (phase !== "recording") return;
    const started = performance.now();
    const id = setInterval(() => setElapsed(performance.now() - started), 200);
    return () => clearInterval(id);
  }, [phase]);

  function onRecordPress() {
    if (phase === "idle") void startRecording();
    else if (phase === "countdown") cancelCountdown();
    else if (phase === "recording") stopRecording();
  }

  function retake() {
    setResult(null);
    setPhase("idle");
    sceneStart.current = performance.now();
  }

  function download(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /** Системное меню «Поделиться» с файлом: на телефоне в нём есть Instagram → «История». Нет — скачиваем. */
  async function shareFile(blob: Blob, name: string) {
    const file = new File([blob], name, { type: blob.type.split(";")[0] });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: theme.event.kicker });
      } catch (e) {
        if ((e as DOMException).name !== "AbortError") download(blob, name);
      }
    } else download(blob, name);
  }

  function savePoster() {
    canvasRef.current?.toBlob((blob) => blob && void shareFile(blob, `keleber-${theme.id}.png`), "image/png");
  }

  // Перетаскивание кружка: захват указателя, скорость по последним движениям, бросок → угол по инерции.
  function toNorm(e: React.PointerEvent) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
  }
  function onBubbleDown(e: React.PointerEvent<HTMLButtonElement>) {
    const b = bubble.current;
    if (b.dragging) return; // второй палец не перехватывает перетаскивание
    // Захват пропал (отпустили за окном, системный жест) — onLostPointerCapture всё равно отпустит кружок.
    e.currentTarget.setPointerCapture(e.pointerId);
    const n = toNorm(e);
    Object.assign(b, { dragging: true, pid: e.pointerId, ox: n.x - b.x, oy: n.y - b.y, rawX: b.x, rawY: b.y, vx: 0, vy: 0, lastT: performance.now() });
    setDragging(true);
  }
  function onBubbleMove(e: React.PointerEvent<HTMLButtonElement>) {
    const b = bubble.current;
    if (!b.dragging || e.pointerId !== b.pid) return;
    const n = toNorm(e);
    const now = performance.now();
    const dt = Math.max(8, now - b.lastT) / 1000;
    const rx = n.x - b.ox;
    const ry = n.y - b.oy;
    b.vx = 0.7 * ((rx - b.rawX) / dt) + 0.3 * b.vx;
    b.vy = 0.7 * ((ry - b.rawY) / dt) + 0.3 * b.vy;
    b.rawX = rx;
    b.rawY = ry;
    b.lastT = now;
    b.x = rubberBand(rx, BOUNDS.minX, BOUNDS.maxX);
    b.y = rubberBand(ry, BOUNDS.minY, BOUNDS.maxY);
  }
  function onBubbleUp(e: React.PointerEvent<HTMLButtonElement>) {
    const b = bubble.current;
    if (!b.dragging || e.pointerId !== b.pid) return;
    b.dragging = false;
    // Палец остановился перед отпусканием — бросок не считаем.
    if (performance.now() - b.lastT > 80) b.vx = b.vy = 0;
    const c = bubbleCorner({ x: b.x, y: b.y }, { x: b.vx, y: b.vy }, BOUNDS);
    b.tx = c.x;
    b.ty = c.y;
    setDragging(false);
  }
  /** Стрелки переносят кружок в угол сразу, без анимации — действие с клавиатуры. */
  function onBubbleKey(e: React.KeyboardEvent) {
    const b = bubble.current;
    const moves: Record<string, () => void> = {
      ArrowLeft: () => (b.tx = BOUNDS.minX),
      ArrowRight: () => (b.tx = BOUNDS.maxX),
      ArrowUp: () => (b.ty = BOUNDS.minY),
      ArrowDown: () => (b.ty = BOUNDS.maxY),
    };
    if (!moves[e.key]) return;
    e.preventDefault();
    moves[e.key]();
    Object.assign(b, { x: b.tx, y: b.ty, vx: 0, vy: 0 });
  }

  const busy = phase === "countdown" || phase === "recording";
  const message = `${theme.event.kicker} · ${theme.event.host}\n\n${inviteUrl}`;
  const status =
    phase === "countdown" ? `Запись через ${count}` : phase === "recording" ? `Идёт запись, ${formatTimer(elapsed)}` : phase === "review" ? "Сторис готова" : "";

  return (
    <div className={styles.stage} style={{ "--stage-bg": theme.colors.stage, "--stage-glow": theme.colors.accent2 } as React.CSSProperties} onClickCapture={onFirstGesture}>
      <div className={styles.frame} data-busy={busy || undefined}>
        <canvas ref={canvasRef} className="absolute inset-0 size-full" role="img" aria-label={`Афиша «${theme.label}»: ${theme.event.title.replace("\n", " ")}`} />
        <video ref={videoRef} className="hidden" muted playsInline />

        <div className={styles.guides} data-show={dragging || undefined} aria-hidden="true">
          <div style={{ height: `${SAFE_TOP * 100}%` }}>Здесь интерфейс Instagram</div>
          <div style={{ height: `${SAFE_BOTTOM * 100}%` }}>Здесь поле ответа</div>
        </div>

        {camera === "on" && (
          <button
            ref={handleRef}
            type="button"
            className={styles.bubbleHandle}
            aria-label="Кружок камеры: перетащите или переместите стрелками в угол"
            onPointerDown={onBubbleDown}
            onPointerMove={onBubbleMove}
            onPointerUp={onBubbleUp}
            onPointerCancel={onBubbleUp}
            onLostPointerCapture={onBubbleUp}
            onKeyDown={onBubbleKey}
          />
        )}

        {/* Верх: режим афиши и переключатели. Во время записи прячется — в кадре только афиша. */}
        <div className={styles.hud} data-hidden={busy || undefined}>
          <div className={styles.segmented} role="radiogroup" aria-label="Что показать">
            {(
              [
                ["invite", "Афиша"],
                ["going", "Я иду"],
              ] as const
            ).map(([value, label]) => (
              <button key={value} type="button" role="radio" aria-checked={mode === value} className={styles.segment} onClick={() => onMode(value)}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2.5">
            <button type="button" className={styles.iconBtn} aria-pressed={musicOn} aria-label={musicOn ? "Выключить бит" : "Включить бит"} onClick={toggleMusic}>
              {musicOn ? <Music aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
            </button>
            <button
              type="button"
              className={styles.iconBtn}
              aria-pressed={camera === "on"}
              aria-label={camera === "on" ? "Убрать кружок с камерой" : "Добавить кружок с камерой"}
              disabled={camera === "requesting"}
              onClick={toggleCamera}
            >
              {camera === "on" ? <Camera aria-hidden="true" /> : <CameraOff aria-hidden="true" />}
            </button>
            {camera === "on" && (
              <button type="button" className={styles.iconBtn} aria-pressed={micOn} aria-label={micOn ? "Выключить микрофон" : "Включить микрофон"} onClick={toggleMic}>
                {micOn ? <Mic aria-hidden="true" /> : <MicOff aria-hidden="true" />}
              </button>
            )}
            <button type="button" className={styles.iconBtn} aria-label="Проиграть афишу заново" onClick={() => (sceneStart.current = performance.now())}>
              <RotateCcw aria-hidden="true" />
            </button>
          </div>
        </div>

        {phase === "recording" && (
          <div className={styles.recPill}>
            <span className={styles.recDot} aria-hidden="true" />
            {formatTimer(elapsed)} / {formatTimer(STORY_MAX_MS)}
          </div>
        )}

        {phase === "countdown" && (
          <div className={styles.countdown} aria-hidden="true">
            <span key={count}>{count}</span>
          </div>
        )}

        {notice && (
          <div className={styles.notice} role="status">
            {notice}
          </div>
        )}

      </div>

      {/* Низ: темы и кнопка записи — под кадром, чтобы не закрывать афишу. */}
      <div className={styles.dock}>
        <div ref={chipsRef} className={styles.chips} data-hidden={busy || undefined} role="radiogroup" aria-label="Тема вечеринки">
          {partyThemes.map((t) => (
            <button key={t.id} type="button" role="radio" aria-checked={t.id === theme.id} className={styles.chip} onClick={() => onTheme(t.id)}>
              <span className={styles.swatch} style={{ background: `linear-gradient(135deg, ${t.colors.accent}, ${t.colors.accent2})` }} aria-hidden="true" />
              <span className="flex flex-col items-start leading-tight">
                <span className="text-[13px] font-semibold">{t.label}</span>
                <span className="text-[11px] opacity-70">{t.mood}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between px-6">
          <button type="button" className={styles.sideBtn} data-hidden={busy || undefined} aria-label="Сохранить картинку афиши" onClick={savePoster}>
            <ImageDown aria-hidden="true" />
            <span>Картинка</span>
          </button>
          <button
            type="button"
            className={styles.record}
            data-state={phase}
            aria-label={phase === "recording" ? "Остановить запись" : phase === "countdown" ? "Отменить запись" : "Записать сторис"}
            onClick={onRecordPress}
          >
            <svg viewBox="0 0 84 84" className={styles.recordRing} aria-hidden="true">
              <circle cx="42" cy="42" r="39" />
              <circle cx="42" cy="42" r="39" className={styles.recordProgress} style={{ animationDuration: `${STORY_MAX_MS}ms` }} />
            </svg>
            <span className={styles.recordInner} aria-hidden="true" />
          </button>
          <button type="button" className={styles.sideBtn} data-hidden={busy || undefined} aria-label="Открыть пропуск" onClick={onOpenPass}>
            <Ticket aria-hidden="true" />
            <span>Пропуск</span>
          </button>
        </div>
      </div>

      <div className="sr-only" role="status" aria-live="polite">
        {status}
      </div>

      {/* Готовая сторис: шторка снизу. */}
      <div className={styles.scrim} data-open={phase === "review" || undefined} onClick={retake} aria-hidden="true" />
      <section className={styles.sheet} data-open={phase === "review" || undefined} aria-label="Готовая сторис" aria-hidden={phase !== "review"}>
        <div className={styles.grabber} aria-hidden="true" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Сторис готова</h2>
            <p className="text-sm text-white/60">
              {result ? `${formatTimer(result.ms)} · ${videoExtension(result.type).toUpperCase()}` : ""} · {camera === "on" ? "с кружком" : "без кружка"}
            </p>
          </div>
          <button type="button" className={styles.closeBtn} aria-label="Закрыть и переснять" onClick={retake}>
            <X aria-hidden="true" />
          </button>
        </div>
        {result && (
          <div className="relative mx-auto mt-3 w-[min(46vw,200px)]">
            <video src={result.url} autoPlay loop playsInline muted={previewMuted} className="aspect-[9/16] w-full rounded-2xl bg-black object-cover" />
            <button
              type="button"
              className={`${styles.iconBtn} absolute right-2 bottom-2`}
              aria-label={previewMuted ? "Включить звук" : "Выключить звук"}
              onClick={() => setPreviewMuted((m) => !m)}
            >
              {previewMuted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
            </button>
          </div>
        )}
        <button type="button" className={styles.primary} onClick={() => result && void shareFile(result.blob, `keleber-${theme.id}.${videoExtension(result.type)}`)}>
          <Share2 aria-hidden="true" />
          Поделиться в сторис
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={styles.secondary} onClick={() => result && download(result.blob, `keleber-${theme.id}.${videoExtension(result.type)}`)}>
            <Download aria-hidden="true" />
            Сохранить
          </button>
          <button type="button" className={styles.secondary} onClick={retake}>
            <RotateCcw aria-hidden="true" />
            Переснять
          </button>
        </div>
        <div className={styles.tip}>
          <p>
            В Instagram добавьте стикер <b>«Ссылка»</b> — по нему гости попросят пропуск.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <CopyLink url={inviteUrl} />
            <a className={styles.pill} href={whatsappShareUrl(message)} target="_blank" rel="noopener">
              <Send aria-hidden="true" />
              WhatsApp
            </a>
            <a className={styles.pill} href={telegramShareUrl(inviteUrl, message)} target="_blank" rel="noopener">
              <Send aria-hidden="true" />
              Telegram
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <>
      <button
        type="button"
        className={styles.pill}
        onClick={async () => {
          await navigator.clipboard.writeText(url).catch(() => {});
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }}
      >
        <Link2 aria-hidden="true" />
        {copied ? "Скопировано" : "Ссылка"}
      </button>
      <span className="sr-only" role="status">
        {copied ? "Скопировано" : ""}
      </span>
    </>
  );
}
