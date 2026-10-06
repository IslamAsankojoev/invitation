// @vitest-environment jsdom
/**
 * Замороженные приглашения прошлых форматов (tests/fixtures/invitations): каждое должно читаться текущей схемой
 * (через миграции) и отрисовываться. Файлы не редактировать — только добавлять новые (правило в AGENTS.md).
 */
import { render } from "@testing-library/react";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { InvitationView } from "@/components/invitation/InvitationView";
import { SCHEMA_VERSION } from "@/lib/migrations";
import { invitationDataSchema } from "@/lib/schema";

const DIR = path.join(process.cwd(), "tests/fixtures/invitations");
const files = readdirSync(DIR).filter((f) => f.endsWith(".json"));

describe("приглашения прошлых форматов", () => {
  it("фикстуры есть, имя начинается с версии формата", () => {
    expect(files.length).toBeGreaterThanOrEqual(15);
    for (const f of files) expect(f).toMatch(/^\d+\.\d+\.\d+-[\w-]+\.json$/);
  });

  it.each(files)("%s читается текущей схемой и отрисовывается", (file) => {
    const raw = JSON.parse(readFileSync(path.join(DIR, file), "utf8"));
    const result = invitationDataSchema.safeParse(raw);
    expect(result.success, result.success ? "" : JSON.stringify(result.error.issues, null, 2)).toBe(true);
    const data = result.data!;
    expect(data.schemaVersion).toBe(SCHEMA_VERSION);
    const { container } = render(<InvitationView data={data} slug="fixture" motion="off" />);
    expect(container.querySelectorAll("section[data-block]").length).toBeGreaterThan(0);
  });
});
