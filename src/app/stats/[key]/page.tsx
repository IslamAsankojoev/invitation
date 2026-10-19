import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FUNNEL_STEPS, parsePeriod, percent, STATS_PERIODS, type FunnelCounts } from "@/lib/analytics";
import { findTemplate } from "@/lib/templates";
import { loadStats, statsKeyValid } from "@/lib/track";

type Props = { params: Promise<{ key: string }>; searchParams: Promise<{ days?: string }> };

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Статистика", robots: { index: false, follow: false } };

/**
 * Скрытая статистика владельца `/stats/<STATS_KEY>`: воронка приглашений (lib/analytics.ts). Только чтение, поэтому,
 * в отличие от админки, работает и на Vercel.
 */
export default async function StatsPage({ params, searchParams }: Props) {
  const { key } = await params;
  if (!statsKeyValid(key)) notFound();
  const days = parsePeriod((await searchParams).days);
  const stats = await loadStats(days);
  const { total } = stats;

  return (
    <main className="min-h-dvh bg-muted/60">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Статистика</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Приглашения, созданные за последние {days} дней, и докуда они дошли.
            </p>
          </div>
          <nav aria-label="Период" className="flex gap-1">
            {STATS_PERIODS.map((p) => (
              <Button key={p} asChild size="sm" variant={p === days ? "default" : "outline"}>
                <Link href={`/stats/${key}?days=${p}`} aria-current={p === days ? "page" : undefined}>
                  {p} дней
                </Link>
              </Button>
            ))}
          </nav>
        </header>

        <ol className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Воронка">
          {FUNNEL_STEPS.map((step) => (
            <li key={step.key}>
              <Card size="sm" className="h-full">
                <CardHeader>
                  <CardDescription>{step.label}</CardDescription>
                  <CardTitle className="text-3xl tabular-nums" data-testid={`funnel-${step.key}`}>
                    {total[step.key]}
                  </CardTitle>
                  {step.key !== "created" && (
                    <p className="text-xs text-muted-foreground tabular-nums">{percent(total[step.key], total.created)} от созданных</p>
                  )}
                </CardHeader>
              </Card>
            </li>
          ))}
        </ol>

        <Card size="sm">
          <CardHeader>
            <CardDescription>В среднем разных гостей открыли одно приглашение (среди открытых)</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{stats.averageGuests}</CardTitle>
          </CardHeader>
        </Card>

        <Breakdown title="По шаблонам" column="Шаблон" rows={stats.byTemplate} label={(id) => findTemplate(id)?.name ?? id} />
        <Breakdown title="По типу события" column="Тип события" rows={stats.byEventType} />
        <Breakdown title="По языку" column="Язык" rows={stats.byLanguage} />
      </div>
    </main>
  );
}

function Breakdown({
  title,
  column,
  rows,
  label = (v) => v,
}: {
  title: string;
  column: string;
  rows: { value: string; counts: FunnelCounts }[];
  label?: (value: string) => string;
}) {
  return (
    <section className="rounded-xl border bg-card p-4">
      <h2 className="mb-2 font-medium">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">За этот период приглашений не создавали.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{column}</TableHead>
              {FUNNEL_STEPS.map((s) => (
                <TableHead key={s.key} className="text-right">
                  {s.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ value, counts }) => (
              <TableRow key={value}>
                <TableCell className="font-medium">{label(value)}</TableCell>
                {FUNNEL_STEPS.map((s) => (
                  <TableCell key={s.key} className="text-right tabular-nums">
                    {counts[s.key]}
                    {s.key !== "created" && <span className="ml-1.5 text-xs text-muted-foreground">{percent(counts[s.key], counts.created)}</span>}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
