// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Editor } from "@/components/editor/Editor";
import { InvitationView } from "@/components/invitation/InvitationView";
import { findBlock, updateBlock } from "@/lib/blocks";
import { createDefaultInvitation } from "@/lib/defaults";
import { createFromTemplate, findTemplate } from "@/lib/templates";
import { openBlockView, openThemeSection } from "./editorHelpers";

const section = (container: HTMLElement, type: string) => container.querySelector<HTMLElement>(`[data-block="${type}"]`)!;

describe("Цвет фона блока", () => {
  it("тёмная заливка во весь блок: слой заливки и светлый текст", () => {
    const data = updateBlock(createDefaultInvitation(), "countdown", { bgColor: "#3b2b21" });
    const { container } = render(<InvitationView data={data} slug="demo" />);
    const countdown = section(container, "countdown");
    expect(within(countdown).getByTestId("block-fill")).toHaveStyle({ background: "#3b2b21" });
    expect(countdown).toHaveClass("inv-fill-dark");
    expect(countdown.style.getPropertyValue("--fill")).toBe("#3b2b21");
  });

  it("на карточке красит саму панель, светлый цвет — тёмный текст; у предметов цвет не действует", () => {
    let data = updateBlock(createDefaultInvitation(), "story", { surface: "card", bgColor: "#f3ede2" });
    data = updateBlock(data, "location", { surface: "notebook", bgColor: "#3b2b21" });
    const { container } = render(<InvitationView data={data} slug="demo" />);
    const story = section(container, "story");
    expect(within(story).queryByTestId("block-fill")).toBeNull();
    expect(within(story).getByTestId("surface-layer")).toHaveStyle({ background: "#f3ede2" });
    expect(story).toHaveClass("inv-fill-light");
    expect(section(container, "location")).not.toHaveClass("inv-fill-dark");
  });
});

describe("Шаблоны с новыми возможностями", () => {
  it("режим заголовков — атрибут на корне приглашения", () => {
    const { container, rerender } = render(<InvitationView data={createFromTemplate(findTemplate("lago")!)} slug="demo" />);
    expect(container.querySelector('[data-testid="invitation"]')).toHaveAttribute("data-headings", "script");
    rerender(<InvitationView data={createFromTemplate(findTemplate("boarding-pass")!)} slug="demo" />);
    expect(container.querySelector('[data-testid="invitation"]')).toHaveAttribute("data-headings", "serif");
    rerender(<InvitationView data={createDefaultInvitation()} slug="demo" />);
    expect(container.querySelector('[data-testid="invitation"]')).toHaveAttribute("data-headings", "caps");
  });

  it("посадочный талон: имена, дата, время и место из блока «Место»", () => {
    const data = createFromTemplate(findTemplate("boarding-pass")!);
    const { container } = render(<InvitationView data={data} slug="demo" />);
    const hero = within(section(container, "hero"));
    expect(hero.getByTestId("hero-names")).toHaveTextContent("Лиза");
    expect(hero.getByText("19.06.2027")).toBeInTheDocument();
    expect(hero.getByText("15:00")).toBeInTheDocument();
    expect(hero.getByText(findBlock(data, "location")!.placeName)).toBeInTheDocument();
    expect(hero.getByText("Посадка на любовь открыта")).toBeInTheDocument();
  });

  it("монограмма — инициалы и дата словами; фото сверху — фото и имена", () => {
    const { container, rerender } = render(<InvitationView data={createFromTemplate(findTemplate("mocha")!)} slug="demo" />);
    const hero = section(container, "hero");
    expect(hero).toHaveTextContent("ЕС".split("").join(""));
    expect(hero).toHaveTextContent("21 августа 2027");
    expect(within(hero).getByTestId("hero-photo")).toHaveAttribute("src", "/templates/mocha-dried.webp");
    rerender(<InvitationView data={createFromTemplate(findTemplate("seaside")!)} slug="demo" />);
    expect(within(section(container, "hero")).getByTestId("hero-photo")).toHaveAttribute("src", "/templates/seaside-couple.webp");
    expect(within(section(container, "hero")).getByTestId("hero-names")).toHaveTextContent("Артём");
  });
});

describe("Редактор: цвет фона и заголовки", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 200 })));
  });

  it("цвет фона из образцов палитры заливает блок в превью, «Без цвета» убирает", async () => {
    const user = userEvent.setup();
    render(<Editor id="inv1" token="secret" initialSlug="demo" initialData={createDefaultInvitation()} />);
    // У блоков с фоном-предметом (бумага) выбора цвета нет — берём блок без фона.
    await openBlockView(user, "Обратный отсчёт", { fine: true });
    const swatches = within(screen.getByRole("group", { name: "Цвет фона блока" }));
    const buttons = swatches.getAllByRole("button");
    await user.click(buttons[buttons.length - 1]); // самый тёмный — цвет текста палитры
    const program = () => screen.getByTestId("preview").querySelector<HTMLElement>('[data-block="countdown"]')!;
    expect(program()).toHaveClass("inv-fill-dark");
    await user.click(swatches.getByRole("button", { name: "Без цвета" }));
    expect(program()).not.toHaveClass("inv-fill-dark");
    expect(within(program()).queryByTestId("block-fill")).toBeNull();
  });

  it("«Заголовки блоков → Шрифтом имён» меняет вид заголовков в превью", async () => {
    const user = userEvent.setup();
    render(<Editor id="inv1" token="secret" initialSlug="demo" initialData={createDefaultInvitation()} />);
    await openThemeSection(user, "Шрифты", { fine: true });
    await user.click(within(screen.getByRole("radiogroup", { name: "Заголовки блоков" })).getByRole("radio", { name: "Шрифтом имён" }));
    expect(screen.getByTestId("preview").querySelector('[data-testid="invitation"]')).toHaveAttribute("data-headings", "script");
  });
});
