# AGENTS.md — контекст проекта для ИИ-ассистента

> Этот файл — «передача дел». Прочитай его целиком перед любой задачей, а затем — разделы `docs/agents/` по теме
> задачи (таблица в §3): там описано, **как** устроена каждая часть, **почему** приняты решения и **где** лежат
> подводные камни. Подробности для людей — в `README.md`. Код — источник истины: если документ и код расходятся,
> верь коду и обнови документ.

> ⚠️ **Правило версии формата.** Меняешь формат приглашения (`src/lib/schema.ts` — любые поля, списки значений,
> границы, значения по умолчанию) — **в том же изменении** подними `SCHEMA_VERSION` в `src/lib/migrations.ts`
> (минор — добавили, мажор — сломали + миграция), запусти `npm run schema:snapshot` и `npm test`. Подробно — `docs/agents/data-model.md` («Версия формата»).
> Тест-сторож `tests/unit/schemaVersion.test.ts` не пропустит изменение формата без версии.


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
npm run schema:snapshot # слепок формата приглашения для текущей SCHEMA_VERSION (после изменения схемы, `docs/agents/data-model.md` («Версия формата»))
npm test             # unit + компоненты + API (Vitest), база wedding_test
npm run test:e2e     # Playwright, Pixel 7, свой dev-сервер :3100, база wedding_e2e, сборка в .next-e2e
npm run typecheck
```

**Базы и деплой:** прод — Supabase + Vercel, локально и в тестах — Docker; тесты **никогда** не ходят в Supabase.
Подробно — `docs/agents/infra.md`.

Перед сдачей задачи всегда: `npx tsc --noEmit`, `npm test`, `npm run test:e2e`; для крупных правок ещё
`NEXT_DIST_DIR=.next-build npx next build` (отдельная папка, чтобы не мешать запущенному dev-серверу; после сборки
верни `tsconfig.json`/`next-env.d.ts`, Next дописывает туда `.next-build/types`).

Если порт 3000 занят другим dev-сервером — в `.claude/launch.json` есть `dev-3200` (своя папка `.next-3200`).

Тестовая база `wedding_test` общая: две сессии, запустившие `npm test` одновременно, стирают друг другу данные —
случайные 404/«No record was found» в API-тестах. Перезапусти, когда другой прогон закончится.

## 3. Где подробности (`docs/agents/`)

Этот файл — короткий корень: он попадает в контекст каждой сессии. Подробности разложены по темам —
**открой нужный файл, прежде чем менять соответствующую часть**. Меняешь поведение — обнови его описание в том же
файле и добавь строку в историю решений.

| Файл | Что внутри | Читай, когда |
|---|---|---|
| [`code-map.md`](docs/agents/code-map.md) | карта папок и модулей | ищешь, где что лежит |
| [`data-model.md`](docs/agents/data-model.md) | `InvitationData`, поля блоков, **правило версии формата** | любая правка `schema.ts`, данных приглашения |
| [`templates.md`](docs/agents/templates.md) | шаблоны, `createFromTemplate`, `applyTemplate`, главная | шаблоны, галерея, выбор шаблона |
| [`invitation.md`](docs/agents/invitation.md) | страница гостя, конверт, блоки, темы, шрифты, анимации, виды блоков, фоны, края, PRO, событие и язык гостя | всё, что видит гость (и превью), переводы |
| [`editor.md`](docs/agents/editor.md) | редактор: панели, превью, автосохранение, телефонный режим | правки редактора |
| [`admin.md`](docs/agents/admin.md) | скрытый показ `/showcase`, админка: правка, порядок и публикация шаблонов, видео | показ, админка, ролики |
| [`infra.md`](docs/agents/infra.md) | базы (Supabase/Docker), Vercel, что осталось до продакшена, лицензии | базы, деплой, переменные окружения, перед релизом |
| [`api.md`](docs/agents/api.md) | доступ по token и аккаунту, API, upload, RSVP | API, права, загрузки |
| [`analytics.md`](docs/agents/analytics.md) | таблица `Event`, события воронки, `/stats` | аналитика, статистика |
| [`pitfalls.md`](docs/agents/pitfalls.md) | грабли, на которые уже наступали | непонятное поведение, перед крупной правкой |
| [`tests.md`](docs/agents/tests.md) | что и где покрыто тестами | пишешь или чинишь тесты |
| [`recipes.md`](docs/agents/recipes.md) | пошагово: новый блок, шаблон, фон, шрифт, палитра, картинка… | добавляешь новое по образцу |
| [`history.md`](docs/agents/history.md) | история решений и версий формата | «почему так сделано», запись итогов задачи |

Текущие планы и где мы сейчас — `next-blocks.md` (блоки и шаблоны), `product-strategy.md` (продукт), `editor-ux.md`
(упрощение редактора).

## 4. Соглашения

- Логика — в `src/lib` чистыми функциями, **не мутирующими** вход; на каждую — unit-тест.
- Реестры с исчерпывающими типами: `blockComponents`, `blockFields` (`{ [K in BlockType]: … }`), `decorDrawers`,
  `titleFonts`, `bodyFonts`, `textures`, `palettes` — TypeScript сам укажет, что забыли зарегистрировать.
- Тексты UI и комментарии в коде — на русском, идентификаторы — на английском. Стиль комментариев — краткое «зачем».
- Доступность — часть контракта и опора тестов: подписи через `htmlFor`/`aria-label`, `Slider thumbLabel`
  (наш патч shadcn-слайдера), `role`-ы Radix. Тесты ищут элементы по ролям и подписям — не ломай их.
- Тема сайта (светлая/тёмная, кнопка с «волной») — `docs/agents/editor.md`. В редакторе не пиши жёсткие светлые
  цвета (`bg-white`, `text-emerald-700`) без `dark:`-пары; QR — на белом специально.
- Редактор/приложение — shadcn-компоненты и токены (`bg-muted`, `text-muted-foreground`, `ring-ring`…);
  приглашение — только `inv-*` и переменные палитры. Не смешивай.
- Выпадающие списки — `NativeSelect` (нативный select: мобильным удобнее, Playwright `selectOption` работает).
- UX-правила (скилл ui-ux-pro-max, ветка `ui-ux-pro-max-skill`): поля на телефоне ≥ 16 px (иначе iOS приближает
  страницу при фокусе), зоны нажатия на сенсорных экранах ≥ 40 px (`pointer-coarse:size-10`), у иконки-кнопки —
  `aria-label`, у декоративной иконки — `aria-hidden`, одно главное действие на экран, у пустого состояния и ошибки —
  действие «что дальше», `motion-reduce:` для переходов. Копирование — общий `components/CopyButton.tsx` (объявляет
  «Скопировано» через `role="status"`). `viewport-fit=cover` в layout — без него `env(safe-area-inset-*)` всегда 0.
- Добавить shadcn-компонент: `npx shadcn@latest add <имя> -y < /dev/null` (иначе CLI ждёт ввода).

## 5. Главное из подводных камней

Полный список — [`docs/agents/pitfalls.md`](docs/agents/pitfalls.md). Чаще всего ломается:

- Prisma `migrate reset`/`db push --force-reset` — только с согласия пользователя; тестовые базы не сбрасывать (п. 10).
- `next build` — только в `NEXT_DIST_DIR=.next-build`, иначе ляжет запущенный `npm run dev` (п. 22).
- Не запускать prettier на существующих файлах: конфига нет, код под 120 символов (п. 17).
- `--accent` внутри приглашения — цвет палитры, снаружи — токен shadcn; не объявлять его в `:root` (п. 1).
- Порядок и публикацию шаблонов меняют в админке — тесты не должны зависеть от `templates[0]` (умолчание —
  первый шаблон в коде, `createDefaultInvitation`).

## 6. Для продакшена

Что уже сделано, что нет и что с лицензиями на картинки и песни — `docs/agents/infra.md`.
