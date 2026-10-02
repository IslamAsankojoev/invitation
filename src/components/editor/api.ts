import { createContext, useContext } from "react";
import type { InvitationData } from "@/lib/schema";
import { checkUpload } from "@/lib/upload";
import { shrinkImage } from "./shrinkImage";

async function errorMessage(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  return [body?.error, ...(body?.details ?? [])].filter(Boolean).join(": ") || `Ошибка ${res.status}`;
}

export async function patchInvitation(id: string, token: string, patch: { data?: InvitationData; slug?: string }) {
  const res = await fetch(`/api/invitations/${id}?token=${encodeURIComponent(token)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
}

/** В какое приглашение загружать файлы: сервер принимает загрузку только с id и token (или от владельца). */
export type UploadTarget = { id: string; token: string };
export const UploadTargetContext = createContext<UploadTarget | null>(null);

/** Загрузка в приглашение, открытое в редакторе (Editor кладёт его в UploadTargetContext). */
export function useUploadFile() {
  const target = useContext(UploadTargetContext);
  return (file: File) => uploadFile(file, target);
}

export async function uploadFile(original: File, target: UploadTarget | null): Promise<string> {
  const file = await shrinkImage(original);
  const error = checkUpload(file.type, file.size);
  if (error) throw new Error(error);
  const form = new FormData();
  form.append("file", file);
  const query = target ? `?id=${encodeURIComponent(target.id)}&token=${encodeURIComponent(target.token)}` : "";
  const res = await fetch(`/api/upload${query}`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await errorMessage(res));
  return (await res.json()).url;
}
