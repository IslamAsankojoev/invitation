import { AccountMenu } from "@/components/account/AccountMenu";
import { TemplateGallery } from "@/components/templates/TemplateGallery";
import { authEnabled, currentUser } from "@/lib/session";

// Вход включается ключами Google в окружении — проверяем на каждом запросе, а не один раз при сборке.
export const dynamic = "force-dynamic";

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
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:py-14">
        <header className="flex flex-col items-center gap-3 text-center">
          <img src="/logo.webp" alt="Keleber" width={96} height={69} className="h-16 w-auto" />
          <h1 className="text-5xl sm:text-6xl" style={{ fontFamily: "var(--font-great-vibes), cursive" }}>
            Пригласительный сайт
          </h1>
          <p className="max-w-xl text-muted-foreground">
            Выберите шаблон — дальше в редакторе можно поменять всё: тексты, фото, цвета, шрифты, украшения и музыку.
            Гостям вы отправите ссылку, а их ответы соберутся в список.
          </p>
        </header>
        <TemplateGallery />
      </div>
    </main>
  );
}
