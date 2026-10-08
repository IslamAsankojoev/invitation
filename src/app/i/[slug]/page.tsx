import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { InvitationPage } from "@/components/invitation/InvitationPage";
import { getInvitationBySlug } from "@/lib/invitations";
import { shareMeta } from "@/lib/share";

type Props = { params: Promise<{ slug: string }> };

/** Адрес сайта из запроса — для абсолютных ссылок в превью (og:image), на любом домене и превью-деплое. */
async function siteOrigin(): Promise<URL | undefined> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return undefined;
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  try {
    return new URL(`${proto}://${host}`);
  } catch {
    return undefined;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const inv = await getInvitationBySlug((await params).slug);
  if (!inv) return { title: "Приглашение" };
  // Превью ссылки в WhatsApp/Telegram: «Анна & Иван — приглашение на свадьбу», дата и место; картинка — opengraph-image.
  const { title, description } = shareMeta(inv.data);
  return {
    metadataBase: await siteOrigin(),
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
