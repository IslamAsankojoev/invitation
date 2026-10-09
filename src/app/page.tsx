import { LayoutTemplate, PenLine, Send } from "lucide-react";
import { AccountMenu } from "@/components/account/AccountMenu";
import { RecentInvitations } from "@/components/templates/RecentInvitations";
import { TemplateGallery } from "@/components/templates/TemplateGallery";
import { Button } from "@/components/ui/button";
import { authEnabled, currentUser } from "@/lib/session";

// Вход включается ключами Google в окружении — проверяем на каждом запросе, а не один раз при сборке.
export const dynamic = "force-dynamic";

/** Три шага — весь путь организатора; так с первого экрана понятно, сколько это займёт. */
const steps = [
  { icon: LayoutTemplate, title: "Выберите шаблон", text: "12 стилей — цвета, шрифты и украшения потом можно поменять." },
  { icon: PenLine, title: "Впишите имена, дату и место", text: "Пара минут: редактор спросит главное сам, ссылку на 2ГИС просто вставьте." },
  { icon: Send, title: "Отправьте гостям", text: "Одной кнопкой в WhatsApp или Telegram. Кто придёт — увидите в списке ответов." },
];

export default async function HomePage() {
  const enabled = authEnabled();
  const user = enabled ? await currentUser() : null;
  return (
    <main className="min-h-svh bg-muted/60">
      {enabled && (
        <nav className="mx-auto flex max-w-6xl justify-end px-4 pt-4">
          <AccountMenu user={user} />
        </nav>
      )}
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-8 sm:py-14">
        <header className="flex flex-col items-center gap-4 text-center">
          <img src="/logo.webp" alt="Keleber" width={96} height={69} className="h-12 w-auto sm:h-16" />
          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
            Приглашение на свадьбу и той — за 5 минут
          </h1>
          <p className="max-w-xl text-balance text-muted-foreground sm:text-lg">
            Красивый сайт-приглашение с музыкой, картой и ответами гостей. Отправьте ссылку в WhatsApp — кто придёт, вы
            увидите сразу.
          </p>
          <Button asChild size="lg" className="mt-1">
            <a href="#templates">Выбрать шаблон</a>
          </Button>
        </header>

        {/* Вернувшимся — сразу их приглашения, до рассказа «как это работает». */}
        <RecentInvitations />

        <ol className="grid gap-3 sm:grid-cols-3">
          {steps.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="flex gap-3 rounded-xl border bg-card p-4 shadow-xs">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="size-4" />
              </span>
              <span className="flex flex-col gap-1">
                <span className="font-medium">
                  <span className="text-muted-foreground">{i + 1}.</span> {title}
                </span>
                <span className="text-sm text-muted-foreground">{text}</span>
              </span>
            </li>
          ))}
        </ol>

        <section id="templates" aria-labelledby="templates-title" className="flex scroll-mt-4 flex-col gap-4">
          <h2 id="templates-title" className="text-lg font-semibold">
            Шаблоны
          </h2>
          <TemplateGallery />
        </section>
      </div>
    </main>
  );
}
