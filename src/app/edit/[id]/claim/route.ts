import { NextResponse } from "next/server";
import { claimDecision, claimNextOf } from "@/lib/access";
import { claimInvitation, getInvitationById } from "@/lib/invitations";
import { currentUser } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Забрать приглашение в аккаунт. Сюда возвращает вход через Google из редактора («Сохранить в аккаунт»):
 * `/edit/<id>/claim?token=…`. GET — потому что это адрес возврата после входа; без token ничего не меняется.
 * Итог — редирект обратно в редактор с `?saved=1|taken|login`; с `next=guests` после удачной привязки — к ответам гостей.
 */
export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  const query = new URL(req.url).searchParams;
  const token = query.get("token");
  const next = claimNextOf(query.get("next"));
  const back = (result: string) => {
    if (result === "1" && next === "guests") return NextResponse.redirect(new URL(`/edit/${id}/guests`, req.url), 303);
    const url = new URL(`/edit/${id}`, req.url);
    if (token) url.searchParams.set("token", token);
    url.searchParams.set("saved", result);
    return NextResponse.redirect(url, 303);
  };

  const [inv, user] = await Promise.all([getInvitationById(id), currentUser()]);
  if (!inv) return NextResponse.json({ error: "Приглашение не найдено" }, { status: 404 });
  if (!user) return back("login");

  const decision = claimDecision(inv, token, user.id);
  if (decision === "forbidden") return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  if (decision === "claim") return back((await claimInvitation(inv.id, user.id)) ? "1" : "taken");
  return back(decision === "already" ? "1" : "taken");
}
