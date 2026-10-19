import { expect, test } from "@playwright/test";

test("кыз узатуу на кыргызском: фильтр на главной → шаблон «Шырдак» → страница гостя по-кыргызски", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("group", { name: "Событие" }).getByRole("button", { name: "Кыз узатуу" }).click();
  await page.getByRole("button", { name: "Выбрать шаблон «Шырдак»" }).click();

  const setup = page.getByRole("dialog", { name: "Главное о событии" });
  await expect(setup.getByLabel("Событие")).toHaveValue("kyz-uzatuu");
  await setup.getByRole("radio", { name: "Кыргызча" }).click();
  await setup.getByLabel("Имя невесты").fill("Нуркыз");
  await setup.getByLabel("Дата").fill("2027-09-04");
  await setup.getByRole("button", { name: "Создать приглашение" }).click();
  await page.waitForURL(/\/edit\/[^/?]+\?token=/);
  await expect(page.getByTestId("preview").getByTestId("hero-names")).toHaveText("Нуркыз");

  const publicHref = await page.getByRole("link", { name: "Посмотреть как гость" }).getAttribute("href");
  await page.goto(publicHref!);
  await expect(page.locator("[data-inv-lang]").first()).toHaveAttribute("lang", "ky");
  await page.getByRole("button", { name: "Чакырууну ачуу" }).click();
  await expect(page.getByText("Кыз узатууга чакыруу").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Кыз узатуу күнү" })).toBeAttached();
  await expect(page.getByText("2027-жыл")).toBeAttached();
});
