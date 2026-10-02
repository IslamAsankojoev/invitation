// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { InvitationPage } from "@/components/invitation/InvitationPage";
import { createDefaultInvitation } from "@/lib/defaults";

const withMusic = () => {
  const data = createDefaultInvitation();
  data.music.url = "/uploads/song.mp3";
  return data;
};

describe("InvitationPage", () => {
  it("кнопки звука нет, если music.url не задан", () => {
    // У нового приглашения песня уже выбрана по умолчанию — «Без музыки» задаём явно.
    render(<InvitationPage data={{ ...createDefaultInvitation(), music: { url: null, loop: true } }} slug="demo" />);
    expect(screen.queryByRole("button", { name: /музыку/ })).not.toBeInTheDocument();
    expect(screen.queryByTestId("music")).not.toBeInTheDocument();
  });

  it("кнопка звука появляется после открытия конверта, если music.url задан", async () => {
    const user = userEvent.setup();
    render(<InvitationPage data={withMusic()} slug="demo" />);
    expect(screen.queryByRole("button", { name: /музыку/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Открыть приглашение" }));
    expect(screen.getByRole("button", { name: /музыку/ })).toBeInTheDocument();
  });

  it("до открытия анимации приглашения на паузе и прокрутка заблокирована, после — запускаются", () => {
    vi.useFakeTimers();
    render(<InvitationPage data={withMusic()} slug="demo" />);
    const view = screen.getByTestId("invitation");
    expect(view).toHaveAttribute("data-motion", "paused");
    expect(document.documentElement.style.overflow).toBe("hidden");
    // На паузе элементы не показываются: они появятся уже после нажатия.
    expect(view.querySelector("[data-reveal][data-revealed]")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Открыть приглашение" }));
    expect(view).toHaveAttribute("data-motion", "on");
    expect(document.documentElement.style.overflow).toBe("");
    expect(screen.getByTestId("envelope")).toHaveAttribute("data-leaving");
    expect(view.querySelector("[data-reveal]:not([data-revealed])")).toBeNull();

    // Заставка растворяется и убирается.
    act(() => vi.advanceTimersByTime(1300));
    expect(screen.queryByTestId("envelope")).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it("музыка встаёт на паузу, когда вкладку свернули, и продолжается при возвращении", async () => {
    const user = userEvent.setup();
    render(<InvitationPage data={withMusic()} slug="demo" />);
    const audio = screen.getByTestId("music") as HTMLAudioElement;
    await user.click(screen.getByRole("button", { name: "Открыть приглашение" }));
    expect(audio.paused).toBe(false);

    const setHidden = (hidden: boolean) => {
      Object.defineProperty(document, "hidden", { value: hidden, configurable: true });
      fireEvent(document, new Event("visibilitychange"));
    };
    setHidden(true);
    expect(audio.paused).toBe(true);
    setHidden(false);
    expect(audio.paused).toBe(false);

    // Если гость сам выключил музыку, при возвращении во вкладку она не включается.
    await user.click(screen.getByRole("button", { name: /музыку/ }));
    setHidden(true);
    setHidden(false);
    expect(audio.paused).toBe(true);
  });

  it("клик «Открыть приглашение» запускает музыку, кнопка звука ставит на паузу", async () => {
    const user = userEvent.setup();
    render(<InvitationPage data={withMusic()} slug="demo" />);
    const audio = screen.getByTestId("music") as HTMLAudioElement;
    expect(audio.paused).toBe(true);

    await user.click(screen.getByRole("button", { name: "Открыть приглашение" }));
    expect(audio.paused).toBe(false);

    await user.click(screen.getByRole("button", { name: /музыку/ }));
    expect(audio.paused).toBe(true);
  });

  it("слой декора не перехватывает клики и не рендерится для type=none", () => {
    const petals = createDefaultInvitation();
    petals.theme.decor.type = "petals";
    const { unmount } = render(<InvitationPage data={petals} slug="demo" />);
    expect(screen.getByTestId("decor-layer")).toHaveClass("pointer-events-none", "fixed");
    unmount();

    const none = createDefaultInvitation();
    none.theme.decor.type = "none";
    render(<InvitationPage data={none} slug="demo" />);
    expect(screen.queryByTestId("decor-layer")).not.toBeInTheDocument();
  });

  it("конверт показывает монограмму, дату и подсказку про музыку", () => {
    render(<InvitationPage data={withMusic()} slug="demo" />);
    const envelope = screen.getByTestId("envelope");
    expect(envelope).toHaveTextContent("А&И");
    expect(envelope).toHaveTextContent("19 . 06 . 2027");
    expect(envelope).toHaveTextContent("включится музыка");
  });
});
