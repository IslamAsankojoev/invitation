// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InvitationPage } from "@/components/invitation/InvitationPage";
import { updateBlock } from "@/lib/blocks";
import { createDefaultInvitation } from "@/lib/defaults";
import { applyCopy } from "@/lib/localize";

const kyrgyz = () => {
  // «Классика» — с кнопкой «Добавить в календарь» (у «Без рамки» её нет).
  const data = applyCopy(updateBlock(createDefaultInvitation(), "hero", { variant: "classic" }), "wedding", "ky");
  data.music.url = "/uploads/song.mp3";
  return data;
};

afterEach(() => vi.unstubAllGlobals());

describe("страница гостя на кыргызском", () => {
  it("конверт, заголовки, отсчёт, календарь и кнопка музыки — на кыргызском; lang у корня", async () => {
    const user = userEvent.setup();
    const { container } = render(<InvitationPage data={kyrgyz()} slug="demo" />);
    expect(container.querySelector("[data-inv-lang]")).toHaveAttribute("lang", "ky");
    expect(screen.getByText("♪ музыка ойнойт")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Чакырууну ачуу" }));
    expect(screen.getByRole("button", { name: /Музыканы/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Тойдун күнү" })).toBeInTheDocument();
    expect(screen.getByText("күн")).toBeInTheDocument();
    expect(screen.getByText("2027-жыл")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Календарга кошуу" })).toBeInTheDocument();
  });
});

describe("аналитика страницы гостя", () => {
  it("открытие страницы и конверта уходят событиями; на показе шаблона — нет", async () => {
    const sendBeacon = vi.fn().mockReturnValue(true);
    vi.stubGlobal("navigator", { ...navigator, sendBeacon });
    const user = userEvent.setup();
    const { unmount } = render(<InvitationPage data={createDefaultInvitation()} slug="aibek-aizada" />);
    await user.click(screen.getByRole("button", { name: "Открыть приглашение" }));
    const sent = await Promise.all(sendBeacon.mock.calls.map(async ([url, blob]) => [url, JSON.parse(await (blob as Blob).text())]));
    expect(sent.map(([url, body]) => [url, body.name, body.slug])).toEqual([
      ["/api/events", "guest_view", "aibek-aizada"],
      ["/api/events", "envelope_opened", "aibek-aizada"],
    ]);
    unmount();

    sendBeacon.mockClear();
    render(<InvitationPage data={createDefaultInvitation()} slug="demo" demo />);
    await user.click(screen.getByRole("button", { name: "Открыть приглашение" }));
    expect(sendBeacon).not.toHaveBeenCalled();
  });
});
