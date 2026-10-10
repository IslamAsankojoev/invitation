import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TemplatePreview } from "@/components/templates/TemplatePreview";
import { showcaseKeyValid } from "@/lib/showcase";
import { templates } from "@/lib/templates";

type Props = { params: Promise<{ key: string }> };

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Шаблоны — показ", robots: { index: false, follow: false } };

/** Скрытый список шаблонов для показа и съёмки видео (адрес знает только владелец, см. lib/showcase.ts). */
export default async function ShowcasePage({ params }: Props) {
  const { key } = await params;
  if (!showcaseKeyValid(key)) notFound();

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Шаблоны — полный показ</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Приглашение целиком, как у гостя. Ответы анкеты не сохраняются. Видео: <code>npm run video -- {"<"}шаблон{">"}</code>
      </p>
      <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {templates.map((t) => (
          <li key={t.id}>
            <Link
              href={`/showcase/${key}/${t.id}`}
              className="group block overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
            >
              <TemplatePreview template={t} width={240} animated={false} className="w-full" />
              <span className="block px-3 py-2.5">
                <span className="block font-medium">{t.name}</span>
                <span className="block text-xs text-muted-foreground">{t.id}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
