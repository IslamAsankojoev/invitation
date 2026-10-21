# Базы, деплой, продакшен

> Раздел контекста проекта для ИИ-ассистента. Корень и правила — [`AGENTS.md`](../../AGENTS.md); код — источник истины.

## Базы и деплой

**Базы.** Прод — Supabase (`eu-west-1`, Data API выключен, RLS включён; Prisma ходит как владелец). Строки
подключения прода — в `.env.supabase` (в .gitignore) и в переменных Vercel: `DATABASE_URL` через пулер (6543,
`pgbouncer=true`), `DIRECT_URL` — прямое (5432) для миграций; `SUPABASE_URL` + `SUPABASE_SECRET_KEY` — хранилище фото
(публичный бакет `uploads`, только картинки ≤ 5 МБ; запись — секретным ключом только с сервера). `.env` указывает на локальный Docker — разработка и
тесты **никогда** не ходят в Supabase (тесты чистят таблицы). Vercel: `vercel-build` = `prisma migrate deploy && next
build`, регион функций `dub1` (vercel.json) — рядом с базой. Старый `prisma/dev.db` (SQLite) больше не используется.

## CI (GitHub Actions)

- Файл — `.github/workflows/ci.yml`, запуск на каждый `push` и `pull_request`. Деплой остаётся на Vercel
  (`vercel-build`), CI его не трогает. E2E (Playwright) в CI пока нет — следующий шаг.
- Джоб `typecheck + tests` (ubuntu-latest, Node 20, кэш npm): `npm ci` (postinstall — `prisma generate`) →
  `npm run typecheck` → `npm test`. Postgres 16 — service-контейнер на `localhost:5433`, `postgres/postgres`, база
  `wedding_test` (как ждут `vitest.config.ts` и `tests/global-setup.ts`, он же применяет миграции).
- В `env` — только строки подключения к этой тестовой базе. Секретов и строк Supabase в workflow нет и не должно быть.
  Ключи (`ADMIN_KEY`, `SHOWCASE_KEY`, `SITE_URL`, `VERCEL`) тесты задают сами; `AUTH_GOOGLE_*` в CI не задавать —
  включится вход, и сценарии по token упрутся в «Войдите».
- Ничего, кроме Postgres, тестам не нужно: сеть мокается (шрифты Google для превью — с запасным путём без сети),
  ffmpeg и браузер не запускаются (очередь видео — с подменённым запуском), файлы вне git не читаются.
- Защита ветки `main` (настраивается в GitHub руками): обязательные статусы `typecheck + tests` и Vercel.
- CI красный — как воспроизвести и что делать: `docs/agents/tests.md`, «CI».

**Уже сделано:** деплой на Vercel (`vercel-build` = `prisma generate && prisma migrate deploy && next build`, регион
`dub1`), аналитика (`/stats`, `docs/agents/analytics.md`). Проверь, что в переменных Vercel задан `SITE_URL` — адрес
сайта для превью ссылок (`lib/siteUrl.ts`; без него — хост запроса).

**Не сделано:** фикстуры реальных приглашений (снимки из прода в `tests/fixtures/invitations`), бэкапы (pg_dump по
расписанию) и пинг против засыпания бесплатного Supabase, rate limit в Redis (сейчас в памяти), чистка
неиспользуемых файлов, CAPTCHA.

**Лицензии:** картинки из `new-sources/` (pngwing.com) встроены, но их лицензии **не куплены** — статус
«уточняется» в `public/library/CREDITS.md`. Подробности и итог разбора — `new-sources.md`.
Встроенные песни (`public/music/`: Lady Gaga & Bruno Mars, Ed Sheeran, Christina Perri, Elvis Presley, Bruno Mars,
Jax 02.14, Indila, Temirlan & Yernat, Ордо Сахна, Yann Tiersen, Gibran Alcocer, Joe Hisaishi) — коммерческие
записи; права на публичное воспроизведение на сайте **не оформлены**.
