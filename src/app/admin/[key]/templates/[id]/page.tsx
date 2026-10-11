import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TemplateEditor } from "@/components/admin/TemplateEditor";
import { adminKeyValid } from "@/lib/admin";
import { currentTemplate } from "@/lib/adminFiles";
import { ensureDraft } from "@/lib/templateDrafts";

type Props = { params: Promise<{ key: string; id: string }> };

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Правка шаблона", robots: { index: false, follow: false } };

/** Правка шаблона: черновик tpl-<id> в обычном редакторе (правки автосохраняются), «Сохранить в шаблон» пишет файл. */
export default async function AdminTemplatePage({ params }: Props) {
  const { key, id } = await params;
  if (!adminKeyValid(key)) notFound();
  const template = await currentTemplate(id);
  if (!template) notFound();
  const draft = await ensureDraft(template);
  const showcase = process.env.SHOWCASE_KEY;
  return (
    <TemplateEditor
      adminKey={key}
      template={template}
      draft={{ id: draft.id, token: draft.editToken, slug: draft.slug, data: draft.data }}
      showcaseHref={showcase ? `/showcase/${showcase}/${template.id}` : null}
    />
  );
}
