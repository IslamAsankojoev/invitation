"use client";

import { FolderHeart } from "lucide-react";
import { SignInButton } from "@/components/account/AccountMenu";
import { Button } from "@/components/ui/button";
import { claimUrl, type AccountGate, type ClaimNext } from "@/lib/access";
import type { EditorAccount } from "./Editor";

const texts: Record<NonNullable<AccountGate>, { title: string; text: string }> = {
  login: {
    title: "Войдите, чтобы продолжить",
    text: "Ссылка для гостей, просмотр приглашения и ответы гостей доступны после входа через Google. Приглашение сохранится в ваш аккаунт — открыть его можно будет с любого устройства в «Моих приглашениях».",
  },
  save: {
    title: "Сохраните приглашение в аккаунт",
    text: "Так вы получите ссылку для гостей и не потеряете доступ к редактору: приглашение появится в «Моих приглашениях».",
  },
  other: {
    title: "Приглашение сохранено в другом аккаунте",
    text: "Ссылку для гостей и ответы видит только владелец. Войдите тем аккаунтом Google, в который его сохранили.",
  },
};

/**
 * Что сделать, чтобы открыть ссылки и ответы гостей: войти, сохранить приглашение в аккаунт или сменить аккаунт.
 * next — куда вернуться после сохранения (редактор или ответы гостей).
 */
export function AccountRequired({
  id,
  token,
  account,
  gate,
  next = "editor",
}: {
  id: string;
  token: string;
  account: EditorAccount;
  gate: NonNullable<AccountGate>;
  next?: ClaimNext;
}) {
  const claim = claimUrl(id, token, next);
  // Ничьё приглашение после входа сразу сохраняем в аккаунт; своё — просто возвращаемся куда шли.
  const afterLogin = account.ownership === "none" ? claim : next === "guests" ? `/edit/${id}/guests` : undefined;
  return (
    <div data-testid="account-required" className="flex flex-col items-start gap-3 text-sm">
      <FolderHeart className="size-6 text-primary" />
      <p className="font-medium">{texts[gate].title}</p>
      <p className="text-muted-foreground">{texts[gate].text}</p>
      {gate === "login" && <SignInButton redirectTo={afterLogin} />}
      {gate === "save" && (
        <Button asChild>
          <a href={claim}>Сохранить в аккаунт {account.user?.email}</a>
        </Button>
      )}
      {gate === "other" && <SignInButton variant="outline" label="Войти другим аккаунтом" chooseAccount />}
    </div>
  );
}
