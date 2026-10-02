import { describe, expect, it } from "vitest";
import { isValidSlug, randomSlug } from "@/lib/slug";

describe("slug", () => {
  it.each(["abc", "anna-ivan-2027", "a".repeat(40), "0-0"])("валиден: %s", (s) => {
    expect(isValidSlug(s)).toBe(true);
  });

  it.each(["ab", "a".repeat(41), "Anna", "анна", "a_b", "a b", "a.b", ""])("невалиден: %s", (s) => {
    expect(isValidSlug(s)).toBe(false);
  });

  it("randomSlug генерирует валидный slug", () => {
    for (let i = 0; i < 20; i++) expect(isValidSlug(randomSlug())).toBe(true);
  });
});
