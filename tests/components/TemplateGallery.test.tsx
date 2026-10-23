// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => vi.unstubAllGlobals());
import { TemplateGallery } from "@/components/templates/TemplateGallery";
import { findBlock } from "@/lib/blocks";
import { splitNames } from "@/lib/calendar";
import { createFromTemplate, templates } from "@/lib/templates";

describe("TemplateGallery", () => {
  it("показывает все шаблоны с живым превью и кнопкой выбора", () => {
    const { container } = render(<TemplateGallery />);
    expect(container.querySelectorAll("button button")).toHaveLength(0);
    for (const t of templates) {
      expect(screen.getByText(t.name)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: `Выбрать шаблон «${t.name}»` })).toBeEnabled();
      // Превью — настоящий главный экран шаблона, но недоступный с клавиатуры.
      const preview = screen.getByTestId(`template-preview-${t.id}`);
      expect(preview).toHaveAttribute("aria-hidden", "true");
      // Имена — из примера шаблона (у шаблонов со своей структурой — свои).
      for (const name of splitNames(findBlock(createFromTemplate(t), "hero")!.names)) {
        expect(within(preview).getByTestId("hero-names")).toHaveTextContent(name);
      }
    }
  });
});

describe("«Выбрать» → форма «Главное о событии»", () => {
  const user = () => userEvent.setup();
  const stubCreate = () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ editUrl: "/edit/x?token=t" }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    return { fetchMock, assign };
  };
  const body = (fetchMock: ReturnType<typeof vi.fn>) => JSON.parse(fetchMock.mock.calls[0][1].body);

  it("пустые имена и дата — ошибки у полей, фокус на первом; заполненная форма уходит в API вместе с шаблоном", async () => {
    const u = user();
    const { fetchMock, assign } = stubCreate();
    render(<TemplateGallery />);
    await u.click(screen.getByRole("button", { name: "Выбрать шаблон «Розовый сад»" }));
    const dialog = screen.getByRole("dialog", { name: "Главное о событии" });
    await u.click(within(dialog).getByRole("button", { name: "Создать приглашение" }));
    expect(within(dialog).getByLabelText("Имена")).toHaveFocus();
    expect(within(dialog).getByLabelText("Имена")).toHaveAccessibleDescription(/Укажите имена/);
    expect(within(dialog).getByText("Укажите дату события")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    await u.type(within(dialog).getByLabelText("Имена"), "Мария & Пётр");
    fireEvent.change(within(dialog).getByLabelText("Дата"), { target: { value: "2027-08-20" } });
    await u.type(within(dialog).getByLabelText("Название места"), "Шале");
    await u.selectOptions(within(dialog).getByLabelText("Музыка"), "Без музыки");
    await u.click(within(dialog).getByRole("button", { name: "Создать приглашение" }));
    expect(body(fetchMock)).toEqual({
      template: "rose-garden",
      eventType: "wedding",
      language: "ru",
      setup: { names: "Мария & Пётр", date: "2027-08-20T16:00", hosts: "", placeName: "Шале", address: "", musicUrl: null },
    });
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/edit/x?token=t"));
  });

  it("«Этно»: «От кого приглашение» с хозяевами из примера в подсказке уходит в API; у шаблона без хозяев поля нет", async () => {
    const u = user();
    const { fetchMock } = stubCreate();
    render(<TemplateGallery />);
    await u.click(screen.getByRole("button", { name: "Выбрать шаблон «Розовый сад»" }));
    expect(within(screen.getByRole("dialog", { name: "Главное о событии" })).queryByLabelText("От кого приглашение")).toBeNull();
    await u.keyboard("{Escape}");
    await u.click(screen.getByRole("button", { name: "Выбрать шаблон «Этно»" }));
    const dialog = screen.getByRole("dialog", { name: "Главное о событии" });
    const hosts = within(dialog).getByLabelText("От кого приглашение");
    expect(hosts).toHaveAttribute("placeholder", "Нурбек и Венера");
    await u.click(within(dialog).getByRole("radio", { name: "Кыргызча" }));
    expect(hosts).toHaveAttribute("placeholder", "Нурбек жана Венера");
    await u.type(within(dialog).getByLabelText("Имена"), "Айбек & Сезим");
    fireEvent.change(within(dialog).getByLabelText("Дата"), { target: { value: "2027-08-20" } });
    await u.type(hosts, "Тилековдор үй-бүлөсү");
    await u.click(within(dialog).getByRole("button", { name: "Создать приглашение" }));
    expect(body(fetchMock)).toMatchObject({ template: "etno", setup: { names: "Айбек & Сезим", hosts: "Тилековдор үй-бүлөсү" } });
  });

  it("«Пропустить» создаёт приглашение с примером текстов (без setup)", async () => {
    const u = user();
    const { fetchMock } = stubCreate();
    render(<TemplateGallery />);
    await u.click(screen.getByRole("button", { name: "Выбрать шаблон «Звёздная ночь»" }));
    await u.click(screen.getByRole("button", { name: "Пропустить — заполню потом" }));
    expect(body(fetchMock)).toEqual({ template: "starry-night", eventType: "wedding", language: "ru" });
  });

  it("событие и язык: фильтр на главной выбирает событие, «Кыргызча» уходит в API, подпись имён — по событию", async () => {
    const u = user();
    const { fetchMock } = stubCreate();
    render(<TemplateGallery />);
    const filters = screen.getByRole("group", { name: "Событие" });
    await u.click(within(filters).getByRole("button", { name: "Кыз узатуу" }));
    expect(within(filters).getByRole("button", { name: "Кыз узатуу" })).toHaveAttribute("aria-pressed", "true");
    await u.click(screen.getAllByRole("button", { name: /^Выбрать шаблон/ })[0]);
    const dialog = screen.getByRole("dialog", { name: "Главное о событии" });
    expect(within(dialog).getByLabelText("Событие")).toHaveValue("kyz-uzatuu");
    await u.click(within(dialog).getByRole("radio", { name: "Кыргызча" }));
    await u.type(within(dialog).getByLabelText("Имя невесты"), "Нуркыз");
    fireEvent.change(within(dialog).getByLabelText("Дата"), { target: { value: "2027-08-20" } });
    await u.click(within(dialog).getByRole("button", { name: "Создать приглашение" }));
    expect(body(fetchMock)).toMatchObject({ eventType: "kyz-uzatuu", language: "ky", setup: { names: "Нуркыз" } });
  });
});
