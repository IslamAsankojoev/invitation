import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvitationPage } from "@/components/invitation/InvitationPage";
import { showcaseKeyValid } from "@/lib/showcase";
import { createFromTemplate, findTemplate } from "@/lib/templates";

type Props = { params: Promise<{ key: string; template: string }> };

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Показ шаблона", robots: { index: false, follow: false } };

/** Шаблон целиком с примером текстов — без базы: приглашение собирается из шаблона при каждом открытии. */
export default async function ShowcaseTemplatePage({ params }: Props) {
  const { key, template } = await params;
  const t = findTemplate(template);
  if (!showcaseKeyValid(key) || !t) notFound();
  return <InvitationPage data={createFromTemplate(t)} slug={t.id} demo />;
}
