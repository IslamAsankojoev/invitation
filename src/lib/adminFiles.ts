/**
 * Файлы скрытой админки (только локально, см. lib/admin.ts): правки шаблонов в src/lib/template-overrides.json, фото
 * шаблонов в public/templates, ролики в videos/. Корень — ADMIN_ROOT (в тестах — временная папка), иначе папка проекта.
 */
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { appendFile, copyFile, mkdir, readdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { copyTemplate, sameTemplate } from "./templateAdmin";
import { baseTemplates, mergeTemplates, type Template, type TemplateOverrides } from "./templates";

const root = () => process.env.ADMIN_ROOT ?? process.cwd();
const overridesFile = () => path.join(root(), "src/lib/template-overrides.json");
export const videosDir = () => path.join(root(), "videos");

export async function readOverrides(): Promise<TemplateOverrides> {
  try {
    const json = JSON.parse(await readFile(overridesFile(), "utf8"));
    return { edited: json.edited ?? {}, added: json.added ?? [] };
  } catch {
    return { edited: {}, added: [] };
  }
}

/** Пишем через временный файл: dev-сервер следит за файлом и не должен прочитать его наполовину записанным. */
async function writeOverrides(overrides: TemplateOverrides) {
  const file = overridesFile();
  const tmp = `${file}.${randomUUID()}.tmp`;
  await writeFile(tmp, `${JSON.stringify(overrides, null, 2)}\n`);
  await rename(tmp, file);
}

export type AdminTemplate = { template: Template; status: "base" | "edited" | "added" };

/** Шаблоны как сейчас в файле правок (свежие — модуль templates.ts мог ещё не перечитать JSON). */
export async function adminTemplates(): Promise<AdminTemplate[]> {
  const overrides = await readOverrides();
  return mergeTemplates(baseTemplates, overrides).map((template) => ({
    template,
    status: overrides.edited[template.id] ? "edited" : baseTemplates.some((t) => t.id === template.id) ? "base" : "added",
  }));
}

export const currentTemplate = async (id: string) => (await adminTemplates()).find((t) => t.template.id === id)?.template;

/**
 * Сохранить шаблон: правка шаблона из кода или новый. Свои загрузки (public/uploads, хранилище) переносятся в
 * public/templates; `replaced` — какие адреса на какие заменены (редактор подставляет их в черновик).
 */
export async function saveTemplate(template: Template): Promise<{ template: Template; replaced: Record<string, string> }> {
  const { template: saved, replaced } = await localizePhotos(template);
  const overrides = await readOverrides();
  const base = baseTemplates.find((t) => t.id === saved.id);
  if (base) {
    // Вернули всё как в коде — правку не храним (иначе шаблон зря помечен «Изменён»).
    if (sameTemplate(base, saved)) {
      delete overrides.edited[saved.id];
      await writeOverrides(overrides);
      return { template: base, replaced };
    }
    overrides.edited[saved.id] = saved;
  } else {
    const i = overrides.added.findIndex((t) => t.id === saved.id);
    if (i >= 0) overrides.added[i] = saved;
    else overrides.added.push(saved);
  }
  if (!mergeTemplates(baseTemplates, overrides).some((t) => t === saved)) throw new Error("Шаблон не проходит схему приглашения");
  await writeOverrides(overrides);
  return { template: saved, replaced };
}

/** Шаблон из кода — вернуть к исходному; новый — удалить. */
export async function resetTemplate(id: string): Promise<boolean> {
  const overrides = await readOverrides();
  const before = JSON.stringify(overrides);
  delete overrides.edited[id];
  overrides.added = overrides.added.filter((t) => t.id !== id);
  if (JSON.stringify(overrides) === before) return false;
  await writeOverrides(overrides);
  return true;
}

export async function duplicateTemplate(id: string): Promise<Template | null> {
  const all = await adminTemplates();
  const source = all.find((t) => t.template.id === id)?.template;
  if (!source) return null;
  return (await saveTemplate(copyTemplate(source, all.map((t) => t.template.id)))).template;
}

/** Свои загрузки в адресах шаблона: локальные /uploads/… и файлы Supabase Storage. */
const UPLOAD_URL = /"(\/uploads\/[^"/]+|https?:\/\/[^"]+\/storage\/v1\/object\/public\/[^"]+)"/g;

/**
 * Фото, загруженные в черновик, лежат среди загрузок пользователей (public/uploads в .gitignore, хранилище чистится
 * вместе с приглашением) — шаблону нужны свои копии в public/templates, со строкой в CREDITS.md (тест library.test.ts).
 */
async function localizePhotos(template: Template): Promise<{ template: Template; replaced: Record<string, string> }> {
  const json = JSON.stringify(template);
  const urls = [...new Set([...json.matchAll(UPLOAD_URL)].map((m) => m[1]))];
  const replaced: Record<string, string> = {};
  if (!urls.length) return { template, replaced };
  const dir = path.join(root(), "public/templates");
  await mkdir(dir, { recursive: true });
  let out = json;
  for (const url of urls) {
    const ext = path.extname(new URL(url, "http://local").pathname).toLowerCase() || ".webp";
    const name = `${template.id}-${randomUUID().slice(0, 8)}${ext}`;
    if (url.startsWith("/uploads/")) await copyFile(path.join(root(), "public", url), path.join(dir, name));
    else {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Не удалось скачать фото ${url} (${res.status})`);
      await writeFile(path.join(dir, name), new Uint8Array(await res.arrayBuffer()));
    }
    replaced[url] = `/templates/${name}`;
    out = out.split(`"${url}"`).join(`"${replaced[url]}"`);
    await addCredit(name, template.name);
  }
  return { template: JSON.parse(out), replaced };
}

const CREDITS_SECTION = "## Загружено в админке шаблонов (`public/templates/`)";

async function addCredit(file: string, templateName: string) {
  const credits = path.join(root(), "public/library/CREDITS.md");
  const text = existsSync(credits) ? await readFile(credits, "utf8") : "";
  const head = text.includes(CREDITS_SECTION)
    ? ""
    : `\n${CREDITS_SECTION}\n\nФото, загруженные при правке шаблона в /admin. Лицензию уточнить перед продакшеном.\n\n| Файл | Что | Автор | Лицензия | Источник |\n|---|---|---|---|---|\n`;
  await appendFile(credits, `${head}| \`${file}\` | Фото шаблона «${templateName}» | — | уточняется (загружено в админке) | /admin |\n`);
}

// ——— Видео ———

/** Имя ролика: <шаблон>--<дата_время>[--full].mp4; старые ролики скрипта — просто <шаблон>.mp4. */
export const VIDEO_NAME = /^[a-z0-9][a-z0-9-]*(--[0-9_-]+)?(--full)?\.mp4$/;

export type VideoFile = { name: string; templateId: string; fullscreen: boolean; size: number; createdAt: string };

export function videoFileName(templateId: string, fullscreen: boolean, now = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}_${p(now.getHours())}-${p(now.getMinutes())}-${p(now.getSeconds())}`;
  return `${templateId}--${stamp}${fullscreen ? "--full" : ""}.mp4`;
}

export function parseVideoName(name: string) {
  const [templateId, ...rest] = name.replace(/\.mp4$/, "").split("--");
  return { templateId, fullscreen: rest.includes("full") };
}

/** Ролики, свежие сверху. */
export async function listVideos(): Promise<VideoFile[]> {
  const names = await readdir(videosDir()).catch(() => [] as string[]);
  const files = await Promise.all(
    names
      .filter((n) => VIDEO_NAME.test(n))
      .map(async (name) => {
        const s = await stat(path.join(videosDir(), name));
        return { name, ...parseVideoName(name), size: s.size, createdAt: s.mtime.toISOString() };
      }),
  );
  return files.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Путь ролика по имени; null — имя не наше (защита от ../ и чужих файлов) или файла нет. */
export function videoPath(name: string): string | null {
  if (!VIDEO_NAME.test(name)) return null;
  const file = path.join(videosDir(), name);
  return existsSync(file) ? file : null;
}

export async function deleteVideo(name: string): Promise<boolean> {
  const file = videoPath(name);
  if (!file) return false;
  await unlink(file);
  return true;
}
