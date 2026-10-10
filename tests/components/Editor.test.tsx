// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Editor, type EditorAccount } from "@/components/editor/Editor";
import { createDefaultInvitation } from "@/lib/defaults";
import { openBlockView, openThemeSection } from "./editorHelpers";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 200 })));
});

/** Действие из меню «⋯» строки блока. */
async function blockAction(user: ReturnType<typeof userEvent.setup>, block: string, item: string) {
  await user.click(screen.getByRole("button", { name: `Действия с блоком «${block}»` }));
  await user.click(screen.getByRole("menuitem", { name: item }));
}

/** Пункты меню «⋯» блока (доступные), меню закрывается. */
async function menuItems(user: ReturnType<typeof userEvent.setup>, block: string) {
  await user.click(screen.getByRole("button", { name: `Действия с блоком «${block}»` }));
  const items = screen.getAllByRole("menuitem").map((el) => el.textContent?.trim());
  await user.keyboard("{Escape}");
  return items;
}

const renderEditor = () =>
  render(<Editor id="inv1" token="secret" initialSlug="demo" initialData={createDefaultInvitation()} />);

describe("Editor", () => {
  it("вид блока выбирается плиткой с миниатюрой; внутри плиток нет вложенных кнопок", async () => {
    const user = userEvent.setup();
    const { container } = renderEditor();
    const preview = screen.getByTestId("preview");
    await openBlockView(user, "Главный экран");
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
    await openThemeSection(user, "Заставка");
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
    expect(within(preview).getByTestId("hero-names")).toHaveTextContent("Айгерим & Нурлан");
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

    await openBlockView(user, "Место");
    await user.click(screen.getByRole("button", { name: "Добавить украшение" }));
    const dialog = screen.getByRole("dialog", { name: "Украшение для блока «Место»" });
    await user.click(within(dialog).getByRole("button", { name: "Гардении" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(location().querySelector("img[data-ornament]")).toHaveAttribute("src", "/library/gardenia.webp");

    await user.click(within(screen.getByRole("radiogroup", { name: "Положение украшения 1" })).getByRole("radio", { name: "Снизу слева" }));
    expect((location().querySelector("[data-decor]") as HTMLElement).style.left).toBe("0px");

    // Только что добавленное украшение раскрыто: «Меньше / Больше» меняют размер заметным шагом.
    const decorWidth = () => (location().querySelector("[data-decor]") as HTMLElement).style.width;
    expect(decorWidth()).toBe("160px");
    await user.click(screen.getByRole("button", { name: "Увеличить украшение 1" }));
    expect(decorWidth()).toBe("200px");
    await user.click(screen.getByRole("button", { name: "Уменьшить украшение 1" }));
    expect(decorWidth()).toBe("160px");

    // Заменить картинку — то же украшение, место и размер не меняются.
    await user.click(screen.getByRole("button", { name: "Заменить картинку" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Красные розы" }));
    expect(location().querySelectorAll("img[data-ornament]")).toHaveLength(1);
    expect(location().querySelector("img[data-ornament]")).toHaveAttribute("src", "/library/red-roses.webp");
    expect((location().querySelector("[data-decor]") as HTMLElement).style.left).toBe("0px");

    // Точные числа и своя анимация — в свёрнутой «Тонкой настройке украшения».
    expect(screen.queryByRole("slider", { name: "Размер украшения 1" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Тонкая настройка украшения" }));
    expect(screen.getByRole("slider", { name: "Размер украшения 1" })).toBeInTheDocument();

    // Своя анимация: сначала — копия общей, потом правится отдельно от остальных украшений.
    expect(location().querySelector("img[data-ornament]")).toHaveAttribute("data-idle", "sway");
    await user.click(screen.getByRole("switch", { name: "Анимировать отдельно от остальных" }));
    await user.selectOptions(screen.getByLabelText("Движение украшения 1"), "float");
    await user.selectOptions(screen.getByLabelText("Появление украшения 1"), "grow");
    expect(location().querySelector("img[data-ornament]")).toHaveAttribute("data-idle", "float");
    expect(location().querySelector("[data-decor]")).toHaveAttribute("data-enter", "grow");
    const amplitude = screen.getByRole("slider", { name: "Сила движения украшения 1" });
    amplitude.focus();
    await user.keyboard("{End}");
    expect((location().querySelector("img[data-ornament]") as HTMLElement).style.getPropertyValue("--oi-a")).toBe("3");
    // «Вращается» — без размаха.
    await user.selectOptions(screen.getByLabelText("Движение украшения 1"), "spin");
    expect(screen.queryByRole("slider", { name: "Сила движения украшения 1" })).not.toBeInTheDocument();
    // Выключили — снова как у всех.
    await user.click(screen.getByRole("switch", { name: "Анимировать отдельно от остальных" }));
    expect(location().querySelector("img[data-ornament]")).toHaveAttribute("data-idle", "sway");
    expect(location().querySelector("[data-decor]")).not.toHaveAttribute("data-decor-own");

    await user.click(screen.getByRole("button", { name: "Удалить украшение 1" }));
    expect(location().querySelector("img[data-ornament]")).toBeNull();
  });

  it("любая правка украшения — после паузы оно перемонтируется и проигрывает анимацию заново", async () => {
    const user = userEvent.setup();
    renderEditor();
    const decor = () => screen.getByTestId("preview").querySelector<HTMLElement>('[data-block="location"] [data-decor]')!;
    await openBlockView(user, "Место");
    await user.click(screen.getByRole("button", { name: "Добавить украшение" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Гардении" }));
    const before = decor();
    expect(before).toHaveAttribute("data-revealed");

    await user.click(within(screen.getByRole("radiogroup", { name: "Положение украшения 1" })).getByRole("radio", { name: "Снизу слева" }));
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
    await openThemeSection(user, "Шрифты");
    const invitation = () => within(screen.getByTestId("preview")).getByTestId("invitation");

    // Шрифты — выпадающие списки: кнопка с выбранным шрифтом, в списке каждый шрифт своим начертанием.
    await user.click(screen.getByRole("button", { name: "Шрифт имён: Great Vibes" }));
    await user.click(screen.getByRole("button", { name: "Шрифт имён Lobster" }));
    expect(invitation().style.getPropertyValue("--font-title")).toContain("--font-lobster");
    expect(screen.queryByRole("button", { name: "Шрифт имён Pacifico" })).not.toBeInTheDocument(); // список закрылся
    // «Авто» подтянул пару к Lobster
    expect(invitation().style.getPropertyValue("--font-body")).toContain("--font-montserrat");
    // Шрифт текста подбирается сам; поменять — в «Тонкой настройке» раздела.
    await user.click(screen.getByRole("button", { name: "Тонкая настройка" }));
    await user.click(screen.getByRole("button", { name: "Шрифт текста: Авто · Montserrat" }));
    await user.click(screen.getByRole("button", { name: "Основной шрифт PT Serif" }));
    expect(invitation().style.getPropertyValue("--font-body")).toContain("--font-pt-serif");

    await openThemeSection(user, "Фон страницы");
    await user.click(screen.getByRole("button", { name: "Текстура Сердечки" }));
    expect(within(invitation()).getByTestId("texture")).toHaveAttribute("data-texture", "hearts");
    expect(screen.getByRole("button", { name: "Текстура Сердечки" })).toHaveAttribute("aria-pressed", "true");
  });

  it("общая анимация украшений задаётся в «Оформлении» и применяется ко всем украшениям", async () => {
    const user = userEvent.setup();
    renderEditor();
    const ornaments = () => [...screen.getByTestId("preview").querySelectorAll<HTMLElement>("img[data-ornament]")];
    expect(ornaments().length).toBeGreaterThan(0);
    await openThemeSection(user, "Анимации", { fine: true });
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

    await openThemeSection(user, "Шаблон");
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
    // Фон целиком — в «Тонкой настройке» подвкладки «Вид»; выбирается в окне по категориям, как украшения.
    await openBlockView(user, "Место", { fine: true });
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

describe("Editor: раскрытый блок — сначала текст, оформление на «Виде»", () => {
  it("блок открывается на «Тексте и фото»; выбранная подвкладка и «Тонкая настройка» переносятся на следующий блок", async () => {
    const user = userEvent.setup();
    renderEditor();
    await user.click(screen.getByRole("button", { name: "Главный экран" }));
    expect(screen.getByRole("tab", { name: "Текст и фото" })).toHaveAttribute("aria-selected", "true");
    // Текст — сразу, оформления не видно.
    expect(screen.getByLabelText("Имена")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Вид блока" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Вид" }));
    expect(screen.getByRole("group", { name: "Вид блока" })).toBeInTheDocument();
    // «Тонкая настройка» свёрнута.
    expect(screen.queryByRole("combobox", { name: "Как блок появляется" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Тонкая настройка" }));
    expect(screen.getByRole("combobox", { name: "Как блок появляется" })).toBeInTheDocument();

    // Следующий блок открывается там же — удобно оформлять блоки подряд.
    await user.click(screen.getByRole("button", { name: "Программа" }));
    expect(screen.getByRole("tab", { name: "Вид" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("combobox", { name: "Как блок появляется" })).toBeInTheDocument();
  });

  it("заголовок — в «Тексте и фото»; пустая строка под заголовком свёрнута в «＋»", async () => {
    const user = userEvent.setup();
    renderEditor();
    await user.click(screen.getByRole("button", { name: "Обратный отсчёт" }));
    expect(screen.getByLabelText("Заголовок")).toBeInTheDocument();
    expect(screen.queryByLabelText("Строка под заголовком")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Строка под заголовком" }));
    await user.keyboard("до встречи");
    const preview = screen.getByTestId("preview");
    expect(preview.querySelector('[data-block="countdown"]')).toHaveTextContent("до встречи");
  });

  it("готовые фоны блока: один клик — фон, цвет и края вместе; «Все фоны…» открывает окно со всеми", async () => {
    const user = userEvent.setup();
    renderEditor();
    const countdown = () => screen.getByTestId("preview").querySelector<HTMLElement>('[data-block="countdown"]')!;
    await openBlockView(user, "Обратный отсчёт");
    expect(screen.getByRole("button", { name: "Фон «Без фона»" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "Фон «Тёмная полоса»" }));
    expect(countdown()).toHaveClass("inv-fill-dark");
    expect(screen.getByRole("button", { name: "Фон «Тёмная полоса»" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "Фон «Рваная бумага»" }));
    expect(countdown()).toHaveAttribute("data-surface", "card");
    expect(countdown()).not.toHaveClass("inv-fill-dark");
    expect(within(countdown()).getByTestId("edges")).toHaveAttribute("data-edge-top", "torn");

    // Своё сочетание — ни одна плитка не выделена, подсказка ведёт в «Тонкую настройку».
    await user.click(screen.getByRole("button", { name: "Все фоны…" }));
    const dialog = screen.getByRole("dialog", { name: "Фон блока" });
    await user.click(within(dialog).getByRole("radio", { name: "Листы и свитки" }));
    await user.click(within(dialog).getByRole("button", { name: "Тетрадный лист" }));
    expect(countdown()).toHaveAttribute("data-surface", "notebook");
    expect(within(screen.getByRole("group", { name: "Готовые фоны блока" })).queryAllByRole("button", { pressed: true })).toHaveLength(0);
    expect(screen.getByText(/Сейчас свой фон: Тетрадный лист/)).toBeInTheDocument();
  });

  it("недействующие настройки скрыты: края — только у блока с заливкой или панелью", async () => {
    const user = userEvent.setup();
    renderEditor();
    await openBlockView(user, "Обратный отсчёт", { fine: true });
    // Без фона и без цвета края нечего резать — настройки нет (раньше была с объяснением «почему не работает»).
    expect(screen.queryByRole("radiogroup", { name: "Верхний край" })).not.toBeInTheDocument();
    const swatches = within(screen.getByRole("group", { name: "Цвет фона блока" })).getAllByRole("button");
    await user.click(swatches[1]);
    expect(screen.getByRole("radiogroup", { name: "Верхний край" })).toBeInTheDocument();
  });
});

describe("Editor на телефоне: превью на весь экран, панель — шторка снизу", () => {
  // В тестах matchMedia ничего не совпадает — это раскладка телефона.
  beforeEach(() => localStorage.clear());
  const sheet = () => screen.getByRole("complementary", { name: "Панель редактора" });

  it("кнопки снизу открывают и закрывают шторку с нужным разделом", async () => {
    const user = userEvent.setup();
    renderEditor();
    expect(sheet()).toHaveClass("invisible");
    await user.click(screen.getByRole("button", { name: "Панель «Оформление»" }));
    expect(sheet()).not.toHaveClass("invisible");
    expect(screen.getByRole("tab", { name: "Оформление" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "Панель «Оформление»" })).toHaveAttribute("aria-pressed", "true");
    // Повторное нажатие — свернуть; так же и кнопкой в шторке.
    await user.click(screen.getByRole("button", { name: "Панель «Оформление»" }));
    expect(sheet()).toHaveClass("invisible");
    await user.click(screen.getByRole("button", { name: "Панель «Музыка»" }));
    await user.click(screen.getByRole("button", { name: "Свернуть панель" }));
    expect(sheet()).toHaveClass("invisible");
    // Как drawer: нажатие вне шторки (невидимая подложка) закрывает её.
    await user.click(screen.getByRole("button", { name: "Панель «Блоки»" }));
    expect(sheet()).not.toHaveClass("invisible");
    await user.click(screen.getByTestId("sheet-backdrop"));
    expect(sheet()).toHaveClass("invisible");
    expect(screen.queryByTestId("sheet-backdrop")).not.toBeInTheDocument();
  });

  it("шторка: касание ручки разворачивает, жест вниз уменьшает, ещё раз — закрывает", async () => {
    const user = userEvent.setup();
    renderEditor();
    await user.click(screen.getByRole("button", { name: "Панель «Музыка»" }));
    // В шапке шторки — название раздела: второго ряда вкладок на телефоне нет, они в нижней панели.
    expect(within(sheet()).getByText("Музыка", { selector: "p" })).toBeInTheDocument();
    expect(sheet()).toHaveClass("h-[50svh]");
    await user.click(screen.getByRole("button", { name: "Развернуть панель" }));
    expect(screen.getByRole("button", { name: "Уменьшить панель" })).toHaveAttribute("aria-expanded", "true");
    const handle = screen.getByTestId("sheet-handle");
    const swipe = (to: number) => {
      fireEvent.pointerDown(handle, { clientY: 100 });
      fireEvent.pointerMove(handle, { clientY: to });
      fireEvent.pointerUp(handle);
    };
    swipe(130); // короткое движение — ничего
    expect(sheet()).not.toHaveClass("h-[50svh]");
    swipe(260); // вниз из полной — половина
    expect(sheet()).toHaveClass("h-[50svh]");
    expect(sheet()).not.toHaveClass("invisible");
    fireEvent.pointerDown(handle, { clientY: 100 });
    fireEvent.pointerMove(handle, { clientY: 260 });
    expect(sheet().style.translate).toBe("0 160px"); // шторка идёт за пальцем
    fireEvent.pointerUp(handle);
    expect(sheet()).toHaveClass("invisible");
  });

  it("«Поделиться» открывает вкладку «Ссылка» с крупной кнопкой копирования", async () => {
    const user = userEvent.setup();
    renderEditor();
    await user.click(screen.getByRole("button", { name: "Поделиться" }));
    expect(screen.getByRole("tab", { name: "Ссылка" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "Скопировать ссылку для гостей" })).toHaveTextContent("Скопировать ссылку для гостей");
  });

  it("нажатие на блок в превью открывает шторку с этим блоком", async () => {
    const user = userEvent.setup();
    renderEditor();
    await user.click(screen.getByTestId("preview").querySelector<HTMLElement>('[data-block="program"]')!);
    expect(sheet()).not.toHaveClass("invisible");
    expect(screen.getByRole("button", { name: "Программа" })).toHaveAttribute("aria-expanded", "true");
  });
});

describe("Editor: сводки в списке блоков и «Что осталось заполнить»", () => {
  beforeEach(() => localStorage.clear());

  it("под названием блока — сводка; имя кнопки остаётся названием, сводка — её описание", async () => {
    const user = userEvent.setup();
    renderEditor();
    const hero = screen.getByRole("button", { name: "Главный экран" });
    expect(hero).toHaveAccessibleDescription("Айгерим & Нурлан · 19.06.2027");
    await user.click(hero);
    await user.clear(screen.getByLabelText("Имена"));
    await user.type(screen.getByLabelText("Имена"), "Мария & Пётр");
    expect(hero).toHaveAccessibleDescription("Мария & Пётр · 19.06.2027");
    expect(screen.getByRole("button", { name: "Анкета гостя" })).toHaveAccessibleDescription("срок ответа не задан");
  });

  it("«Что осталось заполнить» пока скрыто (SHOW_CHECKLIST в BlocksPanel.tsx)", () => {
    renderEditor();
    expect(screen.queryByRole("region", { name: "Что осталось заполнить" })).not.toBeInTheDocument();
  });

  // Вернуть вместе с SHOW_CHECKLIST = true.
  it.skip("пункт открывает свой блок, заполненный — отмечается; список можно скрыть насовсем", async () => {
    const user = userEvent.setup();
    const { unmount } = renderEditor();
    const card = await screen.findByRole("region", { name: "Что осталось заполнить" });
    expect(within(card).getByText("0 из 4")).toBeInTheDocument();

    await user.click(within(card).getByRole("button", { name: "Срок ответа: заполнить" }));
    expect(screen.getByRole("button", { name: "Анкета гостя" })).toHaveAttribute("aria-expanded", "true");
    fireEvent.change(screen.getByLabelText("Ответить до"), { target: { value: "2027-06-01" } });
    expect(within(card).getByRole("button", { name: "Срок ответа: заполнено" })).toBeInTheDocument();
    expect(within(card).getByText("1 из 4")).toBeInTheDocument();

    await user.click(within(card).getByRole("button", { name: "Скрыть список «Что осталось заполнить»" }));
    expect(screen.queryByRole("region", { name: "Что осталось заполнить" })).not.toBeInTheDocument();
    unmount();
    renderEditor();
    await act(() => Promise.resolve());
    expect(screen.queryByRole("region", { name: "Что осталось заполнить" })).not.toBeInTheDocument();
  });
});

describe("Editor: нажатие на блок в превью открывает его", () => {
  beforeEach(() => localStorage.clear());

  it("блок раскрывается в панели (вкладка переключается на «Блоки») и подсвечивается в превью", async () => {
    const user = userEvent.setup();
    renderEditor();
    const preview = screen.getByTestId("preview");
    await user.click(screen.getByRole("tab", { name: "Оформление" }));

    await user.click(preview.querySelector<HTMLElement>('[data-block="location"]')!);
    expect(screen.getByRole("tab", { name: "Блоки" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "Место" })).toHaveAttribute("aria-expanded", "true");
    const location = preview.querySelector<HTMLElement>('[data-block="location"]')!;
    expect(location.closest("[data-pick]")).toHaveAttribute("data-selected");
    expect(preview.querySelectorAll("[data-selected]")).toHaveLength(1);

    // Открыли другой блок в панели: нажатие вне превью прячет рамку выбранного — видно приглашение как у гостя.
    await user.click(screen.getByRole("button", { name: "Программа" }));
    expect(preview.querySelectorAll("[data-selected]")).toHaveLength(0);
  });

  it("кнопки самого приглашения в превью не срабатывают — нажатие только выбирает блок", async () => {
    const user = userEvent.setup();
    renderEditor();
    const preview = screen.getByTestId("preview");
    // Без перехвата кнопка скачала бы .ics через URL.createObjectURL (в jsdom его нет — подставляем на время теста).
    const openWindow = vi.spyOn(window, "open").mockImplementation(() => null);
    try {
      const calendar = within(preview.querySelector<HTMLElement>('[data-block="hero"]')!).getByRole("link", { name: /календар/i });
      await user.click(calendar);
      expect(openWindow).not.toHaveBeenCalled();
    } finally {
      openWindow.mockRestore();
    }
    expect(screen.getByRole("button", { name: "Главный экран" })).toHaveAttribute("aria-expanded", "true");
  });

  it("подсказка над превью закрывается и больше не показывается", async () => {
    const user = userEvent.setup();
    const { unmount } = renderEditor();
    const tip = await screen.findByRole("note");
    expect(tip).toHaveTextContent("Нажмите на любой блок в превью");
    await user.click(screen.getByRole("button", { name: "Закрыть подсказку" }));
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
    unmount();
    renderEditor();
    await act(() => Promise.resolve());
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });
});

describe("Editor: «Оформление» — свёрнутые разделы со сводками", () => {
  it("все разделы свёрнуты, в заголовке видно выбранное; смена значения меняет сводку", async () => {
    const user = userEvent.setup();
    renderEditor();
    await user.click(screen.getByRole("tab", { name: "Оформление" }));
    const sections = ["Шаблон", "Цвета", "Шрифты", "Заставка", "Падающий декор", "Фон страницы", "Анимации"];
    for (const title of sections) {
      expect(screen.getByRole("button", { name: new RegExp(`^${title}`) })).toHaveAttribute("aria-expanded", "false");
    }
    expect(screen.getByRole("button", { name: /^Цвета/ })).toHaveTextContent("Кремовая");
    await openThemeSection(user, "Цвета");
    await user.click(screen.getByRole("button", { name: /Пудровая/ }));
    expect(screen.getByRole("button", { name: /^Цвета/ })).toHaveTextContent("Пудровая");
    // Открыт один раздел за раз.
    await openThemeSection(user, "Падающий декор");
    expect(screen.getByRole("button", { name: /^Цвета/ })).toHaveAttribute("aria-expanded", "false");
  });

  it("падающий декор: плитки видов и «Мало / Средне / Много» вместо ползунка; точные числа — в тонкой настройке", async () => {
    const user = userEvent.setup();
    renderEditor();
    await openThemeSection(user, "Падающий декор");
    await user.click(screen.getByRole("button", { name: "Декор Снег" }));
    expect(screen.getByRole("button", { name: /^Падающий декор/ })).toHaveTextContent("Снег");
    await user.click(within(screen.getByRole("radiogroup", { name: "Сколько" })).getByRole("radio", { name: "Много" }));
    expect(screen.queryByRole("slider", { name: "Плотность декора" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Тонкая настройка" }));
    expect(screen.getByRole("slider", { name: "Плотность декора" })).toHaveAttribute("aria-valuenow", "30");
    // «Нет» — настройки количества пропадают.
    await user.click(screen.getByRole("button", { name: "Декор Нет" }));
    expect(screen.queryByRole("radiogroup", { name: "Сколько" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("decor-layer")).not.toBeInTheDocument();
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
    // Кнопки у «Подарков» нет — вместо пустых полей «＋ Кнопка со ссылкой».
    expect(screen.queryByLabelText("Подпись кнопки")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Кнопка со ссылкой" }));
    expect(screen.getByLabelText("Подпись кнопки")).toHaveFocus();
  });

  it("меню «⋯» блока: «Дублировать» кладёт копию под блок, «Удалить» спрашивает подтверждение", async () => {
    const user = userEvent.setup();
    renderEditor();
    const preview = screen.getByTestId("preview");
    const stories = () => preview.querySelectorAll('[data-block="story"]');
    await blockAction(user, "Наша история", "Дублировать");
    expect(stories()).toHaveLength(2);
    expect(screen.getByRole("button", { name: /^Наша история 2/ })).toHaveAttribute("aria-expanded", "true");

    await blockAction(user, "Наша история 2", "Удалить");
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Отмена" }));
    expect(stories()).toHaveLength(2);
    await blockAction(user, "Наша история 2", "Удалить");
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Удалить" }));
    expect(stories()).toHaveLength(1);

    // Главный экран не удаляется и не копируется, анкета — не копируется.
    expect(await menuItems(user, "Главный экран")).toEqual(["Выше", "Ниже"]);
    expect(await menuItems(user, "Анкета гостя")).toEqual(["Выше", "Ниже", "Удалить"]);
  });

  it("«Выше/Ниже» в меню блока — перемещение без перетаскивания; у крайних блоков недоступно", async () => {
    const user = userEvent.setup();
    renderEditor();
    const order = () => Array.from(screen.getByTestId("preview").querySelectorAll("[data-block]")).map((el) => el.getAttribute("data-block"));
    const before = order();
    const i = before.indexOf("program");
    await blockAction(user, "Программа", "Выше");
    expect(order()[i - 1]).toBe("program");
    await blockAction(user, "Программа", "Ниже");
    expect(order()).toEqual(before);
    await user.click(screen.getByRole("button", { name: "Действия с блоком «Главный экран»" }));
    expect(screen.getByRole("menuitem", { name: "Выше" })).toHaveAttribute("aria-disabled", "true");
    await user.keyboard("{Escape}");
  });

  it("«Отменить / Повторить»: кнопками и ⌘Z вне полей ввода; набор текста — один шаг", async () => {
    const user = userEvent.setup();
    renderEditor();
    const undoBtn = screen.getByRole("button", { name: "Отменить" });
    expect(undoBtn).toBeDisabled();
    const visible = () => screen.getByTestId("preview").querySelector('[data-block="story"]');
    await user.click(screen.getByRole("switch", { name: "Показывать блок «Наша история»" }));
    expect(visible()).toBeNull();
    await user.click(undoBtn);
    expect(visible()).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Повторить" }));
    expect(visible()).toBeNull();
    // ⌘Z / Ctrl+Z на странице (не в поле) — тоже отмена.
    await user.click(document.body);
    await user.keyboard("{Control>}z{/Control}");
    expect(visible()).not.toBeNull();

    // Слово, набранное подряд, отменяется целиком.
    await user.click(screen.getByRole("button", { name: "Главный экран" }));
    const names = screen.getByLabelText("Имена");
    const before = (names as HTMLInputElement).value;
    await user.type(names, " и гости");
    await user.click(undoBtn);
    expect(screen.getByLabelText("Имена")).toHaveValue(before);
  });

  it("загрузка из редактора идёт в это приглашение — с id и token", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ url: "/uploads/bg.png" }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    renderEditor();
    await openThemeSection(user, "Фон страницы");
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

    it("вход не обязателен (AUTH_REQUIRED не задан): без входа ссылка, «Открыть» и «Гости» доступны", async () => {
      const user = userEvent.setup();
      renderWith({ user: null, ownership: "none", required: false });
      expect(screen.getByRole("button", { name: "Войти" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Гости" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Открыть" })).toBeInTheDocument();
      await user.click(screen.getByRole("tab", { name: "Ссылка" }));
      expect(screen.queryByText("Войдите, чтобы продолжить")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Скопировать ссылку для гостей" })).toBeInTheDocument();
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
      await openThemeSection(user, "Заставка");
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
    await openThemeSection(user, "Падающий декор", { fine: true });
    await user.click(screen.getByRole("switch", { name: "Мини-игра: лопаются от касания" }));
    expect(layer()).not.toHaveAttribute("data-pop");
  });
});
