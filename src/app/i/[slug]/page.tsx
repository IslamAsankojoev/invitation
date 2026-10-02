import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvitationPage } from "@/components/invitation/InvitationPage";
import { findBlock } from "@/lib/blocks";
import { getInvitationBySlug } from "@/lib/invitations";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const inv = await getInvitationBySlug((await params).slug);
  const names = inv && findBlock(inv.data, "hero")?.names;
  return { title: names ? `${names} — приглашение` : "Приглашение" };
}

export default async function PublicInvitationPage({ params }: Props) {
  const inv = await getInvitationBySlug((await params).slug);
  if (!inv) notFound();
  return <InvitationPage data={inv.data} slug={inv.slug} />;
}
