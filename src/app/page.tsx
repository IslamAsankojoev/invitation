import { LayoutTemplate, PenLine, Send } from "lucide-react";
import { AccountMenu } from "@/components/account/AccountMenu";
import { TemplateGallery } from "@/components/templates/TemplateGallery";
import { authEnabled, currentUser } from "@/lib/session";

// Вход включается ключами Google в окружении — проверяем на каждом запросе, а не один раз при сборке.
export const dynamic = "force-dynamic";

/** Три шага сценария — чтобы с первого экрана было понятно, что будет после «Выбрать». */
const steps = [
  { icon: LayoutTemplate, text: "Выберите шаблон" },
  { icon: PenLine, text: "Измените тексты и фото" },
  { icon: Send, text: "Отправьте ссылку гостям" },
];

export default async function HomePage() {
  const enabled = authEnabled();
  const user = enabled ? await currentUser() : null;
  return (
    <main className="min-h-dvh bg-muted/60">
      <nav aria-label="Аккаунт" className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pt-4">
        <img src="/logo.webp" alt="Keleber" width={56} height={40} className="h-9 w-auto sm:invisible" />
        {enabled && <AccountMenu user={user} />}
      </nav>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-4 pb-10 sm:gap-10 sm:py-10">
        <header className="flex flex-col items-center gap-3 text-center">
          <img src="/logo.webp" alt="" width={96} height={69} className="hidden h-16 w-auto sm:block" />
          <h1 className="text-[2.75rem] leading-tight text-balance sm:text-6xl" style={{ fontFamily: "var(--font-great-vibes), cursive" }}>
            Пригласительный сайт
          </h1>
          <p className="max-w-xl text-pretty text-muted-foreground">
            Выберите шаблон — в редакторе можно поменять всё. Гостям отправите ссылку, а их ответы соберутся в список.
          </p>
          {/* Телефон — три колонки (иконка над подписью), компьютер — строка «таблеток». */}
          <ol className="mt-1 grid w-full grid-cols-3 gap-2 text-xs sm:flex sm:w-auto sm:flex-wrap sm:justify-center sm:text-sm">
            {steps.map(({ icon: Icon, text }, i) => (
              <li
                key={text}
                className="flex flex-col items-center gap-1.5 rounded-xl border bg-background px-2 py-2.5 text-balance sm:flex-row sm:gap-2 sm:rounded-full sm:px-3 sm:py-1.5"
              >
                <span className="flex items-center gap-1.5">
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground tabular-nums">
                    {i + 1}
                  </span>
                  <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
                </span>
                {text}
              </li>
            ))}
          </ol>
        </header>
        <section aria-labelledby="templates-heading" className="flex flex-col gap-4">
          <h2 id="templates-heading" className="text-lg font-semibold tracking-tight sm:text-xl">
            Шаблоны
          </h2>
          <TemplateGallery />
        </section>
      </div>
    </main>
  );
}
