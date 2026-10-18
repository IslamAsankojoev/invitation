import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as CREATE } from "@/app/api/invitations/route";
import { allTemplates, findPublishedTemplate, findTemplate, templates } from "@/lib/templates";
import { jsonRequest, resetDb } from "./helpers";

// Файл правок, в котором «Итальянское озеро» скрыто в админке.
vi.mock("@/lib/template-overrides.json", () => ({ default: { edited: {}, added: [], hidden: ["lago"] } }));

beforeEach(() => resetDb());

describe("скрытые (не опубликованные) шаблоны", () => {
  it("не в публичном списке, но доступны показу и админке", () => {
    expect(templates.some((t) => t.id === "lago")).toBe(false);
    expect(allTemplates.some((t) => t.id === "lago")).toBe(true);
    expect(templates).toHaveLength(allTemplates.length - 1);
    expect(findTemplate("lago")).toBeDefined();
    expect(findPublishedTemplate("lago")).toBeUndefined();
  });

  it("создать приглашение из скрытого нельзя — как из неизвестного", async () => {
    expect((await CREATE(jsonRequest("/api/invitations", "POST", { template: "lago" }))).status).toBe(400);
    expect((await CREATE(jsonRequest("/api/invitations", "POST", { template: "mocha" }))).status).toBe(201);
  });
});
