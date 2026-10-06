import { findBlock } from "./blocks";
import type { Block, BlockOf, BlockType, InvitationData } from "./schema";
import { exampleBlocks } from "./templates";

export type ChecklistItem = { key: "names" | "place" | "program" | "deadline"; label: string; blockId: string; done: boolean };

/** Значение ещё как в каком-нибудь примере (общем или из шаблона) — значит, организатор его не менял. */
function isExample<T extends BlockType>(type: T, value: (b: BlockOf<T>) => unknown, block: BlockOf<T>): boolean {
  const mine = JSON.stringify(value(block));
  return (exampleBlocks(type) as BlockOf<T>[]).some((e) => JSON.stringify(value(e)) === mine);
}

/**
 * «Что осталось заполнить»: главное, без чего приглашение не отправить. Новое приглашение уже заполнено примером,
 * поэтому «не заполнено» — это «совпадает с примером», а не «пусто». Скрытые и отсутствующие блоки не в списке.
 */
export function checklist(data: InvitationData): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  const visible = <T extends BlockType>(type: T) => {
    const b = findBlock(data, type) as Block | undefined;
    return b?.visible ? (b as BlockOf<T>) : undefined;
  };
  const hero = visible("hero");
  if (hero)
    items.push({
      key: "names",
      label: "Имена и дата",
      blockId: hero.id,
      done: !!hero.names.trim() && !isExample("hero", (b) => b.names.trim(), hero) && !isExample("hero", (b) => b.date, hero),
    });
  const location = visible("location");
  if (location)
    items.push({
      key: "place",
      label: "Место",
      blockId: location.id,
      done: !!location.address.trim() && !isExample("location", (b) => b.address.trim(), location),
    });
  const program = visible("program");
  if (program)
    items.push({
      key: "program",
      label: "Программа",
      blockId: program.id,
      done: program.items.length > 0 && !isExample("program", (b) => b.items.map(({ time, title }) => [time, title]), program),
    });
  const rsvp = visible("rsvp");
  if (rsvp)
    items.push({
      key: "deadline",
      label: "Срок ответа",
      blockId: rsvp.id,
      done: !!rsvp.deadline && !isExample("rsvp", (b) => b.deadline ?? null, rsvp),
    });
  return items;
}
