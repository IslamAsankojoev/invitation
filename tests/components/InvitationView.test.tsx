// @vitest-environment jsdom
import { act, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InvitationView } from "@/components/invitation/InvitationView";
import { addOrnament, createOrnament, moveBlock, toggleBlock, updateBlock } from "@/lib/blocks";
import { EVENT_PASSED_TEXT } from "@/lib/countdown";
import { createDefaultInvitation } from "@/lib/defaults";

const renderedBlocks = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("[data-block]")).map((el) => el.getAttribute("data-block"));
const section = (container: HTMLElement, type: string) => container.querySelector<HTMLElement>(`[data-block="${type}"]`)!;

describe("InvitationView", () => {
  it("рендерит все видимые блоки по порядку массива", () => {
    const { container } = render(<InvitationView data={createDefaultInvitation()} slug="demo" />);
    expect(renderedBlocks(container)).toEqual([
      "hero", "countdown", "calendar", "story", "program", "dresscode", "location", "rsvp",
    ]);
  });

  it("показывает только visible-блоки в правильном порядке", () => {
    let data = createDefaultInvitation();
    data = toggleBlock(data, "story");
    data = toggleBlock(data, "dresscode");
    data = moveBlock(data, 4, 1); // program выше countdown
    const { container } = render(<InvitationView data={data} slug="demo" />);
    expect(renderedBlocks(container)).toEqual(["hero", "program", "countdown", "calendar", "location", "rsvp"]);
    expect(screen.queryByText(/Мы познакомились весной/)).not.toBeInTheDocument();
  });

  it("countdown после даты показывает «Событие состоялось»", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date(2030, 0, 1) });
    const data = updateBlock(createDefaultInvitation(), "hero", { date: "2027-06-19T16:00" });
    render(<InvitationView data={data} slug="demo" />);
    expect(await screen.findByText(EVENT_PASSED_TEXT)).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("countdown до даты показывает дни", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date(2027, 5, 9, 16, 0) });
    const data = updateBlock(createDefaultInvitation(), "hero", { date: "2027-06-19T16:00" });
    const { container } = render(<InvitationView data={data} slug="demo" />);
    const days = await within(section(container, "countdown")).findByText("10");
    expect(days.nextSibling).toHaveTextContent("дней");
    vi.useRealTimers();
  });

  it("календарь выделяет день события", () => {
    const data = updateBlock(createDefaultInvitation(), "hero", { date: "2026-11-07T16:00" });
    const { container } = render(<InvitationView data={data} slug="demo" />);
    const calendar = within(section(container, "calendar"));
    expect(calendar.getByTestId("calendar-day")).toHaveTextContent("7");
    expect(calendar.getByText("ноября")).toBeInTheDocument();
    expect(calendar.getByText("суббота")).toBeInTheDocument();
  });

  it("украшения и фон блока выводятся в разметке, заголовок берётся из title", () => {
    let data = createDefaultInvitation();
    data = addOrnament(data, "location", { ...createOrnament("/library/gardenia.webp", "bottom-right"), size: 90 });
    data = updateBlock(data, "location", { surface: "paper", title: "Где нас искать" });
    const { container } = render(<InvitationView data={data} slug="demo" />);
    const location = section(container, "location");
    expect(location).toHaveAttribute("data-surface", "paper");
    const img = location.querySelector("img[data-ornament]") as HTMLImageElement;
    expect(img).toHaveAttribute("src", "/library/gardenia.webp");
    expect(img.parentElement!.style.width).toBe("90px");
    expect(within(location).getByRole("heading", { name: "Где нас искать" })).toBeInTheDocument();
  });

  it("прозрачность фона применяется к слою фона, а не к содержимому блока", () => {
    const data = updateBlock(createDefaultInvitation(), "program", { surfaceOpacity: 0.4 });
    const { container } = render(<InvitationView data={data} slug="demo" />);
    const program = section(container, "program");
    const layer = within(program).getByTestId("surface-layer");
    expect(layer.style.opacity).toBe("0.4");
    expect(layer.style.backgroundImage).toContain("/library/torn-paper.webp");
    expect(program.style.opacity).toBe("");
    // Сквозь полупрозрачную бумагу проступает тема — текст берёт цвет темы, а не «бумажный».
    expect(program).not.toHaveClass("surface-light-text");
    expect(section(container, "calendar")).toHaveClass("surface-light-text");
    expect(within(section(container, "hero")).queryByTestId("surface-layer")).toBeNull();
  });

  it("фон-предмет: лист режется border-image с отступами из pad, круглый — по центру в квадрате", () => {
    let data = updateBlock(createDefaultInvitation(), "program", { surface: "scroll" });
    data = updateBlock(data, "countdown", { surface: "wreath-blue" });
    data = updateBlock(data, "dresscode", { surface: "note-burlap" });
    const { container } = render(<InvitationView data={data} slug="demo" />);
    const program = section(container, "program");
    expect(program).toHaveClass("surface-object", "surface-light-text");
    expect(program.style.padding).toBe("86px 55px");
    expect(within(program).getByTestId("surface-layer").style.borderImage).toContain("/library/surfaces/scroll.webp");
    const countdown = section(container, "countdown");
    expect(countdown).toHaveClass("surface-round");
    expect(countdown.style.padding).toBe("25%");
    expect(within(countdown).getByTestId("surface-layer").style.backgroundSize).toBe("contain");
    // Мешковина тёмная — текст на ней светлый.
    expect(section(container, "dresscode")).toHaveClass("surface-dark-text");
  });

  it("текстура: на светлой палитре затемняет (multiply), на ночной — инвертируется и осветляет", () => {
    const data = createDefaultInvitation();
    data.theme.texture = "stars";
    const { container, rerender } = render(<InvitationView data={data} slug="demo" />);
    const texture = () => within(container).getByTestId("texture");
    expect(texture()).toHaveAttribute("data-texture", "stars");
    expect(texture().style.mixBlendMode).toBe("multiply");
    expect(texture().style.filter).toBe("");

    rerender(<InvitationView data={{ ...data, theme: { ...data.theme, palette: "night" } }} slug="demo" />);
    expect(texture().style.mixBlendMode).toBe("screen");
    expect(texture().style.filter).toBe("invert(1)");

    // Цветная акварель не инвертируется.
    rerender(<InvitationView data={{ ...data, theme: { ...data.theme, palette: "night", texture: "watercolor" } }} slug="demo" />);
    expect(texture().style.filter).toBe("");

    rerender(<InvitationView data={{ ...data, theme: { ...data.theme, texture: "none" } }} slug="demo" />);
    expect(within(container).queryByTestId("texture")).toBeNull();
  });

  it("без IntersectionObserver все элементы сразу показываются; в мини-превью анимаций нет", () => {
    const { container, rerender } = render(<InvitationView data={createDefaultInvitation()} slug="demo" />);
    const view = within(container).getByTestId("invitation");
    expect(view).toHaveClass("inv-motion");
    expect(container.querySelectorAll("[data-reveal]").length).toBeGreaterThan(10);
    expect(container.querySelector("[data-reveal]:not([data-revealed]), [data-decor]:not([data-revealed])")).toBeNull();

    rerender(<InvitationView data={createDefaultInvitation()} slug="demo" motion="off" />);
    expect(view).not.toHaveClass("inv-motion");
  });

  describe("появление при прокрутке", () => {
    let observed: Element[] = [];
    let trigger: (els: Element[]) => void = () => {};
    const stubObserver = () =>
      vi.stubGlobal(
        "IntersectionObserver",
        class {
          constructor(cb: IntersectionObserverCallback) {
            trigger = (els) => cb(els.map((target) => ({ target, isIntersecting: true })) as never, this as never);
          }
          observe(el: Element) {
            observed.push(el);
          }
          unobserve() {}
          disconnect() {}
        },
      );
    const reduceMotion = (on: boolean) =>
      vi.spyOn(window, "matchMedia").mockImplementation((q) => ({ matches: on && q.includes("reduce"), media: q }) as never);

    afterEach(() => {
      observed = [];
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it("элемент показывается, когда доходит до экрана, с задержкой по номеру data-reveal", () => {
      stubObserver();
      reduceMotion(false);
      const { container } = render(<InvitationView data={createDefaultInvitation()} slug="demo" />);
      const dresscode = section(container, "dresscode");
      const text = dresscode.querySelector<HTMLElement>('[data-reveal="2"]')!;
      expect(observed).toContain(text);
      expect(text).not.toHaveAttribute("data-revealed");

      act(() => trigger([text]));
      expect(text).toHaveAttribute("data-revealed");
      expect(text.style.getPropertyValue("--d")).toBe("0.12s");
    });

    it("при «Уменьшить движение» всё показано сразу, без наблюдателя", () => {
      stubObserver();
      reduceMotion(true);
      const { container } = render(<InvitationView data={createDefaultInvitation()} slug="demo" />);
      expect(observed).toHaveLength(0);
      expect(container.querySelector("[data-reveal]:not([data-revealed]), [data-decor]:not([data-revealed])")).toBeNull();
    });
  });

  it("украшения выезжают со своей стороны, бантик качается на ниточке", () => {
    let data = createDefaultInvitation();
    data = addOrnament(data, "story", createOrnament("/library/gardenia.webp", "top-left"));
    data = addOrnament(data, "story", createOrnament("/library/twine-bow.webp", "right"));
    const { container } = render(<InvitationView data={data} slug="demo" />);
    const [branch, bow] = section(container, "story").querySelectorAll("img[data-ornament]");
    expect(branch.parentElement).toHaveAttribute("data-decor", "left");
    expect(branch).toHaveAttribute("data-idle", "sway");
    expect(bow.parentElement).toHaveAttribute("data-decor", "right");
    expect(bow).toHaveAttribute("data-idle", "swing");
  });

  it("анимация украшений: общая из темы, своя у украшения перебивает её", () => {
    let data = createDefaultInvitation();
    data.theme.ornamentMotion = { enter: "zoom", enterSpeed: 2, idle: "breathe", idleSpeed: 1, idleAmplitude: 1.5 };
    data = addOrnament(data, "story", createOrnament("/library/gardenia.webp", "top-left"));
    data = addOrnament(data, "story", {
      ...createOrnament("/library/twine-bow.webp", "right"),
      motion: { enter: "spin", enterSpeed: 0.5, idle: "none", idleSpeed: 1, idleAmplitude: 1 },
    });
    const { container } = render(<InvitationView data={data} slug="demo" />);
    const [common, own] = section(container, "story").querySelectorAll<HTMLElement>("img[data-ornament]");
    expect(common.parentElement).toHaveAttribute("data-enter", "zoom");
    expect(common.parentElement).not.toHaveAttribute("data-decor-own");
    expect(common.parentElement!.style.getPropertyValue("--oe-k")).toBe("0.5");
    expect(common).toHaveAttribute("data-idle", "breathe");
    expect(common.style.getPropertyValue("--oi-a")).toBe("1.5");
    expect(own.parentElement).toHaveAttribute("data-enter", "spin");
    expect(own.parentElement).toHaveAttribute("data-decor-own");
    expect(own.parentElement!.style.getPropertyValue("--oe-k")).toBe("2");
    expect(own).toHaveAttribute("data-idle", "none");
  });

  it("строка «от руки» выводится под заголовком блока", () => {
    const data = updateBlock(createDefaultInvitation(), "rsvp", { title: "Подтвердите, пожалуйста,", scriptLine: "своё присутствие" });
    const { container } = render(<InvitationView data={data} slug="demo" />);
    const rsvp = section(container, "rsvp");
    expect(within(rsvp).getByRole("heading", { name: "Подтвердите, пожалуйста," })).toBeInTheDocument();
    expect(within(rsvp).getByText("своё присутствие")).toHaveAttribute("data-anim", "write");
  });

  it("цитата (история без заголовка) проявляется по словам, но читается целиком", () => {
    const data = updateBlock(createDefaultInvitation(), "story", { title: "", text: "Любовь — это\nкогда вместе" });
    const { container } = render(<InvitationView data={data} slug="demo" />);
    const story = section(container, "story");
    expect(story.querySelectorAll(".inv-word")).toHaveLength(5);
    expect(within(story).getByText("Любовь — это когда вместе", { normalizer: (t) => t.replace(/\s+/g, " ").trim() })).toHaveClass("sr-only");
  });

  it("программа: у каждого пункта есть точка на линии, пока линия до неё не дошла — точка не горит", () => {
    const { container } = render(<InvitationView data={createDefaultInvitation()} slug="demo" />);
    const dots = section(container, "program").querySelectorAll("[data-dot]");
    expect(dots).toHaveLength(3);
    // В jsdom у элементов нет размеров, поэтому линия не рисуется (само «загорание» проверяется в браузере).
    dots.forEach((d) => expect(d).not.toHaveAttribute("data-lit"));
  });

  it("имена через «&» выводятся в две строки, но читаются целиком", () => {
    render(<InvitationView data={createDefaultInvitation()} slug="demo" />);
    expect(screen.getByTestId("hero-names")).toHaveTextContent("Анна & Иван");
  });
});
