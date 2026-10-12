"use client";

import { Download, Eye, KeyRound, Link2, Send, Share2, Sparkles, Wifi } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { CopyButton } from "@/components/CopyButton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { shareGate } from "@/lib/access";
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
  /** Разработка: адрес сервера в Wi-Fi сети — ссылка для телефона. */
  lanOrigin?: string | null;
  /** Для текста сообщения гостям и ссылки из имён. */
  data: InvitationData;
};

export function LinkPanel({ id, token, slug, onSlugChange, account, lanOrigin, data }: Props) {
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

  // Вход включён — поделиться может только владелец (даже если вход не обязателен): войти и сохранить приглашение
  // в аккаунт, так автор не потеряет доступ. Возврат после входа — на /edit/<id>/claim, он и привяжет приглашение.
  const gate = shareGate(account);
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
  const suggestions = slugSuggestions(data).filter((s) => s !== slug);

  return (
    <div className="flex flex-col gap-4">
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
        {lanOrigin && (
          // Только в dev-режиме: localhost с телефона не открыть — даём адрес компьютера в той же Wi-Fi сети.
          <div className="flex flex-col gap-1.5 rounded-md border border-dashed p-2.5">
            <p className="text-xs text-muted-foreground">С телефона в той же Wi-Fi сети (только в режиме разработки)</p>
            <div className="flex items-center gap-2">
              <Wifi aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              <a
                href={`${lanOrigin}/i/${slug}`}
                target="_blank"
                rel="noopener"
                className="min-w-0 flex-1 truncate text-sm font-medium underline-offset-4 hover:underline"
              >
                {`${lanOrigin}/i/${slug}`}
              </a>
              <CopyButton text={`${lanOrigin}/i/${slug}`} label="Скопировать ссылку для телефона в Wi-Fi сети" />
            </div>
          </div>
        )}
        {/* QR — навести камеру телефона и сразу открыть; адрес сайта известен только после гидратации. */}
        {origin && (
          <div className={`grid gap-3 ${lanOrigin ? "grid-cols-2" : "grid-cols-1 justify-items-center"}`}>
            <QrTile url={publicUrl} caption="Ссылка для гостей" label="QR-код ссылки для гостей" />
            {lanOrigin && <QrTile url={`${lanOrigin}/i/${slug}`} caption="По Wi-Fi (разработка)" label="QR-код ссылки для телефона в Wi-Fi сети" />}
          </div>
        )}
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">Текст сообщения</summary>
          <p className="mt-2 rounded-lg border p-3 whitespace-pre-line">{text}</p>
        </details>
        <Button asChild variant="ghost" size="sm" className="-ml-2 self-start">
          <a href={`/i/${slug}`} target="_blank" rel="noopener">
            <Eye /> Посмотреть как гость
          </a>
        </Button>
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
          {formatError ? <FieldError>{formatError}</FieldError> : <FieldDescription>Латиница, цифры и дефис, 3–40 символов.</FieldDescription>}
        </Field>
        {message && (
          <p role="status" className={message.ok ? "text-sm text-emerald-700 dark:text-emerald-400" : "text-sm text-destructive"}>
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

/** QR-код ссылки: тёмный на белом квадрате — камера читает его при любой теме; подпись — что откроется. */
function QrTile({ url, caption, label }: { url: string; caption: string; label: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  return (
    <figure className="flex w-full max-w-[200px] flex-col items-center gap-2 rounded-lg border p-3">
      <div ref={boxRef} role="img" aria-label={label} data-qr={url} className="w-full rounded-md bg-white p-2.5">
        <QRCode value={url} size={256} level="M" className="block h-auto w-full" aria-hidden="true" />
      </div>
      <figcaption className="text-center text-xs text-muted-foreground">{caption}</figcaption>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label={`Скачать PNG: ${label}`}
        onClick={() => {
          const svg = boxRef.current?.querySelector("svg");
          if (svg) downloadQrPng(svg, `qr-${new URL(url).pathname.split("/").pop() || "invitation"}.png`);
        }}
      >
        <Download /> Скачать PNG
      </Button>
    </figure>
  );
}

/** PNG для печати на открытке: 1024 px, белые поля вокруг кода (камера не читает код вплотную к рисунку). */
const QR_PNG_SIZE = 1024;
const QR_PNG_MARGIN = 64;

function downloadQrPng(svg: SVGSVGElement, fileName: string) {
  const markup = new XMLSerializer().serializeToString(svg);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = QR_PNG_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, QR_PNG_SIZE, QR_PNG_SIZE);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, QR_PNG_MARGIN, QR_PNG_MARGIN, QR_PNG_SIZE - QR_PNG_MARGIN * 2, QR_PNG_SIZE - QR_PNG_MARGIN * 2);
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = fileName;
    a.click();
  };
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}
