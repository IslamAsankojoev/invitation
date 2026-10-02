import { CalendarHeart, ExternalLink, FolderHeart, Pencil, Plus, Users } from "lucide-react";
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
    <main className="min-h-svh bg-muted/60">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 sm:p-8">
        <header className="flex items-center justify-between gap-3">
          <a href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Шаблоны
          </a>
          <AccountMenu user={user} />
        </header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <FolderHeart className="size-6 text-primary" /> Мои приглашения
        </h1>

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
                    <CardHeader>
                      <CardTitle>{hero?.names || "Без имён"}</CardTitle>
                      <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {hero?.date && (
                          <span className="flex items-center gap-1">
                            <CalendarHeart className="size-3.5" /> {describeDate(hero.date).dotted}
                          </span>
                        )}
                        <span>/i/{inv.slug}</span>
                      </CardDescription>
                      <CardAction className="flex flex-wrap justify-end gap-2">
                        <Button asChild size="sm">
                          <a href={`/edit/${inv.id}`}>
                            <Pencil /> Редактировать
                          </a>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <a href={`/edit/${inv.id}/guests`}>
                            <Users /> Гости
                          </a>
                        </Button>
                        <Button asChild variant="outline" size="icon-sm" aria-label="Открыть страницу для гостей">
                          <a href={`/i/${inv.slug}`} target="_blank">
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
