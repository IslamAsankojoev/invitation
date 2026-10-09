import { describe, expect, it } from "vitest";
import { createHistory, HISTORY_LIMIT, MERGE_MS, record, redo, undo } from "@/lib/history";

describe("история правок", () => {
  it("отменить и вернуть; новая правка после отмены стирает «вперёд»", () => {
    let h = createHistory("a");
    h = record(h, "b", 10_000);
    h = record(h, "c", 20_000);
    h = undo(h);
    expect(h.present).toBe("b");
    h = undo(h);
    expect(h.present).toBe("a");
    expect(undo(h)).toBe(h);
    h = redo(h);
    expect(h.present).toBe("b");
    h = record(h, "x", 30_000);
    expect(h.future).toEqual([]);
    expect(redo(h)).toBe(h);
    expect(undo(h).present).toBe("b");
  });

  it("правки чаще MERGE_MS — один шаг (набор текста), после отмены не склеиваются", () => {
    let h = createHistory("");
    h = record(h, "А", 1000);
    h = record(h, "Ай", 1000 + MERGE_MS / 2);
    h = record(h, "Айб", 1000 + MERGE_MS);
    expect(h.past).toEqual([""]);
    h = undo(h);
    expect(h.present).toBe("");
    h = record(h, "Б", 1000 + MERGE_MS + 10);
    expect(h.past).toEqual([""]);
  });

  it("та же ссылка — не правка; не больше HISTORY_LIMIT шагов; вход не меняется", () => {
    const h0 = createHistory(0);
    expect(record(h0, 0, 5)).toBe(h0);
    let h = h0;
    for (let i = 1; i <= HISTORY_LIMIT + 10; i++) h = record(h, i, i * MERGE_MS * 2);
    expect(h.past).toHaveLength(HISTORY_LIMIT);
    expect(h0).toEqual(createHistory(0));
  });
});
