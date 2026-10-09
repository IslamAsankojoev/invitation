import { ArrowLeft, CalendarHeart, ExternalLink, FolderHeart, Pencil, Plus, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { AccountMenu, SignInButton } from "@/components/account/AccountMenu";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { findBlock } from "@/lib/blocks";
import { describeDate } from "@/lib/calendar";
import { listUserInvitations } from "@/lib/invitations";
import { authEnabled, currentUser } from "@/lib/session";

export const metadata = { title: "Мои приглашения" };

// Вход включается ключами Google в окружении — проверяем на каждом запросе, а не один раз при сборке.
export const dynamic = "force-dynamic";

/** Приглашения вошедшего пользователя: редактор, ответы гостей, страница для гостей. */
export default async function MyInvitationsPage() {
  if (!authEnabled()) notFound();
  const user = await currentUser();
  const invitations = user ? await listUserInvitations(user.id) : [];

  return (
    <main className="min-h-dvh bg-muted/60">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 sm:p-8">
        <header className="flex items-center justify-between gap-3">
          <a href="/" className="flex min-h-10 items-center gap-2 rounded-md text-sm text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
            <img src="/logo.webp" alt="" width={40} height={29} className="h-7 w-auto" />
            <ArrowLeft aria-hidden="true" className="size-4" /> Шаблоны
          </a>
          <AccountMenu user={user} />
        </header>
        <div className="flex items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <FolderHeart aria-hidden="true" className="size-6 text-primary" /> Мои приглашения
          </h1>
          {invitations.length > 0 && (
            <Button asChild size="sm" className="pointer-coarse:h-10">
              <a href="/">
                <Plus /> Новое
              </a>
            </Button>
          )}
        </div>

        {!user ? (
          <Card>
            <CardHeader>
              <CardTitle>Войдите, чтобы увидеть свои приглашения</CardTitle>
              <CardDescription>Здесь собраны все приглашения, сохранённые в вашем аккаунте.</CardDescription>
            </CardHeader>
            <div className="px-6">
              <SignInButton />
            </div>
          </Card>
        ) : invitations.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Пока пусто</CardTitle>
              <CardDescription>Выберите шаблон — новое приглашение сразу сохранится в аккаунте.</CardDescription>
            </CardHeader>
            <div className="px-6">
              <Button asChild>
                <a href="/">
                  <Plus /> Создать приглашение
                </a>
              </Button>
            </div>
          </Card>
        ) : (
          <ul className="flex flex-col gap-3" aria-label="Приглашения">
            {invitations.map((inv) => {
              const hero = findBlock(inv.data, "hero");
              return (
                <li key={inv.id}>
                  <Card size="sm">
                    <CardHeader className="max-sm:grid-cols-1!">
                      <CardTitle>{hero?.names || "Без имён"}</CardTitle>
                      <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {hero?.date && (
                          <span className="flex items-center gap-1">
                            <CalendarHeart className="size-3.5" /> {describeDate(hero.date).dotted}
                          </span>
                        )}
                        <span>/i/{inv.slug}</span>
                      </CardDescription>
                      <CardAction className="flex flex-wrap justify-end gap-2 max-sm:col-start-1! max-sm:row-start-3! max-sm:mt-2 max-sm:justify-start max-sm:justify-self-stretch">
                        <Button asChild size="sm" className="pointer-coarse:h-10 max-sm:flex-1">
                          <a href={`/edit/${inv.id}`}>
                            <Pencil /> Редактировать
                          </a>
                        </Button>
                        <Button asChild variant="outline" size="sm" className="pointer-coarse:h-10 max-sm:flex-1">
                          <a href={`/edit/${inv.id}/guests`}>
                            <Users /> Гости
                          </a>
                        </Button>
                        <Button asChild variant="outline" size="icon-sm" className="pointer-coarse:size-10" aria-label="Открыть страницу для гостей">
                          <a href={`/i/${inv.slug}`} target="_blank" rel="noopener">
                            <ExternalLink />
                          </a>
                        </Button>
                      </CardAction>
                    </CardHeader>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
