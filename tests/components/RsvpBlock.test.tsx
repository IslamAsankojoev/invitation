// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InvitationView } from "@/components/invitation/InvitationView";
import { createDefaultInvitation } from "@/lib/defaults";

const rsvp = () => within(document.querySelector<HTMLElement>('[data-block="rsvp"]')!);

describe("Анкета гостя", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("без имени показывает ошибку «Укажите имя» и ничего не отправляет", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<InvitationView data={createDefaultInvitation()} slug="demo" />);

    await user.click(rsvp().getByRole("button", { name: "Подтвердить" }));
    expect(rsvp().getByRole("alert")).toHaveTextContent("Укажите имя");
    expect(fetchMock).not.toHaveBeenCalled();
    // Ошибка — у самого поля: фокус возвращается к нему, поле помечено и связано с текстом ошибки.
    const field = rsvp().getByLabelText("Ваше имя");
    expect(field).toHaveFocus();
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription("Укажите имя");

    // Стоит начать вводить имя — ошибка исчезает.
    await user.type(rsvp().getByLabelText("Ваше имя"), "О");
    expect(rsvp().queryByRole("alert")).not.toBeInTheDocument();
  });

  it("после отправки — «Спасибо!» с именем и числом гостей, «Изменить ответ» возвращает форму", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<InvitationView data={createDefaultInvitation()} slug="demo" />);

    await user.type(rsvp().getByLabelText("Ваше имя"), "Ольга Иванова");
    await user.click(rsvp().getByRole("button", { name: "Добавить гостя" }));
    await user.click(rsvp().getByRole("button", { name: "Добавить гостя" }));
    expect(rsvp().getByLabelText("Количество гостей")).toHaveValue("3");
    await user.click(rsvp().getByRole("button", { name: "Подтвердить" }));

    expect(await rsvp().findByRole("status")).toHaveTextContent("Спасибо!");
    expect(rsvp().getByText("Ольга, мы получили ваше подтверждение: 3 гостя.")).toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ name: "Ольга Иванова", guestsCount: 3 });

    await user.click(rsvp().getByRole("button", { name: "Изменить ответ" }));
    expect(rsvp().getByLabelText("Ваше имя")).toHaveValue("Ольга Иванова");
  });

  it("ответ запоминается: вернувшись, гость видит его, а правка обновляет ту же запись (PUT), а не шлёт вторую", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "r1", editKey: "k1" }), { status: 201 }))
      .mockResolvedValue(new Response(JSON.stringify({ id: "r1" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    const first = render(<InvitationView data={createDefaultInvitation()} slug="demo" />);
    await user.type(rsvp().getByLabelText("Ваше имя"), "Ольга Иванова");
    await user.click(rsvp().getByRole("button", { name: "Подтвердить" }));
    expect(await rsvp().findByRole("status")).toHaveTextContent("Спасибо!");
    first.unmount();

    // Гость открыл приглашение снова.
    render(<InvitationView data={createDefaultInvitation()} slug="demo" />);
    expect(await rsvp().findByText("Вы уже ответили")).toBeInTheDocument();
    expect(rsvp().getByText("Ольга, вы придёте: 1 гость. Ждём вас! ♡")).toBeInTheDocument();
    await user.click(rsvp().getByRole("button", { name: "Изменить ответ" }));
    expect(rsvp().getByLabelText("Ваше имя")).toHaveValue("Ольга Иванова");
    await user.click(rsvp().getByText("Не смогу"));
    await user.type(rsvp().getByLabelText("Комментарий"), "Простите!");
    await user.click(rsvp().getByRole("button", { name: "Подтвердить" }));
    expect(await rsvp().findByRole("status")).toHaveTextContent("Спасибо!");

    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe("/api/invitations/demo/rsvp/r1");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body)).toMatchObject({ editKey: "k1", attending: false, comment: "Простите!" });
  });

  it("ответ удалили у организатора (404) — правка уходит новым ответом", async () => {
    localStorage.setItem("rsvp-answer:demo", JSON.stringify({ id: "gone", editKey: "k", name: "Ольга", attending: true, guests: 1, comment: "" }));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 404 }))
      .mockResolvedValue(new Response(JSON.stringify({ id: "r2", editKey: "k2" }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<InvitationView data={createDefaultInvitation()} slug="demo" />);
    await user.click(await rsvp().findByRole("button", { name: "Изменить ответ" }));
    await user.click(rsvp().getByRole("button", { name: "Подтвердить" }));
    expect(await rsvp().findByRole("status")).toHaveTextContent("Спасибо!");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/invitations/demo/rsvp");
    expect(JSON.parse(localStorage.getItem("rsvp-answer:demo")!)).toMatchObject({ id: "r2", editKey: "k2" });
  });

  it("в превью редактора запомненный ответ не показывается", () => {
    localStorage.setItem("rsvp-answer:demo", JSON.stringify({ id: "r", editKey: "k", name: "Ольга", attending: true, guests: 1, comment: "" }));
    render(<InvitationView data={createDefaultInvitation()} slug="demo" preview />);
    expect(rsvp().queryByText("Вы уже ответили")).not.toBeInTheDocument();
  });
});
