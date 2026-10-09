// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Envelope } from "@/components/invitation/Envelope";
import { InvitationView } from "@/components/invitation/InvitationView";
import { insertBlock, updateBlock } from "@/lib/blocks";
import { createDefaultInvitation } from "@/lib/defaults";
import { BLOCK_VARIANTS, ENVELOPE_STYLES, type Block, type BlockType } from "@/lib/schema";
import { createBlock } from "@/lib/templates";

const cases = (Object.keys(BLOCK_VARIANTS) as BlockType[]).flatMap((type) =>
  (BLOCK_VARIANTS[type] as readonly string[]).map((variant) => [type, variant] as const),
);

describe("Виды блоков", () => {
  it.each(cases)("%s / %s рендерится с основным содержимым", (type, variant) => {
    let data = createDefaultInvitation();
    // Новых типов в приглашении по умолчанию нет — добавляем блок с примером содержимого.
    if (!data.blocks.some((b) => b.type === type)) data = insertBlock(data, createBlock(data, type));
    data = updateBlock(data, type, { variant } as Partial<Block>);
    data = updateBlock(data, "photo", { photo: "/uploads/a.jpg", caption: "Мы у моря" });
    data = updateBlock(data, "gallery", { photos: ["/uploads/a.jpg", "/uploads/b.jpg", "/uploads/c.jpg"] });
    data = updateBlock(data, "hero", { date: "2026-11-07T16:00" });
    data = updateBlock(data, "dresscode", { colors: ["#aabbcc", "#ddeeff"] });
    const { container } = render(<InvitationView data={data} slug="demo" />);
    const section = container.querySelector<HTMLElement>(`[data-block="${type}"]`)!;
    expect(section).not.toBeNull();
    const ui = within(section);

    if (type === "hero") expect(ui.getByTestId("hero-names")).toHaveTextContent("Айгерим");
    if (type === "calendar") expect(section).toHaveTextContent("7");
    if (type === "story") expect(section).toHaveTextContent("Мы познакомились весной");
    if (type === "program") expect(section).toHaveTextContent("Церемония");
    if (type === "location") expect(section).toHaveTextContent("Ресторан «Сад»");
    if (type === "dresscode") expect(section.innerHTML).toMatch(/aabbcc|170, 187, 204/i);
    if (type === "rsvp") expect(ui.getAllByRole("button").length).toBeGreaterThan(0);
    if (type === "text") expect(section).toHaveTextContent("Пожалуйста, не дарите нам цветы");
    if (type === "photo") expect(section.querySelector("img[src='/uploads/a.jpg']")).not.toBeNull();
    if (type === "photo") expect(section).toHaveTextContent("Мы у моря");
    if (type === "gallery") expect(ui.getAllByRole("button", { name: /Открыть фото \d из 3/ })).toHaveLength(3);
    if (type === "contacts") expect(ui.getByRole("link", { name: "WhatsApp — Айгерим" })).toHaveAttribute("href", "https://wa.me/996555000000");
  });

  it("календарь «Неделя» отмечает день события", () => {
    let data = updateBlock(createDefaultInvitation(), "calendar", { variant: "week" });
    data = updateBlock(data, "hero", { date: "2026-11-07T16:00" });
    const { container } = render(<InvitationView data={data} slug="demo" />);
    expect(within(container.querySelector<HTMLElement>('[data-block="calendar"]')!).getByTestId("calendar-day")).toHaveTextContent("7");
  });

  it("компактная анкета: сначала выбор, потом поля", () => {
    const data = updateBlock(createDefaultInvitation(), "rsvp", { variant: "compact" });
    const { container } = render(<InvitationView data={data} slug="demo" />);
    const rsvp = within(container.querySelector<HTMLElement>('[data-block="rsvp"]')!);
    expect(rsvp.queryByLabelText("Ваше имя")).not.toBeInTheDocument();
    fireEvent.click(rsvp.getByRole("button", { name: "С радостью приду" }));
    expect(rsvp.getByLabelText("Ваше имя")).toBeInTheDocument();
    expect(rsvp.getByRole("button", { name: "Добавить гостя" })).toBeInTheDocument();
    fireEvent.click(rsvp.getByRole("button", { name: "изменить" }));
    fireEvent.click(rsvp.getByRole("button", { name: "К сожалению, не смогу" }));
    expect(rsvp.queryByRole("button", { name: "Добавить гостя" })).not.toBeInTheDocument();
  });

  it("стиль «Без анимаций» — приглашение статично", () => {
    const data = createDefaultInvitation();
    data.theme.motion = { style: "none", speed: 1 };
    render(<InvitationView data={data} slug="demo" />);
    expect(screen.getByTestId("invitation")).toHaveAttribute("data-motion", "off");
    expect(screen.getByTestId("invitation")).not.toHaveClass("inv-motion");
  });

  it("своё появление блока выставляется на секции", () => {
    const data = updateBlock(createDefaultInvitation(), "story", { entrance: "zoom" });
    const { container } = render(<InvitationView data={data} slug="demo" />);
    expect(container.querySelector('[data-block="story"]')).toHaveAttribute("data-entrance", "zoom");
  });
});

describe("Виды заставки", () => {
  it.each(ENVELOPE_STYLES)("%s: имена, дата и кнопка открытия на месте", (style) => {
    let opened = 0;
    render(
      <Envelope names="Анна & Иван" date="19 . 06 . 2027" ornament={null} hasMusic variant={style} leaving={false} onOpen={() => opened++} />,
    );
    const env = screen.getByTestId("envelope");
    expect(env).toHaveAttribute("data-style", style);
    expect(env).toHaveTextContent("Анна");
    expect(env).toHaveTextContent("А&И");
    expect(env).toHaveTextContent("19 . 06 . 2027");
    fireEvent.click(screen.getByRole("button", { name: "Открыть приглашение" }));
    expect(opened).toBe(1);
  });
});
