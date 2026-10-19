// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InvitationView } from "@/components/invitation/InvitationView";
import { createDefaultInvitation } from "@/lib/defaults";
import { updateBlock } from "@/lib/blocks";

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

  it("вид «Три ответа»: без ответа просит выбрать, «с супругом» отправляет двух гостей", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<InvitationView data={updateBlock(createDefaultInvitation(), "rsvp", { variant: "choices" })} slug="demo" />);

    await user.type(rsvp().getByLabelText("Имя или имена гостей"), "Айжан и Бакыт");
    await user.click(rsvp().getByRole("button", { name: "Отправить ответ" }));
    expect(rsvp().getByRole("alert")).toHaveTextContent("выберите ответ");
    expect(fetchMock).not.toHaveBeenCalled();

    await user.click(rsvp().getByRole("radio", { name: "Приду с супругом / супругой" }));
    await user.click(rsvp().getByRole("button", { name: "Отправить ответ" }));
    expect(await rsvp().findByRole("status")).toHaveTextContent("Спасибо!");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ name: "Айжан и Бакыт", attending: true, guestsCount: 2 });
  });

  it("вид «Три ответа»: «Не смогу прийти» — отказ", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<InvitationView data={updateBlock(createDefaultInvitation(), "rsvp", { variant: "choices" })} slug="demo" />);

    await user.type(rsvp().getByLabelText("Имя или имена гостей"), "Ольга");
    await user.click(rsvp().getByRole("radio", { name: "Не смогу прийти" }));
    await user.click(rsvp().getByRole("button", { name: "Отправить ответ" }));
    expect(await rsvp().findByText("Ольга, жаль, что вы не сможете прийти. Ваш ответ получен.")).toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ attending: false, guestsCount: 1 });
  });
});

describe("Анкета: один ответ с устройства", () => {
  const secret = "s".repeat(32);
  const stored = () => JSON.parse(localStorage.getItem("rsvp:demo") ?? "null");
  const remember = (answer: object) =>
    localStorage.setItem("rsvp:demo", JSON.stringify({ id: "r1", secret, name: "Ольга Иванова", attending: true, guestsCount: 3, comment: "Без лука", ...answer }));

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("запоминает id и секрет, «Изменить ответ» правит ту же запись (PATCH), а не шлёт новый ответ", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ id: "r1", secret }, { status: 201 }))
      .mockResolvedValueOnce(Response.json({ id: "r1" }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<InvitationView data={createDefaultInvitation()} slug="demo" />);

    await user.type(rsvp().getByLabelText("Ваше имя"), "Ольга");
    await user.click(rsvp().getByRole("button", { name: "Подтвердить" }));
    expect(await rsvp().findByRole("status")).toHaveTextContent("Спасибо!");
    expect(stored()).toMatchObject({ id: "r1", secret, name: "Ольга", guestsCount: 1 });

    await user.click(rsvp().getByRole("button", { name: "Изменить ответ" }));
    await user.click(rsvp().getByRole("button", { name: "Добавить гостя" }));
    await user.click(rsvp().getByRole("button", { name: "Подтвердить" }));
    expect(await rsvp().findByText("Ольга, мы получили ваше подтверждение: 2 гостя.")).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe("/api/invitations/demo/rsvp");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toMatchObject({ id: "r1", secret, name: "Ольга", guestsCount: 2 });
    expect(stored()).toMatchObject({ id: "r1", guestsCount: 2 });
  });

  it("вернувшись, гость видит свой ответ, а форма правки заполнена им", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    remember({});
    const user = userEvent.setup();
    render(<InvitationView data={createDefaultInvitation()} slug="demo" />);

    expect(await rsvp().findByText("Вы уже ответили")).toBeInTheDocument();
    expect(rsvp().getByText("Ольга, мы получили ваше подтверждение: 3 гостя.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    await user.click(rsvp().getByRole("button", { name: "Изменить ответ" }));
    expect(rsvp().getByLabelText("Ваше имя")).toHaveValue("Ольга Иванова");
    expect(rsvp().getByLabelText("Количество гостей")).toHaveValue("3");
    expect(rsvp().getByLabelText("Комментарий")).toHaveValue("Без лука");
  });

  it("вид «Три ответа»: сохранённый ответ «с супругом» выбран в форме правки", async () => {
    remember({ guestsCount: 2 });
    const user = userEvent.setup();
    render(<InvitationView data={updateBlock(createDefaultInvitation(), "rsvp", { variant: "choices" })} slug="demo" />);

    await user.click(await rsvp().findByRole("button", { name: "Изменить ответ" }));
    expect(rsvp().getByRole("radio", { name: "Приду с супругом / супругой" })).toBeChecked();
  });

  it("записи на сервере больше нет (404) — ответ уходит заново и запоминается новый id", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ error: "Ответ не найден" }, { status: 404 }))
      .mockResolvedValueOnce(Response.json({ id: "r2", secret: "t".repeat(32) }, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    remember({});
    const user = userEvent.setup();
    render(<InvitationView data={createDefaultInvitation()} slug="demo" />);

    await user.click(await rsvp().findByRole("button", { name: "Изменить ответ" }));
    await user.click(rsvp().getByRole("button", { name: "Подтвердить" }));
    expect(await rsvp().findByRole("status")).toHaveTextContent("Спасибо!");
    expect(fetchMock.mock.calls.map(([, init]) => init.method)).toEqual(["PATCH", "POST"]);
    expect(stored()).toMatchObject({ id: "r2", secret: "t".repeat(32) });
  });

  it("сбой сети при правке — ошибка, второй ответ не отправляется", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);
    remember({});
    const user = userEvent.setup();
    render(<InvitationView data={createDefaultInvitation()} slug="demo" />);

    await user.click(await rsvp().findByRole("button", { name: "Изменить ответ" }));
    await user.click(rsvp().getByRole("button", { name: "Подтвердить" }));
    expect(await rsvp().findByRole("alert")).toHaveTextContent("Не удалось отправить ответ");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("в превью редактора сохранённый ответ не показывается — там всегда форма", () => {
    remember({});
    render(<InvitationView data={createDefaultInvitation()} slug="demo" preview />);
    expect(rsvp().getByRole("button", { name: "Подтвердить" })).toBeInTheDocument();
    expect(rsvp().queryByText("Вы уже ответили")).not.toBeInTheDocument();
  });
});
