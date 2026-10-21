# Модель данных (`src/lib/schema.ts`) и версия формата

> Раздел контекста проекта для ИИ-ассистента. Корень и правила — [`AGENTS.md`](../../AGENTS.md); код — источник истины.

Приглашение хранится одним JSON-полем `Invitation.data` (jsonb) и **всегда** проходит `invitationDataSchema` при чтении
(`lib/invitations.ts → fromRow`) и записи (PATCH). Тип `InvitationData = z.infer<…>` (выходной тип: поля с
`.default()` в нём обязательны).

```
InvitationData
├─ eventType: wedding | kyz-uzatuu | birthday | jubilee | beshik-toi | tushoo-kesuu | sunnet-toi | party  (2.5.0, `docs/agents/invitation.md` («Событие и язык гостя»))
├─ language: ru | ky   язык страницы гостя (2.5.0); редактор всегда русский
├─ theme
│  ├─ palette: cream | blush | emerald | ivory | autumn | night | lavender | noir | navy | mocha | pearl | sand | forest | burgundy
│  │           | felt | sky | tunduk | beshik | neon
│  ├─ font: 17 шрифтов имён (script=Great Vibes, serif=Cormorant, sans=Inter, marck, bad-script, caveat, lobster,
│  │        pacifico, amatic, playfair, prata, forum, yeseva, cormorant-sc, oranienbaum, poiret, comfortaa)
│  ├─ bodyFont: auto | cormorant | lora | eb-garamond | playfair | old-standard | pt-serif | montserrat | raleway | manrope | inter
│  ├─ background: url | null            фоновое фото страницы
│  ├─ backgroundMode: stretch | fixed | parallax   как ведёт себя фон (по умолчанию stretch — как до 1.1.0)
│  ├─ backgroundDim 0–0.9               приглушение фона цветом --bg (по умолчанию 0.7)
│  ├─ backgroundColor: #hex | null      свой цвет фона страницы (null — палитра); другая яркость «переворачивает» тему —
│  │                                    `themePalette(theme)` в lib/theme.ts: текст = фон палитры, акцент к контрасту
│  ├─ texture: none | halftone | speckle | grain | linen | grid | diagonal | hearts | diamonds | flourish | stars | watercolor | plaster | paper
│  ├─ decor: { type: none|image|petals|sakura|confetti|snow, image: url|null, color: #hex, density 0–60, size 0.5–3,
│  │           speed 0.3–3, pop?: boolean (мини-игра; не задано = включено) }
│  ├─ envelope: { ornament: url|null, style: seal|veil|flap|curtains|book|video, video?: url|null, poster?: url|null }
│  │           картинка в углах, вид заставки; у video — ролик открытия и его первый кадр (нет — DEFAULT_ENVELOPE_VIDEO)
│  ├─ headings: caps | names          заголовки блоков: капитель Tenor Sans или шрифтом имён (см. `docs/agents/invitation.md` («Виды блоков…»))
│  ├─ motion: { style: elegant|soft|playful|cinematic|none, speed 0.5–2 }  стиль и скорость анимаций
│  └─ ornamentMotion: OrnamentMotion   анимация всех украшений без своей (см. `docs/agents/invitation.md` («Анимации»))
├─ music: { url | null, loop, start 0–3600 с, end: с | null }  фрагмент песни (lib/musicFragment.ts; null — до конца)
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
               rotate −180..180, flip, opacity 0.1–1, motion?: OrnamentMotion (нет — общая theme.ornamentMotion),
               seam?: boolean — «Как переход между блоками»: у мест сверху/снизу центр на краю блока, рисуется
               слоем SeamOrnaments (Section.tsx) в обёртке блока поверх соседей (z-30), без обрезки и до 100% ширины;
               переход размера 400 (максимум) — ровно во всю ширину блока (волна-разделитель не обрывается у краёв) }
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
мажорная версия и миграция (`docs/agents/data-model.md` («Версия формата»)).

## Версия формата приглашения (semver) — смотреть при КАЖДОЙ правке schema.ts

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
7. Строка в «История решений» (`docs/agents/history.md`): версия и что изменилось.

**Как работает:** `invitationDataSchema = z.preprocess(migrateInvitation, invitationDataObject)` — каждое чтение
(`lib/invitations.ts`) и запись (PATCH) сначала прогоняют данные через миграции новее их версии и ставят
`schemaVersion = SCHEMA_VERSION`, потом проверяют схемой. В базе данные «догоняют» формат при следующем сохранении.
Данные из будущей версии (откат деплоя) не трогаются. Новое приглашение (`createFromTemplate`) сразу с текущей
версией. Сравнение версий — числами (`compareSemver`: 1.10.0 новее 1.9.0).

`title`: `undefined` → стандартный заголовок (`defaultTitles` в `blocks.ts`), `""` → без заголовка.
