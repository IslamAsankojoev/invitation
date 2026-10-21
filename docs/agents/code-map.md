# Карта кода

> Раздел контекста проекта для ИИ-ассистента. Корень и правила — [`AGENTS.md`](../../AGENTS.md); код — источник истины.

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
  i/[slug]/layout.tsx       метаданные превью ссылки (title, description, openGraph, metadataBase) — `docs/agents/invitation.md`
  i/[slug]/opengraph-image.tsx  картинка превью ссылки 1200×630 (next/og → JPEG) — `docs/agents/invitation.md`
  edit/[id]/page.tsx        редактор (server, проверка token → forbidden()) → <Editor>
  edit/[id]/guests/page.tsx ответы гостей: статистика, таблица, CSV (server)
  my/page.tsx               «Мои приглашения» (только при включённом входе)
  admin/[key]/page.tsx      скрытая админка (только локально, `docs/agents/admin.md`): шаблоны и видео
  admin/[key]/templates/[id]/page.tsx  правка шаблона: черновик tpl-<id> в обычном редакторе
  api/admin/[key]/…         templates/[id] (PUT/PATCH/POST/DELETE), …/draft, videos (GET/POST), videos/[name], jobs/[id]
  edit/[id]/claim/route.ts  GET «Сохранить в аккаунт»: привязать по token, редирект в редактор с ?saved=
  api/auth/[...nextauth]    Auth.js
  forbidden.tsx             403
  api/invitations/route.ts            POST создать (body {template?})
  api/invitations/[key]/route.ts      GET/PATCH/DELETE по id
  api/invitations/[key]/rsvp/route.ts POST/PATCH по slug (гость: ответ / правка своего), GET по id (организатор, token)
  api/upload/route.ts                 POST multipart file
  api/events/route.ts                 POST событие аналитики из браузера (lib/beacon.ts), 204
  stats/[key]/page.tsx                скрытая статистика (STATS_KEY): воронка, разбивка по шаблонам/событию/языку
  api/edges/torn/route.ts             GET полоса рваного края по зерну (webp, кэш в памяти + вечный HTTP-кэш)
src/lib/                    логика без UI, покрыта unit-тестами
  schema.ts       ★ Zod-схема InvitationData — единственный источник типов и валидации
  migrations.ts   ★ SCHEMA_VERSION (semver формата приглашения), migrations, migrateInvitation — см. `docs/agents/data-model.md` («Версия формата»)
  schemaDiff.ts   слепок формата (JSON Schema) и сравнение слепков → какую часть версии поднять (только тесты/скрипт)
  schema-history/ слепки формата по версиям (1.0.0.json…) — не редактировать руками, только npm run schema:snapshot
  variants.ts     подписи видов блоков, появления, стилей анимаций, видов заставки, иконок программы
  premium.ts      какие элементы платные (PRO) и premiumUsage(data) — список использованных
  templates.ts    ★ 18 шаблонов (у новых — своя структура layout), createFromTemplate, applyTemplate, createBlock;
                  `templates` = baseTemplates (код) + правки из template-overrides.json (mergeTemplates)
  template-overrides.json  правки шаблонов из админки (пишет adminFiles.ts, руками не править) — коммитить
  admin.ts adminFiles.ts templateAdmin.ts templateDrafts.ts videoJobs.ts — скрытая админка (`docs/agents/admin.md`)
  defaults.ts     createDefaultInvitation() = первый шаблон в коде (не первый на главной — порядок меняют в админке)
  blocks.ts       чистые функции над блоками и украшениями, названия/заголовки блоков
  theme.ts        палитры, шрифты → CSS-переменные (themeStyle), headingsMode
  color.ts        яркость и смешивание #rrggbb (цвет фона блока, образцы в редакторе)
  library.ts      каталог картинок, фоны блоков, текстуры (CSS/SVG)
  decor.ts        реестр падающего декора (canvas)
  ornaments.ts    позиционирование украшений
  edges.ts        края блока: формы, маски, зёрна;  tornEdge.ts — генератор рваного края по зерну
  calendar.ts     сетка месяца, «07 . 11 . 2026», монограмма, splitNames
  session.ts      authEnabled() (заданы AUTH_GOOGLE_ID/SECRET), currentUser() — в тестах подменяется
  access.ts       canEdit (token или владелец), ownershipOf, claimDecision, accountGate/shareGate — чистые правила доступа
  i18n.ts         ★ подписи страницы гостя на ru/ky (guestText), FONTS_WITHOUT_KYRGYZ — см. `docs/agents/invitation.md` («Событие и язык гостя»)
  copy.ts         примеры текстов по событию и языку (eventCopy), заголовки по умолчанию (defaultTitle), подписи событий
  localize.ts     applyCopy — смена события/языка: нетронутые примеры заменяются или переводятся
  templateCopyKy.ts  кыргызские версии примеров текстов шаблонов (новый пример в шаблоне — строка сюда, тест сверит)
  analytics.ts    события и воронка (чистые функции); track.ts — запись в Event и loadStats; beacon.ts — отправка из браузера
  share.ts        ссылка из имён (транслит рус./кырг., slugSuggestions), текст сообщения гостям, ссылки WhatsApp/Telegram
  music.ts        встроенные песни, DEFAULT_MUSIC_URL, findTrack, флаг CUSTOM_MUSIC_ENABLED (своя музыка выключена)
  images.ts       optimizeImage: sharp → поворот по EXIF, ≤ 1600 px, WebP, без метаданных (GIF — анимированный WebP)
  storage.ts      Storage: LocalStorage (public/uploads) или SupabaseStorage (@supabase/storage-js) — по наличию ключей
  history.ts      история правок редактора (отменить/повторить)
  setup.ts        форма «Главное о событии» при выборе шаблона: setupSchema, applySetup
  rsvpMemory.ts   ответ гостя в его localStorage (`rsvp:<slug>`: id, секрет, ответ); rsvpSecret.ts — секрет и его sha256 (сервер)
  ogImage.ts      картинка превью: шрифты Google Fonts по буквам (`text=`), фото обложки (только свои файлы), кегль имён
  siteUrl.ts      адрес сайта для метаданных: SITE_URL или хост запроса
  countdown.ts ics.ts slug.ts rsvp.ts upload.ts storage.ts rateLimit.ts invitations.ts db.ts utils.ts
src/components/
  ui/             shadcn-компоненты (принадлежат проекту, их можно править)
  invitation/     то, что видит гость (+ превью в редакторе) — БЕЗ shadcn, свой дизайн
                  motion.tsx — режим анимаций (контекст) и появление при прокрутке; burst.ts — салют после RSVP
  editor/         редактор на shadcn
  templates/      TemplatePreview, TemplateGallery
  account/        AccountMenu (Войти / аватар → «Мои приглашения», «Выйти»), SignInButton, DeleteInvitationButton
  admin/          скрытая админка: AdminDashboard (шапка, ход записи, вкладки), AdminTemplates, AdminVideos,
                  RecordDialog, TemplateEditor (Editor с templateMode), api.ts
tests/unit, tests/components, tests/api, tests/e2e, tests/fixtures/test.mp3
tests/fixtures/invitations/ замороженные приглашения прошлых форматов (<версия>-<имя>.json) — только добавлять
```
