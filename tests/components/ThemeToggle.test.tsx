// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { switchThemeWithWave, ThemeToggle } from "@/components/theme/ThemeToggle";

const root = () => document.documentElement;

afterEach(() => {
  localStorage.clear();
  root().className = "";
  root().removeAttribute("style");
  delete (document as { startViewTransition?: unknown }).startViewTransition;
  vi.restoreAllMocks();
});

describe("кнопка темы сайта", () => {
  it("одно нажатие — другая тема: класс на <html>, выбор запомнен, подпись — следующая тема", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    // jsdom: системная тема светлая — кнопка предлагает тёмную.
    const button = await screen.findByRole("button", { name: "Тёмная тема" });
    expect(button).toHaveAttribute("title", "Тёмная тема");
    await user.click(button);
    expect(root()).toHaveClass("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
    await user.click(screen.getByRole("button", { name: "Светлая тема" }));
    expect(root()).toHaveClass("light");
    expect(root()).not.toHaveClass("dark");
    expect(screen.getByRole("button", { name: "Тёмная тема" })).toBeInTheDocument();
  });
});

describe("волна темы", () => {
  const button = () => {
    const el = document.createElement("button");
    el.getBoundingClientRect = () => ({ left: 980, top: 20, width: 40, height: 40 }) as DOMRect;
    return el;
  };

  it("расходится от центра кнопки до самого дальнего угла экрана и убирает за собой переменные", async () => {
    let finish!: () => void;
    const finished = new Promise<void>((r) => (finish = r));
    let update: (() => void) | null = null;
    document.startViewTransition = vi.fn((cb: () => void) => {
      update = cb;
      return { ready: Promise.resolve(), finished, updateCallbackDone: Promise.resolve(), skipTransition: () => {} } as unknown as ViewTransition;
    }) as unknown as typeof document.startViewTransition;
    const apply = vi.fn();
    switchThemeWithWave(button(), apply);

    // Центр кнопки (1000, 40); экран jsdom 1024×768 — дальний угол левый нижний.
    expect(root().style.getPropertyValue("--theme-wave-x")).toBe("1000px");
    expect(root().style.getPropertyValue("--theme-wave-y")).toBe("40px");
    expect(parseFloat(root().style.getPropertyValue("--theme-wave-radius"))).toBeCloseTo(Math.hypot(1000, 728), 3);
    expect(root()).toHaveClass("theme-wave");
    expect(apply).not.toHaveBeenCalled();
    act(() => update!());
    expect(apply).toHaveBeenCalledOnce();

    await act(async () => finish());
    expect(root()).not.toHaveClass("theme-wave");
    expect(root().style.getPropertyValue("--theme-wave-x")).toBe("");
  });

  it("без View Transitions или при «Уменьшить движение» — сразу, без волны", () => {
    const apply = vi.fn();
    switchThemeWithWave(button(), apply);
    expect(apply).toHaveBeenCalledOnce();

    const start = vi.fn();
    document.startViewTransition = start as unknown as typeof document.startViewTransition;
    vi.spyOn(window, "matchMedia").mockImplementation((q: string) => ({ matches: q.includes("reduce"), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }) as unknown as MediaQueryList);
    switchThemeWithWave(button(), apply);
    expect(apply).toHaveBeenCalledTimes(2);
    expect(start).not.toHaveBeenCalled();
    expect(root()).not.toHaveClass("theme-wave");
  });
});
