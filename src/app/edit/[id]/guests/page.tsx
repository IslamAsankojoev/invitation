import { ArrowLeft, UserCheck, UserX, Users } from "lucide-react";
import { forbidden, redirect } from "next/navigation";
import { SignInButton } from "@/components/account/AccountMenu";
import { GuestAnswers } from "@/components/guests/GuestAnswers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { findBlock } from "@/lib/blocks";
import { canEdit, claimUrl, guestsPageAccess } from "@/lib/access";
import { getInvitationById, listRsvps } from "@/lib/invitations";
import { requestOrigin } from "@/lib/origin";
import { shareMessage, telegramShareUrl, whatsappShareUrl } from "@/lib/share";
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
  const publicUrl = new URL(`/i/${inv.slug}`, (await requestOrigin()) ?? "http://localhost").href;
  const message = shareMessage(inv.data, publicUrl);

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
                {/* На телефоне карточки узкие: подпись в одну строку, без значка. */}
                <CardDescription className="flex items-center gap-1.5 text-xs whitespace-nowrap sm:text-sm">
                  <Icon className="size-3.5 max-sm:hidden" /> {label}
                </CardDescription>
                <p data-testid={testId} className="text-3xl leading-none font-semibold tabular-nums">
                  {value}
                </p>
              </CardHeader>
            </Card>
          ))}
        </div>

        <GuestAnswers
          invitationId={inv.id}
          slug={inv.slug}
          token={inv.editToken}
          answers={rsvps.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))}
          csvHref={csvHref}
          csvName={`guests-${inv.slug}.csv`}
          share={{ whatsapp: whatsappShareUrl(message), telegram: telegramShareUrl(publicUrl, message) }}
        />
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
