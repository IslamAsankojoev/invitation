import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TemplateCard } from "@/components/templates/TemplateCard";
import { showcaseKeyValid } from "@/lib/showcase";
import { allTemplates as templates } from "@/lib/templates";

type Props = { params: Promise<{ key: string }> };

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Шаблоны — показ", robots: { index: false, follow: false } };

/** Скрытый список шаблонов для показа и съёмки видео (адрес знает только владелец, см. lib/showcase.ts). */
export default async function ShowcasePage({ params }: Props) {
  const { key } = await params;
  if (!showcaseKeyValid(key)) notFound();

  return (
    <main className="min-h-dvh bg-muted/60">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Шаблоны — полный показ</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Приглашение целиком, как у гостя. Ответы анкеты не сохраняются. Видео: <code>npm run video -- {"<"}шаблон{">"}</code>
        </p>
        <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 md:grid-cols-3 lg:grid-cols-4" aria-label="Шаблоны">
          {templates.map((t) => (
            <li key={t.id}>
              <TemplateCard template={t} actionLabel="Открыть" href={`/showcase/${key}/${t.id}`} />
          </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
