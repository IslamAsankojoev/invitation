import { ArrowLeft, Download, Inbox, UserCheck, UserX, Users } from "lucide-react";
import { forbidden, redirect } from "next/navigation";
import { SignInButton } from "@/components/account/AccountMenu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { findBlock } from "@/lib/blocks";
import { canEdit, claimUrl, guestsPageAccess } from "@/lib/access";
import { getInvitationById, listRsvps } from "@/lib/invitations";
import { authEnabled, currentUser } from "@/lib/session";
import { computeRsvpStats, rsvpsToCsv } from "@/lib/rsvp";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ token?: string }> };

export const metadata = { title: "Ответы гостей" };

export default async function GuestsPage({ params, searchParams }: Props) {
  const [{ id }, { token }] = await Promise.all([params, searchParams]);
  const [inv, user] = await Promise.all([getInvitationById(id), currentUser()]);
  if (!inv) forbidden();
  if (authEnabled()) {
    // Ответы гостей — личные данные: при включённом входе их видит только владелец по аккаунту.
    const access = guestsPageAccess(inv, { token, userId: user?.id });
    if (access === "forbidden") forbidden();
    if (access === "claim") redirect(claimUrl(inv.id, inv.editToken, "guests"));
    if (access === "login") {
      // С верной секретной ссылкой — после входа сразу сохраним приглашение в аккаунт и вернёмся сюда.
      const back = !inv.userId && token === inv.editToken ? claimUrl(inv.id, inv.editToken, "guests") : `/edit/${inv.id}/guests`;
      return <LoginRequired redirectTo={back} />;
    }
  } else if (!canEdit(inv, { token })) forbidden();

  const rsvps = await listRsvps(inv.id);
  const stats = computeRsvpStats(rsvps);
  // BOM — чтобы Excel правильно открыл кириллицу.
  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent("﻿" + rsvpsToCsv(rsvps))}`;
  const names = findBlock(inv.data, "hero")?.names ?? "Приглашение";

  const statCards = [
    { label: "Придут", value: stats.attending, testId: "stat-attending", icon: UserCheck },
    { label: "Не придут", value: stats.notAttending, testId: "stat-not-attending", icon: UserX },
    { label: "Всего гостей", value: stats.totalGuests, testId: "stat-total-guests", icon: Users },
  ];

  return (
    <main className="min-h-svh bg-muted/60">
      <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4 sm:p-8">
        <div className="flex flex-col gap-2">
          <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
            <a href={`/edit/${inv.id}?token=${inv.editToken}`}>
              <ArrowLeft /> К редактору
            </a>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">Ответы гостей</h1>
          <p className="text-muted-foreground">{names}</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {statCards.map(({ label, value, testId, icon: Icon }) => (
            <Card key={testId} size="sm">
              <CardHeader>
                <CardDescription className="flex items-center gap-1.5">
                  <Icon className="size-3.5" /> {label}
                </CardDescription>
                <p data-testid={testId} className="text-3xl leading-none font-semibold tabular-nums">
                  {value}
                </p>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Все ответы</CardTitle>
            <CardDescription>{rsvps.length === 0 ? "Пока никто не ответил" : `Ответов: ${rsvps.length}`}</CardDescription>
            <CardAction>
              <Button asChild variant="outline" size="sm">
                <a href={csvHref} download={`guests-${inv.slug}.csv`}>
                  <Download /> Экспорт в CSV
                </a>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {rsvps.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
                <Inbox className="size-8" />
                Как только гости ответят, их ответы появятся здесь.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Имя</TableHead>
                    <TableHead>Ответ</TableHead>
                    <TableHead className="text-right">Гостей</TableHead>
                    <TableHead>Комментарий</TableHead>
                    <TableHead className="text-right">Дата</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rsvps.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>
                        {r.attending ? <Badge>Придёт</Badge> : <Badge variant="secondary">Не придёт</Badge>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{r.attending ? r.guestsCount : "—"}</TableCell>
                      <TableCell className="max-w-64 whitespace-normal text-muted-foreground">{r.comment}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {r.createdAt.toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

/** Ответы гостей без входа не показываем. */
function LoginRequired({ redirectTo }: { redirectTo: string }) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/60 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Войдите, чтобы увидеть ответы гостей</CardTitle>
          <CardDescription>Ответы видит только владелец приглашения — тот, в чей аккаунт оно сохранено.</CardDescription>
        </CardHeader>
        <CardContent>
          <SignInButton redirectTo={redirectTo} />
        </CardContent>
      </Card>
    </main>
  );
}
