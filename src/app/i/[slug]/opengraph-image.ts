import { getInvitationBySlug } from "@/lib/invitations";
import { SHARE_IMAGE, shareImage } from "@/lib/shareImage";

// Next сам добавит og:image на страницу гостя — это картинка в превью ссылки в WhatsApp и Telegram.
export const size = SHARE_IMAGE;
export const contentType = "image/jpeg";
export const alt = "Приглашение";

export default async function Image({ params }: { params: { slug: string } }) {
  const inv = await getInvitationBySlug(params.slug);
  if (!inv) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(await shareImage(inv.data)), {
    headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=300, s-maxage=300" },
  });
}
