/** Черновики шаблонов для админки: обычные приглашения со slug tpl-<id>, их правит стандартный редактор. */
import { createInvitation, getInvitationBySlug, updateInvitation, type Invitation } from "./invitations";
import { draftSlug } from "./templateAdmin";
import { createFromTemplate, type Template } from "./templates";

/** Черновик шаблона: уже начатый (правки не пропадают между заходами) или новый из шаблона. */
export async function ensureDraft(template: Template): Promise<Invitation> {
  return (await getInvitationBySlug(draftSlug(template.id))) ?? createInvitation(createFromTemplate(template), draftSlug(template.id));
}

/** Начать заново: черновик снова как сохранённый шаблон. */
export async function resetDraft(template: Template): Promise<Invitation> {
  const draft = await ensureDraft(template);
  return updateInvitation(draft.id, { data: createFromTemplate(template) });
}
