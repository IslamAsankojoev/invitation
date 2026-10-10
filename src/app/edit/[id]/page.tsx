import { forbidden } from "next/navigation";
import { Editor, type SaveNotice } from "@/components/editor/Editor";
import { canEdit, ownershipOf } from "@/lib/access";
import { getInvitationById } from "@/lib/invitations";
import { authEnabled, authRequired, currentUser } from "@/lib/session";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ token?: string; saved?: string }> };

const NOTICES: SaveNotice[] = ["1", "taken", "login"];

export const metadata = { title: "Редактор приглашения" };

export default async function EditPage({ params, searchParams }: Props) {
  const [{ id }, { token, saved }] = await Promise.all([params, searchParams]);
  const [inv, user] = await Promise.all([getInvitationById(id), currentUser()]);
  // Секретная ссылка работает всегда (и у приглашений до аккаунтов), владелец заходит и без неё.
  if (!inv || !canEdit(inv, { token, userId: user?.id })) forbidden();

  return (
    <Editor
      id={inv.id}
      token={inv.editToken}
      initialSlug={inv.slug}
      initialData={inv.data}
      account={authEnabled() ? { user, ownership: ownershipOf(inv, user?.id), required: authRequired() } : undefined}
      notice={NOTICES.find((n) => n === saved)}
    />
  );
}
