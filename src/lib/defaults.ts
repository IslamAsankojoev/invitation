import type { InvitationData } from "./schema";
import { createFromTemplate, templates } from "./templates";

/** Приглашение по умолчанию — первый шаблон («Кремовая классика») с примером текстов. */
export function createDefaultInvitation(): InvitationData {
  return createFromTemplate(templates[0]);
}
