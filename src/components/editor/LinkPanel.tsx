"use client";

import { AlertTriangle, Check, CircleCheck, Copy, Eye, KeyRound, Link2, Send, Share2, Sparkles } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { accountGate } from "@/lib/access";
import { checklist } from "@/lib/checklist";
import type { InvitationData } from "@/lib/schema";
import { shareMessage, slugSuggestions, telegramShareUrl, whatsappShareUrl } from "@/lib/share";
import { slugSchema } from "@/lib/slug";
import { patchInvitation } from "./api";
import { AccountRequired } from "./AccountRequired";
import { Group } from "./controls";
import type { EditorAccount } from "./Editor";

type Props = {
  id: string;
  token: string;
  slug: string;
  onSlugChange: (slug: string) => void;
  account?: EditorAccount;
  /** Для текста сообщения гостям и ссылки из имён. */
  data: InvitationData;
  /** «Заполнить» в проверке перед отправкой — открыть этот блок в панели. */
  onFix?: (blockId: string) => void;
};

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      aria-label={label}
      onClick={async () => {
        await navigator.clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check /> : <Copy />}
    </Button>
  );
}

export function LinkPanel({ id, token, slug, onSlugChange, account, data, onFix }: Props) {
  const [value, setValue] = useState(slug);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [origin, setOrigin] = useState("");
  /** Системное «Поделиться» есть почти на всех телефонах, на компьютере — не везде. */
  const [canShare, setCanShare] = useState(false);
  const slugId = useId();
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

  async function save(next = value) {
    if (!slugSchema.safeParse(next).success || next === slug) return;
    try {
      await patchInvitation(id, token, { slug: next });
      onSlugChange(next);
      setValue(next);
      setMessage({ ok: true, text: "Ссылка сохранена" });
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    }
  }

  const text = shareMessage(data, publicUrl);
  // Проверка перед отправкой: тексты из примера шаблона гостям уйдут как есть («Ресторан «Сад»» вместо своего места).
  const missing = checklist(data).filter((item) => !item.done);
  const suggestions = slugSuggestions(data).filter((s) => s !== slug);

  return (
    <div className="flex flex-col gap-4">
      {missing.length > 0 ? (
        <Alert data-testid="presend-check" className="border-amber-300 bg-amber-50 text-amber-950">
          <AlertTriangle />
          <AlertTitle>Перед отправкой проверьте</AlertTitle>
          <AlertDescription className="text-amber-900">
            <p>Ещё как в примере шаблона — гости увидят чужие данные:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {missing.map((item) => (
                <Button
                  key={item.key}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-amber-300 bg-white"
                  aria-label={`Заполнить: ${item.label}`}
                  onClick={() => onFix?.(item.blockId)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      ) : (
        <p data-testid="presend-check" className="flex items-center gap-2 text-sm text-emerald-700">
          <CircleCheck className="size-4" /> Главное заполнено — можно отправлять
        </p>
      )}

      <Group title="Отправьте гостям">
        <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
          <Link2 className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{publicUrl}</span>
          <CopyButton text={publicUrl} label="Скопировать ссылку для гостей" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button asChild size="lg" className="bg-[#25d366] text-white hover:bg-[#1ebe5b]">
            <a href={whatsappShareUrl(text)} target="_blank" rel="noopener noreferrer" aria-label="Отправить в WhatsApp">
              <Send /> WhatsApp
            </a>
          </Button>
          <Button asChild size="lg" className="bg-[#2aabee] text-white hover:bg-[#1e96d4]">
            <a href={telegramShareUrl(publicUrl, text)} target="_blank" rel="noopener noreferrer" aria-label="Отправить в Telegram">
              <Send /> Telegram
            </a>
          </Button>
          {canShare && (
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="col-span-2"
              onClick={() => navigator.share({ text: text.replace(`\n\n${publicUrl}`, ""), url: publicUrl }).catch(() => {})}
            >
              <Share2 /> Другое приложение…
            </Button>
          )}
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">Текст сообщения</summary>
          <p className="mt-2 rounded-lg border p-3 whitespace-pre-line">{text}</p>
        </details>
        <Button asChild variant="ghost" size="sm" className="-ml-2 self-start">
          <a href={`/i/${slug}`} target="_blank">
            <Eye /> Посмотреть как гость
          </a>
        </Button>
        <p className="text-xs text-muted-foreground">
          Совет: откройте приглашение как гость на телефоне и отправьте ответ сами — так проверите анкету. Пробный ответ
          потом можно удалить на странице «Гости».
        </p>
      </Group>

      <Group title="Красивая ссылка">
        {suggestions.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">Ссылку из имён гостям проще узнать и запомнить:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <Button key={s} type="button" variant="outline" size="sm" onClick={() => save(s)} aria-label={`Сделать ссылку /i/${s}`}>
                  <Sparkles /> /i/{s}
                </Button>
              ))}
            </div>
          </div>
        )}
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
            <Button type="button" disabled={!!formatError || value === slug} onClick={() => save()}>
              Сохранить
            </Button>
          </div>
          {formatError ? (
            <FieldError>{formatError}</FieldError>
          ) : (
            <FieldDescription>Латинские буквы, цифры и дефис. Поменяйте до того, как отправите гостям.</FieldDescription>
          )}
        </Field>
        {message && (
          <p role="status" className={message.ok ? "text-sm text-emerald-700" : "text-sm text-destructive"}>
            {message.text}
          </p>
        )}
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

