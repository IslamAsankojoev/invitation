import { afterEach, describe, expect, it, vi } from "vitest";
import { answerKey, loadAnswer, parseSavedAnswer, saveAnswer, type SavedAnswer } from "@/lib/rsvpMemory";
import { hashRsvpSecret, newRsvpSecret } from "@/lib/rsvpSecret";

const answer: SavedAnswer = { id: "r1", secret: "s".repeat(32), name: "Ольга", attending: true, guestsCount: 2, comment: "" };

describe("rsvpMemory — ответ гостя в его браузере", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("разбирает сохранённый ответ; битый или чужой формат — как будто ответа нет", () => {
    expect(parseSavedAnswer(JSON.stringify(answer))).toEqual(answer);
    expect(parseSavedAnswer(JSON.stringify({ ...answer, comment: undefined }))).toEqual(answer);
    expect(parseSavedAnswer(null)).toBeNull();
    expect(parseSavedAnswer("{не json")).toBeNull();
    expect(parseSavedAnswer(JSON.stringify({ id: "r1", editKey: "старый формат" }))).toBeNull();
    expect(parseSavedAnswer(JSON.stringify({ ...answer, guestsCount: 0 }))).toBeNull();
  });

  it("хранит по ключу приглашения", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) });
    saveAnswer("demo", answer);
    expect([...store.keys()]).toEqual([answerKey("demo")]);
    expect(loadAnswer("demo")).toEqual(answer);
    expect(loadAnswer("other")).toBeNull();
  });

  it("недоступное хранилище не роняет анкету", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    });
    expect(loadAnswer("demo")).toBeNull();
    expect(() => saveAnswer("demo", answer)).not.toThrow();
  });
});

describe("rsvpSecret", () => {
  it("секреты случайные, хэш постоянный и не совпадает с секретом", () => {
    const a = newRsvpSecret();
    expect(a).toMatch(/^[\w-]{32}$/);
    expect(newRsvpSecret()).not.toBe(a);
    expect(hashRsvpSecret(a)).toBe(hashRsvpSecret(a));
    expect(hashRsvpSecret(a)).toMatch(/^[0-9a-f]{64}$/);
  });
});
