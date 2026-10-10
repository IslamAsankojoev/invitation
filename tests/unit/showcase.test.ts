import { describe, expect, it } from "vitest";
import { showcaseKeyValid } from "@/lib/showcase";

describe("скрытый показ шаблонов", () => {
  const secret = "a1b2c3d4e5f6a7b8c9d0e1f2";

  it("пускает только по точному ключу", () => {
    expect(showcaseKeyValid(secret, secret)).toBe(true);
    expect(showcaseKeyValid(secret.slice(0, -1), secret)).toBe(false);
    expect(showcaseKeyValid(secret + "0", secret)).toBe(false);
    expect(showcaseKeyValid("", secret)).toBe(false);
  });

  it("без ключа в env или со слишком коротким ключом показа нет", () => {
    expect(showcaseKeyValid("", undefined)).toBe(false);
    expect(showcaseKeyValid("", "")).toBe(false);
    expect(showcaseKeyValid("short", "short")).toBe(false);
  });
});
