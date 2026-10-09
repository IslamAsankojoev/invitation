# AGENTS.md — контекст проекта для ИИ-ассистента

> Этот файл — «передача дел». Прочитай его целиком перед любой задачей: здесь описано, **что** умеет проект,
> **как** это устроено, **почему** приняты решения и **где** лежат подводные камни. Подробности для людей — в
> `README.md`. Код — источник истины: если файл и код расходятся, верь коду и обнови этот файл.

> ⚠️ **Правило версии формата.** Меняешь формат приглашения (`src/lib/schema.ts` — любые поля, списки значений,
> границы, значения по умолчанию) — **в том же изменении** подними `SCHEMA_VERSION` в `src/lib/migrations.ts`
> (минор — добавили, мажор — сломали + миграция), запусти `npm run schema:snapshot` и `npm test`. Подробно — §4.1.
> Тест-сторож `tests/unit/schemaVersion.test.ts` не пропустит изменение формата без версии.

> **Текущая задача:** этапы 1–2 `next-blocks.md` сделаны (повторяемые блоки, новые типы, цвет фона блока), по мотивам
> примеров с Pinterest собраны 4 шаблона со своей структурой. Дальше — вопросы анкеты, виды блоков, библиотека. Всё —
> в `next-blocks.md` (там же долг по тестам).
>
> **Перед продакшеном:** картинки из `new-sources/` (pngwing.com) встроены, но их лицензии **не куплены** — статус
> «уточняется» в `public/library/CREDITS.md`. Подробности и итог разбора — `new-sources.md`.
> Встроенные песни (`public/music/`: Lady Gaga & Bruno Mars, Ed Sheeran, Christina Perri, Elvis Presley, Bruno Mars,
> Jax 02.14, Indila, Temirlan & Yernat, Ордо Сахна, Yann Tiersen, Gibran Alcocer) — коммерческие
> записи; права на публичное воспроизведение на сайте **не оформлены**.

## 1. Что это

MVP-конструктор пригласительных сайтов (свадьба, день рождения). Язык интерфейса и контента — **русский**.

Сквозной сценарий: организатор выбирает **шаблон** на главной → попадает в **редактор** (ссылка с секретным
`token`) → настраивает тексты, оформление, музыку → изменения **автосохраняются** → копирует **ссылку для гостей**
`/i/<slug>` → гость открывает **конверт**, слушает музыку, отправляет **ответ (RSVP)** → организатор видит ответы
на **странице гостей** и выгружает CSV.

Эталон дизайна — сайт пользователя https://test.rainbow.kg/ (кремовая бумага, сухоцветы, бант из бечёвки,
лепестки роз, конверт с печатью-монограммой, разреженные капители). Новые визуальные решения держи на этом уровне.

## 2. Стек и команды

Next.js 15 (App Router, webpack) · React 19 · TypeScript strict · Tailwind CSS 4 · **shadcn/ui** (база Radix,
стиль `radix-vega`, иконки lucide) · Prisma 6 + PostgreSQL (прод — Supabase, локально — Docker) · Auth.js 5 (next-auth beta, вход через Google) · Zod 3 · dnd-kit · Vitest 3 + React Testing Library ·
Playwright. Node 20. TypeScript закреплён на **5.x** (TS 7 ломает Next 15).

```bash
npm install          # + prisma generate
npm run db:up        # локальный Postgres в Docker (порт 5433; базы wedding, wedding_test, wedding_e2e)
npm run dev          # :3000, сначала prisma migrate deploy
npm run db:migrate   # новая миграция после правки schema.prisma (prisma migrate dev --name …)
npm run db:seed      # 12 демо (по шаблону): /i/demo, /i/demo-<id шаблона> (rose-garden, boarding-pass, lago…)
npm run db:deploy:prod  # миграции в Supabase (строки из .env.supabase); на Vercel это делает vercel-build
npm run storage:setup   # создать/обновить бакет uploads в Supabase Storage (ключи из .env.supabase)
npm run schema:snapshot # слепок формата приглашения для текущей SCHEMA_VERSION (после изменения схемы, §4.1)
npm test             # unit + компоненты + API (Vitest), база wedding_test
npm run test:e2e     # Playwright, Pixel 7, свой dev-сервер :3100, база wedding_e2e, сборка в .next-e2e
npm run typecheck
```

**Базы.** Прод — Supabase (`eu-west-1`, Data API выключен, RLS включён; Prisma ходит как владелец). Строки
подключения прода — в `.env.supabase` (в .gitignore) и в переменных Vercel: `DATABASE_URL` через пулер (6543,
`pgbouncer=true`), `DIRECT_URL` — прямое (5432) для миграций; `SUPABASE_URL` + `SUPABASE_SECRET_KEY` — хранилище фото
(публичный бакет `uploads`, только картинки ≤ 5 МБ; запись — секретным ключом только с сервера). `.env` указывает на локальный Docker — разработка и
тесты **никогда** не ходят в Supabase (тесты чистят таблицы). Vercel: `vercel-build` = `prisma migrate deploy && next
build`, регион функций `dub1` (vercel.json) — рядом с базой. Старый `prisma/dev.db` (SQLite) больше не используется.

Перед сдачей задачи всегда: `npx tsc --noEmit`, `npm test`, `npm run test:e2e`; для крупных правок ещё
`NEXT_DIST_DIR=.next-build npx next build` (отдельная папка, чтобы не мешать запущенному dev-серверу; после сборки
верни `tsconfig.json`/`next-env.d.ts`, Next дописывает туда `.next-build/types`).

Текущее состояние: **354 теста Vitest, E2E и `next build` проходят** (после шаблонов по примерам). Края, фоновые
картинки, ширина и стиль текста всё ещё без своих тестов — см. «Долг по тестам» в `next-blocks.md`.

Если порт 3000 занят другим dev-сервером — в `.claude/launch.json` есть `dev-3200` (своя папка `.next-3200`).

## 3. Карта кода

```
prisma/schema.prisma        Invitation(id, slug unique, editToken, userId?, data: Json, timestamps), Rsvp,
                            User/Account/Session/VerificationToken (Auth.js)
src/auth.ts                 Auth.js: Google + PrismaAdapter, сессии в БД; без ключей провайдеров нет
prisma/migrations/          миграции (prisma migrate) — менять схему только через новую миграцию
prisma/seed.ts              демо на каждый шаблон
docker-compose.yml          локальный Postgres; docker/init-db.sql создаёт базы для тестов
public/library/*.webp       встроенная библиотека картинок (цветы, банты, лепестки, бумага), ~1 МБ
public/library/bot-*.webp   старинная ботаника (Редуте и др., public domain/CC0), источники — public/library/CREDITS.md;
                            вырезаны из сканов scripts/botanical-cutout.mjs
public/library/surfaces/    фоны-предметы (листы, стикеры, билеты, рамы, тарелки, салфетки, венки)
scripts/new-sources.mjs     готовит картинки из new-sources/ (pngwing): разрезание, выравнивание, закраска текста
scripts/split-sheet.mjs     разрезает PNG с несколькими элементами по альфа-каналу (модуль + CLI)
scripts/torn-preview.ts     превью рваного края по зёрнам: npx tsx scripts/torn-preview.ts out.png [зерно…]
public/library/*.svg        векторные ассеты (рамки, арки, венки, разделители, ветки, акварель) — генерирует
                            scripts/library-svg.mjs (node scripts/library-svg.mjs, детерминированно)
public/templates/           фото-примеры шаблонов (Unsplash License, источники — public/library/CREDITS.md)
public/uploads/             загрузки пользователей (LocalStorage), в .gitignore
public/music/               встроенные песни (каталог — lib/music.ts); исходники — папка musics/ (без метаданных, ≤128 кбит/с)
src/app/
  layout.tsx, fonts.ts      все шрифты через next/font (CSS-переменные --font-<ключ>)
  globals.css               токены shadcn + стили приглашения (.inv-*, .surface-*, анимации)
  icon.png, apple-icon.png  фавикон и иконка iOS (из public/keleber-logo.png; лого в шапках — public/logo.webp)
  page.tsx                  главная = галерея шаблонов
  i/[slug]/page.tsx         публичная страница (server) → <InvitationPage>
  edit/[id]/page.tsx        редактор (server, проверка token → forbidden()) → <Editor>
  edit/[id]/guests/page.tsx ответы гостей: статистика, таблица, CSV (server)
  my/page.tsx               «Мои приглашения» (только при включённом входе)
  edit/[id]/claim/route.ts  GET «Сохранить в аккаунт»: привязать по token, редирект в редактор с ?saved=
  api/auth/[...nextauth]    Auth.js
  forbidden.tsx             403
  api/invitations/route.ts            POST создать (body {template?})
  api/invitations/[key]/route.ts      GET/PATCH по id
  api/invitations/[key]/rsvp/route.ts POST по slug (гость), GET по id (организатор, token)
  api/upload/route.ts                 POST multipart file
  api/edges/torn/route.ts             GET полоса рваного края по зерну (webp, кэш в памяти + вечный HTTP-кэш)
src/lib/                    логика без UI, покрыта unit-тестами
  schema.ts       ★ Zod-схема InvitationData — единственный источник типов и валидации
  migrations.ts   ★ SCHEMA_VERSION (semver формата приглашения), migrations, migrateInvitation — см. §4.1
  schemaDiff.ts   слепок формата (JSON Schema) и сравнение слепков → какую часть версии поднять (только тесты/скрипт)
  schema-history/ слепки формата по версиям (1.0.0.json…) — не редактировать руками, только npm run schema:snapshot
  variants.ts     подписи видов блоков, появления, стилей анимаций, видов заставки, иконок программы
  premium.ts      какие элементы платные (PRO) и premiumUsage(data) — список использованных
  templates.ts    ★ 12 шаблонов (у новых — своя структура layout), createFromTemplate, applyTemplate, createBlock
  defaults.ts     createDefaultInvitation() = первый шаблон
  blocks.ts       чистые функции над блоками и украшениями, названия/заголовки блоков
  theme.ts        палитры, шрифты → CSS-переменные (themeStyle), headingsMode
  color.ts        яркость и смешивание #rrggbb (цвет фона блока, образцы в редакторе)
  library.ts      каталог картинок, фоны блоков, текстуры (CSS/SVG)
  decor.ts        реестр падающего декора (canvas)
  ornaments.ts    позиционирование украшений
  edges.ts        края блока: формы, маски, зёрна;  tornEdge.ts — генератор рваного края по зерну
  calendar.ts     сетка месяца, «07 . 11 . 2026», монограмма, splitNames
  session.ts      authEnabled() (заданы AUTH_GOOGLE_ID/SECRET), currentUser() — в тестах подменяется
  access.ts       canEdit (token или владелец), ownershipOf, claimDecision — чистые правила доступа
  music.ts        встроенные песни, DEFAULT_MUSIC_URL, findTrack, флаг CUSTOM_MUSIC_ENABLED (своя музыка выключена)
  images.ts       optimizeImage: sharp → поворот по EXIF, ≤ 1600 px, WebP, без метаданных (GIF — анимированный WebP)
  storage.ts      Storage: LocalStorage (public/uploads) или SupabaseStorage (@supabase/storage-js) — по наличию ключей
  countdown.ts ics.ts slug.ts rsvp.ts upload.ts storage.ts rateLimit.ts invitations.ts db.ts utils.ts
src/components/
  ui/             shadcn-компоненты (принадлежат проекту, их можно править)
  invitation/     то, что видит гость (+ превью в редакторе) — БЕЗ shadcn, свой дизайн
                  motion.tsx — режим анимаций (контекст) и появление при прокрутке; burst.ts — салют после RSVP
  editor/         редактор на shadcn
  templates/      TemplatePreview, TemplateGallery
  account/        AccountMenu (Войти / аватар → «Мои приглашения», «Выйти»), SignInButton
tests/unit, tests/components, tests/api, tests/e2e, tests/fixtures/test.mp3
tests/fixtures/invitations/ замороженные приглашения прошлых форматов (<версия>-<имя>.json) — только добавлять
```

## 4. Модель данных (`src/lib/schema.ts`)

Приглашение хранится одним JSON-полем `Invitation.data` (jsonb) и **всегда** проходит `invitationDataSchema` при чтении
(`lib/invitations.ts → fromRow`) и записи (PATCH). Тип `InvitationData = z.infer<…>` (выходной тип: поля с
`.default()` в нём обязательны).

```
InvitationData
├─ theme
│  ├─ palette: cream | blush | emerald | ivory | autumn | night | lavender | noir | navy | mocha | pearl | sand
│  ├─ font: 17 шрифтов имён (script=Great Vibes, serif=Cormorant, sans=Inter, marck, bad-script, caveat, lobster,
│  │        pacifico, amatic, playfair, prata, forum, yeseva, cormorant-sc, oranienbaum, poiret, comfortaa)
│  ├─ bodyFont: auto | cormorant | lora | eb-garamond | playfair | old-standard | pt-serif | montserrat | raleway | manrope | inter
│  ├─ background: url | null            фоновое фото страницы
│  ├─ texture: none | halftone | speckle | grain | linen | grid | diagonal | hearts | diamonds | flourish | stars | watercolor
│  ├─ decor: { type: none|image|petals|sakura|confetti|snow, image: url|null, color: #hex, density 0–60, size 0.5–3,
│  │           speed 0.3–3, pop?: boolean (мини-игра; не задано = включено) }
│  ├─ envelope: { ornament: url|null, style: seal|veil|flap|curtains|book }  картинка в углах и вид заставки
│  ├─ headings: caps | names          заголовки блоков: капитель Tenor Sans или шрифтом имён (см. §5.7)
│  ├─ motion: { style: elegant|soft|playful|cinematic|none, speed 0.5–2 }  стиль и скорость анимаций
│  └─ ornamentMotion: OrnamentMotion   анимация всех украшений без своей (см. §5.6)
├─ music: { url | null, loop }
└─ blocks: Block[]   порядок массива = порядок на странице; ≤ MAX_BLOCKS (40); любой тип — сколько угодно, кроме
   SINGLE_BLOCK_TYPES (hero, rsvp — по одному); id уникальны (superRefine)
   общие поля (blockBase): id (у старых JSON нет → withBlockIds: «b-<тип>», повторы «b-<тип>-2»), visible, title?, scriptLine? (строка «от руки» под заголовком),
                            surface: plain|paper|card|vellum|crumpled|notebook|frame|plate (убранные значения → LEGACY_SURFACES), surfaceOpacity 0.1–1, ornaments[≤6],
                            entrance: auto|rise|fade|slide|zoom|blur|none (своё появление блока),
                            edgeTop/edgeBottom: none|wave|arch|zigzag|scallop|perforated|torn (края фона блока),
                            edgeTopSeed?/edgeBottomSeed? — зерно рисунка рваного края (нет → от типа блока),
                            width: content|full, bgImage: url|null, bgDim 0–0.9 (приглушение цветом --bg), bgBlur 0–24 px, bgDarken 0–0.9 (чёрная вуаль),
                            bgColor: #hex|null (заливка блока / цвет панели),
                            textStyles: { [поле]: { color?: #hex, font?: шрифт имён или основного } }
   variant — вид блока, свой список у каждого типа (BLOCK_VARIANTS в schema.ts), по умолчанию «classic»
   Ornament: { src, position: top-left|top|top-right|left|right|bottom-left|bottom|bottom-right|center, size 40–400,
               rotate −180..180, flip, opacity 0.1–1, motion?: OrnamentMotion (нет — общая theme.ornamentMotion) }
   OrnamentMotion { enter: auto|side|fade|rise|drop|zoom|grow|spin|blur|none, enterSpeed 0.25–3,
                    idle: auto|sway|swing|float|breathe|flutter|shimmer|spin|none, idleSpeed 0.25–3, idleAmplitude 0.2–3 }
   hero      { names, date "YYYY-MM-DDTHH:mm", label?, subtitle?, photo }
   countdown {}                calendar {}       (оба берут дату из hero)
   story     { text, photo }   program   { items[{ time, title, description?, icon? }] }
   location  { placeName, address, mapUrl?, photo }
   dresscode { text, colors: #hex[] }             rsvp { deadline? "YYYY-MM-DD" }
   text      { icon? (TEXT_ICONS), text, buttonLabel?, buttonUrl? (https/tel/mailto) }   виды classic/card/quote
   photo     { photo, caption?, height: auto|screen|square; width по умолчанию full }    виды classic/frame/polaroid
   gallery   { photos: url[] ≤ 9 }                                                     виды classic/collage/carousel
   contacts  { text?, people[≤6]{ name, role?, phone?, whatsapp, telegram? } }         виды classic/cards
```

**Блок указывается по `id`.** Функции `lib/blocks.ts` (`toggleBlock/updateBlock/addOrnament…`) принимают ключ: id
или тип — тогда это первый блок типа (удобно для hero/rsvp, шаблонов и тестов; id никогда не равен типу).
`findBlock(data, "hero")` — первый блок типа: из него берут имена/дату/место. Добавление/копия/удаление —
`insertBlock`, `duplicateBlock`, `removeBlock` (hero не удаляется), `canAddBlock`; название в списке — `blockName`
(«Текст 2», если блоков типа несколько). Демо и новые приглашения получают id «b-<тип>» (как старые JSON).

**Обратная совместимость:** все поля, добавленные после первой версии, имеют `.default()` в схеме — старые JSON
в БД читаются без миграций. Новое поле добавляй так же, иначе сломаешь существующие приглашения (есть тест
«старые приглашения без новых полей читаются…» в `tests/unit/schema.test.ts`). Всё, что `.default()` не решает, —
мажорная версия и миграция (§4.1).

### 4.1 Версия формата приглашения (semver) — смотреть при КАЖДОЙ правке schema.ts

У каждого приглашения в JSON есть `schemaVersion` (semver, например `"1.3.0"`); текущая — `SCHEMA_VERSION` в
`src/lib/migrations.ts`. Сохранённые до версий данные считаются `1.0.0`. Это версия **формата данных приглашения**,
не сайта и не `package.json`: правки дизайна, редактора, API, анимаций версию не меняют — только формат
(`invitationDataObject` в `schema.ts` и всё, что в него входит: темы, блоки, украшения, списки `PALETTES`, `FONTS`,
`SURFACES`, `BLOCK_VARIANTS`…).

**Что поднимать:**

| Изменение формата | Версия | Миграция |
|---|---|---|
| новое поле **со значением по умолчанию** (`.default()`/`.optional()`), новое значение в списке (палитра, шрифт, вид блока, фон), новый тип блока, расширили границы (`max` 400 → 600) | **минор** `1.4.0 → 1.5.0` | не нужна: старые данные валидны, Zod подставит значения |
| поле удалено или переименовано; сменился тип или **смысл** (px → %), убрали значение из списка, сузили границы, поменяли значение по умолчанию, новое обязательное поле без default, перестроили структуру | **мажор** `1.5.0 → 2.0.0` | **обязательна** |
| формат не изменился (текст ошибки, комментарий) | патч `1.5.0 → 1.5.1` — по желанию | нет |

**Порядок действий (в том же изменении, что и правка схемы):**
1. Поправь `schema.ts`.
2. Подними `SCHEMA_VERSION` в `src/lib/migrations.ts` (не знаешь какую — запусти `npm test`, сторож скажет).
3. Мажор → добавь в `migrations` запись `{ to: "2.0.0", why: "…", up: (data) => … }`: `up` получает «сырой» JSON
   прошлого формата (ещё не проверенный схемой; поля могут отсутствовать), возвращает JSON нового формата, вход не
   мутирует. Порядок — по возрастанию версий. Если убираешь значение из списка — переведи его в новое (как
   `LEGACY_SURFACES`). Тест на `up` — в `tests/unit/migrations.test.ts`.
4. `npm run schema:snapshot` — запишет `src/lib/schema-history/<версия>.json`. Слепки прошлых версий не трогать.
   Если скрипт ругается «формат изменился, а версия осталась» — забыл шаг 2 (`--force` — только для версии, которая
   ещё нигде не выкатывалась).
5. `npm test`. Сторож (`tests/unit/schemaVersion.test.ts`) проверит: формат = слепок текущей версии; каждая версия
   в истории поднята не меньше, чем требуют изменения (сравнение слепков — `diffSchemas` в `schemaDiff.ts`: мажор,
   если старые данные могут не пройти или поменять смысл); у каждой мажорной есть миграция.
6. Фикстура: при мажорной версии (или новом заметном виде данных) **добавь** файл в `tests/fixtures/invitations/`
   (`<версия>-<что>.json`) — пример данных нового формата. Старые фикстуры **никогда не правь и не удаляй**: они —
   доказательство, что приглашения прошлых форматов (в т.ч. реальных пользователей) читаются и отрисовываются
   (`tests/components/InvitationFixtures.test.tsx`).
7. Строка в «История решений» (§11): версия и что изменилось.

**Как работает:** `invitationDataSchema = z.preprocess(migrateInvitation, invitationDataObject)` — каждое чтение
(`lib/invitations.ts`) и запись (PATCH) сначала прогоняют данные через миграции новее их версии и ставят
`schemaVersion = SCHEMA_VERSION`, потом проверяют схемой. В базе данные «догоняют» формат при следующем сохранении.
Данные из будущей версии (откат деплоя) не трогаются. Новое приглашение (`createFromTemplate`) сразу с текущей
версией. Сравнение версий — числами (`compareSemver`: 1.10.0 новее 1.9.0).

`title`: `undefined` → стандартный заголовок (`defaultTitles` в `blocks.ts`), `""` → без заголовка.

## 5. Функционал и реализация

### 5.1 Шаблоны (`lib/templates.ts`, `components/templates/*`, `editor/TemplatePicker.tsx`)
- 12 шаблонов. Первые четыре — только тема и украшения: `cream-classic` (Кремовая классика), `rose-garden` (Розовый сад), `golden-autumn` (Золотая осень),
  `starry-night` (Звёздная ночь). Вторые четыре собраны на новых возможностях (виды блоков, заставки, векторные
  ассеты, CSS-фоны, PRO-шрифты): `eucalyptus` (Эвкалипт), `art-deco` (Великий Гэтсби, палитра `noir`),
  `lavender-provence` (Лавандовый Прованс, палитра `lavender`), `marble-olive` (Мрамор и олива). Шаблон = полная
  `theme` + оформление блоков по типам (`variant/surface/surfaceOpacity/ornaments/entrance`) + `dresscodeColors`.
  Картинки берутся по id из `library` (`lib(id)` бросает ошибку на несуществующий id).
  Последние четыре — по мотивам примеров с Pinterest (next-blocks.md), **со своей структурой** (`layout`: блоки по
  порядку с примером текстов, фото и оформлением): `boarding-pass` (Посадочный талон: `navy`, обложка `ticket`,
  кремовые «билеты» = карточка + `bgColor` + край `perforated`, ч/б фото), `lago` (Итальянское озеро: `sand`,
  рукописные заголовки `headings: names`, полосы `bgColor` с рваными краями, фото с рваными краями), `mocha` (Шоколад
  и сургуч: обложка `monogram`, шоколадные/латте полосы, цитата на шёлке, галерея, сургуч), `seaside` (Морской берег:
  `pearl`, обложка `cover`, ракушка, жемчуг, розы). Фото-примеры — `photo(id)` → `/templates/<id>.webp`.
  Проверено на практике: золотая акварель `wc-gold` и шторки `curtains` на тёмной палитре выглядят грязно;
  украшения `top` у блока с заголовком налезают на него — лучше углы/бока/`bottom`.
- `createFromTemplate(t)` — новое приглашение с примером текстов (`sampleBlocks(t)`: структура шаблона или стандартный
  набор; id «b-<тип>», повторы «b-<тип>-2»).
- `applyTemplate(data, t)` — **чистая** функция: меняет тему (кроме `background`) и оформление блоков (`BlockDesign`:
  вид, фон, **цвет фона**, прозрачность, края и их зёрна, ширина, украшения, появление, **стили надписей**), цвета
  дресс-кода; сохраняет имена, дату, тексты, программу, фото и фоновые картинки, музыку, набор и порядок блоков,
  видимость, заголовки. Оформление n-го блока типа — из n-го блока этого типа в `layout` (лишние — последнего), иначе
  из `blocks` по типу, иначе «классика, без фона, без украшений». Блоки, которых в шаблоне нет, шаблон не добавляет.
  Тема копируется `structuredClone` (`themeOf`, по умолчанию `headings: "caps"`) — иначе вложенные `decor/envelope`
  были бы общими с константой шаблона и мутировались.
- Главная (`TemplateGallery`): карточки с живым превью; «Выбрать» → `POST /api/invitations {template}` →
  `window.location.assign(editUrl)`.
- Редактор («Оформление» → «Шаблон»): мини-превью, подтверждение через shadcn `AlertDialog`.
- `TemplatePreview` рендерит настоящий `InvitationView` (только hero, 390×700) и масштабирует `transform: scale`;
  `inert` + `aria-hidden`. В превью есть свои кнопки, поэтому кликабельная плитка сделана **прозрачной кнопкой
  поверх превью**, а не обёрткой (вложенные `<button>` = hydration error; есть регрессионный тест).

### 5.2 Страница гостя (`components/invitation/*`)
- `InvitationPage` (client): `<audio>`, `InvitationView`, `DecorLayer`, `Envelope`, кнопка музыки (эквалайзер,
  справа сверху). Пока конверт открыт — `html { overflow: hidden }`.
- **Конверт** (`Envelope`): рамка, украшение в двух углах, имена в две строки, дата «19 . 06 . 2027», печать с
  монограммой (`monogram()`), «Открыть приглашение» (`aria-label`), «♪ включится музыка». Клик = жест пользователя →
  `audio.play()` (автозапуск браузеры блокируют). Уход — CSS-анимация `envelope-away`, по `animationend` конверт
  размонтируется.
- `InvitationView`: корень с `themeStyle(theme)` (CSS-переменные), фоновое фото, `TextureLayer`, блоки через реестр
  `blockComponents[type]` (`blocks/registry.ts`), только `visible`, в порядке массива. Контент max 430px.
- `Section` — обёртка **каждого** блока: фон-слой (`surface-layer` отдельным div, чтобы `surfaceOpacity` не
  затрагивала текст), украшения (`<img>` с `ornamentStyle`, обрезаются `overflow-hidden`), заголовок
  (`inv-heading` + сердечко), появление при прокрутке (IntersectionObserver; без него — сразу видно).
  На бумаге (`paper/torn`) при непрозрачности ≥ 0.5 текст принудительно тёмный (`surface-light-text`).
- Новые блоки: Text (значок, текст, кнопка-ссылка), Photo (classic — фото заливкой блока через `Section fill`,
  режется краями, высота по пропорциям снимка/экран/квадрат; frame; polaroid), Gallery (сетка `galleryColumns`,
  коллаж, лента со scroll-snap; лайтбокс — портал в body, стрелки/Escape; в превью редактора не открывается),
  Contacts (кнопки tel/WhatsApp/Telegram — `lib/contacts.ts`). Фото/галерея без фото: гостю не видны, в превью — подсказка.
- Блоки: Hero (опц. фото с затемнением, рамка, кнопка .ics), Countdown (client, считает только на клиенте),
  Calendar (месяц, день в сердечке), Story, Program (таймлайн), Location (фото, «Посмотреть на карте»),
  Dresscode (кружки цветов), Rsvp (форма, степпер гостей, honeypot `website`, в превью не отправляет).
- `DecorLayer`: canvas `fixed` (в превью `absolute`), `pointer-events: none`, частицы из `decorDrawers`,
  тип `image` рисует картинку с «переворотом» (scaleX), `prefers-reduced-motion` → статично.
- `TextureLayer`: узоры нарисованы чёрным; светлая тема → `multiply`, тёмная → `invert(1)` + `screen`;
  `tinted` (акварель на `--accent`) — как есть.
- Стили приглашения — классы `inv-*` в `globals.css` (`.inv-btn`, `.inv-input`, `.inv-field`, `.inv-choice`,
  `.inv-heading`, `.inv-caps`, `.inv-script`, `.inv-divider`) на переменных `--bg --text --accent --font-title
  --font-body --font-heading --title-scale --field --glow --on-accent`. **shadcn внутри приглашения не используется.**

### 5.3 Редактор (`components/editor/*`, всё на shadcn)
- `Editor`: слева панель (шапка с Badge статуса сохранения, «Открыть», «Гости»; Tabs: Блоки / Оформление /
  Музыка / Ссылка; Alert с ошибками Zod), справа превью в рамке телефона — Magic UI `Iphone` (`ui/iphone.tsx`, доработан: `children` в экране,
  рамка `pointer-events-none`; экран в натуральную величину ≈ 402×856 — как iPhone 16 Pro;
  не помещается — телефон уменьшается целиком `transform: scale` (`usePhoneScale`), вёрстка внутри не сужается; расчёты
  по `getBoundingClientRect` внутри превью переводи в пиксели вёрстки — см. `previewScrollTop` и касания в `DecorLayer`) с `InvitationView preview` + `DecorLayer contained`.
  Над превью — «Перезагрузить» (иконка; новый `key` у превью → анимации заново, прокрутка наверх), статус сохранения
  (`save-status`), переключатель (Switch) «Следовать» и главная кнопка «Поделиться» (на компьютере; открывает «Ссылку»). В углу телефона — кнопка-эквалайзер музыки: превью
  играет песню как у гостя (`useInvitationMusic` + `MusicButton` из `invitation/music.tsx` — общие с `InvitationPage`;
  печать в «Посмотреть заставку» включает музыку; «Послушать» в «Музыке» и музыка превью глушат друг друга).
  Раскрытый блок хранится в `Editor` (открыт максимум один, сначала все свёрнуты); при **открытии** блока и включённом «Следовать» превью
  прокручивается к нему (`scrollTo` контейнера `preview`, не `scrollIntoView`; `previewScrollTop`: первый блок — к верху, последний — к низу, остальные — с отступом до 80 px сверху). Правки полей превью не дёргают.
- **Автосохранение** `useAutosave(value, save, validate, 800)`: debounce 800 мс, статусы `saved|saving|invalid|error`,
  невалидные данные не отправляются, гонки отсекаются счётчиком версий, одинаковая ссылка на объект не сохраняется
  повторно (важно для StrictMode). Сохранение = `PATCH /api/invitations/:id?token=…` с `{ data }`.
- «Блоки» (`BlocksPanel`): всё по `block.id` (dnd-kit id, key, раскрытый блок, прокрутка превью к
  `[data-block-id]`). Кнопка «Добавить блок» → `AddBlockDialog` (плитки типов, одиночные уже имеющиеся неактивны;
  «Готовые тексты» — `TEXT_PRESETS`); новый блок = `createBlock(data, type, preset)` в `templates.ts`: пример содержимого
  (`sampleBlock`) + оформление как у блока того же типа, иначе шаблона, на который похожа тема (`guessTemplate`), иначе
  без оформления; встаёт под раскрытым блоком (или в конец), раскрывается, превью прокручивается после рендера.
  В строке блока «Дублировать» (кроме одиночных) и «Удалить» (кроме hero; через `AlertDialog`). dnd-kit сортировка (Pointer + Keyboard sensor, русские объявления для скринридеров,
  `DndContext id="blocks-dnd"` против hydration mismatch), Switch видимости, раскрытый блок — две подвкладки
  (`editor-ux.md`, этап 1): «Текст и фото» — `BlockTitleFields` (заголовок, строка под ним; пустая — кнопкой
  `AddFieldButton` «＋») + поля `blockFields[type]`; «Вид» — `VariantPicker` (3 в ряд) + `BlockView` (готовые фоны —
  `BlockStylePicker` на `lib/blockStyles.ts`: «Без фона», «Карточка», полосы, «Рваная бумага», «Волна», «Бумага» и
  «Все фоны…» → `SurfaceDialog`; высота фото,
  украшения — ряд миниатюр, у выбранной карточка `OrnamentCard`: место сеткой 3×3 `POSITION_GRID`, «Меньше / Больше»
  `stepOrnamentSize`, отражение, «Заменить картинку», удаление, свёрнутая «Тонкая настройка украшения»; свёрнутая «Тонкая настройка»: фон `SurfacePicker`, прозрачность, цвет, края, картинка, ширина, появление —
  каждое только если сейчас действует). Подвкладка и открытость тонкой настройки — общие для всех блоков
  (`blockView` в `Editor`). В тестах — помощник `openBlockView(user, "Место", { fine })` (`tests/components/editorHelpers.ts`).
  Нажатие на блок в превью (`pickFromPreview`, захват клика — кнопки приглашения в превью не срабатывают) переключает
  на «Блоки», раскрывает блок и прокручивает панель к его карточке (`data-block-item`); открытый блок в превью залит
  акцентом шаблона (`selectedBlockId` → `data-selected` на обёртке, `.editor-pick` в globals.css). Над превью —
  одноразовая подсказка (localStorage `editor-pick-tip`). Вкладки панели — управляемые (`tab` в `Editor`).
  Под названием блока — сводка (`blockSummary`; в доступное имя кнопки не входит — это её описание). Над списком —
  «Что осталось заполнить» (`checklist(data)`: «не заполнено» = совпадает с примером `exampleBlocks` любого шаблона),
  пункт раскрывает блок; закрытие — localStorage `editor-checklist-hidden`.
  **Телефон (< 1024 px, `useIsDesktop`):** превью во всю ширину без iPhone, снизу `nav` «Разделы редактора» (кнопки
  «Панель «Блоки»»…, активная — «таблетка» под иконкой), панель `aside` — шторка снизу (`sheet` в `Editor`; закрыта —
  `invisible` + сдвиг, содержимое в DOM), невидимая подложка закрывает её, ручку (`sheet-handle`) можно смахнуть вниз
  (> 80 px — закрыть). Ряда вкладок в шторке нет (он дублировал нижнюю панель) — в шапке название раздела, «Открыть» и
  «Гости» — иконками. В тестах jsdom `matchMedia` не совпадает — тесты идут в телефонной раскладке.
- «Оформление» (`ThemePanel`, `editor-ux.md` этап 4): shadcn `Accordion` из 7 свёрнутых разделов — Шаблон, Цвета, Шрифты,
  Заставка, Падающий декор, Фон страницы, Анимации; в заголовке раздела — выбранное (`SectionTrigger`, шаблон по
  `guessTemplate`). Тонкие настройки раздела — в `FineTuning` (controls.tsx): шрифт текста и заголовки блоков; цвет,
  размер, скорость, точная плотность и мини-игра декора; скорость анимаций и общая анимация украшений. Декор — плитки
  и «Мало / Средне / Много» (`densityLevel/densityOf` в lib/decor.ts). В тестах — `openThemeSection(user, "Шрифты", { fine })`.
- `controls.tsx`: `ImagePicker` (Dialog: библиотека по категориям + своя загрузка), `LibraryImageField`,
  `UploadField`, `Segmented` (ToggleGroup, нельзя «снять» выбор), `Group` (Card), `checker` (шахматка).
- «Музыка» (`MusicPanel`): **своя загрузка пока выключена** (`CUSTOM_MUSIC_ENABLED = false` в `lib/music.ts`, чтобы не
  копить mp3; сообщение «Загрузить свою музыку пока нельзя»). Выбор из встроенных песен (`musicTracks`) с кнопкой
  «Послушать», «Без музыки», Switch «по кругу». Новое приглашение сразу с `DEFAULT_MUSIC_URL` (`createFromTemplate`).
  Песня, загруженная до ограничения, сохраняется и видна строкой «Своя песня». Вернуть загрузку — флаг в `true`
  (компонент `CustomUpload` и проверка размера уже есть). «Ссылка»: смена slug (кнопкой, не автосохранением;
  409 если занят), копирование ссылок гостя и редактора.
- Все изменения — через чистые функции `lib/blocks.ts` (`toggleBlock`, `moveBlock`, `updateBlock`, `addOrnament`,
  `updateOrnament`, `removeOrnament`) или `applyTemplate`; состояние — один `useState<InvitationData>`.

### 5.4 API и безопасность
- Доступ к редактору — **секретный `editToken` в query** (`?token=`) **или владелец по аккаунту** (`canEdit`).
  Страницы редактора и гостей отдают настоящий **403** через `forbidden()` (`experimental.authInterrupts`).
- **Аккаунты** (Auth.js, Google, сессии в БД, `src/auth.ts`). Включаются ключами `AUTH_GOOGLE_ID/AUTH_GOOGLE_SECRET`
  (+ `AUTH_SECRET`; образец — `.env.example`); без них `authEnabled()` = false и всё работает только по token, как
  раньше (локально, тесты, E2E). Создать приглашение можно без входа (`userId = null`); вошедший при создании сразу
  владелец. **При включённом входе ссылка для гостей, «Открыть» и «Гости» — только владельцу** (`accountGate`:
  login / save / other): во вкладке «Ссылка» и в окне по кнопкам «Открыть»/«Гости» — `AccountRequired` (войти,
  «Сохранить в аккаунт», «Войти другим аккаунтом»). Сохранение — `/edit/<id>/claim?token=…[&next=guests]` →
  `claimInvitation` (атомарно, только если владельца нет) → редактор с `?saved=1|taken|login` (Alert, вкладка
  «Ссылка») или, с `next=guests`, ответы гостей. Страница ответов при входе — `guestsPageAccess`: без входа просит
  войти (token уже не пускает), ничьё с token забирает в аккаунт, чужое — 403. Редактировать по token можно всегда;
  страница гостя `/i/<slug>` и анкета открыты всем — гостям вход не нужен.
  `/my` — список приглашений пользователя, ссылки без token (владелец проходит по сессии). Главная и `/my` —
  `force-dynamic`: иначе `authEnabled()` вычислился бы один раз при сборке.
- PATCH и GET rsvp по-прежнему по token (редактор всегда знает token — сервер передаёт его и владельцу).
- Next не позволяет разные имена динамических сегментов на одном уровне → папка `api/invitations/[key]`:
  для GET/PATCH и GET rsvp это **id**, для POST rsvp — **slug**.
- PATCH: `{ data?, slug? }`, 400 с плоским списком ошибок Zod (`formatZodErrors`), 403, 409 (slug занят).
- RSVP POST: валидация `rsvpInputSchema`, honeypot `website` → 400, лимит 5 ответов/мин с IP (in-memory), 429.
- Рваный край: `GET /api/edges/torn?v=&seed=0…2147483646&side=top|bottom&layer=mask|paper` → webp. Картинка —
  чистая функция параметров: кэш в памяти (≤400, параллельные запросы одного зерна считаются один раз) и
  `Cache-Control: immutable`; первый запрос зерна ~0.1 с. Открыт без token (как upload), 400 на кривые параметры.
- Upload: `image/*` ≤ 4 МБ (Vercel принимает запрос до 4.5 МБ), `audio/mpeg` ≤ 10 МБ — сейчас отклоняется, пока
  `CUSTOM_MUSIC_ENABLED = false` (`lib/upload.ts`). Фото сжимается дважды: в браузере `shrinkImage` (editor/shrinkImage.ts:
  ≤ 1600 px, JPEG или WebP с прозрачностью; фото с телефона 5–10 МБ → ~1 МБ) и на сервере `optimizeImage` → WebP.
  Нечитаемая картинка — 400, сбой хранилища — 502. Файл — `inv/<id приглашения>/<uuid>.webp` (чистить по приглашению)., сохраняется через интерфейс `Storage`
  (`LocalStorage` → `public/uploads`). Только в своё приглашение: `?id=&token=` или владелец (404/403). Клиент берёт
  id и token из `UploadTargetContext` (кладёт `Editor`, хук `useUploadFile` в `editor/api.ts`).
- «Всего гостей» = сумма `guestsCount` только у пришедших. CSV с BOM для Excel (кнопка — только когда есть ответы).
  На телефоне ответы — список карточек (`list` «Ответы»), таблица — от `md`; пустой список предлагает скопировать ссылку.

### 5.5 Шрифты, темы, библиотека
- `src/app/fonts.ts`: 25 шрифтов next/font, все с кириллицей. Аргументы — **только литералы** (next/font парсит
  при сборке, spread не работает). Непредзагружаемые — `preload: false` (скачиваются, только если применены).
- `lib/theme.ts`: `titleFonts[font] = { label, css, pair, scale }` (`scale` выравнивает кегль рукописных),
  `bodyFonts`, `resolveBodyFont` (`auto` → `pair`), `themeStyle` выставляет переменные, в т.ч. `--field`,
  `--glow`, `--on-accent`, зависящие от `palettes[p].dark`.
- `lib/library.ts`: `library` (id → `/library/<id>.webp`, категории flowers|botanical|leaves|wreaths|frames|dividers|watercolor|accents|particles),
  `surfaceImages` (бумага/рваный край), `textures` (CSS/SVG data-URI, бесшовные).

### 5.6 Анимации приглашения (по мотивам test.rainbow.kg)
- **Режим** `motion` у `InvitationView` (контекст `MotionContext`, `motion.tsx`): `on` — редактор и гость после открытия;
  `paused` — гость до нажатия на печать (корень `data-motion="paused"` → CSS ставит все анимации на паузу, появление
  не стартует); `off` — мини-превью шаблонов (класса `inv-motion` нет → всё статично).
- **Появление при прокрутке:** элементы размечены `data-reveal="N"` (+ `data-anim`: по умолчанию подъём снизу, `fade`,
  `blur`, `right`, `drop`, `spread`, `pop`, `curtain`, `write`; `data-delay` — своя задержка в секундах). `useReveal`
  в `Section` наблюдает их IntersectionObserver'ом и ставит `data-revealed` + `--d` (шаг 0.12 с по N). Подстраховка
  на прокрутке (capture — ловит и рамку превью) показывает всё, что на экране или уже выше.
- **Украшения** (`ornamentMotionProps` в `lib/ornaments.ts`, CSS — «Украшения» в разделе анимаций): каждое — обёртка
  `span[data-decor][data-enter]` (место, ширина, сдвиг — `ornamentStyle`) с картинкой `img[data-ornament][data-idle]`
  внутри (поворот/отражение/прозрачность — `ornamentImageStyle`). Обёртка **появляется** (переход из скрытого
  состояния по `data-enter`; `auto` — как в стиле анимаций, выезд со своего края), картинка потом **движется**
  (`data-idle`, keyframes `inv-orn-*`; `auto` → банты `swing`, остальное `sway` — `resolveIdle`). Разделение нужно,
  чтобы вращение шло вокруг центра картинки, а не точки привязки. У sway/swing/flutter первый кадр — наклон, поэтому перед циклом идёт разгон из ровного положения
  (`inv-orn-*-in`; иначе в момент старта картинка дёргалась). Скорости — множители длительности `--oe-k`/`--oi-k`
  (= 1/скорость), размах — `--oi-a` внутри keyframes. Настройки — своя `ornament.motion` или общая
  `theme.ornamentMotion` (контекст `OrnamentMotionContext` из `InvitationView`). Любая настройка украшения или его
  анимации меняет `key` (`ornamentMotionProps`); `OrnamentItem` в Section перемонтирует его через 0.4 с после последней
  правки (ползунок не мигает) и сам показывает (`replayReveal`) — анимация в превью идёт с начала. Украшение со своей анимацией (`data-decor-own`)
  анимируется и в блоке «Без анимации». В редакторе — `OrnamentMotionFields` (общие — «Оформление» → «Анимации»,
  свои — переключатель «Своя анимация» в карточке украшения, включение копирует общие).
- **Весь CSS движения** — раздел «Анимации приглашения» в `globals.css`, **только** внутри
  `@media (prefers-reduced-motion: no-preference)`. Базовые правила = статичный вид, он же при «Уменьшить движение».
  Сдвиги — свойствами `translate/scale/rotate`, а не `transform` (его занимают украшения). Осторожно: в Tailwind 4
  `rotate-*`/`translate-*`/`scale-*` — тоже эти свойства, поэтому `data-reveal` ставь на обёртку, а не на такой элемент
  (и не на кнопки с собственным transition). Скрытое состояние `opacity: 0 !important` — у фона блока и украшений
  прозрачность inline.
- Где что: заставка — `Envelope` (`inv-intro*`, уход по таймеру 1.3 с в `InvitationPage`); музыка — нарастание
  громкости, пауза при `visibilitychange`, кнопка-эквалайзер снизу справа только после открытия; обложка — фото
  из размытия + параллакс (только у гостя), рамка `inv-frame`, искорки, стрелка «Листать вниз»; календарь — счётчик
  дня через `@property --inv-num`, дни волной (`--w` = строка+столбец), кружок + круг «от руки»; история без
  заголовка = цитата (слова по одному, текст целиком в `sr-only`); программа — линия `--p` растёт с прокруткой
  (`ProgramBlock`, только растёт), точки `data-lit`; место — шторка и блик `inv-btn-shine`; анкета — перелистывание
  цифры (WAAPI), салют `heartBurst`, экран «Спасибо!» с «Изменить ответ».
- Падающий декор остаётся canvas (`DecorLayer`): переворот `flip`, проявление/угасание у краёв `edgeFade`,
  скорость `decor.speed`. **Мини-игра** (`decor.pop !== false`, Switch «Лопаются от касания»): касание частицы —
  она лопается конфетти (`hitParticle` с радиусом не меньше `MIN_HIT_RADIUS` = 22 px, `burstSparks`/`stepSparks`/
  `drawSparks` в lib/decor.ts, цвета `sparkColors` — без белого) и снова падает сверху (`respawnParticle`). Касания
  ловятся `pointerdown` на window (холст остаётся `pointer-events: none` — кнопки и прокрутка работают), в превью
  редактора — только внутри рамки телефона. Кольцо-вспышку пользователь отверг — только конфетти. «perMinute/maxOnScreen» эталона у нас = плотность (частицы переиспользуются).
- Проверка в браузерной панели: если панель скрыта, таймлайн анимаций и rAF заморожены — перематывай
  `document.getAnimations()` вручную, а кадр обновляй сменой размера окна (`resize_window`).

### 5.7 Виды блоков, стили анимаций, заставки, PRO
- **Виды блоков** (`variant`): hero classic/arch/polaroid/minimal/cover/monogram/ticket · countdown classic/circles/cards · calendar
  classic/date/week/tearoff · story classic/photo/letter · program classic/cards/icons · location
  classic/postcard/minimal · dresscode classic/stripes/chips · rsvp classic/compact. Реестр `blockComponents` не
  менялся: каждый компонент блока сам ветвится по `block.variant`. В редакторе — `VariantPicker` (плитки с настоящим
  блоком в миниатюре, `motion="off"`). Плитка — **прозрачная кнопка поверх** миниатюры (в миниатюре есть свои
  кнопки; вложенные `<button>` ломают гидратацию — есть регрессионный тест). Шаблон может задать вид (`variant`) и появление (`entrance`) блока; незаданное сбрасывается к `classic`/`auto`.
- **Стиль анимаций** (`theme.motion.style`) — атрибут `data-style` на корне приглашения, CSS меняет скрытое
  состояние и кривые; `none` = `motion="off"`. **Скорость** — `--inv-speed` → `--k`; все длительности и задержки
  в движущем CSS записаны как `calc(Xs * var(--k, 1))` (новые анимации пиши так же). «Кино» дополнительно ×1.5.
- **Появление блока** (`entrance`) — `data-entrance` на секции, перебивает стиль для обычных элементов
  (не трогает write/curtain/spread); `none` — блок показывается сразу (`useReveal(ref, instant)`), его анимации выключены.
- **Заставка** (`Envelope variant`): seal, veil (backdrop-blur обложки), flap (клапан + письмо), curtains, book.
  Время ухода — `INTRO_LEAVE_MS` в `Envelope.tsx` (синхронно с CSS `.inv-intro-*`). В редакторе «Посмотреть
  заставку» (`IntroPreview`, `Envelope contained`) — проигрывается в рамке телефона, закрывается сменой вкладки/блока.
- **Фоны блока — это предметы, на которых лежит текст** (лист, тетрадь, рама, тарелка), а не фактуры на весь блок:
  «обои» (мрамор, штукатурка, эбру и т.п.) пользователь отверг. Виды отрисовки — `surfaceLayer()` в library.ts
  (общая для приглашения и плиток `SurfacePicker` в BlockStyle): картинка на весь блок (`paper`), CSS (`vellum`),
  серая фактура × `--tex-base` палитры (`crumpled`), предмет `surfaceObjects`: `border` — border-image (углы и края не
  искажаются, середина тянется/повторяется; `crest` — венец рамы отдельным `<img>`, `window` — паспарту) и `contain`
  (тарелка целиком; содержимое `zoom: .78`, годится коротким блокам). Новые предметы задаются помощниками
  `sheet(id, [w, h], slice, pad, {repeat, window})` (доли размера файла → px; предмет на странице ≈ 390 px шириной,
  поэтому по горизонтали почти не тянется) и `round(id, pad)`; их `pad` Section ставит inline, классы — общие
  `.surface-object` / `.surface-round` (круг растёт по содержимому, но длинный блок в него не помещается — только
  короткие блоки). У старых `notebook`/`frame` отступы — классами `.surface-<id>` в globals.css.
  45 фонов в редакторе разбиты на группы `surfaceGroups` (тест: каждый ровно в одной). Тёмные предметы
  (`darkSurfaces`, мешковина) — светлый текст с тенью. Слишком контрастные детали (линейки записки, линии корешков
  билета) ослаблены/убраны на этапе подготовки, а не CSS. Убранные фоны (torn, kraft, fabric, marble…) при чтении заменяются через `LEGACY_SURFACES` в schema.ts. **Украшение по центру** (`position: center`) — для венков/рамок за текстом.
- **Края блока** (`edgeTop`/`edgeBottom`, `lib/edges.ts`): CSS-маска на слое фона — полоса края сверху/снизу
  + сплошная середина (заходит на полосы на 1 px). Волна/арка/зигзаг/фестоны — SVG-маски из кода (зигзаг и фестоны
  `mask-repeat: round` — целое число зубцов). Рваная бумага генерируется по зерну (`lib/tornEdge.ts`, ~70 мс,
  бесшовная полоса 1200×96 = 600×48 CSS px) и отдаётся `/api/edges/torn`: `layer=mask` режет окрашенный слой,
  `layer=paper` — белая сердцевина с волокнами и тенью, лежит под ним (тень запечена — CSS filter на большом фото
  дорог при параллаксе). Характер обрыва (размах, ступеньки, ширина кромки, ворс) тоже из зерна. Зерно — в блоке
  (`edgeTopSeed/edgeBottomSeed`): выбор рваного края, повторное нажатие на плитку и кнопка «Другой обрыв» дают
  новое (`newEdgeSeed`), гость видит тот же обрыв. Нет зерна (старые данные) → `defaultEdgeSeed` от типа блока.
  Правишь генератор — подними `TORN_VERSION` в edges.ts (он в URL, иначе останется вечный кэш). Режутся только фоны во весь блок: панели `EDGE_SURFACES`
  (card, vellum, crumpled) и заливка `fill` — фото обложки classic (`Section` prop `fill`, в отличие от
  `background`, который края не режут). У бумаги-картинки и предметов краёв нет; в редакторе — подсказка.
  На вырезанной стороне у панели нет скругления и рамки, у содержимого +`pad`, рамка `inv-frame` и стрелка обложки
  отступают. Выбор — `EdgePicker` в BlockStyle (плитки-образцы в масштабе 0.5). Шаблон задаёт края через `BlockDesign`.
- **Фоновая картинка блока** (`bgImage`, `bgDim`, `bgBlur`, `bgDarken`): слой во весь блок в `Section` (+ приглушение цветом `--bg`,
  размытие `filter: blur` — слой вынесен за края на 2×радиус, иначе края светлеют; затемнение — чёрная вуаль,
  от `DARK_TEXT_FROM` = 0.45 у блока без панели текст светлый — `surface-dark-text`),
  считается заливкой — края режут её так же, как фото обложки (`blockHasFill`). Шаблон её не трогает (как фото).
- **Ширина блока** (`width`): `InvitationView` кладёт каждый блок в обёртку — «по контенту» `max-w-[430px]`, «во всю
  ширину» без ограничения; у такого блока фон/картинка/края на весь экран, а содержимое `Section` — в колонке 430 px.
  Только для `FULL_WIDTH_SURFACES` (без фона и панели), предметы — всегда по контенту (`isFullWidth`). В превью
  телефона разницы нет. Из-за обёрток секции — не соседи: «следующий блок» ищи среди `section[data-block]`.
- **Цвет и шрифт текста** (`textStyles`, `lib/textStyle.ts`): у каждого редактируемого текста свой стиль по ключу
  поля (`TEXT_KEYS`: title, scriptLine, names, label, subtitle, text, placeName, address; у программы один стиль на
  все пункты — time/itemTitle/itemDescription). В блоке — `style={textStyle(block, "ключ")}` на элементе с текстом
  (новое текстовое поле — не забудь). В редакторе — `TextStylePicker` (кнопка «Aa» справа от поля: буквы выбранным
  шрифтом, полоска выбранным цветом; Popover с цветами всех палитр + свой цвет и списком всех шрифтов своим
  начертанием); в `TextField` — проп `textStyle`. Пустой стиль удаляется (`withTextStyle`).
- **Цвет фона блока** (`bgColor`): без фона — заливка во весь блок (слой `block-fill` в `Section`, режется краями,
  как картинка; `blockHasFill`), на панелях (карточка, калька, мятая бумага) — цвет самой панели (`tintedPanel`), у
  предметов не действует (`takesBgColor`). По яркости цвета (`isDarkColor`, lib/color.ts) секция получает
  `inv-fill-dark`/`inv-fill-light`: палитра «переворачивается» — текст `--ink-dark/--ink-light`, акцент
  `--accent-on-dark/-light`, поля формы от `--fill` (переменные задаёт `themeStyle`). Так делаются кремовые «билеты»
  на тёмно-синей палитре и шоколадные полосы на светлой. В редакторе — `BgColorPicker` в BlockStyle (образцы из
  палитры через `mixHex` + свой цвет).
- **Заголовки шрифтом имён** (`theme.headings = "names"`, Segmented «Заголовки блоков» в «Шрифтах»): атрибут
  `data-headings` на корне (`headingsMode`): `serif` — капитель шрифтом имён, `script` (у рукописного шрифта) —
  строчными и крупно, а строка под заголовком (`scriptLine`) — капителью. CSS стилизует только `.inv-title` (h2
  заголовка секции в `Section`), не все `.inv-heading`.
- **Новые обложки:** `cover` — фото сверху с волной (маска `.inv-cover-photo`), под ним имена с рукописным `&`
  (`.inv-amp`); `monogram` — инициалы в кольце с веточкой, имена, дата словами, `subtitle` — место капителью, фото
  снизу во всю ширину, проявляется из фона; `ticket` (PRO) — билет на CSS: бумага `--paper`, перфорация и вырезы
  маской `.inv-ticket` (тень — на обёртке, маска срезала бы её), глобус и штемпель SVG, дата/время/место (из блока
  «Место»). Украшения лежат **под** содержимым секции: у `cover` верх занят фото — украшения ставь в нижние углы.
- Край **`perforated`** — полукруглые выемки, как у билета (SVG-маска в `shapes`).
- **PRO** (`lib/premium.ts`): списки платных видов, стилей, заставок, фонов, шрифтов и `premium: true` у ассетов.
  В редакторе всё доступно, помечено `ProBadge`. Плашка `premium-usage` с перечнем сверху пока скрыта
  флагом `SHOW_PREMIUM_ALERT = false` в `Editor.tsx` (тарифов нет); вернуть — поставить `true` и поправить тест в `Editor.test.tsx`. Проверку тарифа
  при публикации делать на сервере через `premiumUsage(data)` (публикации пока нет).
- Шрифты: +12 имён (Comforter, Comforter Brush, Alice, Kurale, Philosopher, Ruslan Display, Cormorant Unicase/Infant,
  Playfair SC, Gabriela, Pattaya, Bellota) и +6 основных (Literata, Spectral, Vollkorn, Alegreya, Jost, Arsenal) —
  все Google Fonts (OFL) с кириллицей. Рукописных с кириллицей в Google мало — дальше только платные с SaaS-лицензией.

## 6. Соглашения

- Логика — в `src/lib` чистыми функциями, **не мутирующими** вход; на каждую — unit-тест.
- Реестры с исчерпывающими типами: `blockComponents`, `blockFields` (`{ [K in BlockType]: … }`), `decorDrawers`,
  `titleFonts`, `bodyFonts`, `textures`, `palettes` — TypeScript сам укажет, что забыли зарегистрировать.
- Тексты UI и комментарии в коде — на русском, идентификаторы — на английском. Стиль комментариев — краткое «зачем».
- Доступность — часть контракта и опора тестов: подписи через `htmlFor`/`aria-label`, `Slider thumbLabel`
  (наш патч shadcn-слайдера), `role`-ы Radix. Тесты ищут элементы по ролям и подписям — не ломай их.
- Редактор/приложение — shadcn-компоненты и токены (`bg-muted`, `text-muted-foreground`, `ring-ring`…);
  приглашение — только `inv-*` и переменные палитры. Не смешивай.
- Выпадающие списки — `NativeSelect` (нативный select: мобильным удобнее, Playwright `selectOption` работает).
- UX-правила (скилл ui-ux-pro-max, ветка `ui-ux-pro-max-skill`): поля на телефоне ≥ 16 px (иначе iOS приближает
  страницу при фокусе), зоны нажатия на сенсорных экранах ≥ 40 px (`pointer-coarse:size-10`), у иконки-кнопки —
  `aria-label`, у декоративной иконки — `aria-hidden`, одно главное действие на экран, у пустого состояния и ошибки —
  действие «что дальше», `motion-reduce:` для переходов. Копирование — общий `components/CopyButton.tsx` (объявляет
  «Скопировано» через `role="status"`). `viewport-fit=cover` в layout — без него `env(safe-area-inset-*)` всегда 0.
- Добавить shadcn-компонент: `npx shadcn@latest add <имя> -y < /dev/null` (иначе CLI ждёт ввода).

## 7. Подводные камни (выучено на практике)

1. **`--accent` занят дважды:** снаружи приглашения это токен shadcn, внутри — цвет палитры (ставится inline на
   корне приглашения/конверта/плиток превью). Не объявляй `--accent` приглашения в `:root`.
2. `--font-heading` — переменная **приглашения** (Tenor Sans). shadcn init добавлял свою в `@theme` — удалено.
3. Radix ToggleGroup `type="single"` — это `radiogroup`/`radio` с `aria-checked` (не `button`/`aria-pressed`) и
   позволяет снять выбор (`""`) — игнорируем пустое значение.
4. Radix Slider: `role="slider"` у thumb, не у корня → имя передаём `thumbLabel`. В тестах двигаем клавиатурой
   (`{Home}`, `{ArrowRight}`), `fireEvent.change` не работает.
5. jsdom не умеет медиа/canvas/ResizeObserver/pointer capture — всё застаблено в `tests/setup.ts`.
6. **Fast Refresh сохраняет состояние:** после правок кода конверт может «исчезнуть» без клика — это не баг,
   проверяй после полной перезагрузки. Скриншоты в браузерной панели иногда запаздывают — проверяй DOM.
7. Проверка через JS: несколько `onChange` в одном тике видят один и тот же `data` (последний побеждает) — кликай
   с паузой, как пользователь.
8. Dev-режим: `router.push` на ещё не скомпилированный маршрут подвисал → после создания используем
   `window.location.assign`.
9. dnd-kit KeyboardSensor подписывается на клавиши асинхронно: в E2E жмём ↑ по одному и ждём объявление
   «Блок «Программа» над блоком «…»» (`toPass`).
10. Prisma запрещает `db push --force-reset`/`migrate reset` из ИИ-агентов без согласия пользователя — не обходи.
    Тестовые базы не сбрасываются: API-тесты чистят таблицы сами (`resetDb`). Тесты падают с «Тестовая база
    недоступна» — не запущен Docker (`npm run db:up`).
11. `next start` **не отдаёт** файлы, загруженные в `public/` после сборки → E2E идёт против `next dev`; для
    продакшена нужен S3 (реализовать `Storage`).
12. Загрузки в `public/uploads` (и E2E тоже) копятся — это ожидаемо, папка в `.gitignore`.
13. Даты — локальное время без часового пояса (`"YYYY-MM-DDTHH:mm"`); форматирование парсит строку вручную, чтобы
    сервер и клиент совпадали; в .ics — «плавающее» время.
14. Проект под git: https://github.com/IslamAsankojoev/invitation (ветка `main`). Секреты — только в `.env` (в
    `.gitignore`; GitHub push protection отклоняет ключи Google), образец — `.env.example`. Архивы `*.tgz`, исходники
    `musics/` и `new-sources/` в репозиторий не идут. Старые архивы «до переделки» остались локально.
15. **Телефон: адресная строка меняет высоту окна при прокрутке.** Всё `fixed` на весь экран с `h-full`/`100vh`
    получает resize почти каждый кадр. Поэтому `DecorLayer` высотой `h-lvh` и при resize не пересоздаёт частицы, а
    подгоняет их (`fitParticles`) — иначе частицы «прыгали» и холст растягивался (эффект «полёта в космосе»).
16. **`sr-only` (`position: absolute`) без позиционированного предка** считается от страницы, а не от панели со
    своим скроллом, и растягивает документ: в редакторе на десктопе под экраном был пустой «провал». Поэтому
    прокручиваемая панель редактора — `relative`; новые скролл-контейнеры с такими полями делай так же.
17. В проекте нет конфига Prettier: `npx prettier --write` переформатирует файл под 80 символов, а код написан под 120.
    Не запускай его на существующих файлах.
18. **Даты в примерах шаблонов — в будущем**, иначе отсчёт пишет «Событие состоялось» (так было с 2025–2026 годом).
    Дата ответа анкеты уже выводится блоком — не дублируй её в `scriptLine`.
19. Фото «во всю ширину» на компьютере растягивается на весь экран: высота заливки ограничена `min(88svh, 760px)`
    (кроме «На весь экран»), иначе квадрат был бы 1280×1280.
20. Проверять страницы удобнее не браузерной панелью (скрытая панель замораживает кадр), а headless Playwright:
    снимок всей страницы после «Открыть приглашение» с `reducedMotion: "reduce"`.
21. **Вход в тестах не настоящий:** `tests/setup.ts` мокает `@/lib/session`, сессию задаёт `signInAs()` из
    `tests/auth-mock.ts` (после каждого теста сбрасывается). E2E запускает сервер с пустыми `AUTH_GOOGLE_*`
    (playwright.config.ts) — иначе ключи из `.env` включили бы вход и сценарий по token упёрся бы в «Войдите». Проверить Auth.js вживую без Google: вставить в БД
    `User` + `Session` и поставить cookie `authjs.session-token` = sessionToken.
22. **`next build` в папку `.next` ломает запущенный `npm run dev`** (страницы отдают 500): собирай с
    `NEXT_DIST_DIR=.next-build`, а после локального `npm run vercel-build` перезапусти dev и удали `.next`.
23. **shadcn `accordion` генерируется с ошибками:** импорт `cn` из `"cn"` и фиксированная высота
    `h-(--radix-accordion-content-height)` у внутреннего блока — раздел не рос, когда внутри раскрывалась «Тонкая
    настройка», и низ обрезался. Обе правки уже в `ui/accordion.tsx`; при повторном `shadcn add accordion` — проверь.

## 8. Тесты

- `tests/unit/*` — схема (в т.ч. обратная совместимость), блоки/украшения, шаблоны (валидность, существование
  картинок, различимость, `applyTemplate` сохраняет контент и не мутирует), календарь/монограмма, countdown, ics,
  slug, rsvp/CSV, decor, theme/текстуры.
- `tests/components/*` (jsdom, `// @vitest-environment jsdom`) — рендер блоков/порядок/видимость, конверт и музыка,
  редактор (имя → превью, скрытие блока, ошибки, украшения, фон и ползунок, шрифты и текстура, шаблон с
  подтверждением), галерея шаблонов.
- `tests/api/*` — route handlers напрямую с `Request`: создание (в т.ч. по шаблону, 400), GET/PATCH (403/400/409),
  upload (типы, размеры), RSVP (honeypot, лимит, 404, GET с token).
- Версия формата: `schemaVersion.test.ts` (сторож: формат = слепок, версии подняты правильно, у мажорных есть
  миграции), `migrations.test.ts` (semver, порядок миграций, `diffSchemas` мажор/минор),
  `components/InvitationFixtures.test.tsx` (все фикстуры прошлых форматов читаются и отрисовываются).
- `tests/e2e/full-flow.spec.ts` — главная → шаблон «Розовый сад» → имена и дата → скрыть story → перетащить
  program выше countdown → украшение «Красные розы» и фон «Бумага» на «Место» → декор petals, шрифт Prata,
  текстура «Узор» → песня «A Thousand Years» из списка → публичная страница (порядок, текстура, шрифт Prata загружен, розы на конверте, палитра)
  → «Открыть приглашение» → `audio.paused === false` → RSVP → ответ на странице гостей.

## 9. Рецепты

- **Любая правка формата приглашения** (поле, список значений, тип блока, вид, фон, шрифт, палитра): + версия по
  §4.1 — `SCHEMA_VERSION`, при мажоре миграция, `npm run schema:snapshot`, `npm test`.
- **Новый тип блока:** схема (`...blockBase`, `variant`, `BLOCK_VARIANTS`) → `blockLabels` + `defaultTitles` +
  `blockDescriptions` → `variantLabels`, `premiumVariants` → компонент в `invitation/blocks` через
  `<Section block={block}>` (+ `textStyle(block, key)`) + `registry.ts` → поля в `BlockFields.tsx` → пример в
  `sampleBlock()` (`templates.ts`) → иконка и место в `AddBlockDialog` → тесты (`Variants.test.tsx` подхватит виды сам).
  Одиночный тип — в `SINGLE_BLOCK_TYPES`. Это изменение формата — минорная версия (§4.1).
- **Новый шаблон:** объект в `templates` (`theme`, `blocks`, `dresscodeColors`, по желанию `layout` — своя структура:
  блоки по порядку с примером текстов, фото и оформлением). Палитра шаблона не должна повторяться (тест), шрифт может.
  Если меняешь число шаблонов — поправь тест «их двенадцать»; `seed.ts` подхватит автоматически.
- **Фото-пример шаблона:** Unsplash (не Unsplash+: в поиске `premium`/`plus` — платные), пережать в WebP ≤ 1200 px
  (q≈74) в `public/templates/<шаблон>-<что>.webp`, строка в `public/library/CREDITS.md` (раздел «Фото-примеры
  шаблонов», «Unsplash License» — тест `library.test.ts` сверяет каждый файл). Вырезка предмета с ровного цветного
  фона (ракушка) — по оттенку и насыщенности фона + самая большая связная область; строка в «Вырезки с Unsplash».
- **Фон-предмет:** найди CC0/PD фото (Wikimedia: музеи Met, Rijksmuseum, Paris Musées) или купленную картинку →
  вырежи фон/окно (sharp; готовые операции — `scripts/new-sources.mjs`: `inpaint` закрасить текст, `keyout` белый
  фон, `deskew`, `flatten`, `feather`; составной лист — `split-sheet.mjs`) → `public/library/surfaces/` → ключ в
  `SURFACES` + `surfaceLabels` + `surfaceGroups` + `surfaceObjects` через `sheet(...)`/`round(...)` (размер файла —
  тест сверит) + при светлом предмете `lightSurfaces` → строка в CREDITS.md → проверь на светлой и тёмной палитре,
  на коротком и длинном блоке. Подбирать slice/pad удобно по картинке с сеткой 5%.
- **Картинка в библиотеку:** прозрачный WebP (~900px) в `public/library/` + `asset(id, label, category)` в `library.ts`.
  Сторонние — public domain / CC0 или купленные у автора; у **каждой** — строка в `public/library/CREDITS.md` со
  статусом (тест `library.test.ts` проверяет; свои картинки первой версии — список `IN_HOUSE` в тесте). Исключение —
  картинки из `new-sources/` (pngwing): пользователь их покупает, до покупки статус «уточняется». Скан старинного листа →
  `node scripts/botanical-cutout.mjs скан.jpg public/library/bot-<id>.webp` (параметры CROP/BOTTOM/FILL — в шапке
  скрипта), смотри результат на светлом и тёмном фоне. Wikimedia отдаёт превью только стандартных размеров (1280px —
  да, 1600px — 400). Белые лепестки становятся прозрачными: на светлых палитрах это выглядит естественно, на тёмных — нет.
- **Шрифт:** проверь кириллицу (`node_modules/next/dist/compiled/@next/font/dist/google/font-data.json`) →
  `fonts.ts` (литералы, `preload: false`) → ключ в `FONTS`/`BODY_FONTS` → `titleFonts`/`bodyFonts`.
- **Текстура:** ключ в `TEXTURES` + запись в `textures` (`svgTile(size, "<svg…>")`, рисуй чёрным).
- **Палитра:** ключ в `PALETTES` + запись в `palettes` (`dark: true` для тёмных — включает инверсию текстур и
  тёмный текст на кнопках).
- **Вид блока:** значение в `BLOCK_VARIANTS[type]` → подпись в `variantLabels` → ветка в компоненте блока
  (`block.variant === "…"`) → при желании в `premiumVariants` → тест `tests/components/Variants.test.tsx` подхватит сам.
- **Векторный ассет:** функция в `scripts/library-svg.mjs` → `node scripts/library-svg.mjs` → `vector(id, label,
  category, premium?)` в `library.ts`.
- **Форма края блока:** значение в `EDGES` (schema.ts) → подпись в `edgeLabels` и запись в `shapes` (lib/edges.ts):
  путь для нижнего края (верхний отражается сам), высота полосы, ширина плитки, repeat, `pad` содержимого.
  Рваный край — правь `lib/tornEdge.ts`, смотри `npx tsx scripts/torn-preview.ts out.png [зёрна]` (фото, тёмная и
  светлая заливка: белая кромка переменной ширины, без «сосулек» — длинных зубцов вниз), подними `TORN_VERSION`.
- **Вид падающего декора:** `DECOR_TYPES` + `decorLabels` + `decorDrawers` (`fall`, `sway`, `sizeRange`, `draw`).

## 10. Для продакшена (не сделано)

фикстуры реальных приглашений
(снимки из прода в tests/fixtures/invitations), бэкапы (pg_dump по расписанию) и пинг против засыпания бесплатного Supabase, аналитика, деплой на
Vercel (Postgres + migrate уже сделаны), rate limit в Redis, чистка неиспользуемых файлов, CAPTCHA.

## 11. История решений (кратко)

1. MVP по ТЗ (схема Zod, API, блоки, редактор, декор, конверт, гости, тесты).
2. Дизайн доведён до уровня test.rainbow.kg: библиотека PNG→WebP, украшения блоков, фоны блоков, календарь,
   фото, декор-картинки, монограмма, типографика.
3. Размер падающего декора, прозрачность фона блока (отдельный слой).
4. 17 шрифтов имён + 10 основных (все с кириллицей), 12 текстур на CSS/SVG, инверсия на тёмной палитре.
5. UI приложения переписан на shadcn/ui (приглашение — нет), классы приглашения переименованы в `inv-*`.
6. 4 шаблона, галерея на главной, смена шаблона в редакторе, палитра «Осенняя», переменные `--field/--glow/--on-accent`.
7. Анимации как на test.rainbow.kg (заставка, обложка, появление при прокрутке, календарь, программа, салют RSVP,
   музыка), поля `scriptLine` и `decor.speed`. Архив до переделки — `before-animations.tgz`.
8. Вариации: виды каждого блока, стили анимаций и своё появление блока, 5 видов заставки, 23 векторных ассета,
   4 CSS-фона, 18 новых шрифтов, пометки PRO. Архив до переделки — `before-variants.tgz`.
9. +4 шаблона на новых возможностях (Эвкалипт, Великий Гэтсби, Лавандовый Прованс, Мрамор и олива), палитры
   `lavender` и `noir`, шаблон задаёт `variant`/`entrance` блоков. Архив до переделки — `before-templates2.tgz`.
10. Категория «Ботаника»: 18 старинных гравюр и акварелей (public domain/CC0) с убранной бумагой, `CREDITS.md`,
    скрипт `botanical-cutout.mjs`. Окно выбора картинки прокручивается обёрткой (сетка сама сжималась).
11. Фоны блока — предметы: тетрадный лист, золочёная рама с венцом (Rijksmuseum), мейсенская тарелка (Paris Musées),
    мятая бумага; убраны рваный край, крафт, лён, CSS-мрамор (замены в LEGACY_SURFACES). Плитки фона с образцом.
12. Разбор `new-sources/` (pngwing, лицензии покупаются): +37 фонов-предметов (листы, свиток, пергаменты, стикеры,
    записки, ткань, ярлык, этикетка, карточка, 4 билета, 4 рамы, тарелка, 4 салфетки, 3 венка) и 18 украшений
    (гибискус, сакура, 9 акварелей, 7 лент); выбор фона — группами; скрипты `new-sources.mjs`, `split-sheet.mjs`.
    Архив до переделки — `before-new-sources.tgz`.
13. Края блока сверху и снизу: волна, арка, зигзаг, фестоны (SVG-маски) и рваная бумага с белой волокнистой
    кромкой и тенью — генерируется по зерну на сервере, при каждом выборе обрыв новый. Работают на панелях и на
    фото обложки.
14. У каждого блока — фоновая картинка с приглушением и ширина «по контенту / во всю ширину».
15. Цвет и шрифт любого редактируемого текста — пикер «Aa» рядом с полем (shadcn Popover).
16. Повторяемые блоки: у блока `id`, любой тип сколько угодно (hero и rsvp — по одному, до 40 блоков), окно
    «Добавить блок» с готовыми текстами, «Дублировать»/«Удалить». Новые типы «Текст», «Фото», «Галерея» (лайтбокс),
    «Контакты». Архив до переделки — `before-blocks.tgz`.
17. +4 шаблона по примерам с Pinterest со своей структурой (`layout`): Посадочный талон, Итальянское озеро, Шоколад и
    сургуч, Морской берег. Для них: цвет фона блока (`bgColor`, этап 2), заголовки шрифтом имён, обложки
    cover/monogram/ticket, край «Перфорация», палитры navy/mocha/pearl/sand, значки «Самолёт»/«Глобус», векторы
    (маршрут самолёта, волна, жемчуг, сургуч), ракушка и 24 фото с Unsplash. Архив до переделки — `before-templates3.tgz`.
18. Анимация украшений: вид и скорость появления, вид/скорость/размах движения — общие для всех («Оформление» →
    «Анимации») и свои у каждого украшения. Разметка украшения — обёртка + картинка. Архив до переделки —
    `before-ornament-motion.tgz`.
19. Аккаунты: вход через Google (Auth.js, пользователи в нашей БД), «Сохранить в аккаунт», «Мои приглашения»,
    владелец заходит без token, загрузка файлов только в своё приглашение. Архив до переделки — `before-auth.tgz`.
    Затем: ссылки/«Открыть»/ответы гостей — только владельцу; музыка — только встроенные песни (своя выключена).
20. Git + GitHub, переход с SQLite на PostgreSQL: прод — Supabase, локально и в тестах — Docker; `data` → jsonb,
    миграции `prisma migrate`, vercel.json (регион dub1). Фото — Supabase Storage со сжатием в браузере и на сервере.
21. Версия формата приглашения (semver, `schemaVersion`, текущая `1.0.0` — всё, что было до неё): миграции при чтении и
    записи, слепки формата по версиям, тест-сторож (сам определяет, мажор или минор), 15 фикстур прошлых форматов
    (12 шаблонов + первая версия, удалённые фоны, до аккаунтов). Правило — §4.1.
22. Упрощение редактора (`editor-ux.md`). Этап 1: блок открывается на «Тексте и фото», оформление — на «Виде»,
    тонкие настройки свёрнуты, недействующие скрыты. Этап 2: украшения — миниатюры и карточка выбранного.
    Этап 3: готовые стили фона блока в один клик. Этап 4: «Оформление» — свёрнутые разделы со сводками.
    Этап 5: нажатие на блок в превью открывает его, открытый блок подсвечен заливкой цвета шаблона.
    Этап 6: сводки под названиями блоков и «Что осталось заполнить». Этап 7 (на пробу): телефонный режим — превью
    на весь экран и панель-шторка. Коммит `ux-v1` (ветка `ux-v1`) — состояние до переделки.
23. Аудит по правилам ui-ux-pro-max (ветка `ui-ux-pro-max-skill`): главная — два столбца карточек на телефоне, вся
    карточка нажимается, три шага сценария; редактор — «Поделиться», шторка без дубля вкладок и со свайпом, крупные
    зоны нажатия; ответы гостей — карточки на телефоне; 403 с выходом на главную; поля ≥ 16 px; safe-area.
