import { expect, test, type Page } from "@playwright/test";

const blockOrder = (page: Page) =>
  page.locator("[data-testid^=block-item-]").evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")!.slice(11)));

test("создать → настроить → открыть → послушать → ответить → увидеть ответ", async ({ page }) => {
  // 1. Создать приглашение из шаблона «Розовый сад»
  await page.goto("/");
  await page.getByRole("button", { name: "Выбрать шаблон «Розовый сад»" }).click();
  await page.waitForURL(/\/edit\/[^/?]+\?token=/);
  const editorUrl = new URL(page.url());
  const saveStatus = page.getByTestId("save-status");

  // На телефоне панель — шторка снизу: открываем «Блоки».
  await page.getByRole("button", { name: "Панель «Блоки»" }).click();
  // 2. Имена и дата (блоки сначала свёрнуты — открываем главный экран)
  await page.getByRole("button", { name: "Главный экран", exact: true }).click();
  await page.getByLabel("Имена", { exact: true }).fill("Мария & Пётр");
  await page.getByLabel("Дата и время").fill("2027-08-20T17:30");
  await expect(page.getByTestId("preview").getByTestId("hero-names")).toHaveText("Мария & Пётр");

  // 3. Скрыть story
  await page.getByLabel("Показывать блок «Наша история»").uncheck();
  await expect(saveStatus).toHaveText("Сохранено");

  // 4. Переставить program выше countdown (клавиатурный drag-and-drop dnd-kit)
  const handle = page.getByRole("button", { name: "Перетащить блок «Программа»" });
  // KeyboardSensor dnd-kit подписывается на клавиши асинхронно после захвата, поэтому жмём ↑ по одному разу,
  // сверяясь с объявлением для скринридера, пока блок не окажется над «Обратным отсчётом».
  const announcement = (text: string) => page.getByText(text);
  await handle.focus();
  await page.keyboard.press("Space");
  await expect(handle).toHaveAttribute("aria-pressed", "true");
  await expect(async () => {
    await page.keyboard.press("ArrowUp");
    await expect(announcement("Блок «Программа» над блоком «Обратный отсчёт».")).toBeAttached({ timeout: 500 });
  }).toPass({ timeout: 10_000 });
  await page.keyboard.press("Space");
  await expect(announcement("Блок «Программа» перемещён на место блока «Обратный отсчёт».")).toBeAttached();
  await expect.poll(() => blockOrder(page)).toEqual([
    "hero", "program", "countdown", "calendar", "story", "dresscode", "location", "rsvp",
  ]);

  // 4а. Украшение из библиотеки на блок «Место» и фон «Бумага»
  await page.getByRole("button", { name: "Место", exact: true }).click();
  // Оформление блока — на подвкладке «Вид» (сначала блок открывается на «Тексте и фото»).
  await page.getByTestId("block-item-location").getByRole("tab", { name: "Вид" }).click();
  await page.getByRole("button", { name: "Добавить украшение" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Красные розы" }).click();
  // В шаблоне у «Места» уже есть своё украшение — новое добавляется последним.
  await expect(page.getByTestId("preview").locator('[data-block="location"] img[data-ornament]').last()).toHaveAttribute(
    "src",
    "/library/red-roses.webp",
  );
  await page.getByTestId("block-item-location").getByRole("button", { name: "Тонкая настройка", exact: true }).click();
  await page.getByTestId("block-item-location").getByRole("button", { name: /^Фон блока: .*Выбрать$/ }).click();
  const surfaces = page.getByRole("dialog", { name: "Фон блока" });
  await surfaces.getByRole("radio", { name: "Простые" }).click();
  await surfaces.getByRole("button", { name: "Бумага", exact: true }).click();

  // 4б. Новый блок «Текст» с готовым текстом «Подарки» — встаёт под открытым «Местом»
  await page.getByRole("button", { name: "Добавить блок", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Подарки" }).click();
  await expect.poll(() => blockOrder(page)).toEqual([
    "hero", "program", "countdown", "calendar", "story", "dresscode", "location", "text", "rsvp",
  ]);
  await expect(page.getByTestId("preview").locator('[data-block="text"]')).toContainText("Ваше присутствие");

  // 5. Декор «petals»
  // «Оформление» — свёрнутые разделы: раскрываем нужный.
  await page.getByRole("tab", { name: "Оформление" }).click();
  await page.getByRole("button", { name: /^Падающий декор/ }).click();
  await page.getByRole("button", { name: "Декор Лепестки" }).click();
  await page.getByRole("button", { name: /^Шрифты/ }).click();
  await page.getByRole("button", { name: /^Шрифт имён: / }).click();
  await page.getByRole("button", { name: "Шрифт имён Prata" }).click();
  await page.getByRole("button", { name: /^Фон страницы/ }).click();
  await page.getByRole("button", { name: "Текстура Узор" }).click();

  // 6. Музыка — из встроенного списка (своя загрузка пока выключена)
  await page.getByRole("tab", { name: "Музыка" }).click();
  await expect(page.getByText(/Загрузить свою музыку пока нельзя/)).toBeVisible();
  await page.getByRole("button", { name: "Песня «A Thousand Years» — Christina Perri" }).click();
  await expect(page.getByRole("button", { name: "Песня «A Thousand Years» — Christina Perri" })).toHaveAttribute("aria-pressed", "true");
  await expect(saveStatus).toHaveText("Сохранено");

  // 7. Открыть публичную ссылку
  const publicHref = await page.getByRole("link", { name: "Открыть" }).getAttribute("href");
  await page.goto(publicHref!);

  await expect(page.getByTestId("decor-layer")).toHaveAttribute("data-decor", "petals");
  const blocks = await page.locator("[data-block]").evaluateAll((els) => els.map((e) => e.getAttribute("data-block")));
  expect(blocks).toEqual(["hero", "program", "countdown", "calendar", "dresscode", "location", "text", "rsvp"]);
  await expect(page.locator('[data-block="text"]').getByRole("heading", { name: "Подарки" })).toBeAttached();
  await expect(page.getByTestId("hero-names")).toHaveText("Мария & Пётр");
  await expect(page.getByTestId("texture")).toHaveAttribute("data-texture", "flourish");
  // Шрифт Prata реально загрузился (кириллица), а не подменён системным.
  await expect
    .poll(() => page.evaluate(() => document.fonts.ready.then(() => document.fonts.check("40px Prata", "Мария"))))
    .toBe(true);
  const location = page.locator('[data-block="location"]');
  await expect(location).toHaveAttribute("data-surface", "paper");
  await expect(location.locator("img[data-ornament]")).toHaveCount(2);
  await expect(location.locator("img[data-ornament]").last()).toHaveAttribute("src", "/library/red-roses.webp");
  await expect(page.getByTestId("envelope")).toContainText("М&П");
  // Оформление шаблона дошло до страницы гостя: розы на конверте, пудровая палитра.
  await expect(page.getByTestId("envelope").locator("img").first()).toHaveAttribute("src", "/library/rose-lilac.webp");
  await expect(page.getByTestId("invitation")).toHaveCSS("background-color", "rgb(251, 241, 238)");

  // 8. Конверт → музыка играет
  const audio = page.getByTestId("music");
  expect(await audio.evaluate((a: HTMLAudioElement) => a.paused)).toBe(true);
  await page.getByRole("button", { name: "Открыть приглашение" }).click();
  await expect.poll(() => audio.evaluate((a: HTMLAudioElement) => a.paused)).toBe(false);
  await expect(page.getByTestId("envelope")).toBeHidden();
  await expect(page.getByRole("button", { name: "Выключить музыку" })).toBeVisible();
  await expect(page.locator('[data-block="hero"]')).toContainText("20 . 08 . 2027");

  // 9. Отправить RSVP
  await page.getByLabel("Ваше имя").fill("Ольга Иванова");
  await page.getByRole("button", { name: "Добавить гостя" }).click();
  await expect(page.getByLabel("Количество гостей")).toHaveValue("2");
  await page.getByLabel("Комментарий").fill("Будем обязательно!");
  await page.getByRole("button", { name: "Подтвердить" }).click();
  await expect(page.getByText("Ольга, мы получили ваше подтверждение: 2 гостя.")).toBeVisible();

  // 10. Ответ виден на странице гостей
  await page.goto(`${editorUrl.pathname}/guests${editorUrl.search}`);
  await expect(page.getByRole("cell", { name: "Ольга Иванова" })).toBeVisible();
  await expect(page.getByTestId("stat-attending")).toHaveText("1");
  await expect(page.getByTestId("stat-not-attending")).toHaveText("0");
  await expect(page.getByTestId("stat-total-guests")).toHaveText("2");
});
