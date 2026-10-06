// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Editor, type EditorAccount } from "@/components/editor/Editor";
import { createDefaultInvitation } from "@/lib/defaults";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 200 })));
});

const renderEditor = () =>
  render(<Editor id="inv1" token="secret" initialSlug="demo" initialData={createDefaultInvitation()} />);

describe("Editor", () => {
  it("вид блока выбирается плиткой с миниатюрой; внутри плиток нет вложенных кнопок", async () => {
    const user = userEvent.setup();
    const { container } = renderEditor();
    const preview = screen.getByTestId("preview");
    await user.click(screen.getByRole("button", { name: "Главный экран" }));
    expect(container.querySelectorAll("button button")).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: "Вид «Арка с фото»" }));
    expect(screen.getByRole("button", { name: "Вид «Арка с фото»" })).toHaveAttribute("aria-pressed", "true");
    expect(preview.querySelector(".inv-arch")).not.toBeNull();
    // Платный вид выбирается; плашка «PRO-оформление» пока скрыта (SHOW_PREMIUM_ALERT в Editor.tsx).
    await user.click(screen.getByRole("button", { name: "Вид «Полароид»" }));
    expect(screen.getByRole("button", { name: "Вид «Полароид»" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByTestId("premium-usage")).not.toBeInTheDocument();
  });

  it("«Посмотреть заставку» проигрывает её в превью, нажатие на печать закрывает", async () => {
    const user = userEvent.setup();
    renderEditor();
    await user.click(screen.getByRole("tab", { name: "Оформление" }));
    await user.click(screen.getByRole("button", { name: "Заставка Книга" }));
    const intro = screen.getByTestId("intro-preview");
    expect(within(intro).getByTestId("envelope")).toHaveAttribute("data-style", "book");
    vi.useFakeTimers();
    fireEvent.click(within(intro).getByRole("button", { name: "Открыть приглашение" }));
    act(() => vi.advanceTimersByTime(2000));
    vi.useRealTimers();
    expect(screen.queryByTestId("intro-preview")).not.toBeInTheDocument();
  });

  it("открыт только один блок, а превью прокручивается к открытому блоку", async () => {
    const user = userEvent.setup();
    renderEditor();
    const preview = screen.getByTestId("preview");
    const scrollTo = vi.spyOn(preview, "scrollTo");
    const header = (label: string) => screen.getByRole("button", { name: label });
    expect(header("Главный экран")).toHaveAttribute("aria-expanded", "false"); // сначала все свёрнуты

    await user.click(header("Программа"));
    expect(header("Программа")).toHaveAttribute("aria-expanded", "true");
    expect(header("Главный экран")).toHaveAttribute("aria-expanded", "false");
    expect(scrollTo).toHaveBeenCalledTimes(1);

    // Правка полей не дёргает превью — прокручивать его можно самому.
    await user.clear(screen.getByLabelText("Заголовок"));
    expect(scrollTo).toHaveBeenCalledTimes(1);

    // Закрытие блока тоже не прокручивает.
    await user.click(header("Программа"));
    expect(header("Программа")).toHaveAttribute("aria-expanded", "false");
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it("«Следовать» выключается — превью не прокручивается; «Перезагрузить» пересоздаёт превью", async () => {
    const user = userEvent.setup();
    renderEditor();
    const preview = screen.getByTestId("preview");
    const scrollTo = vi.spyOn(preview, "scrollTo");
    const follow = screen.getByRole("switch", { name: "Следовать за редактируемым блоком" });
    expect(follow).toBeChecked();

    await user.click(follow);
    expect(follow).not.toBeChecked();
    await user.click(screen.getByRole("button", { name: "Место" }));
    expect(scrollTo).not.toHaveBeenCalled();

    // Включили снова — сразу прокрутка к открытому блоку.
    await user.click(follow);
    expect(scrollTo).toHaveBeenCalledTimes(1);

    const before = within(preview).getByTestId("invitation");
    await user.click(screen.getByRole("button", { name: "Перезагрузить" }));
    expect(within(preview).getByTestId("invitation")).not.toBe(before);
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 0 });
  });

  it("изменение имени сразу отражается в превью", async () => {
    const user = userEvent.setup();
    renderEditor();
    const preview = screen.getByTestId("preview");
    expect(within(preview).getByTestId("hero-names")).toHaveTextContent("Анна & Иван");
    await user.click(screen.getByRole("button", { name: "Главный экран" }));

    const input = screen.getByLabelText("Имена");
    await user.clear(input);
    await user.type(input, "Мария & Пётр");

    expect(within(preview).getByTestId("hero-names")).toHaveTextContent("Мария & Пётр");
  });

  it("скрытие блока убирает его из превью", async () => {
    const user = userEvent.setup();
    renderEditor();
    const preview = screen.getByTestId("preview");
    expect(preview.querySelector('[data-block="story"]')).not.toBeNull();
    await user.click(screen.getByLabelText("Показывать блок «Наша история»"));
    expect(preview.querySelector('[data-block="story"]')).toBeNull();
  });

  it("пустые имена показывают ошибку и не сохраняются", async () => {
    const user = userEvent.setup();
    renderEditor();
    await user.click(screen.getByRole("button", { name: "Главный экран" }));
    await user.clear(screen.getByLabelText("Имена"));
    expect(screen.getByTestId("save-status")).toHaveTextContent("Есть ошибки");
    expect(screen.getByRole("alert")).toHaveTextContent("Укажите имена");
  });

  it("украшение из библиотеки добавляется в блок и сразу видно в превью", async () => {
    const user = userEvent.setup();
    renderEditor();
    const preview = screen.getByTestId("preview");
    const location = () => preview.querySelector('[data-block="location"]')!;
    expect(location().querySelector("img[data-ornament]")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Место" }));
    await user.click(screen.getByRole("button", { name: "Добавить украшение" }));
    const dialog = screen.getByRole("dialog", { name: "Украшение для блока «Место»" });
    await user.click(within(dialog).getByRole("button", { name: "Гардении" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(location().querySelector("img[data-ornament]")).toHaveAttribute("src", "/library/gardenia.webp");

    await user.selectOptions(screen.getByLabelText("Положение украшения 1"), "bottom-left");
    expect((location().querySelector("[data-decor]") as HTMLElement).style.left).toBe("0px");

    // Своя анимация: сначала — копия общей, потом правится отдельно от остальных украшений.
    expect(location().querySelector("img[data-ornament]")).toHaveAttribute("data-idle", "sway");
    await user.click(screen.getByRole("switch", { name: "Своя анимация украшения 1" }));
    await user.selectOptions(screen.getByLabelText("Движение украшения 1"), "float");
    await user.selectOptions(screen.getByLabelText("Появление украшения 1"), "grow");
    expect(location().querySelector("img[data-ornament]")).toHaveAttribute("data-idle", "float");
    expect(location().querySelector("[data-decor]")).toHaveAttribute("data-enter", "grow");
    const amplitude = screen.getByRole("slider", { name: "Размах движения украшения 1" });
    amplitude.focus();
    await user.keyboard("{End}");
    expect((location().querySelector("img[data-ornament]") as HTMLElement).style.getPropertyValue("--oi-a")).toBe("3");
    // «Вращается» — без размаха.
    await user.selectOptions(screen.getByLabelText("Движение украшения 1"), "spin");
    expect(screen.queryByRole("slider", { name: "Размах движения украшения 1" })).not.toBeInTheDocument();
    // Выключили — снова как у всех.
    await user.click(screen.getByRole("switch", { name: "Своя анимация украшения 1" }));
    expect(location().querySelector("img[data-ornament]")).toHaveAttribute("data-idle", "sway");
    expect(location().querySelector("[data-decor]")).not.toHaveAttribute("data-decor-own");

    await user.click(screen.getByRole("button", { name: "Удалить украшение 1" }));
    expect(location().querySelector("img[data-ornament]")).toBeNull();
  });

  it("любая правка украшения — после паузы оно перемонтируется и проигрывает анимацию заново", async () => {
    const user = userEvent.setup();
    renderEditor();
    const decor = () => screen.getByTestId("preview").querySelector<HTMLElement>('[data-block="location"] [data-decor]')!;
    await user.click(screen.getByRole("button", { name: "Место" }));
    await user.click(screen.getByRole("button", { name: "Добавить украшение" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Гардении" }));
    const before = decor();
    expect(before).toHaveAttribute("data-revealed");

    await user.selectOptions(screen.getByLabelText("Положение украшения 1"), "bottom-left");
    // Пока правка идёт — тот же элемент, изменения видны сразу.
    expect(decor()).toBe(before);
    expect(decor().style.left).toBe("0px");
    // После паузы — новый элемент, и он снова показан (анимация с начала).
    await act(() => new Promise((r) => setTimeout(r, 500)));
    expect(decor()).not.toBe(before);
    await waitFor(() => expect(decor()).toHaveAttribute("data-revealed"));
  });

  it("шрифты и текстура выбираются в «Оформлении» и сразу применяются к превью", async () => {
    const user = userEvent.setup();
    renderEditor();
    await user.click(screen.getByRole("tab", { name: "Оформление" }));
    const invitation = () => within(screen.getByTestId("preview")).getByTestId("invitation");

    // Шрифты — выпадающие списки: кнопка с выбранным шрифтом, в списке каждый шрифт своим начертанием.
    await user.click(screen.getByRole("button", { name: "Шрифт имён: Great Vibes" }));
    await user.click(screen.getByRole("button", { name: "Шрифт имён Lobster" }));
    expect(invitation().style.getPropertyValue("--font-title")).toContain("--font-lobster");
    expect(screen.queryByRole("button", { name: "Шрифт имён Pacifico" })).not.toBeInTheDocument(); // список закрылся
    // «Авто» подтянул пару к Lobster
    expect(invitation().style.getPropertyValue("--font-body")).toContain("--font-montserrat");
    expect(screen.getByRole("button", { name: "Основной текст: Авто · Montserrat" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Основной текст: Авто · Montserrat" }));
    await user.click(screen.getByRole("button", { name: "Основной шрифт PT Serif" }));
    expect(invitation().style.getPropertyValue("--font-body")).toContain("--font-pt-serif");

    await user.click(screen.getByRole("button", { name: "Текстура Сердечки" }));
    expect(within(invitation()).getByTestId("texture")).toHaveAttribute("data-texture", "hearts");
    expect(screen.getByRole("button", { name: "Текстура Сердечки" })).toHaveAttribute("aria-pressed", "true");
  });

  it("общая анимация украшений задаётся в «Оформлении» и применяется ко всем украшениям", async () => {
    const user = userEvent.setup();
    renderEditor();
    const ornaments = () => [...screen.getByTestId("preview").querySelectorAll<HTMLElement>("img[data-ornament]")];
    expect(ornaments().length).toBeGreaterThan(0);
    await user.click(screen.getByRole("tab", { name: "Оформление" }));
    await user.selectOptions(screen.getByLabelText("Появление всех украшений"), "blur");
    await user.selectOptions(screen.getByLabelText("Движение всех украшений"), "shimmer");
    const speed = screen.getByRole("slider", { name: "Скорость движения всех украшений" });
    speed.focus();
    await user.keyboard("{End}");
    for (const img of ornaments()) {
      expect(img).toHaveAttribute("data-idle", "shimmer");
      expect(img.parentElement).toHaveAttribute("data-enter", "blur");
      expect(Number(img.style.getPropertyValue("--oi-k"))).toBeLessThan(0.5);
    }
    // «Сразу на месте» — скорость появления не нужна.
    await user.selectOptions(screen.getByLabelText("Появление всех украшений"), "none");
    expect(screen.queryByRole("slider", { name: "Скорость появления всех украшений" })).not.toBeInTheDocument();
  });

  it("шаблон применяется после подтверждения: оформление меняется, имена остаются", async () => {
    const user = userEvent.setup();
    renderEditor();
    const invitation = () => within(screen.getByTestId("preview")).getByTestId("invitation");
    await user.click(screen.getByRole("button", { name: "Главный экран" }));
    await user.clear(screen.getByLabelText("Имена"));
    await user.type(screen.getByLabelText("Имена"), "Мария & Пётр");

    await user.click(screen.getByRole("tab", { name: "Оформление" }));
    // Превью шаблона содержит свои кнопки — плитка не должна оборачивать их в <button>.
    expect(document.querySelectorAll("button button")).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: "Шаблон «Звёздная ночь»" }));
    const dialog = screen.getByRole("alertdialog", { name: "Применить шаблон «Звёздная ночь»?" });

    // «Отмена» ничего не меняет
    await user.click(within(dialog).getByRole("button", { name: "Отмена" }));
    expect(invitation().style.getPropertyValue("--bg")).toBe("#f7f1e8");

    await user.click(screen.getByRole("button", { name: "Шаблон «Звёздная ночь»" }));
    await user.click(screen.getByRole("button", { name: "Применить" }));
    expect(invitation().style.getPropertyValue("--bg")).toBe("#151b2c");
    expect(within(invitation()).getByTestId("texture")).toHaveAttribute("data-texture", "stars");
    expect(within(invitation()).getByTestId("hero-names")).toHaveTextContent("Мария & Пётр");
    expect(screen.getByTestId("save-status")).toHaveTextContent("Сохраняю");
  });

  it("фон блока выбирается в окне по категориям, прозрачность фона меняется ползунком", async () => {
    const user = userEvent.setup();
    renderEditor();
    const location = () => screen.getByTestId("preview").querySelector<HTMLElement>('[data-block="location"]')!;
    await user.click(screen.getByRole("button", { name: "Место" }));
    // Фон выбирается в окне по категориям, как украшения.
    await user.click(screen.getByRole("button", { name: /^Фон блока: .*Выбрать$/ }));
    const dialog = screen.getByRole("dialog", { name: "Фон блока" });
    await user.click(within(dialog).getByRole("radio", { name: "Листы и свитки" }));
    await user.click(within(dialog).getByRole("button", { name: "Тетрадный лист" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(location()).toHaveAttribute("data-surface", "notebook");
    expect(screen.getByRole("button", { name: "Фон блока: Тетрадный лист. Выбрать" })).toBeInTheDocument();

    // Ползунок Radix управляется клавиатурой: Home → минимум (10%), каждая → +5%.
    const slider = screen.getByRole("slider", { name: "Прозрачность фона блока" });
    slider.focus();
    await user.keyboard("{Home}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}");
    expect(slider).toHaveAttribute("aria-valuenow", "35");
    expect(within(location()).getByTestId("surface-layer").style.opacity).toBe("0.35");

    await user.click(screen.getByRole("button", { name: "Убрать фон блока" }));
    expect(location()).toHaveAttribute("data-surface", "plain");
    expect(screen.queryByRole("slider", { name: "Прозрачность фона блока" })).not.toBeInTheDocument();
  });
});

describe("Editor: добавление, копирование и удаление блоков", () => {
  it("«Добавить блок» → тип → блок под открытым, раскрыт и виден в превью", async () => {
    const user = userEvent.setup();
    renderEditor();
    const preview = screen.getByTestId("preview");
    await user.click(screen.getByRole("button", { name: "Программа" }));
    await user.click(screen.getByRole("button", { name: "Добавить блок" }));
    const dialog = screen.getByRole("dialog");
    // Анкета уже есть и может быть только одна.
    expect(within(dialog).getByRole("button", { name: "Добавить блок «Анкета гостя»" })).toBeDisabled();
    await user.click(within(dialog).getByRole("button", { name: "Подарки" }));

    const types = [...preview.querySelectorAll("[data-block]")].map((el) => el.getAttribute("data-block"));
    expect(types.indexOf("text")).toBe(types.indexOf("program") + 1);
    expect(preview.querySelector('[data-block="text"]')).toHaveTextContent("Подарки");
    expect(screen.getByRole("button", { name: /^Текст/ })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Подпись кнопки")).toBeInTheDocument();
  });

  it("«Дублировать» кладёт копию под блок, «Удалить» спрашивает подтверждение", async () => {
    const user = userEvent.setup();
    renderEditor();
    const preview = screen.getByTestId("preview");
    const stories = () => preview.querySelectorAll('[data-block="story"]');
    await user.click(screen.getByRole("button", { name: "Дублировать блок «Наша история»" }));
    expect(stories()).toHaveLength(2);
    expect(screen.getByRole("button", { name: /^Наша история 2/ })).toHaveAttribute("aria-expanded", "true");

    await user.click(screen.getByRole("button", { name: "Удалить блок «Наша история 2»" }));
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Отмена" }));
    expect(stories()).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Удалить блок «Наша история 2»" }));
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Удалить" }));
    expect(stories()).toHaveLength(1);

    // Главный экран не удаляется и не копируется, анкета — не копируется.
    expect(screen.queryByRole("button", { name: "Удалить блок «Главный экран»" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Дублировать блок «Главный экран»" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Дублировать блок «Анкета гостя»" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Удалить блок «Анкета гостя»" })).toBeInTheDocument();
  });

  it("загрузка из редактора идёт в это приглашение — с id и token", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ url: "/uploads/bg.png" }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    renderEditor();
    await user.click(screen.getByRole("tab", { name: "Оформление" }));
    await user.upload(screen.getByLabelText("Фоновое фото"), new File([new Uint8Array(10)], "bg.png", { type: "image/png" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/upload?id=inv1&token=secret", expect.objectContaining({ method: "POST" }));
  });

  describe("аккаунт", () => {
    const renderWith = (account: EditorAccount) =>
      render(<Editor id="inv1" token="secret" initialSlug="demo" initialData={createDefaultInvitation()} account={account} />);

    it("без входа: вместо ссылки для гостей — «Войдите» со входом через Google", async () => {
      const user = userEvent.setup();
      renderWith({ user: null, ownership: "none" });
      expect(screen.getByRole("button", { name: "Войти" })).toBeInTheDocument();
      await user.click(screen.getByRole("tab", { name: "Ссылка" }));
      expect(screen.getByText("Войдите, чтобы продолжить")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Войти через Google" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Скопировать ссылку для гостей" })).not.toBeInTheDocument();
    });

    it("без входа «Открыть» и «Гости» не ведут на страницы, а просят войти", async () => {
      const user = userEvent.setup();
      renderWith({ user: null, ownership: "none" });
      expect(screen.queryByRole("link", { name: "Гости" })).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "Открыть" })).not.toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Гости" }));
      const dialog = screen.getByRole("dialog", { name: "Ответы гостей" });
      expect(within(dialog).getByRole("button", { name: "Войти через Google" })).toBeInTheDocument();
      await user.keyboard("{Escape}");
      await user.click(screen.getByRole("button", { name: "Открыть" }));
      expect(screen.getByRole("dialog", { name: "Открыть приглашение" })).toBeInTheDocument();
    });

    it("вошёл в другой аккаунт — ссылки и ответы закрыты, можно сменить аккаунт", async () => {
      const user = userEvent.setup();
      renderWith({ user: { id: "u2", email: "other@example.com", name: null, image: null }, ownership: "other" });
      await user.click(screen.getByRole("button", { name: "Гости" }));
      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByText("Приглашение сохранено в другом аккаунте")).toBeInTheDocument();
      expect(within(dialog).getByRole("button", { name: "Войти другим аккаунтом" })).toBeInTheDocument();
    });

    it("вошёл, но приглашение ещё ничьё — одна кнопка «Сохранить в аккаунт» (из «Гости» — с возвратом к ответам)", async () => {
      const user = userEvent.setup();
      renderWith({ user: { id: "u1", email: "anna@example.com", name: "Анна", image: null }, ownership: "none" });
      await user.click(screen.getByRole("tab", { name: "Ссылка" }));
      expect(screen.getByRole("link", { name: "Сохранить в аккаунт anna@example.com" })).toHaveAttribute(
        "href",
        "/edit/inv1/claim?token=secret",
      );
      await user.click(screen.getByRole("button", { name: "Гости" }));
      expect(within(screen.getByRole("dialog")).getByRole("link", { name: "Сохранить в аккаунт anna@example.com" })).toHaveAttribute(
        "href",
        "/edit/inv1/claim?token=secret&next=guests",
      );
    });

    it("своё приглашение: ссылки на месте, в шапке — меню аккаунта", async () => {
      const user = userEvent.setup();
      renderWith({ user: { id: "u1", email: "anna@example.com", name: "Анна", image: null }, ownership: "mine" });
      expect(screen.getByRole("link", { name: "Гости" })).toHaveAttribute("href", "/edit/inv1/guests?token=secret");
      await user.click(screen.getByRole("tab", { name: "Ссылка" }));
      expect(screen.getByRole("button", { name: "Скопировать ссылку для гостей" })).toBeInTheDocument();
      expect(screen.getByText(/сохранено в вашем аккаунте/)).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Аккаунт anna@example.com" }));
      expect(screen.getByRole("link", { name: "Мои приглашения" })).toHaveAttribute("href", "/my");
    });

    it("без входа (ключей Google нет) всё как раньше: ссылки сразу, кнопки «Войти» нет", async () => {
      const user = userEvent.setup();
      renderEditor();
      expect(screen.queryByRole("button", { name: "Войти" })).not.toBeInTheDocument();
      await user.click(screen.getByRole("tab", { name: "Ссылка" }));
      expect(screen.getByRole("button", { name: "Скопировать ссылку для гостей" })).toBeInTheDocument();
    });
  });

  describe("музыка", () => {
    it("своя загрузка недоступна — песня выбирается из встроенного списка, есть «Без музыки»", async () => {
      const user = userEvent.setup();
      const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
      vi.stubGlobal("fetch", fetchMock);
      renderEditor();
      await user.click(screen.getByRole("tab", { name: "Музыка" }));
      expect(screen.getByText(/Загрузить свою музыку пока нельзя/)).toBeInTheDocument();
      expect(screen.queryByLabelText("Загрузить mp3")).not.toBeInTheDocument();
      // У нового приглашения песня уже выбрана — первая из списка.
      expect(screen.getByRole("button", { name: "Песня «Die With A Smile» — Lady Gaga, Bruno Mars" })).toHaveAttribute("aria-pressed", "true");

      await user.click(screen.getByRole("button", { name: "Песня «A Thousand Years» — Christina Perri" }));
      expect(screen.getByRole("button", { name: "Песня «A Thousand Years» — Christina Perri" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: "Песня «Perfect» — Ed Sheeran" })).toHaveAttribute("aria-pressed", "false");
      await act(() => new Promise((r) => setTimeout(r, 900)));
      const body = JSON.parse(fetchMock.mock.calls.at(-1)![1].body);
      expect(body.data.music.url).toBe("/music/a-thousand-years.mp3");

      await user.click(screen.getByRole("button", { name: "Без музыки" }));
      expect(screen.getByRole("button", { name: "Без музыки" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.queryByLabelText("Повторять по кругу")).not.toBeInTheDocument();
    });

    it("«Послушать» играет песню в редакторе, повторное нажатие останавливает", async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(screen.getByRole("tab", { name: "Музыка" }));
      await user.click(screen.getByRole("button", { name: "Послушать «Marry You»" }));
      const audio = screen.getByTestId("music-preview") as HTMLAudioElement;
      expect(audio.getAttribute("src")).toBe("/music/marry-you.mp3");
      expect(audio.paused).toBe(false);
      await user.click(screen.getByRole("button", { name: "Остановить «Marry You»" }));
      expect(audio.paused).toBe(true);
    });

    it("музыка в превью — как у гостя: кнопка-эквалайзер, печать заставки включает, «Послушать» глушит", async () => {
      const user = userEvent.setup();
      renderEditor();
      const audio = screen.getByTestId("preview-music") as HTMLAudioElement;
      expect(audio.getAttribute("src")).toBe("/music/die-with-a-smile.mp3");
      expect(audio.paused).toBe(true);

      await user.click(screen.getByRole("button", { name: "Включить музыку" }));
      expect(audio.paused).toBe(false);
      await user.click(screen.getByRole("button", { name: "Выключить музыку" }));
      expect(audio.paused).toBe(true);

      // Нажатие на печать в «Посмотреть заставку» включает музыку.
      await user.click(screen.getByRole("tab", { name: "Оформление" }));
      await user.click(screen.getByRole("button", { name: "Посмотреть заставку" }));
      await user.click(within(screen.getByTestId("intro-preview")).getByRole("button", { name: "Открыть приглашение" }));
      expect(audio.paused).toBe(false);

      // «Послушать» другую песню — музыка превью замолкает, песни не накладываются.
      await user.click(screen.getByRole("tab", { name: "Музыка" }));
      await user.click(screen.getByRole("button", { name: "Послушать «Marry You»" }));
      expect(audio.paused).toBe(true);
      expect(screen.getByRole("button", { name: "Включить музыку" })).toBeInTheDocument();

      // И наоборот: включили музыку превью — прослушивание останавливается.
      await user.click(screen.getByRole("button", { name: "Включить музыку" }));
      expect((screen.getByTestId("music-preview") as HTMLAudioElement).paused).toBe(true);
      expect(screen.getByRole("button", { name: "Послушать «Marry You»" })).toBeInTheDocument();
    });

    it("песня, загруженная до ограничения, остаётся и видна отдельной строкой", async () => {
      const user = userEvent.setup();
      const data = createDefaultInvitation();
      data.music = { url: "/uploads/old.mp3", loop: true };
      render(<Editor id="inv1" token="secret" initialSlug="demo" initialData={data} />);
      await user.click(screen.getByRole("tab", { name: "Музыка" }));
      expect(screen.getByRole("button", { name: "Песня «Своя песня» — загружена раньше" })).toHaveAttribute("aria-pressed", "true");
    });
  });

  it("мини-игра с декором включена по умолчанию и выключается переключателем", async () => {
    const user = userEvent.setup();
    const data = createDefaultInvitation();
    data.theme.decor = { ...data.theme.decor, type: "petals", density: 10 };
    render(<Editor id="inv1" token="secret" initialSlug="demo" initialData={data} />);
    const layer = () => screen.getByTestId("decor-layer");
    expect(layer()).toHaveAttribute("data-pop", "true");
    await user.click(screen.getByRole("tab", { name: "Оформление" }));
    await user.click(screen.getByRole("switch", { name: "Лопаются от касания" }));
    expect(layer()).not.toHaveAttribute("data-pop");
  });
});
