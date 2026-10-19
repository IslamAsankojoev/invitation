"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { guestText, type GuestText } from "@/lib/i18n";
import { rsvpInputSchema } from "@/lib/rsvp";
import { loadAnswer, saveAnswer, type SavedAnswer } from "@/lib/rsvpMemory";
import { heartBurst } from "../burst";
import { prefersReducedMotion } from "../motion";
import { Section } from "../Section";
import type { BlockProps } from "./types";

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; message: string };

const formatDeadline = (d: string) => d.split("-").reverse().join(".");

/** Вид «Три ответа» (как на toigokel.kg): ответ сразу задаёт, придёт ли гость и сколько их. Подпись — `label(t)`. */
const CHOICES = [
  { id: "alone", label: (t: GuestText["rsvp"]) => t.choiceAlone, attending: true, guests: 1 },
  { id: "spouse", label: (t: GuestText["rsvp"]) => t.choiceSpouse, attending: true, guests: 2 },
  { id: "declined", label: (t: GuestText["rsvp"]) => t.choiceDeclined, attending: false, guests: 1 },
] as const;
type Choice = (typeof CHOICES)[number]["id"];

/** Какой из трёх ответов соответствует сохранённому; другое число гостей (ответ дан в другом виде анкеты) — никакой. */
const choiceOf = ({ attending, guestsCount }: Pick<SavedAnswer, "attending" | "guestsCount">): Choice | null =>
  CHOICES.find((c) => c.attending === attending && (!attending || c.guests === guestsCount))?.id ?? null;

export function RsvpBlock({ block, ctx }: BlockProps<"rsvp">) {
  const lang = ctx.data.language;
  const t = guestText(lang).rsvp;
  const [name, setName] = useState("");
  const [attending, setAttending] = useState(true);
  const [guests, setGuests] = useState(1);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  /** Ответ, уже отправленный с этого устройства: «Изменить ответ» обновит ту же запись, а не добавит вторую. */
  const [saved, setSaved] = useState<SavedAnswer | null>(null);
  /** «Спасибо» показано не после отправки, а потому что гость вернулся с готовым ответом. */
  const [restored, setRestored] = useState(false);
  const compact = block.variant === "compact";
  /** Компактный вид: сначала только выбор «приду / не смогу», поля — после него. */
  const [chosen, setChosen] = useState(false);
  const choices = block.variant === "choices";
  const [choice, setChoice] = useState<Choice | null>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const guestsRef = useRef<HTMLInputElement>(null);
  /** Куда перелистнуть цифру гостей: 1 — вверх (+), −1 — вниз (−), 0 — без анимации (ввод с клавиатуры). */
  const flip = useRef(0);

  // Гость уже отвечал с этого устройства — сразу его ответ. Только после монтирования: на сервере localStorage нет.
  // В превью редактора и показе шаблона ответов нет — там всегда пустая форма.
  useEffect(() => {
    if (ctx.preview || ctx.demo) return;
    const answer = loadAnswer(ctx.slug);
    if (!answer) return;
    setSaved(answer);
    setName(answer.name);
    setAttending(answer.attending);
    setGuests(answer.guestsCount);
    setComment(answer.comment);
    setChosen(true);
    setChoice(choiceOf(answer));
    setRestored(true);
    setStatus({ kind: "sent" });
  }, [ctx.preview, ctx.demo, ctx.slug]);

  useEffect(() => {
    const el = guestsRef.current;
    const dir = flip.current;
    flip.current = 0;
    if (!el || !dir || prefersReducedMotion() || typeof el.animate !== "function") return;
    el.animate(
      [
        { transform: `translateY(${dir * 70}%)`, opacity: 0, filter: "blur(2px)" },
        { transform: "none", opacity: 1, filter: "none" },
      ],
      { duration: 420, easing: "cubic-bezier(.22,.61,.36,1)" },
    );
  }, [guests]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (ctx.preview) return;
    const form = new FormData(e.currentTarget);
    if (choices && (!choice || !name.trim())) return setStatus({ kind: "error", message: t.pickNameAndAnswer });
    const input = {
      name,
      attending,
      guestsCount: attending ? guests : 1,
      comment: comment.trim() || undefined,
      website: String(form.get("website") ?? "") || undefined,
    };
    const parsed = rsvpInputSchema.safeParse(input);
    // Тексты ошибок схемы — русские; на кыргызском — общая подсказка.
    if (!parsed.success) return setStatus({ kind: "error", message: lang === "ru" ? parsed.error.issues[0].message : t.checkForm });
    if (ctx.demo) {
      // Показ шаблона: приглашения в базе нет — показываем, как гостя поблагодарят.
      if (submitRef.current && !prefersReducedMotion()) heartBurst(submitRef.current);
      return setStatus({ kind: "sent" });
    }

    setStatus({ kind: "sending" });
    const send = (method: "POST" | "PATCH", body: object) =>
      fetch(`/api/invitations/${ctx.slug}/rsvp`, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }).catch(() => null);
    // Уже отвечали с этого устройства — меняем ту же запись. Её нет на сервере (404) — отправляем как новый ответ;
    // при сбое сети новый не шлём, иначе ответ мог бы задвоиться.
    let res = saved ? await send("PATCH", { ...parsed.data, id: saved.id, secret: saved.secret }) : null;
    let keys = saved && { id: saved.id, secret: saved.secret };
    if (!saved || res?.status === 404) {
      res = await send("POST", parsed.data);
      const body = res?.ok ? await res.json().catch(() => null) : null;
      keys = typeof body?.id === "string" && typeof body?.secret === "string" ? { id: body.id, secret: body.secret } : null;
    }
    if (res?.ok) {
      if (keys) {
        const { name, attending, guestsCount } = parsed.data;
        const answer = { ...keys, name, attending, guestsCount, comment: parsed.data.comment ?? "" };
        saveAnswer(ctx.slug, answer);
        setSaved(answer);
      }
      if (submitRef.current && !prefersReducedMotion()) heartBurst(submitRef.current);
      return setStatus({ kind: "sent" });
    }
    const body = await res?.json().catch(() => null);
    setStatus({ kind: "error", message: (lang === "ru" && body?.error) || t.sendFailed });
  }

  if (status.kind === "sent") {
    const first = name.trim().split(/\s+/)[0];
    return (
      <Section block={block}>
        <div className="inv-thanks">
          <div className="inv-thanks-heart text-2xl text-[var(--accent)]" aria-hidden="true">
            ♡
          </div>
          <p role={restored ? undefined : "status"} className="inv-script inv-thanks-title mt-2 inline-block text-4xl">
            {restored ? t.alreadyAnswered : t.thanks}
          </p>
          <p className="inv-thanks-after mx-auto mt-3 max-w-xs text-xl leading-snug">
            {attending ? t.thanksAttending(first, guests) : t.thanksDeclined(first)}
          </p>
          <button
            type="button"
            className="inv-btn-outline inv-thanks-after mt-6"
            onClick={() => {
              setRestored(false);
              setStatus({ kind: "idle" });
            }}
          >
            {t.changeAnswer}
          </button>
        </div>
      </Section>
    );
  }

  const clampGuests = (n: number) => Math.min(10, Math.max(1, Number.isFinite(n) ? Math.round(n) : 1));
  const step = (dir: 1 | -1) => {
    flip.current = dir;
    setGuests((g) => clampGuests(g + dir));
  };

  const deadline = block.deadline && (
    <p className="inv-caps -mt-4 mb-8 opacity-70" data-reveal="2">
      {t.until(formatDeadline(block.deadline))}
    </p>
  );

  if (choices) {
    return (
      <Section block={block}>
        {deadline}
        <form onSubmit={submit} noValidate className="inv-rsvp-card mx-auto flex max-w-sm flex-col gap-5 rounded-3xl px-6 py-7 text-left" data-reveal="3" data-anim="fade">
          <label className="inv-field">
            <span>{t.namesLabel}</span>
            <input
              name="name"
              required
              maxLength={100}
              className="inv-input"
              placeholder={t.namesPlaceholder}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (status.kind === "error") setStatus({ kind: "idle" });
              }}
            />
          </label>
          <fieldset className="flex flex-col gap-2.5">
            <legend className="mb-2.5 pl-1 text-lg opacity-80">{t.yourAnswer}</legend>
            {CHOICES.map((c) => (
              <label key={c.id} className="inv-option" data-checked={choice === c.id || undefined}>
                <input
                  type="radio"
                  name="answer"
                  className="sr-only"
                  checked={choice === c.id}
                  onChange={() => {
                    setChoice(c.id);
                    setAttending(c.attending);
                    setGuests(c.guests);
                    if (status.kind === "error") setStatus({ kind: "idle" });
                  }}
                />
                <span aria-hidden="true" className="inv-option-dot" />
                {c.label(t)}
              </label>
            ))}
          </fieldset>
          <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
          {status.kind === "error" && (
            <p role="alert" className="inv-fade-up text-center text-sm text-red-700">
              {status.message}
            </p>
          )}
          <button ref={submitRef} type="submit" className="inv-btn inv-btn-lift mt-1" disabled={ctx.preview || status.kind === "sending"}>
            {status.kind === "sending" ? t.sending : t.send}
          </button>
          {ctx.preview && <p className="text-center text-sm opacity-60">В превью ответы не отправляются</p>}
        </form>
      </Section>
    );
  }

  if (compact && !chosen) {
    const choose = (value: boolean) => {
      setAttending(value);
      setChosen(true);
    };
    return (
      <Section block={block}>
        {deadline}
        <div className="mx-auto flex max-w-xs flex-col gap-3" data-reveal="3">
          <button type="button" className="inv-btn inv-btn-lift py-4" onClick={() => choose(true)}>
            {t.gladlyCome}
          </button>
          <button type="button" className="inv-btn-outline justify-center rounded-full py-4" onClick={() => choose(false)}>
            {t.sadlyNot}
          </button>
        </div>
      </Section>
    );
  }

  return (
    <Section block={block}>
      {deadline}
      <form onSubmit={submit} noValidate className={`mx-auto flex max-w-xs flex-col gap-4 text-left ${compact ? "inv-fade-up" : ""}`} data-reveal="3">
        {compact && (
          <p className="text-center text-lg">
            {attending ? t.youCome : t.sorry}{" "}
            <button type="button" className="underline decoration-[var(--accent)] underline-offset-4 opacity-70" onClick={() => setChosen(false)}>
              {t.change}
            </button>
          </p>
        )}
        <label className="inv-field">
          <span>{t.nameLabel}</span>
          <input
            name="name"
            required
            maxLength={100}
            className="inv-input"
            placeholder={t.namePlaceholder}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (status.kind === "error") setStatus({ kind: "idle" });
            }}
          />
        </label>
        <fieldset className={`flex gap-2 ${compact ? "hidden" : ""}`}>
          <legend className="sr-only">{t.willYouCome}</legend>
          {[
            [true, t.yes],
            [false, t.no],
          ].map(([value, label]) => (
            <label key={String(value)} className={`inv-choice ${attending === value ? "inv-choice-active" : ""}`}>
              <input
                type="radio"
                name="attending"
                className="sr-only"
                checked={attending === value}
                onChange={() => setAttending(value as boolean)}
              />
              {label}
            </label>
          ))}
        </fieldset>
        {attending && (
          <div className="flex items-center justify-between pl-5">
            <span className="text-lg">{t.howMany}</span>
            <div className="flex items-center overflow-hidden rounded-full border border-[var(--accent)]/40 bg-[var(--field)]">
              <button
                type="button"
                aria-label={t.lessGuests}
                className="inv-counter-btn h-11 w-11 text-xl disabled:opacity-30"
                disabled={guests <= 1}
                onClick={() => step(-1)}
              >
                −
              </button>
              <input
                ref={guestsRef}
                aria-label={t.guestsCount}
                inputMode="numeric"
                className="w-8 bg-transparent text-center text-xl tabular-nums outline-none"
                value={guests}
                onChange={(e) => setGuests(clampGuests(Number(e.target.value)))}
              />
              <button
                type="button"
                aria-label={t.moreGuests}
                className="inv-counter-btn h-11 w-11 text-xl disabled:opacity-30"
                disabled={guests >= 10}
                onClick={() => step(1)}
              >
                +
              </button>
            </div>
          </div>
        )}
        <label className="inv-field">
          <span>{t.comment}</span>
          <textarea
            name="comment"
            rows={2}
            maxLength={1000}
            className="inv-input"
            placeholder={t.commentPlaceholder}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </label>
        {/* Honeypot: скрыт от людей, боты заполняют. */}
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
        {status.kind === "error" && (
          <p role="alert" className="inv-fade-up text-center text-sm text-red-700">
            {status.message}
          </p>
        )}
        <button ref={submitRef} type="submit" className="inv-btn inv-btn-lift mt-2" disabled={ctx.preview || status.kind === "sending"}>
          {status.kind === "sending" ? t.sending : t.confirm}
        </button>
        {ctx.preview && <p className="text-center text-sm opacity-60">В превью ответы не отправляются</p>}
      </form>
    </Section>
  );
}
