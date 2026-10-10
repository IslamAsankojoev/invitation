import { describe, expect, it } from "vitest";
import { accountGate, canEdit, claimDecision, claimNextOf, claimUrl, guestsPageAccess, ownershipOf } from "@/lib/access";

const free = { editToken: "secret", userId: null };
const owned = { editToken: "secret", userId: "u1" };

describe("доступ к приглашению", () => {
  it("править можно по секретной ссылке или владельцу по аккаунту", () => {
    expect(canEdit(free, { token: "secret" })).toBe(true);
    expect(canEdit(owned, { token: "secret", userId: "u2" })).toBe(true); // старые ссылки работают и после привязки
    expect(canEdit(owned, { userId: "u1" })).toBe(true);
    expect(canEdit(owned, { userId: "u2" })).toBe(false);
    expect(canEdit(free, { userId: "u1" })).toBe(false); // у ничьего приглашения владельца нет
    expect(canEdit(free, { token: "wrong" })).toBe(false);
    expect(canEdit(free, { token: "" })).toBe(false);
    expect(canEdit(null, { token: "secret" })).toBe(false);
  });

  it("чьё приглашение: моё, ничьё, чужое", () => {
    expect(ownershipOf(owned, "u1")).toBe("mine");
    expect(ownershipOf(owned, "u2")).toBe("other");
    expect(ownershipOf(owned, null)).toBe("other");
    expect(ownershipOf(free, "u1")).toBe("none");
  });

  it("забрать в аккаунт можно только с token и только ничьё", () => {
    expect(claimDecision(free, "secret", "u1")).toBe("claim");
    expect(claimDecision(free, "wrong", "u1")).toBe("forbidden");
    expect(claimDecision(free, null, "u1")).toBe("forbidden");
    expect(claimDecision(owned, "secret", "u1")).toBe("already");
    expect(claimDecision(owned, null, "u1")).toBe("already");
    expect(claimDecision(owned, "secret", "u2")).toBe("taken");
  });

  it("что мешает открыть ссылки и ответы: вход, сохранение в аккаунт, чужой аккаунт", () => {
    const u = { id: "u1" };
    expect(accountGate(undefined)).toBeNull(); // вход выключен
    expect(accountGate({ user: null, ownership: "none" })).toBe("login");
    expect(accountGate({ user: null, ownership: "other" })).toBe("login");
    expect(accountGate({ user: u, ownership: "none" })).toBe("save");
    expect(accountGate({ user: u, ownership: "other" })).toBe("other");
    expect(accountGate({ user: u, ownership: "mine" })).toBeNull();
    // Вход не обязателен (AUTH_REQUIRED не задан) — ничего не закрыто.
    expect(accountGate({ user: null, ownership: "none", required: false })).toBeNull();
    expect(accountGate({ user: u, ownership: "other", required: false })).toBeNull();
  });

  it("ответы гостей при входе — только владельцу; ничьё с token забирается в аккаунт", () => {
    expect(guestsPageAccess(owned, { token: "secret" })).toBe("login"); // token без входа уже не пускает
    expect(guestsPageAccess(owned, { userId: "u1" })).toBe("show");
    expect(guestsPageAccess(owned, { token: "secret", userId: "u2" })).toBe("forbidden");
    expect(guestsPageAccess(free, { token: "secret", userId: "u1" })).toBe("claim");
    expect(guestsPageAccess(free, { token: "wrong", userId: "u1" })).toBe("forbidden");
  });

  it("возврат после сохранения — только в известные места", () => {
    expect(claimNextOf("guests")).toBe("guests");
    expect(claimNextOf("https://evil.example")).toBe("editor");
    expect(claimNextOf(null)).toBe("editor");
    expect(claimUrl("i1", "a b")).toBe("/edit/i1/claim?token=a%20b");
    expect(claimUrl("i1", "t", "guests")).toBe("/edit/i1/claim?token=t&next=guests");
  });
});
