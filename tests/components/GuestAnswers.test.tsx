// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GuestAnswers, type Answer } from "@/components/guests/GuestAnswers";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const answers: Answer[] = [
  { id: "a1", name: "Пётр Иванов", attending: true, guestsCount: 2, comment: "Будем!", createdAt: "2027-05-01T10:00:00.000Z" },
  { id: "a2", name: "Ольга", attending: false, guestsCount: 1, comment: null, createdAt: "2027-05-02T10:00:00.000Z" },
];
const props = { invitationId: "inv1", slug: "demo", token: "secret", csvHref: "data:,", csvName: "g.csv", share: { whatsapp: "https://wa.me/?text=x", telegram: "https://t.me/share/url?url=x" } };
const list = () => within(screen.getByTestId("guest-list"));

describe("Ответы гостей", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 }))));
  afterEach(() => {
    vi.unstubAllGlobals();
    refresh.mockReset();
  });

  it("поиск и «придут / не придут»", async () => {
    const user = userEvent.setup();
    render(<GuestAnswers {...props} answers={answers} />);
    expect(list().getAllByRole("listitem")).toHaveLength(2);
    await user.click(screen.getByRole("radio", { name: "Не придут · 1" }));
    expect(list().getAllByRole("listitem")).toHaveLength(1);
    expect(list().getByText("Ольга")).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Все · 2" }));
    await user.type(screen.getByRole("searchbox", { name: "Поиск по имени" }), "петр");
    expect(list().getAllByRole("listitem")).toHaveLength(1);
    expect(list().getByText("Пётр Иванов")).toBeInTheDocument();
    await user.type(screen.getByRole("searchbox", { name: "Поиск по имени" }), "xyz");
    expect(screen.getByText("Никого не нашли")).toBeInTheDocument();
  });

  it("удаление — с подтверждением, по token", async () => {
    const user = userEvent.setup();
    render(<GuestAnswers {...props} answers={answers} />);
    await user.click(list().getByRole("button", { name: "Удалить ответ «Ольга»" }));
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Удалить" }));
    expect(fetch).toHaveBeenCalledWith("/api/invitations/inv1/rsvp/a2?token=secret", { method: "DELETE" });
    expect(refresh).toHaveBeenCalled();
  });

  it("«Добавить ответ» за гостя, ответившего по телефону", async () => {
    const user = userEvent.setup();
    render(<GuestAnswers {...props} answers={[]} />);
    // Пустой список — кнопки отправки приглашения.
    expect(screen.getByRole("link", { name: "Отправить в WhatsApp" })).toHaveAttribute("href", props.share.whatsapp);
    await user.click(screen.getByRole("button", { name: "Добавить ответ" }));
    const dialog = screen.getByRole("dialog", { name: "Добавить ответ" });
    await user.click(within(dialog).getByRole("button", { name: "Сохранить" }));
    expect(within(dialog).getByText("Укажите имя")).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText("Имя"), "Бабушка Гульнара");
    await user.clear(within(dialog).getByLabelText("Сколько гостей"));
    await user.type(within(dialog).getByLabelText("Сколько гостей"), "3");
    await user.click(within(dialog).getByRole("button", { name: "Сохранить" }));
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/invitations/demo/rsvp?token=secret");
    expect(JSON.parse(init.body as string)).toMatchObject({ name: "Бабушка Гульнара", attending: true, guestsCount: 3 });
    expect(refresh).toHaveBeenCalled();
  });
});
