import type { Metadata } from "next";
import { getInvitationBySlug } from "@/lib/invitations";
import { linkPreview } from "@/lib/share";
import { siteUrl } from "@/lib/siteUrl";

/**
 * Превью ссылки в WhatsApp/Telegram. Метаданные здесь, а не в page.tsx: картинку из opengraph-image.tsx Next
 * привязывает к этому сегменту и строит её адрес по metadataBase сегмента — из page он для картинки не действует.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const inv = await getInvitationBySlug((await params).slug);
  if (!inv) return { title: "Приглашение" };
  const { title, description } = linkPreview(inv.data);
  return {
    metadataBase: await siteUrl(),
    title,
    description,
    openGraph: { type: "website", locale: "ru_RU", url: `/i/${inv.slug}`, title, description },
  };
}

export default function InvitationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
