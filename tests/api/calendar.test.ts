import { beforeEach, describe, expect, it } from "vitest";
import { GET } from "@/app/i/[slug]/calendar.ics/route";
import { findBlock } from "@/lib/blocks";
import { createInvitation } from "@/lib/invitations";
import { resetDb } from "./helpers";

beforeEach(resetDb);

const get = (slug: string) =>
  GET(new Request(`http://localhost/i/${slug}/calendar.ics`), { params: Promise.resolve({ slug }) });

describe("GET /i/[slug]/calendar.ics", () => {
  it("отдаёт событие как text/calendar для открытия в Календаре", async () => {
    const inv = await createInvitation();
    const res = await get(inv.slug);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/calendar; charset=utf-8");
    expect(res.headers.get("content-disposition")).toMatch(/^inline/);
    const ics = await res.text();
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain(`SUMMARY:${findBlock(inv.data, "hero")!.names.replace(/,/g, "\\,")}`);
    expect(ics).toContain(`http://localhost/i/${inv.slug}`);
  });

  it("нет приглашения → 404", async () => {
    expect((await get("net-takogo")).status).toBe(404);
  });
});
