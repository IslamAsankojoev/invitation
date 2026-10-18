import type { InvitationData } from "./schema";
import { baseTemplates, createFromTemplate, findTemplate } from "./templates";

/**
 * Приглашение по умолчанию — первый шаблон в коде («Кремовая классика», с правками из админки) с примером текстов.
 * Не первый на главной: порядок и публикацию меняют в админке, а умолчание (и тесты на нём) от этого не зависит.
 */
export function createDefaultInvitation(): InvitationData {
  return createFromTemplate(findTemplate(baseTemplates[0].id)!);
}
