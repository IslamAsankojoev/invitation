import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvitationPage } from "@/components/invitation/InvitationPage";
import { getInvitationBySlug } from "@/lib/invitations";
import { requestOrigin } from "@/lib/origin";
import { shareMeta } from "@/lib/share";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const inv = await getInvitationBySlug((await params).slug);
  if (!inv) return { title: "Приглашение" };
  // Превью ссылки в WhatsApp/Telegram: «Анна & Иван — приглашение на свадьбу», дата и место; картинка — opengraph-image.
  const { title, description } = shareMeta(inv.data);
  return {
    metadataBase: await requestOrigin(),
    title,
    description,
    openGraph: { title, description, type: "website", locale: "ru_RU" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PublicInvitationPage({ params }: Props) {
  const inv = await getInvitationBySlug((await params).slug);
  if (!inv) notFound();
  return <InvitationPage data={inv.data} slug={inv.slug} />;
}
