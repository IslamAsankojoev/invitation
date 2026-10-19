import { describe, expect, it } from "vitest";
import { averageGuests, funnel, funnelBy, parsePeriod, percent, type CreatedRow, type ReachedRow } from "@/lib/analytics";

const created: CreatedRow[] = [
  { invitationId: "a", props: { template: "lago", lang: "ky" } },
  { invitationId: "b", props: { template: "lago", lang: "ru" } },
  { invitationId: "c", props: { template: "etno" } },
];
const reached: ReachedRow[] = [
  { invitationId: "a", step: "shared" },
  { invitationId: "a", step: "shared" },
  { invitationId: "a", step: "viewed" },
  { invitationId: "c", step: "answered" },
  // Приглашение вне периода не считается.
  { invitationId: "z", step: "viewed" },
];

describe("funnel", () => {
  it("каждое приглашение считается на шаге один раз, чужие приглашения не считаются", () => {
    expect(funnel(created, reached)).toEqual({ created: 3, shared: 1, viewed: 1, answered: 1 });
    expect(funnel([], reached)).toEqual({ created: 0, shared: 0, viewed: 0, answered: 0 });
  });

  it("по полю props: группы по убыванию созданных, без значения — «—»", () => {
    expect(funnelBy("template", created, reached)).toEqual([
      { value: "lago", counts: { created: 2, shared: 1, viewed: 1, answered: 0 } },
      { value: "etno", counts: { created: 1, shared: 0, viewed: 0, answered: 1 } },
    ]);
    expect(funnelBy("lang", created, reached).map((r) => r.value)).toEqual(["—", "ky", "ru"]);
  });
});

describe("averageGuests", () => {
  it("разные браузеры на приглашение в среднем, без id браузера — не считаются", () => {
    expect(
      averageGuests([
        { invitationId: "a", visitorId: "1" },
        { invitationId: "a", visitorId: "1" },
        { invitationId: "a", visitorId: "2" },
        { invitationId: "b", visitorId: "3" },
        { invitationId: "b", visitorId: null },
      ]),
    ).toBe(1.5);
    expect(averageGuests([])).toBe(0);
  });
});

describe("percent и parsePeriod", () => {
  it("доля от базы и период из адреса", () => {
    expect(percent(1, 3)).toBe("33 %");
    expect(percent(0, 0)).toBe("—");
    expect(parsePeriod("7")).toBe(7);
    expect(parsePeriod("365")).toBe(30);
    expect(parsePeriod(undefined)).toBe(30);
  });
});
