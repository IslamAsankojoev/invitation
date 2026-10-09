import { describe, expect, it } from "vitest";
import { commit, createHistory, redo, undo } from "@/lib/history";

describe("history", () => {
  it("отменяет и повторяет правки по шагам", () => {
    let h = createHistory("a");
    h = commit(h, "b", 1000);
    h = commit(h, "c", 5000);
    expect(undo(h).present).toBe("b");
    expect(undo(undo(h)).present).toBe("a");
    expect(undo(undo(undo(h))).present).toBe("a"); // дальше некуда
    expect(redo(undo(undo(h))).present).toBe("b");
  });

  it("частые правки (набор текста) сливаются в один шаг", () => {
    let h = createHistory("");
    for (const [i, v] of ["А", "Ан", "Анн", "Анна"].entries()) h = commit(h, v, 1000 + i * 100);
    expect(h.past).toEqual([""]);
    expect(undo(h).present).toBe("");
  });

  it("новая правка после отмены стирает «повторить» и не сливается с отменённой", () => {
    let h = commit(commit(createHistory("a"), "b", 1000), "c", 5000);
    h = undo(h);
    h = commit(h, "x", 5100);
    expect(h.future).toEqual([]);
    expect(h.past).toEqual(["a", "b"]);
  });

  it("не мутирует вход, ограничивает длину, тот же объект — не правка", () => {
    const h0 = createHistory(0);
    let h = h0;
    for (let i = 1; i <= 5; i++) h = commit(h, i, i * 10_000, 700, 3);
    expect(h.past).toEqual([2, 3, 4]);
    expect(h0).toEqual({ past: [], present: 0, future: [], at: 0 });
    expect(commit(h, h.present, 1)).toBe(h);
  });
});
