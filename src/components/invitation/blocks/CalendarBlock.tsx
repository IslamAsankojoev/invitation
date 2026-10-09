import type { CSSProperties } from "react";
import { findBlock } from "@/lib/blocks";
import { buildMonthGrid, buildWeek, describeDate, parseLocalDate, WEEKDAYS_SHORT } from "@/lib/calendar";
import { Section } from "../Section";
import type { BlockProps } from "./types";

/** Кружок дня события: «выпрыгивает» с пружинкой, вокруг рисуется круг от руки. */
function EventDay({ day }: { day: number }) {
  return (
    <span data-testid="calendar-day" className="relative inline-flex h-9 w-9 items-center justify-center">
      <span aria-hidden="true" className="inv-cal-mark" />
      <svg viewBox="0 0 48 48" className="inv-cal-ring" aria-hidden="true">
        <path d="M27 5.8C37.5 7 43.2 15 42.6 25 42 35.4 33.6 42.6 23.4 42.4 12.8 42.2 5.4 34.2 5.6 23.6 5.8 13.2 14 5.4 24.4 5.6c3.4.1 6 .9 8 2.2" />
      </svg>
      <span className="inv-cal-num relative text-base">{day}</span>
    </span>
  );
}

/** Число дня события: на экране — CSS-счётчик от 1 до дня, настоящая цифра — для скринридеров. */
function CountingDay({ day, className }: { day: number; className: string }) {
  return (
    <span className={`inv-date-day ${className}`} style={{ "--day": day } as CSSProperties}>
      <span className="sr-only">{day}</span>
    </span>
  );
}

/** Месяц события с выделенным днём — как страница настольного календаря; есть ещё три вида. */
export function CalendarBlock({ block, ctx }: BlockProps<"calendar">) {
  const date = findBlock(ctx.data, "hero")?.date;
  if (!date) return null;
  const { year, month, day } = parseLocalDate(date);
  const info = describeDate(date);

  if (block.variant === "date") {
    return (
      <Section block={block}>
        <div className="inv-date-row" data-reveal="2" data-anim="fade">
          <p className="inv-caps inv-date-tag inv-date-tag-center mx-auto w-fit px-6 py-2">{info.weekday}</p>
          <CountingDay day={day} className="my-4 block text-[7.5rem] font-light leading-none" />
          <p className="inv-script text-5xl" data-reveal="3" data-anim="write">
            {info.monthGenitive}
          </p>
        </div>
        <p className="inv-caps mt-6 tracking-[0.5em] opacity-70" data-reveal="4" data-anim="spread">
          {year}
        </p>
        <p className="mt-3 text-lg opacity-70" data-reveal="4">
          в {info.time}
        </p>
      </Section>
    );
  }

  if (block.variant === "week") {
    const week = buildWeek(year, month, day);
    return (
      <Section block={block}>
        <p className="inv-caps opacity-70" data-reveal="2">
          {info.monthName} {year}
        </p>
        <div className="inv-calendar mx-auto mt-6 grid max-w-sm grid-cols-7 gap-1" data-reveal="3" data-anim="fade" aria-label={`Неделя ${info.day} ${info.monthGenitive}`}>
          {week.map((d, i) => (
            <div key={i} className="inv-cal-day flex flex-col items-center gap-2" style={{ "--w": i } as CSSProperties}>
              <span className={`inv-caps text-[0.62rem] ${d.isEvent ? "text-[var(--accent)]" : "opacity-70"}`}>{WEEKDAYS_SHORT[i]}</span>
              {d.isEvent ? <EventDay day={d.day} /> : <span className="flex h-9 items-center text-lg opacity-80">{d.day}</span>}
            </div>
          ))}
        </div>
        <p className="mt-6 text-lg" data-reveal="4">
          {info.weekday}, {info.day} {info.monthGenitive} · {info.time}
        </p>
      </Section>
    );
  }

  if (block.variant === "tearoff") {
    return (
      <Section block={block}>
        <div className="inv-tearoff inv-date-row relative mx-auto w-56" style={{ transform: "rotate(-2deg)" }} data-reveal="2" data-anim="drop">
          <div className="inv-tearoff-head relative rounded-t-xl px-4 pt-5 pb-3 text-center">
            <span aria-hidden="true" className="inv-tearoff-hole left-10" />
            <span aria-hidden="true" className="inv-tearoff-hole right-10" />
            <p className="inv-caps text-[0.75rem]">{info.monthName}</p>
          </div>
          <div className="inv-tearoff-sheet px-4 pt-3 pb-8 text-center text-[#3e3630]">
            <p className="inv-caps text-[0.65rem] opacity-60">{year}</p>
            <CountingDay day={day} className="my-2 block text-[6rem] leading-[1.1] font-light" />
            <p className="inv-caps text-[0.7rem]">{info.weekday}</p>
            <p className="inv-script mt-2 text-3xl">в {info.time}</p>
          </div>
        </div>
      </Section>
    );
  }

  const weeks = buildMonthGrid(year, month);
  return (
    <Section block={block}>
      <div className="inv-date-row mx-auto flex max-w-xs items-center justify-center gap-4" data-reveal="2" data-anim="fade">
        <span className="inv-caps inv-date-tag flex-1 py-2">{info.weekday}</span>
        <CountingDay day={day} className="text-6xl font-light leading-none" />
        <span className="inv-caps inv-date-tag flex-1 py-2">{info.monthGenitive}</span>
      </div>
      <p className="mt-4 text-lg tracking-widest opacity-70" data-reveal="3">
        {year} год
      </p>

      <table className="inv-calendar mx-auto mt-8 w-full max-w-xs text-lg" aria-label={`${info.monthName} ${year}`} data-reveal="3" data-anim="fade">
        <thead>
          <tr>
            {WEEKDAYS_SHORT.map((d) => (
              <th key={d} className="inv-caps pb-3 text-[0.65rem] font-normal opacity-70">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, w) => (
            <tr key={w}>
              {week.map((d, i) => (
                <td key={i} className={`py-1.5 tabular-nums ${i >= 5 && d !== day ? "opacity-60" : ""}`}>
                  {/* --w — номер диагонали: дни появляются волной из левого верхнего угла. */}
                  <span className="inv-cal-day inline-block" style={{ "--w": w + i } as CSSProperties}>
                    {d === day ? <EventDay day={d} /> : d}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
}
