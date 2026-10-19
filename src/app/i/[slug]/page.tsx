import { notFound } from "next/navigation";
import { InvitationPage } from "@/components/invitation/InvitationPage";
import { getInvitationBySlug } from "@/lib/invitations";

type Props = { params: Promise<{ slug: string }> };

export default async function PublicInvitationPage({ params }: Props) {
  const inv = await getInvitationBySlug((await params).slug);
  if (!inv) notFound();
  return <InvitationPage data={inv.data} slug={inv.slug} />;
}
