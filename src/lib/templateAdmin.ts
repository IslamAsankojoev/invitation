/** Правка шаблонов в скрытой админке — чистые функции (файлы пишет lib/adminFiles.ts). */
import { findBlock } from "./blocks";
import type { InvitationData } from "./schema";
import { createFromTemplate, type LayoutBlock, type Template } from "./templates";

/** id шаблона — часть адресов (/showcase/…/<id>, черновик tpl-<id>) и имён файлов: латиница, цифры, дефис. */
export const TEMPLATE_ID = /^[a-z0-9][a-z0-9-]{1,35}$/;

/** Черновик шаблона — обычное приглашение с этим slug: правится в редакторе, автосохраняется в базу. */
export const draftSlug = (templateId: string) => `tpl-${templateId}`;

/**
 * Шаблон из приглашения, собранного в редакторе: тема, музыка и все блоки по порядку (структура `layout` — тексты,
 * фото и оформление каждого блока). Имя, описание и оформление типов, которых в приглашении нет (`blocks`), —
 * от прежнего шаблона. Цвета дресс-кода — из блока дресс-кода. Вход не мутирует.
 */
export function templateFromInvitation(base: Template, data: InvitationData): Template {
  // exact: блок целиком — пустые поля так и остаются пустыми (см. LayoutBlock).
  const layout = data.blocks.map(({ id: _id, ...block }) => ({ ...structuredClone(block), exact: true })) as LayoutBlock[];
  const dresscode = findBlock(data, "dresscode");
  return {
    id: base.id,
    name: base.name,
    description: base.description,
    theme: structuredClone(data.theme),
    blocks: structuredClone(base.blocks),
    dresscodeColors: dresscode?.colors.length ? [...dresscode.colors] : [...base.dresscodeColors],
    ...(data.music.url && { music: data.music.url }),
    // Фрагмент — только если выбран не «весь трек по кругу» (иначе шаблон не отличается от прежнего).
    ...((data.music.start || data.music.end != null || !data.music.loop) && {
      musicFragment: { start: data.music.start, end: data.music.end, loop: data.music.loop },
    }),
    layout,
  };
}

/** Копия шаблона под свободным id («mocha-2», «mocha-3»…) и с пометкой в названии. */
export function copyTemplate(template: Template, takenIds: string[]): Template {
  const stem = template.id.replace(/-\d+$/, "").slice(0, 32);
  let n = 2;
  while (takenIds.includes(`${stem}-${n}`)) n++;
  return { ...structuredClone(template), id: `${stem}-${n}`, name: `${template.name} (копия)` };
}

/** JSON без зависимости от порядка ключей: jsonb в Postgres переставляет ключи. undefined-поля не считаются. */
const stable = (v: unknown): string =>
  Array.isArray(v)
    ? `[${v.map(stable).join(",")}]`
    : v && typeof v === "object"
      ? `{${Object.entries(v)
          .filter(([, x]) => x !== undefined)
          .sort(([a], [b]) => (a < b ? -1 : 1))
          .map(([k, x]) => `${JSON.stringify(k)}:${stable(x)}`)
          .join(",")}}`
      : JSON.stringify(v);

/** Содержимое для сравнения: тема, песня и блоки без id (id черновика и нового приглашения могут различаться). */
const comparable = (data: InvitationData) =>
  stable({ theme: data.theme, music: data.music, blocks: data.blocks.map(({ id: _id, ...b }) => b) });

/** Черновик совпадает с шаблоном — сохранять в шаблон нечего. */
export const sameAsTemplate = (template: Template, data: InvitationData) => comparable(createFromTemplate(template)) === comparable(data);

/** Подставить новые адреса фото (после переноса загрузок в public/templates). Вход не мутирует. */
export function replaceUrls(data: InvitationData, replaced: Record<string, string>): InvitationData {
  let json = JSON.stringify(data);
  for (const [from, to] of Object.entries(replaced)) json = json.split(JSON.stringify(from)).join(JSON.stringify(to));
  return JSON.parse(json);
}

/** Шаблон по сути тот же: название, описание и приглашение, которое из него собирается. */
export const sameTemplate = (a: Template, b: Template) =>
  a.name === b.name && a.description === b.description && sameAsTemplate(a, createFromTemplate(b));
