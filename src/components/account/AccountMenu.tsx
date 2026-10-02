"use client";

import { FolderHeart, LogOut } from "lucide-react";
import { signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { SessionUser } from "@/lib/session";

/** Значок Google для кнопки входа. */
export function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.6 10.6 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
    </svg>
  );
}

/** Вход через Google; после входа вернёт на redirectTo (по умолчанию — текущая страница). */
export function SignInButton({
  redirectTo,
  label = "Войти через Google",
  chooseAccount = false,
  ...props
}: { redirectTo?: string; label?: string; /** Показать выбор аккаунта Google, даже если вход уже был. */ chooseAccount?: boolean } & React.ComponentProps<
  typeof Button
>) {
  return (
    <Button
      type="button"
      {...props}
      onClick={() =>
        signIn("google", { redirectTo: redirectTo ?? window.location.href }, chooseAccount ? { prompt: "select_account" } : undefined)
      }
    >
      <GoogleIcon /> {label}
    </Button>
  );
}

/** Аккаунт в шапке: «Войти» или кружок с аватаром → почта, «Мои приглашения», «Выйти». */
export function AccountMenu({ user }: { user: SessionUser | null }) {
  if (!user) return <SignInButton variant="outline" size="sm" label="Войти" />;
  const initial = (user.name || user.email || "?").trim()[0]?.toUpperCase();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="icon-sm" className="overflow-hidden rounded-full" aria-label={`Аккаунт ${user.email ?? ""}`.trim()}>
          {user.image ? <img src={user.image} alt="" referrerPolicy="no-referrer" className="size-full object-cover" /> : initial}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-60 flex-col gap-1 p-2">
        <div className="px-2 py-1.5 text-sm">
          {user.name && <p className="truncate font-medium">{user.name}</p>}
          {user.email && <p className="truncate text-xs text-muted-foreground">{user.email}</p>}
        </div>
        <Button asChild variant="ghost" size="sm" className="justify-start">
          <a href="/my">
            <FolderHeart /> Мои приглашения
          </a>
        </Button>
        <Button type="button" variant="ghost" size="sm" className="justify-start" onClick={() => signOut({ redirectTo: "/" })}>
          <LogOut /> Выйти
        </Button>
      </PopoverContent>
    </Popover>
  );
}

