// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InvitationView } from "@/components/invitation/InvitationView";
import { createDefaultInvitation } from "@/lib/defaults";

const rsvp = () => within(document.querySelector<HTMLElement>('[data-block="rsvp"]')!);

describe("Анкета гостя", () => {
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
});
