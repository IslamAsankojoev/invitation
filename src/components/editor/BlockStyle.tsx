"use client";

import { Ban, ChevronRight, FlipHorizontal2, Image as ImageIcon, Minus, Palette, Plus, RotateCcw, Shuffle, Sparkles, Trash2, X } from "lucide-react";
import { useId, useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { blockLabels, createOrnament, defaultTitles, MAX_ORNAMENTS } from "@/lib/blocks";
import { blockEdges, blockHasFill, edgeLabels, edgeMaskStyle, edgesVisible, newEdgeSeed, tornPaperStyle, type EdgeSide } from "@/lib/edges";
import { BLOCK_STYLES, blockStyleLabels, blockStylePatch, blockStyleSpec, matchBlockStyle, type BlockStyleId } from "@/lib/blockStyles";
import { isDarkColor, mixHex } from "@/lib/color";
import { FULL_WIDTH_SURFACES, isPanelSurface, ORNAMENT_CATEGORIES, surfaceGroups, surfaceLabels, surfaceLayer, surfaceThumb, takesBgColor } from "@/lib/library";
import { ORNAMENT_SIZE_MAX, ORNAMENT_SIZE_MIN, POSITION_GRID, positionLabels, stepOrnamentSize } from "@/lib/ornaments";
import { premiumSurfaces } from "@/lib/premium";
import {
  EDGES,
  ENTRANCES,
  PHOTO_HEIGHTS,
  type Block,
  type Edge,
  type Entrance,
  type Ornament,
  type OrnamentPosition,
  type PhotoHeight,
  type Surface,
  type Theme,
} from "@/lib/schema";
import { palettes, themeStyle } from "@/lib/theme";
import { entranceLabels, photoHeightLabels } from "@/lib/variants";
import { cn } from "@/lib/utils";
import { AddFieldButton, checker, ImagePicker, ProBadge, Segmented, UploadField } from "./controls";
import { TextStylePicker } from "./TextStylePicker";
import { withTextStyle, type TextKey } from "@/lib/textStyle";
import { OrnamentMotionFields } from "./OrnamentMotionFields";

type Props = {
  block: Block;
  /** Тема — чтобы плитки фона показывали фактуру в цветах палитры. */
  theme: Theme;
  onChange: (patch: Partial<Block>) => void;
  onAddOrnament: (o: Ornament) => void;
  onUpdateOrnament: (index: number, patch: Partial<Ornament>) => void;
  onRemoveOrnament: (index: number) => void;
};

/** Ползунок с подписью и текущим значением. */
export function LabeledSlider({
  label,
  ariaLabel = label,
  valueLabel,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  /** Доступное имя, если видимой подписи мало (например, «Размер украшения 2»). */
  ariaLabel?: string;
  valueLabel: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{valueLabel}</span>
      </div>
      <Slider thumbLabel={ariaLabel} value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}

/** Фон блока: плитки с настоящим образцом фона в цветах палитры приглашения, по группам (одна радиогруппа). */
/** Образец фона: предмет целиком или слой фона в цветах палитры (цвета — из themeStyle выше по дереву). */
function SurfaceSwatch({ surface, className }: { surface: Surface; className?: string }) {
  const layer = surfaceLayer(surface);
  const thumb = surfaceThumb(surface);
  return (
    <span className={cn("relative block", className)} style={{ background: "var(--bg)" }}>
      {thumb ? (
        <img src={thumb} alt="" className="absolute inset-1 h-[calc(100%-0.5rem)] w-[calc(100%-0.5rem)] object-contain" />
      ) : (
        surface !== "plain" && (
          <span
            className={cn("absolute inset-1.5", layer.className, isPanelSurface(surface) && "rounded-md!")}
            // Фактура в плитке — крупнее масштабом, чтобы её было видно на маленьком образце.
            style={{ ...layer.style, ...(layer.style.backgroundRepeat === "repeat" ? { backgroundSize: "160px 160px" } : {}) }}
          />
        )
      )}
    </span>
  );
}

/** Окно со всеми фонами блока по категориям (как у украшений): выбор закрывает окно. */
function SurfaceDialog({
  theme,
  value,
  open,
  onOpenChange,
  onChange,
}: {
  theme: Theme;
  value: Surface;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (s: Surface) => void;
}) {
  const groupOf = (s: Surface) => surfaceGroups.find((g) => g.items.includes(s))?.label ?? surfaceGroups[0].label;
  const [group, setGroup] = useState(groupOf(value));
  const [wasOpen, setWasOpen] = useState(open);
  // Открыли заново — показываем группу выбранного фона.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setGroup(groupOf(value));
  }
  const items = surfaceGroups.find((g) => g.label === group)?.items ?? [];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85svh] flex-col gap-4 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Фон блока</DialogTitle>
          <DialogDescription>Бумага, карточки и предметы, на которых лежит текст блока.</DialogDescription>
        </DialogHeader>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={group}
          onValueChange={(v) => v && setGroup(v)}
          aria-label="Категория фона"
          className="flex-wrap"
        >
          {surfaceGroups.map((g) => (
            <ToggleGroupItem key={g.label} value={g.label}>
              {g.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {/* Прокрутка — у обёртки, а не у сетки: иначе во flex-окне строки сжимаются и плитки налезают. */}
        <div className="-mx-1 min-h-0 overflow-y-auto px-1 pb-1">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="group" aria-label="Фоны" style={themeStyle(theme)}>
            {items.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={value === s}
                aria-label={surfaceLabels[s]}
                title={surfaceLabels[s]}
                onClick={() => {
                  onChange(s);
                  onOpenChange(false);
                }}
                className="relative flex flex-col overflow-hidden rounded-lg border text-left text-[11px] text-muted-foreground outline-none transition hover:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-primary aria-pressed:ring-2 aria-pressed:ring-primary/30"
              >
                <SurfaceSwatch surface={s} className="aspect-[4/3]" />
                <span className="block truncate bg-background px-1.5 py-1">{surfaceLabels[s]}</span>
                {premiumSurfaces.includes(s) && <ProBadge className="absolute top-1 right-1" />}
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Фон блока в «Тонкой настройке»: выбранный фон, «Выбрать» (окно со всеми фонами), «Убрать». */
function SurfacePicker({ theme, value, onChange }: { theme: Theme; value: Surface; onChange: (s: Surface) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>Фон блока</FieldLabel>
      <div className="flex items-center gap-3">
        <SurfaceSwatch surface={value} className="h-12 w-16 shrink-0 overflow-hidden rounded-md border" />
        <span className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
          <span className="truncate">{surfaceLabels[value]}</span>
          {premiumSurfaces.includes(value) && <ProBadge />}
        </span>
        <Button type="button" variant="outline" size="sm" aria-label={`Фон блока: ${surfaceLabels[value]}. Выбрать`} onClick={() => setOpen(true)}>
          <ImageIcon /> Выбрать
        </Button>
        {value !== "plain" && (
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Убрать фон блока" title="Без фона" onClick={() => onChange("plain")}>
            <X />
          </Button>
        )}
      </div>
      <SurfaceDialog theme={theme} value={value} open={open} onOpenChange={setOpen} onChange={onChange} />
    </div>
  );
}

/** Схема готового стиля в цветах палитры: фон, цвет, края и «строчки текста». */
function BlockStyleSwatch({ id, theme }: { id: BlockStyleId; theme: Theme }) {
  const spec = blockStyleSpec(id, theme);
  // Фиксированные зёрна: образец рваной бумаги не прыгает при каждой перерисовке.
  const edges = { top: spec.edgeTop, bottom: spec.edgeBottom, topSeed: 7, bottomSeed: 11 };
  const cut = spec.edgeTop !== "none" || spec.edgeBottom !== "none";
  const layer: CSSProperties =
    spec.surface === "card"
      ? {
          background: "color-mix(in srgb, var(--bg) 55%, white)",
          border: cut ? undefined : "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
          borderRadius: cut ? 0 : 10,
        }
      : spec.surface === "paper"
        ? surfaceLayer("paper").style
        : { background: spec.bgColor ?? "transparent" };
  const dark = !!spec.bgColor && isDarkColor(spec.bgColor);
  return (
    <span className="relative block h-14 overflow-hidden" style={{ background: "var(--bg)" }}>
      <span className={cn("absolute", spec.surface === "card" || spec.surface === "paper" ? "inset-x-2 inset-y-1.5" : "inset-x-0 inset-y-1.5")}>
        {spec.edgeTop === "torn" && <span style={tornPaperStyle("top", edges.topSeed, 0.4)} />}
        {spec.edgeBottom === "torn" && <span style={tornPaperStyle("bottom", edges.bottomSeed, 0.4)} />}
        <span className="absolute inset-0" style={{ ...layer, ...(cut ? edgeMaskStyle(edges, 0.4) : {}) }} />
        <span className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 flex-col items-center gap-1" style={{ color: dark ? "#fff" : "var(--text)" }}>
          <span className="h-0.5 w-1/2 rounded-full bg-current opacity-50" />
          <span className="h-0.5 w-1/3 rounded-full bg-current opacity-30" />
        </span>
      </span>
    </span>
  );
}

/**
 * Готовые стили фона блока (уровень 2): один клик — фон, цвет и края вместе (lib/blockStyles.ts). Последняя плитка —
 * окно со всеми фонами. Своё сочетание (из «Тонкой настройки» или шаблона) — ни одна плитка не выделена.
 */
function BlockStylePicker({ block, theme, onChange }: { block: Block; theme: Theme; onChange: (patch: Partial<Block>) => void }) {
  const [all, setAll] = useState(false);
  const current = matchBlockStyle(block, theme);
  const tile =
    "relative flex flex-col overflow-hidden rounded-lg border text-left text-[11px] text-muted-foreground outline-none transition hover:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-primary aria-pressed:ring-2 aria-pressed:ring-primary/30";
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>Фон блока</FieldLabel>
      {!current && <p className="text-xs text-muted-foreground">Сейчас свой фон: {surfaceLabels[block.surface]}. Подробнее — в «Тонкой настройке».</p>}
      <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Готовые фоны блока" style={themeStyle(theme)}>
        {BLOCK_STYLES.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={current === id}
            aria-label={`Фон «${blockStyleLabels[id]}»`}
            onClick={() => onChange(blockStylePatch(id, theme))}
            className={tile}
          >
            <BlockStyleSwatch id={id} theme={theme} />
            {/* Подпись в две строки: «Цветная полоса» в узкой плитке иначе обрезалась бы. */}
            <span className="block flex-1 bg-background px-1 py-1 leading-tight">{blockStyleLabels[id]}</span>
          </button>
        ))}
        <button type="button" onClick={() => setAll(true)} className={tile}>
          <span className="flex h-14 items-center justify-center bg-muted/50">
            <ImageIcon className="size-5" />
          </span>
          <span className="block flex-1 bg-background px-1 py-1 leading-tight">Все фоны…</span>
        </button>
      </div>
      <SurfaceDialog theme={theme} value={block.surface} open={all} onOpenChange={setAll} onChange={(surface) => onChange({ surface })} />
    </div>
  );
}

/**
 * Края фона блока: сверху и снизу своя форма; плитки — образец формы в цветах палитры.
 * Рваная бумага при каждом выборе, повторном нажатии и по кнопке «Другой обрыв» получает новое зерно — обрыв новый.
 */
function EdgePicker({ theme, block, onChange }: { theme: Theme; block: Block; onChange: (patch: Partial<Block>) => void }) {
  const visible = edgesVisible(block.surface, blockHasFill(block));
  const edges = blockEdges(block);
  const sides: { side: EdgeSide; label: string; value: Edge; seed: number; set: (e: Edge, seed?: number) => Partial<Block> }[] = [
    {
      side: "top",
      label: "Верхний край",
      value: edges.top,
      seed: edges.topSeed,
      set: (edgeTop, edgeTopSeed) => (edgeTopSeed === undefined ? { edgeTop } : { edgeTop, edgeTopSeed }),
    },
    {
      side: "bottom",
      label: "Нижний край",
      value: edges.bottom,
      seed: edges.bottomSeed,
      set: (edgeBottom, edgeBottomSeed) => (edgeBottomSeed === undefined ? { edgeBottom } : { edgeBottom, edgeBottomSeed }),
    },
  ];
  // Края режут только панели и заливку — у остальных фонов настройка ничего бы не меняла, поэтому её нет.
  if (!visible) return null;
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>Края сверху и снизу</FieldLabel>
      {sides.map(({ side, label, value, seed, set }) => (
        <div key={side} className="flex flex-col gap-1">
          <div className="flex min-h-6 items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">{label}</span>
            {value === "torn" && (
              <Button type="button" variant="ghost" size="xs" onClick={() => onChange(set("torn", newEdgeSeed()))}>
                <Shuffle /> Другой обрыв
              </Button>
            )}
          </div>
          <ToggleGroup
            type="single"
            aria-label={label}
            value={value}
            onValueChange={(v) => {
              // Повторное нажатие на выбранную плитку Radix присылает как "" — для рваного края это «ещё раз».
              if (!v) {
                if (value === "torn") onChange(set("torn", newEdgeSeed()));
                return;
              }
              onChange(v === "torn" ? set("torn", newEdgeSeed()) : set(v as Edge));
            }}
            className="grid w-full grid-cols-6 gap-1.5"
            style={themeStyle(theme)}
          >
            {EDGES.map((e) => (
              <ToggleGroupItem
                key={e}
                value={e}
                className="relative flex h-auto min-w-0 flex-col items-stretch gap-0 overflow-hidden rounded-lg border p-0 text-[10px] font-normal text-muted-foreground data-[state=on]:border-primary data-[state=on]:ring-2 data-[state=on]:ring-primary/30"
              >
                <span className="relative block h-10 overflow-hidden" style={{ background: "var(--bg)" }}>
                  <span className={cn("absolute inset-x-0", side === "top" ? "top-1.5 bottom-0" : "top-0 bottom-1.5")}>
                    {/* Образец — в половину натуральной высоты: в узкой плитке форма иначе выглядит утрированной. */}
                    {e === "torn" && <span style={tornPaperStyle(side, seed, 0.5)} />}
                    <span
                      className="absolute inset-0"
                      style={{
                        background: "color-mix(in srgb, var(--accent) 70%, var(--text))",
                        // В плитке рваного края — текущий обрыв блока: после «Другой обрыв» образец меняется тоже.
                        ...edgeMaskStyle(
                          { ...edges, top: side === "top" ? e : "none", bottom: side === "bottom" ? e : "none" },
                          0.5,
                        ),
                      }}
                    />
                  </span>
                </span>
                <span className="block truncate px-0.5 py-1" title={edgeLabels[e]}>
                  {edgeLabels[e]}
                </span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      ))}
    </div>
  );
}

/** Цвет фона блока: без цвета, образцы из палитры (тон фона, светлые акценты, акцент, текст) и свой цвет. */
function BgColorPicker({ theme, block, onChange }: { theme: Theme; block: Block; onChange: (bgColor: string | null) => void }) {
  const p = palettes[theme.palette];
  const swatches = [
    ...new Set([
      mixHex(p.bg, p.text, 0.06),
      mixHex(p.accent, "#ffffff", 0.8),
      mixHex(p.accent, "#ffffff", 0.5),
      p.accent,
      mixHex(p.text, p.bg, 0.15),
      p.text,
    ]),
  ];
  const value = block.bgColor;
  const custom = !!value && !swatches.includes(value);
  const ring = "ring-offset-2 ring-offset-background aria-pressed:ring-2 aria-pressed:ring-primary";
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>{block.surface === "plain" ? "Цвет фона" : "Цвет панели"}</FieldLabel>
      <div role="group" aria-label="Цвет фона блока" className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-pressed={!value}
          aria-label="Без цвета"
          title="Без цвета"
          onClick={() => onChange(null)}
          className={cn("flex size-8 items-center justify-center rounded-full border text-muted-foreground", ring)}
        >
          <Ban className="size-4" />
        </button>
        {swatches.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={value === c}
            aria-label={`Цвет фона ${c}`}
            title={c}
            onClick={() => onChange(c)}
            className={cn("size-8 rounded-full border border-foreground/10", ring)}
            style={{ background: c }}
          />
        ))}
        <label
          title="Свой цвет"
          data-selected={custom || undefined}
          className={cn(
            "relative flex size-8 cursor-pointer items-center justify-center rounded-full border text-muted-foreground ring-offset-2 ring-offset-background data-selected:ring-2 data-selected:ring-primary",
          )}
          style={custom ? { background: value! } : undefined}
        >
          {!custom && <Palette className="size-4" />}
          <input
            type="color"
            aria-label="Свой цвет фона"
            className="absolute inset-0 cursor-pointer opacity-0"
            value={value ?? p.bg}
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">Текст и акцент на цветном фоне подстраиваются сами: на тёмном — светлые, на светлом — тёмные.</p>
    </div>
  );
}

/** У главного экрана и фото во всю ширину заголовка нет. */
const isTitled = (block: Block) => block.type !== "hero" && !(block.type === "photo" && block.variant === "classic");

/**
 * Заголовок блока и строка под ним — это текст, поэтому они первыми в «Тексте и фото».
 * Пустая строка под заголовком свёрнута в кнопку «＋», чтобы не занимать место.
 */
export function BlockTitleFields({ block, onChange }: { block: Block; onChange: (patch: Partial<Block>) => void }) {
  const titleId = useId();
  const scriptId = useId();
  const [showScript, setShowScript] = useState(false);
  if (!isTitled(block)) return null;
  const styleOf = (key: TextKey) => ({
    value: block.textStyles[key],
    onChange: (patch: Partial<Block["textStyles"][string]>) => onChange({ textStyles: withTextStyle(block.textStyles, key, patch) }),
  });
  return (
    <>
      <Field>
        <FieldLabel htmlFor={titleId}>Заголовок</FieldLabel>
        <div className="flex gap-2">
          <Input
            id={titleId}
            value={block.title ?? defaultTitles[block.type]}
            placeholder="Без заголовка"
            onChange={(e) => onChange({ title: e.target.value })}
          />
          {block.title !== undefined && block.title !== defaultTitles[block.type] && (
            <Button type="button" variant="ghost" size="icon" aria-label="Сбросить заголовок" title="Сбросить" onClick={() => onChange({ title: undefined })}>
              <RotateCcw />
            </Button>
          )}
          <TextStylePicker label="Заголовок" {...styleOf("title")} />
        </div>
      </Field>
      {showScript || block.scriptLine ? (
        <Field>
          <FieldLabel htmlFor={scriptId}>Строка под заголовком</FieldLabel>
          <div className="flex gap-2">
            <Input
              id={scriptId}
              autoFocus={showScript && !block.scriptLine}
              value={block.scriptLine ?? ""}
              placeholder="Например: своё присутствие"
              onChange={(e) => onChange({ scriptLine: e.target.value || undefined })}
            />
            <TextStylePicker label="Строка под заголовком" {...styleOf("scriptLine")} />
          </div>
        </Field>
      ) : (
        <AddFieldButton onClick={() => setShowScript(true)}>Строка под заголовком</AddFieldButton>
      )}
    </>
  );
}

type ViewProps = Props & {
  /** «Тонкая настройка» раскрыта — состояние общее для всех блоков (держит Editor). */
  fineOpen: boolean;
  onFineOpenChange: (open: boolean) => void;
};

/**
 * Подвкладка «Вид» (без «Вида блока» — его плитки рисует BlockItem): особое для типа, украшения и свёрнутая
 * «Тонкая настройка» — фон, края, картинка, ширина, появление. Недействующие сейчас настройки не показываются.
 */
export function BlockView({ block, theme, onChange, onAddOrnament, onUpdateOrnament, onRemoveOrnament, fineOpen, onFineOpenChange }: ViewProps) {
  const [picking, setPicking] = useState<"add" | "replace" | null>(null);
  const [openOrnament, setOpenOrnament] = useState<number | null>(null);
  const entranceId = useId();
  const widthId = useId();
  const label = blockLabels[block.type];
  // Новое украшение ставим в первый свободный угол.
  const nextPosition =
    (["top-right", "bottom-left", "top-left", "bottom-right"] as OrnamentPosition[]).find(
      (p) => !block.ornaments.some((o) => o.position === p),
    ) ?? "right";

  return (
    <>
      <BlockStylePicker block={block} theme={theme} onChange={onChange} />

      {block.type === "photo" && (
        <Segmented<PhotoHeight>
          label="Высота фото"
          value={block.height}
          options={Object.fromEntries(PHOTO_HEIGHTS.map((h) => [h, photoHeightLabels[h]])) as Record<PhotoHeight, string>}
          onChange={(height) => onChange({ height } as Partial<Block>)}
        />
      )}

      <div className="flex flex-col gap-2">
        <FieldLabel>
          Украшения{" "}
          <span className="font-normal text-muted-foreground">
            {block.ornaments.length} из {MAX_ORNAMENTS}
          </span>
        </FieldLabel>
        {/* Ряд миниатюр: нажатие раскрывает карточку украшения под рядом (одна за раз). */}
        <div className="flex flex-wrap items-center gap-2">
          {block.ornaments.map((o, i) => (
            <button
              key={i}
              type="button"
              aria-pressed={openOrnament === i}
              aria-label={`Украшение ${i + 1}`}
              onClick={() => setOpenOrnament(openOrnament === i ? null : i)}
              className={cn(
                "size-12 overflow-hidden rounded-md border p-1 outline-none transition hover:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-primary aria-pressed:ring-2 aria-pressed:ring-primary/30",
                checker,
              )}
            >
              <img src={o.src} alt="" className="size-full object-contain" />
            </button>
          ))}
          {block.ornaments.length < MAX_ORNAMENTS && (
            <Button type="button" variant="outline" size="sm" onClick={() => setPicking("add")}>
              <Plus /> Добавить украшение
            </Button>
          )}
        </div>
        {openOrnament !== null && block.ornaments[openOrnament] && (
          <OrnamentCard
            key={openOrnament}
            index={openOrnament}
            ornament={block.ornaments[openOrnament]}
            theme={theme}
            onChange={(patch) => onUpdateOrnament(openOrnament, patch)}
            onReplace={() => setPicking("replace")}
            onRemove={() => {
              onRemoveOrnament(openOrnament);
              setOpenOrnament(null);
            }}
          />
        )}
      </div>

      <ImagePicker
        open={picking !== null}
        onOpenChange={(open) => !open && setPicking(null)}
        title={picking === "replace" ? `Другая картинка для украшения ${(openOrnament ?? 0) + 1}` : `Украшение для блока «${label}»`}
        categories={ORNAMENT_CATEGORIES}
        onPick={(src) => {
          if (picking === "replace" && openOrnament !== null) onUpdateOrnament(openOrnament, { src });
          else {
            onAddOrnament(createOrnament(src, nextPosition));
            // Только что добавленное — сразу раскрыто: его обычно хочется подвинуть.
            setOpenOrnament(block.ornaments.length);
          }
          setPicking(null);
        }}
      />

      <Collapsible open={fineOpen} onOpenChange={onFineOpenChange} className="border-t pt-2">
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
            <ChevronRight className={cn("transition-transform", fineOpen && "rotate-90")} /> Тонкая настройка
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="flex flex-col gap-4 pt-3">
          <SurfacePicker theme={theme} value={block.surface} onChange={(surface) => onChange({ surface })} />
          {block.surface !== "plain" && (
            <LabeledSlider
              label="Прозрачность фона"
              ariaLabel="Прозрачность фона блока"
              valueLabel={`${Math.round(block.surfaceOpacity * 100)}%`}
              value={Math.round(block.surfaceOpacity * 100)}
              min={10}
              max={100}
              step={5}
              onChange={(v) => onChange({ surfaceOpacity: v / 100 })}
            />
          )}
          {takesBgColor(block.surface) && <BgColorPicker theme={theme} block={block} onChange={(bgColor) => onChange({ bgColor })} />}
          <EdgePicker theme={theme} block={block} onChange={onChange} />
          <UploadField label="Картинка на фоне блока" value={block.bgImage} onChange={(bgImage) => onChange({ bgImage })} />
          {block.bgImage && (
            <LabeledSlider
              label="Приглушить картинку"
              ariaLabel="Приглушить фоновую картинку"
              valueLabel={`${Math.round(block.bgDim * 100)}%`}
              value={Math.round(block.bgDim * 100)}
              min={0}
              max={90}
              step={5}
              onChange={(v) => onChange({ bgDim: v / 100 })}
            />
          )}
          {block.bgImage && (
            <LabeledSlider
              label="Размыть картинку"
              ariaLabel="Размыть фоновую картинку"
              valueLabel={block.bgBlur ? `${block.bgBlur} px` : "нет"}
              value={block.bgBlur}
              min={0}
              max={24}
              step={1}
              onChange={(bgBlur) => onChange({ bgBlur })}
            />
          )}
          {block.bgImage && (
            <LabeledSlider
              label="Затемнить картинку"
              ariaLabel="Затемнить фоновую картинку"
              valueLabel={`${Math.round(block.bgDarken * 100)}%`}
              value={Math.round(block.bgDarken * 100)}
              min={0}
              max={90}
              step={5}
              onChange={(v) => onChange({ bgDarken: v / 100 })}
            />
          )}
          {/* У листов, рам и тарелок ширина всегда по контенту — переключатель им не нужен. */}
          {FULL_WIDTH_SURFACES.includes(block.surface) && (
            <Field orientation="horizontal">
              <Switch id={widthId} checked={block.width === "full"} onCheckedChange={(full) => onChange({ width: full ? "full" : "content" })} />
              <div className="flex flex-col gap-0.5">
                <FieldLabel htmlFor={widthId}>Растянуть фон на всю ширину экрана</FieldLabel>
                <FieldDescription>Видно на компьютере</FieldDescription>
              </div>
            </Field>
          )}
          <Field>
            <FieldLabel htmlFor={entranceId}>Как блок появляется</FieldLabel>
            <NativeSelect
              id={entranceId}
              className="w-full"
              value={block.entrance}
              onChange={(e) => onChange({ entrance: e.target.value as Entrance })}
            >
              {ENTRANCES.map((e) => (
                <NativeSelectOption key={e} value={e}>
                  {entranceLabels[e]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}

/**
 * Карточка выбранного украшения: где, «Меньше / Больше», отражение, замена, удаление; точные числа и своя анимация —
 * в свёрнутой «Тонкой настройке украшения».
 */
function OrnamentCard({
  index,
  ornament: o,
  theme,
  onChange,
  onReplace,
  onRemove,
}: {
  index: number;
  ornament: Ornament;
  theme: Theme;
  onChange: (patch: Partial<Ornament>) => void;
  onReplace: () => void;
  onRemove: () => void;
}) {
  const n = index + 1;
  const flipId = useId();
  const ownId = useId();
  const [fine, setFine] = useState(false);
  return (
    <div data-testid={`ornament-${index}`} className="flex flex-col gap-4 rounded-lg border bg-muted/40 p-3">
      <div className="flex items-start gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Где</span>
          <div role="radiogroup" aria-label={`Положение украшения ${n}`} className="grid grid-cols-3 gap-1 rounded-md border bg-background p-1">
            {POSITION_GRID.map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={o.position === p}
                aria-label={positionLabels[p]}
                title={positionLabels[p]}
                onClick={() => onChange({ position: p })}
                className="group flex size-7 items-center justify-center rounded outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="size-2 rounded-full bg-muted-foreground/30 transition group-aria-checked:size-3 group-aria-checked:bg-primary" />
              </button>
            ))}
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Размер</span>
            <div className="flex gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label={`Уменьшить украшение ${n}`}
                disabled={o.size <= ORNAMENT_SIZE_MIN}
                onClick={() => onChange({ size: stepOrnamentSize(o.size, "smaller") })}
              >
                <Minus /> Меньше
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label={`Увеличить украшение ${n}`}
                disabled={o.size >= ORNAMENT_SIZE_MAX}
                onClick={() => onChange({ size: stepOrnamentSize(o.size, "bigger") })}
              >
                <Plus /> Больше
              </Button>
            </div>
          </div>
          <label htmlFor={flipId} className="flex items-center gap-2 text-sm">
            <Switch id={flipId} size="sm" checked={o.flip} onCheckedChange={(flip) => onChange({ flip })} />
            <FlipHorizontal2 className="size-3.5 text-muted-foreground" /> Отразить зеркально
          </label>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onReplace}>
          <ImageIcon /> Заменить картинку
        </Button>
        <Button type="button" variant="ghost" size="sm" className="ml-auto text-muted-foreground hover:text-destructive" aria-label={`Удалить украшение ${n}`} onClick={onRemove}>
          <Trash2 /> Удалить
        </Button>
      </div>
      <Collapsible open={fine} onOpenChange={setFine} className="border-t pt-2">
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
            <ChevronRight className={cn("transition-transform", fine && "rotate-90")} /> Тонкая настройка украшения
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="flex flex-col gap-3 pt-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <LabeledSlider
              label="Размер"
              ariaLabel={`Размер украшения ${n}`}
              valueLabel={`${o.size}px`}
              value={o.size}
              min={ORNAMENT_SIZE_MIN}
              max={ORNAMENT_SIZE_MAX}
              step={10}
              onChange={(size) => onChange({ size })}
            />
            <LabeledSlider
              label="Поворот"
              ariaLabel={`Поворот украшения ${n}`}
              valueLabel={`${o.rotate}°`}
              value={o.rotate}
              min={-180}
              max={180}
              step={5}
              onChange={(rotate) => onChange({ rotate })}
            />
            <LabeledSlider
              label="Прозрачность"
              ariaLabel={`Прозрачность украшения ${n}`}
              valueLabel={`${Math.round(o.opacity * 100)}%`}
              value={Math.round(o.opacity * 100)}
              min={10}
              max={100}
              step={5}
              onChange={(v) => onChange({ opacity: v / 100 })}
            />
          </div>
          <label htmlFor={ownId} className="flex items-center gap-2 text-sm">
            <Switch
              id={ownId}
              size="sm"
              checked={!!o.motion}
              // Включили — начинаем с общих настроек, выключили — снова как у всех.
              onCheckedChange={(own) => onChange({ motion: own ? { ...theme.ornamentMotion } : undefined })}
            />
            <Sparkles className="size-3.5 text-muted-foreground" /> Анимировать отдельно от остальных
          </label>
          {theme.motion.style === "none" && (
            <p className="text-xs text-muted-foreground">Сейчас анимации выключены: «Оформление» → «Анимации» → «Без анимаций».</p>
          )}
          {o.motion ? (
            <OrnamentMotionFields value={o.motion} of={`украшения ${n}`} onChange={(patch) => onChange({ motion: { ...o.motion!, ...patch } })} />
          ) : (
            <p className="text-xs text-muted-foreground">Как у всех украшений — общая анимация в «Оформлении» → «Анимации».</p>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
