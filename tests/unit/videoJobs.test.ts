import { spawn } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { cancel, enqueue, isFinished, listJobs, setRunner } from "@/lib/videoJobs";

/** Вместо скрипта записи — node с заданным выводом; аргументы запоминаем. */
function fakeRunner(script: string, calls: string[][]) {
  return (args: string[]) => {
    calls.push(args);
    return spawn(process.execPath, ["-e", script]);
  };
}

const waitFor = async (check: () => boolean, ms = 5000) => {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > ms) throw new Error("не дождались");
    await new Promise((r) => setTimeout(r, 20));
  }
};

const job = (templateId: string, sound = false) => ({ templateId, templateName: templateId, fullscreen: false, bg: "#1b2b27", sound });

afterEach(async () => {
  for (const j of listJobs()) if (!isFinished(j)) cancel(j.id);
  await waitFor(() => listJobs().every(isFinished));
  setRunner(null);
});

describe("очередь записи видео", () => {
  it("пишет по одному, передаёт шаблон, адрес сайта и имя файла; прогресс и этапы — из вывода скрипта", async () => {
    const calls: string[][] = [];
    setRunner(fakeRunner(`console.log("@stage record"); console.log("@progress 0.5"); setTimeout(() => console.log("@stage encode"), 50);`, calls));
    const [a, b] = enqueue([job("mocha"), job("lago")], "http://localhost:3001");
    expect(a.file).toMatch(/^mocha--.+\.mp4$/);
    expect(b.file).not.toBe(a.file.replace("mocha", "lago").replace(/\d\d\.mp4$/, ""));
    // Второй ждёт, пока идёт первый.
    expect(listJobs().find((j) => j.id === b.id)!.stage).toBe("queued");
    await waitFor(() => listJobs().filter((j) => [a.id, b.id].includes(j.id)).every((j) => j.stage === "done"));
    expect(calls[0]).toEqual(["mocha", "--base", "http://localhost:3001", "--name", a.file, "--bg", "#1b2b27"]);
    expect(calls[1][0]).toBe("lago");
    expect(listJobs().find((j) => j.id === a.id)!.progress).toBe(0.5);
  });

  it("со звуком — скрипт с --audio, в имени файла пометка --sound", async () => {
    const calls: string[][] = [];
    setRunner(fakeRunner(``, calls));
    const [a] = enqueue([job("mocha", true)], "http://localhost:3000");
    expect(a.file).toMatch(/^mocha--.+--sound\.mp4$/);
    await waitFor(() => listJobs().find((j) => j.id === a.id)!.stage === "done");
    expect(calls[0]).toContain("--audio");
  });

  it("ошибка скрипта — понятное сообщение из его вывода, очередь идёт дальше", async () => {
    const calls: string[][] = [];
    setRunner(fakeRunner(`console.error("Error: Нет SHOWCASE_KEY в .env"); process.exit(1);`, calls));
    const [a] = enqueue([job("mocha")], "http://localhost:3000");
    await waitFor(() => listJobs().find((j) => j.id === a.id)!.stage === "error");
    expect(listJobs().find((j) => j.id === a.id)!.error).toBe("Нет SHOWCASE_KEY в .env");
  });

  it("отмена: из очереди убирается сразу, текущая запись останавливается", async () => {
    setRunner(fakeRunner(`console.log("@stage record"); setTimeout(() => {}, 10000);`, []));
    const [a, b] = enqueue([job("mocha"), job("lago")], "http://localhost:3000");
    expect(cancel(b.id)).toBe(true);
    expect(listJobs().find((j) => j.id === b.id)!.stage).toBe("canceled");
    await waitFor(() => listJobs().find((j) => j.id === a.id)!.stage === "record");
    expect(cancel(a.id)).toBe(true);
    await waitFor(() => listJobs().find((j) => j.id === a.id)!.stage === "canceled");
    expect(cancel(a.id)).toBe(false);
  });
});
