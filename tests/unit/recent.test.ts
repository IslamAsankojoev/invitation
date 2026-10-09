import { describe, expect, it } from "vitest";
import { forgetInvitation, MAX_RECENT, parseRecent, rememberInvitation, type RecentInvitation } from "@/lib/recent";

const entry = (id: string, at = 1): RecentInvitation => ({ id, token: `t-${id}`, names: `Имена ${id}`, date: "2027-06-19T16:00", at });

describe("недавние приглашения", () => {
  it("свежее — первым, без повторов, не больше MAX_RECENT; вход не меняется", () => {
    const list = [entry("a"), entry("b")];
    const next = rememberInvitation(list, { ...entry("b", 2), names: "Айбек & Айзада" });
    expect(next.map((r) => r.id)).toEqual(["b", "a"]);
    expect(next[0].names).toBe("Айбек & Айзада");
    expect(list.map((r) => r.id)).toEqual(["a", "b"]);
    let many: RecentInvitation[] = [];
    for (let i = 0; i < MAX_RECENT + 3; i++) many = rememberInvitation(many, entry(String(i)));
    expect(many).toHaveLength(MAX_RECENT);
    expect(many[0].id).toBe(String(MAX_RECENT + 2));
  });

  it("убрать из списка", () => {
    expect(forgetInvitation([entry("a"), entry("b")], "a").map((r) => r.id)).toEqual(["b"]);
  });

  it("битое содержимое хранилища — пустой список, кривые записи пропускаются", () => {
    expect(parseRecent(null)).toEqual([]);
    expect(parseRecent("{oops")).toEqual([]);
    expect(parseRecent('{"id":"a"}')).toEqual([]);
    expect(parseRecent(JSON.stringify([entry("a"), { id: 1 }, null, "x"]))).toEqual([entry("a")]);
  });
});
