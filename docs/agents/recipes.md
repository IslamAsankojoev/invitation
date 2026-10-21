# Рецепты

> Раздел контекста проекта для ИИ-ассистента. Корень и правила — [`AGENTS.md`](../../AGENTS.md); код — источник истины.

- **Любая правка формата приглашения** (поле, список значений, тип блока, вид, фон, шрифт, палитра): + версия по
  `docs/agents/data-model.md` («Версия формата») — `SCHEMA_VERSION`, при мажоре миграция, `npm run schema:snapshot`, `npm test`.
- **Новый тип блока:** схема (`...blockBase`, `variant`, `BLOCK_VARIANTS`) → `blockLabels` + `defaultTitles` +
  `blockDescriptions` → `variantLabels`, `premiumVariants` → компонент в `invitation/blocks` через
  `<Section block={block}>` (+ `textStyle(block, key)`) + `registry.ts` → поля в `BlockFields.tsx` → пример в
  `sampleBlock()` (`templates.ts`) → иконка и место в `AddBlockDialog` → тесты (`Variants.test.tsx` подхватит виды сам).
  Одиночный тип — в `SINGLE_BLOCK_TYPES`. Это изменение формата — минорная версия (`docs/agents/data-model.md` («Версия формата»)).
- **Правка шаблона в админке** (`docs/agents/admin.md`): закоммить `src/lib/template-overrides.json`, новые файлы `public/templates/` и
  строки CREDITS.md; `npm test` — тесты, завязанные на содержимое конкретных шаблонов (имена, виды, цвета полос), после
  правок может понадобиться обновить. Перенести правку в код (templates.ts) и «Сбросить изменения» — по желанию.
- **Новый шаблон:** объект в `baseTemplates` (`theme`, `blocks`, `dresscodeColors`, по желанию `layout` — своя структура:
  блоки по порядку с примером текстов, фото и оформлением). Палитра шаблона не должна повторяться (тест), шрифт может.
  Если меняешь число шаблонов — поправь тест «их тринадцать»; `seed.ts` подхватит автоматически.
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
- **Новая подпись на странице гостя:** поле в `GuestText` (lib/i18n.ts) на обоих языках → `guestText(...)` в компоненте.
- **Новый пример текста в шаблоне:** кыргызская версия — строка в `templateCopyKy.ts` (тест «у каждого примера текста
  есть кыргызская версия» напомнит). Новый тип события — `EVENT_TYPES` + `eventCopy`, `eventTypeLabels`, `namesLabels`,
  при желании `titleOverrides` и `EVENT_FILTERS` (это формат — минорная версия).
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
