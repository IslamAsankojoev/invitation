"use client";

import { KeyRound, Link2, Share2 } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { CopyButton } from "@/components/CopyButton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { accountGate } from "@/lib/access";
import { slugSchema } from "@/lib/slug";
import { patchInvitation } from "./api";
import { AccountRequired } from "./AccountRequired";
import { Group } from "./controls";
import type { EditorAccount } from "./Editor";

type Props = { id: string; token: string; slug: string; onSlugChange: (slug: string) => void; account?: EditorAccount };

export function LinkPanel({ id, token, slug, onSlugChange, account }: Props) {
  const [value, setValue] = useState(slug);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [origin, setOrigin] = useState("");
  const slugId = useId();
  /** Системное меню «Поделиться» (телефоны) — после гидратации, на сервере его нет. */
  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    setOrigin(window.location.origin);
    setCanShare(typeof navigator.share === "function");
  }, []);

  const formatError = slugSchema.safeParse(value).error?.issues[0].message;
  const publicUrl = `${origin}/i/${slug}`;
  const editorUrl = `${origin}/edit/${id}?token=${token}`;

  // Вход включён — ссылки только владельцу: войти и сохранить приглашение в аккаунт (так автор не потеряет доступ,
  // а у нас останется его контакт). Возврат после входа — на /edit/<id>/claim, он и привяжет приглашение.
  const gate = accountGate(account);
  if (account && gate)
    return (
      <Group title="Ссылка для гостей">
        <AccountRequired id={id} token={token} account={account} gate={gate} />
      </Group>
    );

  async function save() {
    if (formatError || value === slug) return;
    try {
      await patchInvitation(id, token, { slug: value });
      onSlugChange(value);
      setMessage({ ok: true, text: "Ссылка сохранена" });
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Group title="Адрес приглашения">
        <Field data-invalid={!!formatError || undefined}>
          <FieldLabel htmlFor={slugId}>Адрес приглашения</FieldLabel>
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center rounded-md border border-input shadow-xs focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
              <span className="pl-2.5 text-sm text-muted-foreground">/i/</span>
              <Input
                id={slugId}
                className="border-0 pl-0.5 shadow-none focus-visible:ring-0"
                aria-invalid={!!formatError || undefined}
                value={value}
                maxLength={40}
                onChange={(e) => {
                  setValue(e.target.value.toLowerCase());
                  setMessage(null);
                }}
              />
            </div>
            <Button type="button" disabled={!!formatError || value === slug} onClick={save}>
              Сохранить
            </Button>
          </div>
          {formatError ? <FieldError>{formatError}</FieldError> : <FieldDescription>Латиница, цифры и дефис, 3–40 символов.</FieldDescription>}
        </Field>
        {message && (
          <p role="status" className={message.ok ? "text-sm text-emerald-700" : "text-sm text-destructive"}>
            {message.text}
          </p>
        )}
      </Group>

      {/* Главное действие вкладки — отправить ссылку гостям: крупные кнопки, а не только иконка. */}
      <Group title="Ссылка для гостей">
        <div className="flex items-center gap-2">
          <Link2 aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <a href={`/i/${slug}`} target="_blank" rel="noopener" className="min-w-0 flex-1 truncate text-sm font-medium underline-offset-4 hover:underline">
            {publicUrl}
          </a>
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyButton text={publicUrl} label="Скопировать ссылку для гостей" variant="default" className="flex-1 pointer-coarse:h-10">
            Скопировать ссылку для гостей
          </CopyButton>
          {canShare && (
            <Button type="button" variant="outline" size="sm" className="pointer-coarse:h-10" onClick={() => navigator.share({ url: publicUrl }).catch(() => {})}>
              <Share2 /> Отправить
            </Button>
          )}
        </div>
      </Group>

      <Alert>
        <KeyRound />
        <AlertTitle>Ссылка на редактор — ваш ключ доступа</AlertTitle>
        {/* min-w-0: иначе ячейка сетки Alert растягивается под длинную ссылку и текст вылезает за карточку. */}
        <AlertDescription className="min-w-0">
          <p>
            {account?.ownership === "mine"
              ? "Приглашение сохранено в вашем аккаунте — оно есть в «Моих приглашениях». Ссылкой можно поделиться с тем, кто будет редактировать вместе с вами."
              : "Сохраните её и никому не отправляйте."}
          </p>
          <div className="mt-2 flex w-full items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-xs">{editorUrl}</code>
            <CopyButton text={editorUrl} label="Скопировать ссылку на редактор" />
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}

