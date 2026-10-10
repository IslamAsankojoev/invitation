"use client";

import { useId, type ComponentType, type ReactNode } from "react";
import { Ban, Flower, Flower2, Image as ImageIcon, PartyPopper, Play, Snowflake } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { TextureLayer } from "@/components/invitation/TextureLayer";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { findBlock } from "@/lib/blocks";
import { splitNames } from "@/lib/calendar";
import { decorShortLabels, densityLevel, densityLevelLabels, densityOf, type DensityLevel } from "@/lib/decor";
import { textureLabels } from "@/lib/library";
import {
  BODY_FONTS,
  DECOR_TYPES,
  ENVELOPE_STYLES,
  FONTS,
  HEADINGS,
  MOTION_STYLES,
  PALETTES,
  TEXTURES,
  type DecorType,
  type InvitationData,
  type Theme,
} from "@/lib/schema";
import { premiumEnvelopeStyles, premiumFonts, premiumMotionStyles } from "@/lib/premium";
import { bodyFonts, isScriptFont, palettes, titleFonts } from "@/lib/theme";
import { backgroundModeLabels, envelopeStyleLabels, headingsLabels, motionStyleLabels } from "@/lib/variants";
import { cn } from "@/lib/utils";
import { LabeledSlider } from "./BlockStyle";
import { FineTuning, LibraryImageField, ProBadge, Segmented, UploadField } from "./controls";
import { OrnamentMotionFields } from "./OrnamentMotionFields";
import { FontSelect } from "./FontSelect";
import { TemplatePicker } from "./TemplatePicker";
import { guessTemplate } from "@/lib/templates";

/** Плитка выбора (палитра, шрифт, текстура): выбранная подсвечена цветом primary. */
const tile =
  "rounded-lg border bg-card text-card-foreground outline-none transition hover:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-primary aria-pressed:ring-2 aria-pressed:ring-primary/25";

type Props = {
  data: InvitationData;
  onChange: (data: InvitationData) => void;
  /** Показать заставку поверх превью. */
  onPreviewIntro?: () => void;
};

/** Заголовок раздела: название слева, выбранное значение справа (видно, не раскрывая раздел). */
function SectionTrigger({ title, summary, extra }: { title: string; summary: string; extra?: ReactNode }) {
  return (
    <AccordionTrigger className="items-center gap-3 py-3.5 hover:no-underline">
      <span className="font-medium">{title}</span>
      <span className="ml-auto flex min-w-0 items-center gap-2 text-xs font-normal text-muted-foreground">
        {extra}
        <span className="truncate">{summary}</span>
      </span>
    </AccordionTrigger>
  );
}

const decorIcons: Record<DecorType, ComponentType<{ className?: string }>> = {
  none: Ban,
  petals: Flower,
  sakura: Flower2,
  confetti: PartyPopper,
  snow: Snowflake,
  image: ImageIcon,
};

/**
 * «Оформление» — свёрнутые разделы, как список блоков (editor-ux.md §4.5): в заголовке видно выбранное, порядок —
 * от понятного к тонкому, точные числа и редкие настройки — в «Тонкой настройке» внутри раздела.
 */
/** Подсказка под выбором поведения фона. */
const backgroundModeHints = {
  parallax: "Фон медленно сдвигается при прокрутке — красиво с тканью или пейзажем",
  fixed: "Фон стоит на месте, содержимое едет поверх него",
  stretch: "Фото растянуто на всю высоту страницы и прокручивается вместе с ней",
} as const;

export function ThemePanel({ data, onChange, onPreviewIntro }: Props) {
  const { theme } = data;
  const set = (patch: Partial<Theme>) => onChange({ ...data, theme: { ...theme, ...patch } });
  const setDecor = (patch: Partial<Theme["decor"]>) => set({ decor: { ...theme.decor, ...patch } });
  const setMotion = (patch: Partial<Theme["motion"]>) => set({ motion: { ...theme.motion, ...patch } });
  const setOrnamentMotion = (patch: Partial<Theme["ornamentMotion"]>) => set({ ornamentMotion: { ...theme.ornamentMotion, ...patch } });
  const palette = palettes[theme.palette];
  // Образец для шрифтов — первое имя из приглашения.
  const sampleName = splitNames(findBlock(data, "hero")?.names ?? "Анна")[0].split(" ")[0] || "Анна";
  const colorId = useId();
  const popId = useId();
  const decorOn = theme.decor.type !== "none";

  return (
    <Accordion type="single" collapsible className="rounded-xl border bg-card px-4">
      <AccordionItem value="template">
        <SectionTrigger title="Шаблон" summary={guessTemplate(theme)?.name ?? "Свой"} />
        <AccordionContent>
          <TemplatePicker data={data} onChange={onChange} />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="colors">
        <SectionTrigger
          title="Цвета"
          summary={palette.label}
          extra={
            <span className="flex" aria-hidden>
              {[palette.bg, palette.accent, palette.text].map((c, i) => (
                <span key={i} className="-ml-1 size-3.5 rounded-full ring-2 ring-card first:ml-0" style={{ background: c }} />
              ))}
            </span>
          }
        />
        <AccordionContent>
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Палитра">
            {PALETTES.map((p) => (
              <button key={p} type="button" aria-pressed={theme.palette === p} onClick={() => set({ palette: p })} className={cn(tile, "p-1.5 text-xs")}>
                <span className="mb-1.5 flex h-7 overflow-hidden rounded-md ring-1 ring-foreground/10" aria-hidden>
                  <span className="flex-1" style={{ background: palettes[p].bg }} />
                  <span className="flex-1" style={{ background: palettes[p].accent }} />
                  <span className="flex-1" style={{ background: palettes[p].text }} />
                </span>
                {palettes[p].label}
              </button>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="fonts">
        <SectionTrigger title="Шрифты" summary={titleFonts[theme.font].label} />
        <AccordionContent className="flex flex-col gap-4">
          <FontSelect
            label="Шрифт имён"
            ariaPrefix="Шрифт имён"
            sample={sampleName}
            value={theme.font}
            options={FONTS.map((f) => ({ value: f, label: titleFonts[f].label, css: titleFonts[f].css, scale: titleFonts[f].scale, premium: premiumFonts.includes(f) }))}
            onChange={(font) => set({ font })}
          />
          <FieldDescription className="-mt-2">Шрифт текста подбирается к нему сам — поменять можно в «Тонкой настройке».</FieldDescription>
          <FineTuning>
            <FontSelect
              label="Шрифт текста"
              ariaPrefix="Основной шрифт"
              sample="Ждём вас с радостью"
              value={theme.bodyFont}
              options={BODY_FONTS.map((f) => {
                // «Авто» показывает, какой шрифт подобран к шрифту имён.
                const key = f === "auto" ? titleFonts[theme.font].pair : f;
                return { value: f, label: f === "auto" ? `Авто · ${bodyFonts[key].label}` : bodyFonts[key].label, css: bodyFonts[key].css };
              })}
              onChange={(bodyFont) => set({ bodyFont })}
            />
            <Segmented
              label="Заголовки блоков"
              value={theme.headings}
              options={Object.fromEntries(HEADINGS.map((h) => [h, headingsLabels[h]])) as Record<Theme["headings"], string>}
              onChange={(headings) => set({ headings })}
            />
            {theme.headings === "names" && (
              <FieldDescription className="-mt-2">
                {isScriptFont(theme.font) ? "Рукописные заголовки; строка под заголовком — капителью." : "Заголовки капителью шрифтом имён."}
              </FieldDescription>
            )}
          </FineTuning>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="intro">
        <SectionTrigger title="Заставка" summary={envelopeStyleLabels[theme.envelope.style]} />
        <AccordionContent className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Вид заставки">
            {ENVELOPE_STYLES.map((e) => (
              <button
                key={e}
                type="button"
                aria-pressed={theme.envelope.style === e}
                aria-label={`Заставка ${envelopeStyleLabels[e]}`}
                onClick={() => {
                  set({ envelope: { ...theme.envelope, style: e } });
                  onPreviewIntro?.();
                }}
                className={cn(tile, "relative flex flex-col items-center gap-1 px-1 pt-2 pb-1.5 text-xs")}
              >
                <EnvelopeIcon style={e} />
                {envelopeStyleLabels[e]}
                {premiumEnvelopeStyles.includes(e) && <ProBadge className="absolute top-1 right-1" />}
              </button>
            ))}
          </div>
          {onPreviewIntro && (
            <Button type="button" variant="outline" size="sm" className="self-start" onClick={onPreviewIntro}>
              <Play /> Посмотреть заставку
            </Button>
          )}
          <LibraryImageField
            label="Украшение конверта"
            value={theme.envelope.ornament}
            categories={["flowers", "botanical", "leaves", "accents"]}
            onChange={(ornament) => set({ envelope: { ...theme.envelope, ornament } })}
          />
          <FieldDescription className="-mt-2">Появится в правом верхнем и левом нижнем углу первого экрана.</FieldDescription>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="decor">
        <SectionTrigger title="Падающий декор" summary={decorShortLabels[theme.decor.type]} />
        <AccordionContent className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Падающий декор">
            {DECOR_TYPES.map((t) => {
              const Icon = decorIcons[t];
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={theme.decor.type === t}
                  aria-label={`Декор ${decorShortLabels[t]}`}
                  // Для «Картинки» сразу подставляем лепесток, чтобы декор был виден без лишнего шага.
                  onClick={() => setDecor(t === "image" && !theme.decor.image ? { type: t, image: "/library/petal-red.webp" } : { type: t })}
                  className={cn(tile, "flex flex-col items-center gap-1 px-1 py-2 text-xs")}
                >
                  <Icon className="size-5 text-muted-foreground" />
                  {decorShortLabels[t]}
                </button>
              );
            })}
          </div>
          {theme.decor.type === "image" && (
            <LibraryImageField
              label="Картинка частиц"
              value={theme.decor.image}
              categories={["particles", "foliage", "flowers", "leaves"]}
              onChange={(image) => setDecor({ image })}
            />
          )}
          {decorOn && (
            <Segmented<DensityLevel>
              label="Сколько"
              value={densityLevel(theme.decor.density) ?? ("" as DensityLevel)}
              options={densityLevelLabels}
              onChange={(level) => setDecor({ density: densityOf(level) })}
            />
          )}
          {decorOn && (
            <FineTuning>
              {theme.decor.type !== "image" && (
                <Field orientation="horizontal" className="w-fit">
                  <input
                    id={colorId}
                    type="color"
                    className="size-8 cursor-pointer overflow-hidden rounded-md border [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch-wrapper]:p-0"
                    value={theme.decor.color}
                    onChange={(e) => setDecor({ color: e.target.value })}
                  />
                  <FieldLabel htmlFor={colorId}>Цвет декора</FieldLabel>
                </Field>
              )}
              <div className="grid grid-cols-2 gap-4">
                <LabeledSlider
                  label="Плотность"
                  ariaLabel="Плотность декора"
                  valueLabel={String(theme.decor.density)}
                  value={theme.decor.density}
                  min={0}
                  max={60}
                  step={1}
                  onChange={(density) => setDecor({ density })}
                />
                <LabeledSlider
                  label="Размер"
                  ariaLabel="Размер декора"
                  valueLabel={`×${theme.decor.size.toFixed(1)}`}
                  value={theme.decor.size}
                  min={0.5}
                  max={3}
                  step={0.1}
                  onChange={(size) => setDecor({ size: Math.round(size * 10) / 10 })}
                />
                <LabeledSlider
                  label="Скорость"
                  ariaLabel="Скорость декора"
                  valueLabel={`×${theme.decor.speed.toFixed(1)}`}
                  value={theme.decor.speed}
                  min={0.3}
                  max={3}
                  step={0.1}
                  onChange={(speed) => setDecor({ speed: Math.round(speed * 10) / 10 })}
                />
              </div>
              <Field orientation="horizontal">
                <Switch id={popId} checked={theme.decor.pop !== false} onCheckedChange={(pop) => setDecor({ pop })} />
                <FieldLabel htmlFor={popId}>Мини-игра: лопаются от касания</FieldLabel>
              </Field>
              <FieldDescription className="-mt-2">Нажмите на частицу — она лопнет конфетти. Попробуйте прямо в превью.</FieldDescription>
            </FineTuning>
          )}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="background">
        <SectionTrigger
          title="Фон страницы"
          summary={`${theme.texture === "none" ? "Без узора" : textureLabels[theme.texture]}${theme.background ? ` · фото, ${backgroundModeLabels[theme.backgroundMode].toLowerCase()}` : ""}`}
        />
        <AccordionContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <FieldLabel>Узор фона</FieldLabel>
            <div className="grid grid-cols-4 gap-2" role="group" aria-label="Текстура">
              {TEXTURES.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={theme.texture === t}
                  aria-label={`Текстура ${textureLabels[t]}`}
                  onClick={() => set({ texture: t })}
                  className={cn(tile, "overflow-hidden text-[10px] text-muted-foreground")}
                >
                  <span className="relative block h-12" style={{ background: palette.bg, ["--accent" as string]: palette.accent }}>
                    <TextureLayer texture={t} dark={palette.dark} />
                  </span>
                  <span className="block truncate px-1 py-1">{textureLabels[t]}</span>
                </button>
              ))}
            </div>
          </div>
          <UploadField label="Фоновое фото" value={theme.background} onChange={(background) => set({ background })} />
          {theme.background && (
            <>
              <Segmented
                label="Как ведёт себя фон"
                value={theme.backgroundMode}
                options={backgroundModeLabels}
                onChange={(backgroundMode) => set({ backgroundMode })}
              />
              <p className="-mt-2 text-xs text-muted-foreground">{backgroundModeHints[theme.backgroundMode]}</p>
              <LabeledSlider
                label="Приглушение"
                ariaLabel="Приглушение фона страницы"
                valueLabel={`${Math.round(theme.backgroundDim * 100)}%`}
                value={theme.backgroundDim}
                min={0}
                max={0.9}
                step={0.05}
                onChange={(v) => set({ backgroundDim: Math.round(v * 100) / 100 })}
              />
            </>
          )}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="motion">
        <SectionTrigger title="Анимации" summary={motionStyleLabels[theme.motion.style].label} />
        <AccordionContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Стиль анимаций">
            {MOTION_STYLES.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={theme.motion.style === m}
                aria-label={`Анимации ${motionStyleLabels[m].label}`}
                onClick={() => setMotion({ style: m })}
                className={cn(tile, "relative px-2.5 py-2 text-left", m === "none" && "col-span-2")}
              >
                {premiumMotionStyles.includes(m) && <ProBadge className="absolute top-1.5 right-1.5" />}
                <span className="block text-sm font-medium">{motionStyleLabels[m].label}</span>
                <span className="block text-[11px] leading-snug text-muted-foreground">{motionStyleLabels[m].hint}</span>
              </button>
            ))}
          </div>
          {theme.motion.style !== "none" && (
            <FineTuning>
              <LabeledSlider
                label="Скорость анимаций"
                ariaLabel="Скорость анимаций"
                valueLabel={
                  theme.motion.speed === 1
                    ? "обычная"
                    : theme.motion.speed < 1
                      ? `быстрее ×${(1 / theme.motion.speed).toFixed(1)}`
                      : `медленнее ×${theme.motion.speed.toFixed(1)}`
                }
                value={theme.motion.speed}
                min={0.5}
                max={2}
                step={0.1}
                onChange={(speed) => setMotion({ speed: Math.round(speed * 10) / 10 })}
              />
              <div className="flex flex-col gap-3">
                <FieldLabel>Анимация украшений</FieldLabel>
                <OrnamentMotionFields value={theme.ornamentMotion} of="всех украшений" onChange={setOrnamentMotion} />
                <FieldDescription>Для всех украшений без своей анимации. Своя — у украшения в блоке: «Вид» → украшение → «Тонкая настройка украшения».</FieldDescription>
              </div>
              <FieldDescription>Как появляется отдельный блок — в его «Виде» → «Тонкая настройка».</FieldDescription>
            </FineTuning>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

/** Схематичная иконка вида заставки для плитки выбора. */
function EnvelopeIcon({ style }: { style: (typeof ENVELOPE_STYLES)[number] }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 48 32" className="h-8 w-12 text-muted-foreground" aria-hidden="true">
      {style === "seal" && (
        <>
          <rect x="4" y="2" width="40" height="28" rx="2" {...common} />
          <circle cx="24" cy="16" r="6" fill="currentColor" opacity=".5" />
        </>
      )}
      {style === "veil" && (
        <>
          <rect x="4" y="2" width="40" height="28" rx="2" {...common} strokeDasharray="3 2" />
          <path d="M8 22 Q24 8 40 22" {...common} opacity=".6" />
        </>
      )}
      {style === "flap" && (
        <>
          <rect x="6" y="8" width="36" height="22" rx="1.5" {...common} />
          <path d="M6 8 L24 22 L42 8" {...common} />
          <path d="M14 8 V3 H34 V8" {...common} opacity=".6" />
        </>
      )}
      {style === "curtains" && (
        <>
          <path d="M4 2 H22 Q17 16 22 30 H4Z" {...common} />
          <path d="M44 2 H26 Q31 16 26 30 H44Z" {...common} />
        </>
      )}
      {style === "book" && (
        <>
          <path d="M24 5 Q14 1 5 4 V29 Q14 26 24 30 Q34 26 43 29 V4 Q34 1 24 5Z" {...common} />
          <path d="M24 5 V30" {...common} />
        </>
      )}
    </svg>
  );
}
