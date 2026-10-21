# Тесты

> Раздел контекста проекта для ИИ-ассистента. Корень и правила — [`AGENTS.md`](../../AGENTS.md); код — источник истины.

## Как устроено

Текущее состояние: **551 тест Vitest (1 пропущен), 2 сценария E2E и `next build` проходят** (после этапа A `product-strategy.md`, одного
ответа гостя и превью ссылки). Края, фоновые картинки, ширина и стиль текста всё ещё без своих тестов — см. «Долг по
тестам» в `next-blocks.md`.

- **Vitest** (`vitest.config.ts`): `tests/{unit,components,api}/**/*.test.{ts,tsx}`. Компонентные тесты — в jsdom
  (первая строка файла `// @vitest-environment jsdom`), остальные — в Node.
- **База:** `tests/global-setup.ts` перед прогоном делает `prisma migrate deploy` в `wedding_test` (Postgres из
  Docker; нет базы — ошибка «Тестовая база недоступна… npm run db:up»). Базу не сбрасывают: API-тесты чистят таблицы
  сами (`resetDb` из `tests/api/helpers.ts`).
- **`tests/setup.ts`:** заглушки того, чего нет в jsdom (play/pause медиа с событиями, canvas, ResizeObserver,
  pointer capture, хранилища на Node ≥ 25), мок `@/lib/session`, уборка после теста.
- **Помощники:** `signInAs()` / `testAuth` (`tests/auth-mock.ts`) — вход без Google; `jsonRequest`, `ctx`, `createUser`,
  `resetDb` (`tests/api/helpers.ts`) — вызывать route handlers напрямую с `Request`; `pngOf()` (`tests/image-fixtures.ts`)
  — настоящая картинка (сервер декодирует и сжимает, «нули» не примет); `openBlockView`, `openThemeSection`
  (`tests/components/editorHelpers.ts`) — дойти до контрола в редакторе; меню «⋯» блока — `blockAction()` в `Editor.test.tsx`.
- **Админка в тестах** пишет файлы во временную папку: `ADMIN_ROOT` в `beforeEach` (`tests/api/admin.test.ts`).
  Свой файл правок шаблонов — `vi.mock("@/lib/template-overrides.json", …)` (`tests/api/hiddenTemplates.test.ts`).
- **E2E — Playwright** (`playwright.config.ts`): Pixel 7, свой dev-сервер на :3100 с базой `wedding_e2e` и сборкой в
  `.next-e2e`, `AUTH_GOOGLE_*` пустые (иначе сценарий по token упрётся во вход).

## CI

GitHub Actions (`.github/workflows/ci.yml`, подробно — `docs/agents/infra.md`) на каждый push и PR запускает
`npm run typecheck` и `npm test` с Postgres 16 в контейнере. E2E в CI пока нет — гоняй `npm run test:e2e` локально.

**CI красный — что делать:**
1. Посмотреть упавший шаг: `gh run list --branch <ветка>`, затем `gh run view <id> --log-failed`.
2. Воспроизвести как на раннере — без `.env`, в UTC, из чистой копии (там нет `public/uploads` и прочего локального):
   `git clone . /tmp/ci && cd /tmp/ci && npm ci && env -i HOME="$HOME" PATH="$PATH" CI=true TZ=UTC npm test`
   (локальный Postgres — `npm run db:up`, та же база `wedding_test` на 5433).
3. Частые причины: новая миграция не закоммичена (падает `prisma migrate deploy` в global-setup), тест зависит от
   локального файла или переменной из `.env`, от часового пояса или от порядка шаблонов из админки.
4. **Не ослабляй и не пропускай тесты**, чтобы получить зелёный: чини причину. Если тесту нужно то, чего нет на
   раннере (сеть, ffmpeg, браузер), — сначала обсуди с владельцем.

## Правила

- Ищи элементы по ролям и подписям (`getByRole`, `getByLabelText`) — доступность часть контракта; не ослабляй проверки,
  если контрол переехал, — поправь путь к нему.
- Не завязывайся на порядок и публикацию шаблонов (их меняют в админке, `template-overrides.json`): «первый шаблон» —
  `createDefaultInvitation()` (первый в коде), проверки всех шаблонов — по `allTemplates`, а не `templates`.
- Фикстуры прошлых форматов (`tests/fixtures/invitations/<версия>-<что>.json`) только добавлять — никогда не править.
- Radix Slider двигать клавиатурой (`{Home}`, `{ArrowRight}`), dnd-kit в E2E — по одной клавише с ожиданием объявления
  (см. `pitfalls.md`).

## Что где покрыто

| Область | Файлы |
|---|---|
| Схема и версия формата | `unit/schema` (обратная совместимость), `unit/schemaVersion` (сторож: формат = слепок, версии подняты верно, у мажорных есть миграции), `unit/migrations` (semver, миграции, `diffSchemas`), `components/InvitationFixtures` (все фикстуры читаются и рисуются) |
| Шаблоны | `unit/templates` (валидность, картинки, различимость, `applyTemplate`, `createBlock`, структуры `layout`), `unit/templateAdmin` (шаблон из приглашения, `template-overrides.json`: правки, порядок, публикация, имена роликов), `api/hiddenTemplates` (скрытые не в публичном списке и не создаются), `components/TemplateFeatures`, `components/TemplateGallery` (галерея, «Выбрать» → «Главное о событии»), `unit/setup` |
| Блоки и оформление | `unit/blocks` (в т.ч. повторяемые блоки), `unit/blockStyles`, `unit/ornaments`, `unit/color`, `unit/theme` (шрифты, текстуры, заливки, цвет фона), `unit/premium`, `unit/library` (файлы и строки CREDITS.md), `components/Variants` (все виды блоков и заставок), `components/NewBlocks`, `components/PageBackground` |
| Страница гостя | `components/InvitationView` (порядок, видимость, появление), `components/InvitationPage` (конверт, видео-конверт, музыка), `unit/decor` (падающий декор, мини-игра), `unit/calendar`, `unit/countdown`, `unit/contacts`, `unit/music`, `unit/musicFragment` |
| Анкета (RSVP) | `components/RsvpBlock` (виды, «Три ответа», один ответ с устройства), `unit/rsvp` (схема, статистика, CSV), `unit/rsvpMemory`, `api/rsvp` (honeypot, лимит, изменение ответа, GET с token) |
| Язык и событие | `unit/localize` (даты, подписи, `applyCopy`, кыргызские шаблоны), `components/GuestLanguage` (страница и анкета на кыргызском), `e2e/kyrgyz.spec` |
| Ссылка и превью | `unit/share` (ссылка из имён, сообщение гостям, `linkPreview`), `unit/ogImage`, `api/linkPreview`, `unit/slug`, `unit/lan`, `components/CopyButton` |
| Календарь гостя | `unit/ics`, `api/calendar` (`.ics` для iPhone) |
| Аналитика | `unit/analytics` (воронка, проценты, периоды), `api/events` (`POST /api/events`, `loadStats`, ключ `/stats`), аналитика страницы гостя — в `components/GuestLanguage` |
| Редактор | `components/Editor` (превью, блоки, «Вид», телефонный режим, отмена), `unit/history`, `unit/checklist`, `components/ThemeToggle` (кнопка и волна темы сайта) |
| API, доступ, аккаунты | `api/invitations` (создание, GET/PATCH: 400/403/409), `api/account` (вход, «Сохранить в аккаунт», удаление), `unit/access`, `components/DeleteInvitationButton`, `api/upload` + `unit/images` (типы, размеры, сжатие, хранилище) |
| Админка и показ | `api/admin` (доступ, шаблоны, порядок, публикация, видео), `components/Admin`, `unit/videoJobs` (очередь записи), `unit/showcase` |
| Вечеринки (прототип) | `unit/party` (темы, дата афиши, номер пропуска, пульс бита, таймер записи) |
| Сквозной сценарий | `e2e/full-flow.spec` — главная → «Розовый сад» → имена и дата → скрыть story → перетащить program выше countdown → украшение «Красные розы» и фон «Бумага» на «Место» → декор petals, шрифт Prata, текстура «Узор» → песня «A Thousand Years» → страница гостя (порядок, текстура, шрифт, розы на конверте, палитра) → «Открыть приглашение» → музыка играет → RSVP → ответ на странице гостей |
