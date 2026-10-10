// Видео шаблона для Instagram (Reels 9:16, 1080×1920): открывает скрытый показ /showcase/<ключ>/<шаблон>,
// нажимает на печать конверта и листает приглашение «пальцем» — как в эталонном ролике (замеры по кадрам):
// свайп 0,83 с, старт сразу на полной скорости, скорость гаснет как (1−t)^1,5 (путь 1−(1−t)^2,5), шаг — до начала
// следующего блока, но не больше ~1,05 экрана, пауза ~2,6 с; анкету заполняют (имя по буквам, «Приду», +2 гостя,
// «Подтвердить»). Звука нет (музыку добавлять в Instagram — права на песни из public/music не оформлены).
//
//   npm run video -- <шаблон…|all> [--base http://localhost:3000] [--out videos] [--fps 30] [--bg "#1b2b27"] [--fullscreen]
//
// По умолчанию — как в эталоне: телефон в рамке на тёмном фоне, экран 513×1133 в кадре 1080×1920 (вёрстка
// 390×862 CSS px). --fullscreen — приглашение на весь кадр (экран 405×720 CSS px).
//
// Нужны: запущенный сайт (npm run dev), SHOWCASE_KEY в .env, ffmpeg в PATH.
// Кадры снимаются screencast'ом Chrome с метками времени и склеиваются ffmpeg в постоянные 30 к/с.
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

try {
  process.loadEnvFile(".env");
} catch {
  // .env может не быть — тогда ключ из окружения
}

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args.splice(i, 2)[1] : def;
};
const base = opt("base", "http://localhost:3000");
const outDir = opt("out", "videos");
const fps = Number(opt("fps", "30"));
const bgColor = opt("bg", "#1b2b27");
if (!/^#[0-9a-f]{6}$/i.test(bgColor)) throw new Error(`--bg: нужен цвет вида #1a1a1a, а не «${bgColor}»`);
const fullscreen = args.includes("--fullscreen");
/** VIDEO_DEBUG=1 — печатать шаги листания (где остановились, что нажали). */
const debug = (...a) => process.env.VIDEO_DEBUG && console.error("·", ...a);
if (fullscreen) args.splice(args.indexOf("--fullscreen"), 1);
const key = process.env.SHOWCASE_KEY;
if (!key) throw new Error("Нет SHOWCASE_KEY в .env — без него страницы показа не открываются");

/** Экран телефона в кадре 1080×1920 — замер по эталонному ролику (рамка 18 px, скругление ~52 px). */
const SCREEN = { x: 284, y: 417, width: 513, height: 1133, radius: 54, bezel: 18 };
// Вёрстка той же пропорции, снимаем с запасом по чёткости и уменьшаем до экрана. На весь кадр: 405×720 × 8/3.
const VIEW = fullscreen ? { width: 405, height: 720 } : { width: 390, height: Math.round((390 * SCREEN.height) / SCREEN.width) };
// Чёткость съёмки — с небольшим запасом к размеру экрана в кадре: выше — греет ноутбук и почти не видно разницы.
const DPR = fullscreen ? 8 / 3 : 1.6;

/** Тайминги эталонного ролика, мс. */
const T = { envelope: 2300, hero: 4200, flick: 830, dwell: 2600, beforeRsvp: 900, afterThanks: 2600, end: 2400 };
/** Шаг свайпа в долях экрана: не дальше MAX, блок ближе MIN не считается «следующим». */
const STEP = { min: 0.35, max: 1.05, fallback: 0.85 };

async function templateIds() {
  const res = await fetch(`${base}/showcase/${key}`);
  if (!res.ok) throw new Error(`Показ недоступен (${res.status}): сайт запущен и SHOWCASE_KEY совпадает?`);
  return [...new Set([...(await res.text()).matchAll(new RegExp(`/showcase/${key}/([a-z0-9-]+)`, "g"))].map((m) => m[1]))];
}

async function record(browser, id) {
  const context = await browser.newContext({
    viewport: VIEW,
    deviceScaleFactor: DPR,
    isMobile: true,
    hasTouch: true,
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  // Не ждать элемент по 30 с: если анкеты нет или что-то не нашлось — сразу ошибка, а не долгий прогон.
  page.setDefaultTimeout(8000);
  // Загрузке — своё время: dev-сервер при первом открытии компилирует страницу десятки секунд.
  page.setDefaultNavigationTimeout(90_000);
  // load, а не networkidle: у dev-сервера сеть не затихает (HMR), музыка тоже догружается.
  const res = await page.goto(`${base}/showcase/${key}/${id}`, { waitUntil: "load" });
  await page.getByRole("button", { name: "Открыть приглашение" }).waitFor({ timeout: 30_000 }).catch(() => {});
  // На порту может работать другой сайт или не тот ключ — тогда конверта нет; говорим сразу, а не ждём.
  const envelope = page.getByRole("button", { name: "Открыть приглашение" });
  if (!res?.ok() || !(await envelope.count())) {
    await context.close();
    throw new Error(
      `${base}/showcase/…/${id} — не показ шаблона (ответ ${res?.status() ?? "нет"}). ` +
        "Запущен ли сайт приглашений на этом адресе (--base), верны ли SHOWCASE_KEY и id шаблона?",
    );
  }
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500); // картинки и шрифты успевают проявиться до начала записи

  const cdp = await context.newCDPSession(page);
  const frames = [];
  cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
    frames.push({ data: Buffer.from(data, "base64"), t: metadata.timestamp });
    cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", {
    format: "jpeg",
    quality: 92,
    maxWidth: Math.round(VIEW.width * DPR),
    maxHeight: Math.round(VIEW.height * DPR),
    everyNthFrame: 2, // ~30 к/с — столько и в итоговом видео; каждый кадр Chrome вдвое тяжелее для ноутбука
  });

  // Конверт: даём рассмотреть, «касание» пальцем по печати, приглашение открывается.
  await page.waitForTimeout(T.envelope);
  await tap(page, page.getByRole("button", { name: "Открыть приглашение" }));
  await page.waitForTimeout(T.hero);

  // Свайпы до конца страницы; положения блоков меряем заново (анкета после ответа меняет высоту).
  let rsvpDone = false;
  for (let guard = 0; guard < 60; guard++) {
    const { y, maxScroll, tops, rsvpTop } = await page.evaluate(() => {
      const sections = [...document.querySelectorAll("section[data-block]")].filter((s) => s.dataset.block !== "divider");
      const top = (s) => s.getBoundingClientRect().top + scrollY;
      const rsvp = sections.find((s) => s.dataset.block === "rsvp");
      return {
        y: scrollY,
        maxScroll: document.documentElement.scrollHeight - innerHeight,
        tops: sections.map(top),
        rsvpTop: rsvp ? top(rsvp) : null,
      };
    });
    if (y >= maxScroll - 2) break;
    const vh = VIEW.height;
    const next = tops.find((t) => t > y + vh * STEP.min);
    let target = next !== undefined && next - y <= vh * STEP.max ? next - vh * 0.04 : y + vh * STEP.fallback;
    target = Math.min(maxScroll, Math.max(0, target));
    debug(`свайп ${Math.round(y)} → ${Math.round(target)} (конец ${Math.round(maxScroll)})`);
    await flick(page, target);
    // Упёрлись в низ (в мобильной эмуляции расчётный конец страницы бывает дальше реального) — это конец.
    if (Math.abs((await page.evaluate(() => scrollY)) - y) < 2) break;
    const atRsvp = !rsvpDone && rsvpTop !== null && Math.abs(target - (rsvpTop - vh * 0.04)) < 4;
    if (atRsvp) {
      rsvpDone = true;
      await page.waitForTimeout(T.beforeRsvp);
      await fillRsvp(page);
      await page.waitForTimeout(T.afterThanks);
    } else {
      await page.waitForTimeout(T.dwell);
    }
  }
  await page.waitForTimeout(T.end - T.dwell);

  await cdp.send("Page.stopScreencast");
  await context.close();
  return frames;
}

/**
 * Свайп как в эталонном ролике: 0,83 с, старт сразу на полной скорости, скорость гаснет как (1−t)^1,5 —
 * путь 1−(1−t)^2,5. Короткие поправки (меньше трети экрана) — чуть быстрее.
 */
async function flick(page, target) {
  await page.evaluate(
    ([target, ms]) =>
      new Promise((done) => {
        const from = scrollY;
        const dist = target - from;
        if (Math.abs(dist) < 2) return done();
        const duration = Math.abs(dist) < innerHeight / 3 ? ms * 0.6 : ms;
        document.documentElement.style.scrollBehavior = "auto";
        const t0 = performance.now();
        const step = (now) => {
          const u = Math.min(1, (now - t0) / duration);
          window.scrollTo(0, from + dist * (1 - (1 - u) ** 2.5));
          if (u < 1) requestAnimationFrame(step);
          else done();
        };
        requestAnimationFrame(step);
      }),
    [target, T.flick],
  );
}

/** Нажатие «пальцем»: след касания, затем само нажатие. */
async function tap(page, locator) {
  debug("нажатие", String(locator));
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  const box = await locator.boundingBox();
  if (box) await showTap(page, box.x + box.width / 2, box.y + box.height / 2);
  await locator.click();
}

/** Анкета как в ролике: имя по буквам, «Приду», двое гостей сверху, отправка; держим кадр на «Спасибо!». */
async function fillRsvp(page) {
  const rsvp = page.locator('section[data-block="rsvp"]');
  const name = rsvp.getByPlaceholder("Имя и фамилия");
  if (!(await name.count())) return;
  await tap(page, name);
  await page.keyboard.type("Алия Сатыбалдиева", { delay: 95 });
  await page.waitForTimeout(500);
  await tap(page, rsvp.locator("label.inv-choice", { hasText: "Приду" })); // радио внутри подписи
  await page.waitForTimeout(600);
  for (let i = 0; i < 2; i++) {
    await tap(page, rsvp.getByRole("button", { name: "Добавить гостя" }));
    await page.waitForTimeout(450);
  }
  await page.waitForTimeout(500);
  // Кнопка отправки может быть ниже экрана — короткий свайп к ней, как пальцем.
  const submit = rsvp.locator('button[type="submit"]');
  const box = await submit.boundingBox();
  if (box && box.y + box.height > VIEW.height - 40) {
    await flick(page, await page.evaluate((dy) => scrollY + dy, box.y + box.height - VIEW.height * 0.7));
    await page.waitForTimeout(500);
  }
  await tap(page, submit);
}

/** Полупрозрачный след касания, как в записях экрана телефона. */
async function showTap(page, x, y) {
  await page.evaluate(
    ([x, y]) =>
      new Promise((done) => {
        const dot = document.createElement("div");
        Object.assign(dot.style, {
          position: "fixed",
          left: `${x - 22}px`,
          top: `${y - 22}px`,
          width: "44px",
          height: "44px",
          borderRadius: "50%",
          background: "rgba(255,255,255,.55)",
          boxShadow: "0 0 0 1px rgba(0,0,0,.12), 0 2px 10px rgba(0,0,0,.18)",
          zIndex: 2147483647,
          pointerEvents: "none",
        });
        document.body.append(dot);
        dot.animate(
          [
            { transform: "scale(.6)", opacity: 0 },
            { transform: "scale(1)", opacity: 1, offset: 0.3 },
            { transform: "scale(1.15)", opacity: 0 },
          ],
          { duration: 650, easing: "ease-out" },
        ).onfinish = () => dot.remove();
        setTimeout(done, 260);
      }),
    [x, y],
  );
}

/** #rrggbb × k (0–1): тот же оттенок, темнее. */
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v * k).toString(16).padStart(2, "0"));
  return `#${c.join("")}`;
}

/** Фон, тело телефона и маска экрана (PNG) для рамки как в эталоне. */
async function mockupLayers(dir) {
  const sharp = (await import("sharp")).default;
  const { x, y, width: w, height: h, radius: r, bezel: b } = SCREEN;
  // Края — тот же цвет, только темнее (виньетка), иначе любой --bg уходил бы в зелёный край эталона.
  const n = parseInt(bgColor.slice(1), 16);
  const light = 0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255) > 140;
  const edge = shade(bgColor, light ? 0.8 : 0.45); // светлый фон темнеет мягко, иначе края грязно-серые
  const bg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">
    <defs>
      <radialGradient id="g" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="${bgColor}"/><stop offset="1" stop-color="${bgColor}" stop-opacity="0"/></radialGradient>
      <filter id="s" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="38"/></filter>
    </defs>
    <rect width="1080" height="1920" fill="${edge}"/>
    <rect width="1080" height="1920" fill="url(#g)"/>
    <rect x="${x - b}" y="${y - b + 40}" width="${w + 2 * b}" height="${h + 2 * b}" rx="${r + b}" fill="#000" opacity=".55" filter="url(#s)"/>
    <rect x="${x - b}" y="${y - b}" width="${w + 2 * b}" height="${h + 2 * b}" rx="${r + b}" fill="#0a0a0a" stroke="#3a3d3c" stroke-width="2"/>
    <rect x="${x - b - 4}" y="${y + 220}" width="4" height="70" rx="2" fill="#26292a"/>
    <rect x="${x - b - 4}" y="${y + 310}" width="4" height="110" rx="2" fill="#26292a"/>
    <rect x="${x + w + b}" y="${y + 260}" width="4" height="150" rx="2" fill="#26292a"/>
  </svg>`;
  const mask = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#000"/><rect width="${w}" height="${h}" rx="${r}" fill="#fff"/></svg>`;
  // Камера поверх экрана — точка, как на эталоне.
  const top = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><circle cx="${x + w / 2}" cy="${y + 20}" r="9" fill="#050505"/><circle cx="${x + w / 2 + 2}" cy="${y + 18}" r="3" fill="#1d2a3a"/></svg>`;
  await sharp(Buffer.from(bg)).png().toFile(path.join(dir, "bg.png"));
  await sharp(Buffer.from(mask)).grayscale().png().toFile(path.join(dir, "mask.png"));
  await sharp(Buffer.from(top)).png().toFile(path.join(dir, "top.png"));
}

/** Кадры с метками времени → MP4 с постоянной частотой (кадр держится, пока не придёт следующий). */
async function encode(frames, file) {
  const dir = mkdtempSync(path.join(tmpdir(), "inv-video-"));
  try {
    const list = [];
    frames.forEach((f, i) => {
      const name = `f${String(i).padStart(5, "0")}.jpg`;
      writeFileSync(path.join(dir, name), f.data);
      const next = frames[i + 1]?.t ?? f.t + 1 / fps;
      list.push(`file '${name}'`, `duration ${Math.max(0.001, next - f.t).toFixed(4)}`);
    });
    list.push(`file 'f${String(frames.length - 1).padStart(5, "0")}.jpg'`);
    writeFileSync(path.join(dir, "list.txt"), list.join("\n"));
    const input = ["-f", "concat", "-safe", "0", "-i", "list.txt"];
    let filter;
    if (fullscreen) {
      filter = ["-vf", `fps=${fps},scale=1080:1920:flags=lanczos,format=yuv420p`];
    } else {
      await mockupLayers(dir);
      // Картинки рамки зациклены (бесконечны) — длину ролика задаёт -t ниже, иначе ffmpeg не остановится.
      for (const img of ["bg.png", "mask.png", "top.png"]) input.push("-loop", "1", "-framerate", String(fps), "-i", img);
      const { x, y, width: w, height: h } = SCREEN;
      filter = [
        "-filter_complex",
        `[0]fps=${fps},scale=${w}:${h}:flags=lanczos,format=rgba[s];[2]format=gray,scale=${w}:${h}[m];[s][m]alphamerge[sr];` +
          `[1][sr]overlay=${x}:${y}:shortest=1[v];[v][3]overlay=0:0:shortest=1,format=yuv420p`,
      ];
    }
    const duration = (frames.at(-1).t - frames[0].t + 1 / fps).toFixed(3);
    // nice и 4 потока — кодирование не забирает весь процессор; preset medium почти не уступает slow по качеству.
    execFileSync(
      "nice",
      ["-n", "15", "ffmpeg", "-y", "-loglevel", "error", "-filter_threads", "2", ...input, ...filter, "-t", duration, "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-threads", "4", "-r", String(fps), "-movflags", "+faststart", path.resolve(file)],
      { cwd: dir, stdio: "inherit" },
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// --selftest: склейка на 30 искусственных кадрах (секунда работы) — проверка, что ffmpeg завершается и длина верная.
if (args.includes("--selftest")) {
  const sharp = (await import("sharp")).default;
  const w = Math.round(VIEW.width * DPR), h = Math.round(VIEW.height * DPR);
  const frames = [];
  for (let i = 0; i < 30; i++) {
    const data = await sharp({ create: { width: w, height: h, channels: 3, background: { r: 20 + i * 6, g: 60, b: 50 } } }).jpeg().toBuffer();
    frames.push({ data, t: i / 30 });
  }
  const file = path.join(tmpdir(), "inv-video-selftest.mp4");
  const t0 = Date.now();
  await encode(frames, file);
  const dur = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim();
  console.log(`selftest: ${dur} с видео (ожидалось ~1.0), ${Date.now() - t0} мс`);
  // --keep — сохранить кадр рядом, чтобы посмотреть фон и рамку.
  if (args.includes("--keep")) {
    mkdirSync(outDir, { recursive: true });
    const still = path.join(outDir, "selftest-frame.png");
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", "0.5", "-i", file, "-frames:v", "1", still]);
    console.log(`кадр: ${still}`);
  }
  rmSync(file, { force: true });
  process.exit(0);
}

const wanted = args.length === 0 || args.includes("all") ? await templateIds() : args;
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
try {
  for (const id of wanted) {
    const started = Date.now();
    // Предохранитель: один ролик — около минуты; дольше 3 минут — значит, что-то зависло, не греем ноутбук зря.
    const frames = await Promise.race([
      record(browser, id),
      new Promise((_, fail) => setTimeout(() => fail(new Error(`${id}: съёмка дольше 3 минут — остановлено`)), 180_000)),
    ]);
    const seconds = frames.at(-1).t - frames[0].t;
    const file = path.join(outDir, `${id}.mp4`);
    await encode(frames, file);
    console.log(`${file}  ${seconds.toFixed(1)} с, ${frames.length} кадров (~${(frames.length / seconds).toFixed(0)} к/с снято), ${((Date.now() - started) / 1000).toFixed(0)} с работы`);
  }
} finally {
  await browser.close();
}
