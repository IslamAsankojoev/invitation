"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { guestsWord, rsvpInputSchema } from "@/lib/rsvp";
import { heartBurst } from "../burst";
import { prefersReducedMotion } from "../motion";
import { Section } from "../Section";
import type { BlockProps } from "./types";

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; message: string };

const formatDeadline = (d: string) => d.split("-").reverse().join(".");

export function RsvpBlock({ block, ctx }: BlockProps<"rsvp">) {
  const [name, setName] = useState("");
  const [attending, setAttending] = useState(true);
  const [guests, setGuests] = useState(1);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const compact = block.variant === "compact";
  /** Компактный вид: сначала только выбор «приду / не смогу», поля — после него. */
  const [chosen, setChosen] = useState(false);
  const submitRef = useRef<HTMLButtonElement>(null);
  const guestsRef = useRef<HTMLInputElement>(null);
  /** Куда перелистнуть цифру гостей: 1 — вверх (+), −1 — вниз (−), 0 — без анимации (ввод с клавиатуры). */
  const flip = useRef(0);

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
    const input = {
      name,
      attending,
      guestsCount: attending ? guests : 1,
      comment: String(form.get("comment") ?? "") || undefined,
      website: String(form.get("website") ?? "") || undefined,
    };
    const parsed = rsvpInputSchema.safeParse(input);
    if (!parsed.success) return setStatus({ kind: "error", message: parsed.error.issues[0].message });

    setStatus({ kind: "sending" });
    const res = await fetch(`/api/invitations/${ctx.slug}/rsvp`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parsed.data),
    }).catch(() => null);
    if (res?.ok) {
      if (submitRef.current && !prefersReducedMotion()) heartBurst(submitRef.current);
      return setStatus({ kind: "sent" });
    }
    const body = await res?.json().catch(() => null);
    setStatus({ kind: "error", message: body?.error ?? "Не удалось отправить ответ" });
  }

  if (status.kind === "sent") {
    const first = name.trim().split(/\s+/)[0];
    return (
      <Section block={block}>
        <div className="inv-thanks">
          <div className="inv-thanks-heart text-2xl text-[var(--accent)]" aria-hidden="true">
            ♡
          </div>
          <p role="status" className="inv-script inv-thanks-title mt-2 inline-block text-4xl">
            Спасибо!
          </p>
          <p className="inv-thanks-after mx-auto mt-3 max-w-xs text-xl leading-snug">
            {attending
              ? `${first}, мы получили ваше подтверждение: ${guests} ${guestsWord(guests)}.`
              : `${first}, жаль, что вы не сможете прийти. Ваш ответ получен.`}
          </p>
          <button type="button" className="inv-btn-outline inv-thanks-after mt-6" onClick={() => setStatus({ kind: "idle" })}>
            Изменить ответ
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
      до {formatDeadline(block.deadline)}
    </p>
  );

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
            С радостью приду
          </button>
          <button type="button" className="inv-btn-outline justify-center rounded-full py-4" onClick={() => choose(false)}>
            К сожалению, не смогу
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
            {attending ? "Вы придёте — ура! ♡" : "Жаль, что не получится."}{" "}
            <button type="button" className="underline decoration-[var(--accent)] underline-offset-4 opacity-70" onClick={() => setChosen(false)}>
              изменить
            </button>
          </p>
        )}
        <label className="inv-field">
          <span>Ваше имя</span>
          <input
            name="name"
            required
            maxLength={100}
            className="inv-input"
            placeholder="Имя и фамилия"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (status.kind === "error") setStatus({ kind: "idle" });
            }}
          />
        </label>
        <fieldset className={`flex gap-2 ${compact ? "hidden" : ""}`}>
          <legend className="sr-only">Придёте?</legend>
          {[
            [true, "Приду"],
            [false, "Не смогу"],
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
            <span className="text-lg">Сколько вас будет</span>
            <div className="flex items-center overflow-hidden rounded-full border border-[var(--accent)]/40 bg-[var(--field)]">
              <button
                type="button"
                aria-label="Убрать гостя"
                className="inv-counter-btn h-11 w-11 text-xl disabled:opacity-30"
                disabled={guests <= 1}
                onClick={() => step(-1)}
              >
                −
              </button>
              <input
                ref={guestsRef}
                aria-label="Количество гостей"
                inputMode="numeric"
                className="w-8 bg-transparent text-center text-xl tabular-nums outline-none"
                value={guests}
                onChange={(e) => setGuests(clampGuests(Number(e.target.value)))}
              />
              <button
                type="button"
                aria-label="Добавить гостя"
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
          <span>Комментарий</span>
          <textarea name="comment" rows={2} maxLength={1000} className="inv-input" placeholder="Пожелания ..." />
        </label>
        {/* Honeypot: скрыт от людей, боты заполняют. */}
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
        {status.kind === "error" && (
          <p role="alert" className="inv-fade-up text-center text-sm text-red-700">
            {status.message}
          </p>
        )}
        <button ref={submitRef} type="submit" className="inv-btn inv-btn-lift mt-2" disabled={ctx.preview || status.kind === "sending"}>
          {status.kind === "sending" ? "Отправляю…" : "Подтвердить"}
        </button>
        {ctx.preview && <p className="text-center text-sm opacity-60">В превью ответы не отправляются</p>}
      </form>
    </Section>
  );
}
