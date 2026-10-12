/**
 * Очередь записи роликов для админки: по одному за раз (запись грузит процессор), скрипт scripts/template-video.mjs
 * в отдельном процессе. Состояние — в памяти сервера (globalThis — переживает перезагрузку модулей в dev).
 */
import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { videoFileName } from "./adminFiles";

export type VideoStage = "queued" | "open" | "record" | "encode" | "done" | "error" | "canceled";

export type VideoJob = {
  id: string;
  templateId: string;
  templateName: string;
  fullscreen: boolean;
  bg: string;
  /** С музыкой приглашения (скрипт с --audio). */
  sound: boolean;
  file: string;
  stage: VideoStage;
  /** Доля пролистанной страницы, 0–1. */
  progress: number;
  error?: string;
  /** Последние строки вывода скрипта — для сообщения об ошибке. */
  log: string[];
  createdAt: string;
  endedAt?: string;
};

export type VideoRequest = { templateId: string; templateName: string; fullscreen: boolean; bg: string; sound: boolean };

/** Как запустить запись (в тестах — подменяется). */
export type Runner = (args: string[]) => ChildProcess;

const defaultRunner: Runner = (args) =>
  spawn(process.execPath, [path.join(process.cwd(), "scripts/template-video.mjs"), ...args], { cwd: process.env.ADMIN_ROOT ?? process.cwd() });

type State = { jobs: VideoJob[]; child: ChildProcess | null; runner: Runner; base: string };
const g = globalThis as unknown as { __videoJobs?: State };
const state = (g.__videoJobs ??= { jobs: [], child: null, runner: defaultRunner, base: "http://localhost:3000" });

/** Сколько законченных задач помнить. */
const KEEP_FINISHED = 20;
const FINISHED: VideoStage[] = ["done", "error", "canceled"];

export const isFinished = (job: VideoJob) => FINISHED.includes(job.stage);

export function setRunner(runner: Runner | null) {
  state.runner = runner ?? defaultRunner;
}

/** Задачи: текущая и очередь — сверху по порядку, затем законченные (свежие сверху). */
export function listJobs(): VideoJob[] {
  const active = state.jobs.filter((j) => !isFinished(j));
  const done = state.jobs.filter(isFinished).sort((a, b) => (b.endedAt ?? "").localeCompare(a.endedAt ?? ""));
  return structuredClone([...active, ...done]);
}

/** Поставить ролики в очередь. base — адрес этого же сайта: скрипт снимает его страницу показа. */
export function enqueue(requests: VideoRequest[], base: string): VideoJob[] {
  state.base = base;
  const now = new Date();
  const jobs = requests.map((r, i): VideoJob => ({
    ...r,
    id: randomUUID(),
    // Секунды в имени разводим номером, чтобы «Записать все» не дал одинаковых имён.
    file: videoFileName(r.templateId, r.fullscreen, new Date(now.getTime() + i * 1000), r.sound),
    stage: "queued",
    progress: 0,
    log: [],
    createdAt: now.toISOString(),
  }));
  state.jobs.push(...jobs);
  pump();
  return structuredClone(jobs);
}

/** Отменить: из очереди — убрать, текущую — остановить процесс. */
export function cancel(id: string): boolean {
  const job = state.jobs.find((j) => j.id === id);
  if (!job || isFinished(job)) return false;
  job.error = "Остановлено";
  if (job.stage === "queued") finish(job, "canceled");
  // Текущая станет «canceled» в обработчике выхода процесса.
  else state.child?.kill("SIGTERM");
  return true;
}

function finish(job: VideoJob, stage: VideoStage, error?: string) {
  job.stage = stage;
  job.endedAt = new Date().toISOString();
  if (error) job.error = error;
  const finished = state.jobs.filter(isFinished);
  for (const old of finished.slice(0, Math.max(0, finished.length - KEEP_FINISHED))) state.jobs.splice(state.jobs.indexOf(old), 1);
}

function pump() {
  if (state.child) return;
  const job = state.jobs.find((j) => j.stage === "queued");
  if (!job) return;
  job.stage = "open";
  const args = [job.templateId, "--base", state.base, "--name", job.file, "--bg", job.bg, ...(job.fullscreen ? ["--fullscreen"] : []), ...(job.sound ? ["--audio"] : [])];
  let child: ChildProcess;
  try {
    child = state.runner(args);
  } catch (e) {
    finish(job, "error", e instanceof Error ? e.message : String(e));
    return pump();
  }
  state.child = child;
  const onLine = (line: string) => {
    const [tag, value] = line.split(" ");
    if (tag === "@stage" && (value === "open" || value === "record" || value === "encode")) job.stage = value;
    else if (tag === "@progress") job.progress = Math.max(job.progress, Number(value) || 0);
    else if (!line.startsWith("@") && line.trim()) job.log = [...job.log, line].slice(-12);
  };
  lines(child.stdout, onLine);
  lines(child.stderr, onLine);
  child.on("error", (e) => {
    job.log = [...job.log, e.message].slice(-12);
  });
  child.on("close", (code) => {
    state.child = null;
    if (job.error === "Остановлено") finish(job, "canceled");
    else if (code === 0) finish(job, "done");
    else finish(job, "error", lastError(job.log) ?? `Скрипт записи завершился с кодом ${code}`);
    pump();
  });
}

/** Вывод процесса построчно. */
function lines(stream: NodeJS.ReadableStream | null, onLine: (line: string) => void) {
  let rest = "";
  stream?.on("data", (chunk: Buffer) => {
    const parts = (rest + chunk.toString()).split("\n");
    rest = parts.pop() ?? "";
    parts.forEach(onLine);
  });
  stream?.on("end", () => rest && onLine(rest));
}

/** Понятная строка ошибки из вывода: «Error: …» скрипта, иначе последняя строка. */
const lastError = (log: string[]) => {
  const err = [...log].reverse().find((l) => /Error:/.test(l));
  return (err ?? log.at(-1))?.replace(/^.*?Error:\s*/, "").trim();
};
