"use client";

import { Ban, FlipHorizontal2, Image as ImageIcon, Palette, Plus, RotateCcw, Shuffle, Sparkles, Trash2, X } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { blockLabels, createOrnament, defaultTitles, MAX_ORNAMENTS } from "@/lib/blocks";
import { blockEdges, blockHasFill, edgeLabels, edgeMaskStyle, edgesVisible, newEdgeSeed, tornPaperStyle, type EdgeSide } from "@/lib/edges";
import { mixHex } from "@/lib/color";
import { FULL_WIDTH_SURFACES, isPanelSurface, ORNAMENT_CATEGORIES, surfaceGroups, surfaceLabels, surfaceLayer, surfaceThumb, takesBgColor } from "@/lib/library";
import { positionLabels } from "@/lib/ornaments";
import { premiumSurfaces } from "@/lib/premium";
import {
  EDGES,
  ENTRANCES,
  ORNAMENT_POSITIONS,
  type Block,
  type Edge,
  type Entrance,
  type Ornament,
  type OrnamentPosition,
  type Surface,
  type Theme,
} from "@/lib/schema";
import { headingsMode, palettes, themeStyle } from "@/lib/theme";
import { entranceLabels } from "@/lib/variants";
import { cn } from "@/lib/utils";
import { checker, Group, ImagePicker, ProBadge, Segmented, UploadField } from "./controls";
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

/**
 * Фон блока: в панели — только выбранный фон и «Выбрать»; все фоны — в окне, по категориям (как украшения).
 */
function SurfacePicker({ theme, value, onChange }: { theme: Theme; value: Surface; onChange: (s: Surface) => void }) {
  const [open, setOpen] = useState(false);
  const groupOf = (s: Surface) => surfaceGroups.find((g) => g.items.includes(s))?.label ?? surfaceGroups[0].label;
  const [group, setGroup] = useState(groupOf(value));
  const items = surfaceGroups.find((g) => g.label === group)?.items ?? [];
  const vars = themeStyle(theme);
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>Фон блока</FieldLabel>
      <div className="flex items-center gap-3">
        <SurfaceSwatch surface={value} className="h-12 w-16 shrink-0 overflow-hidden rounded-md border" />
        <span className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
          <span className="truncate">{surfaceLabels[value]}</span>
          {premiumSurfaces.includes(value) && <ProBadge />}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`Фон блока: ${surfaceLabels[value]}. Выбрать`}
          onClick={() => {
            setGroup(groupOf(value));
            setOpen(true);
          }}
        >
          <ImageIcon /> Выбрать
        </Button>
        {value !== "plain" && (
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Убрать фон блока" title="Без фона" onClick={() => onChange("plain")}>
            <X />
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
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
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="group" aria-label="Фоны" style={vars}>
              {items.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={value === s}
                  aria-label={surfaceLabels[s]}
                  title={surfaceLabels[s]}
                  onClick={() => {
                    onChange(s);
                    setOpen(false);
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
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>Края блока</FieldLabel>
      {!visible && (
        <p className="text-xs text-muted-foreground">
          Края видны у блока с фоном «Карточка», «Калька» или «Мятая бумага» и у обложки с фото во весь экран.
        </p>
      )}
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

/** Оформление любого блока: заголовок, фон, украшения. */
export function BlockStyle({ block, theme, onChange, onAddOrnament, onUpdateOrnament, onRemoveOrnament }: Props) {
  const [picking, setPicking] = useState(false);
  const titleId = useId();
  const scriptId = useId();
  const entranceId = useId();
  const label = blockLabels[block.type];
  const styleOf = (key: TextKey) => ({
    value: block.textStyles[key],
    onChange: (patch: Partial<Block["textStyles"][string]>) => onChange({ textStyles: withTextStyle(block.textStyles, key, patch) }),
  });
  // Главный экран и фото во всю ширину рисуются без заголовка.
  const titled = block.type !== "hero" && !(block.type === "photo" && block.variant === "classic");
  // Новое украшение ставим в первый свободный угол.
  const nextPosition =
    (["top-right", "bottom-left", "top-left", "bottom-right"] as OrnamentPosition[]).find(
      (p) => !block.ornaments.some((o) => o.position === p),
    ) ?? "right";

  return (
    <Group title="Оформление блока">
      {titled && (
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
      )}
      {titled && (
        <Field>
          <FieldLabel htmlFor={scriptId}>
            {headingsMode(theme) === "script" ? "Строка капителью под заголовком" : "Строка от руки под заголовком"}
          </FieldLabel>
          <div className="flex gap-2">
            <Input
              id={scriptId}
              value={block.scriptLine ?? ""}
              placeholder="Например: своё присутствие"
              onChange={(e) => onChange({ scriptLine: e.target.value || undefined })}
            />
            <TextStylePicker label="Строка от руки" {...styleOf("scriptLine")} />
          </div>
        </Field>
      )}

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
      <UploadField label="Фоновая картинка" value={block.bgImage} onChange={(bgImage) => onChange({ bgImage })} />
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
      <EdgePicker theme={theme} block={block} onChange={onChange} />
      <div className="flex flex-col gap-1.5">
        <Segmented
          label="Ширина блока"
          value={block.width}
          options={{ content: "По контенту", full: "Во всю ширину" }}
          onChange={(width) => onChange({ width })}
        />
        <p className="text-xs text-muted-foreground">
          {FULL_WIDTH_SURFACES.includes(block.surface)
            ? "Во всю ширину растягиваются фон, картинка и края, текст остаётся в колонке. Заметно на компьютере — в превью телефона блок одинаковый."
            : "У листов, стикеров, рам и тарелок ширина всегда по контенту."}
        </p>
      </div>

      <Field>
        <FieldLabel htmlFor={entranceId}>Появление блока</FieldLabel>
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

      <div className="flex flex-col gap-2">
        <FieldLabel>
          Украшения{" "}
          <span className="font-normal text-muted-foreground">
            {block.ornaments.length}/{MAX_ORNAMENTS}
          </span>
        </FieldLabel>
        <ul className="flex flex-col gap-2">
          {block.ornaments.map((o, i) => (
            <OrnamentRow
              key={i}
              index={i}
              ornament={o}
              theme={theme}
              onChange={(patch) => onUpdateOrnament(i, patch)}
              onRemove={() => onRemoveOrnament(i)}
            />
          ))}
        </ul>
        {block.ornaments.length < MAX_ORNAMENTS && (
          <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setPicking(true)}>
            <Plus /> Добавить украшение
          </Button>
        )}
      </div>

      <ImagePicker
        open={picking}
        onOpenChange={setPicking}
        title={`Украшение для блока «${label}»`}
        categories={ORNAMENT_CATEGORIES}
        onPick={(src) => {
          onAddOrnament(createOrnament(src, nextPosition));
          setPicking(false);
        }}
      />
    </Group>
  );
}

function OrnamentRow({
  index,
  ornament: o,
  theme,
  onChange,
  onRemove,
}: {
  index: number;
  ornament: Ornament;
  theme: Theme;
  onChange: (patch: Partial<Ornament>) => void;
  onRemove: () => void;
}) {
  const n = index + 1;
  const flipId = useId();
  const ownId = useId();
  return (
    <li data-testid={`ornament-${index}`} className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-3">
      <div className="flex items-center gap-3">
        <img src={o.src} alt="" className={cn("size-12 shrink-0 rounded-md border object-contain p-1", checker)} />
        <NativeSelect
          aria-label={`Положение украшения ${n}`}
          size="sm"
          className="w-full [&_select]:bg-background"
          value={o.position}
          onChange={(e) => onChange({ position: e.target.value as OrnamentPosition })}
        >
          {ORNAMENT_POSITIONS.map((p) => (
            <NativeSelectOption key={p} value={p}>
              {positionLabels[p]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Удалить украшение ${n}`} onClick={onRemove}>
          <Trash2 />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <LabeledSlider
          label="Размер"
          ariaLabel={`Размер украшения ${n}`}
          valueLabel={`${o.size}px`}
          value={o.size}
          min={40}
          max={400}
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
        <div className="flex items-end">
          <label htmlFor={flipId} className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch id={flipId} size="sm" checked={o.flip} onCheckedChange={(flip) => onChange({ flip })} />
            <FlipHorizontal2 className="size-3.5" /> Отразить
          </label>
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t pt-3">
        <label htmlFor={ownId} className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch
            id={ownId}
            size="sm"
            aria-label={`Своя анимация украшения ${n}`}
            checked={!!o.motion}
            // Включили — начинаем с общих настроек, выключили — снова как у всех.
            onCheckedChange={(own) => onChange({ motion: own ? { ...theme.ornamentMotion } : undefined })}
          />
          <Sparkles className="size-3.5" /> Своя анимация
        </label>
        {theme.motion.style === "none" && (
          <p className="text-xs text-muted-foreground">Сейчас анимации выключены: «Оформление» → «Анимации» → «Без анимаций».</p>
        )}
        {o.motion ? (
          <OrnamentMotionFields value={o.motion} of={`украшения ${n}`} onChange={(patch) => onChange({ motion: { ...o.motion!, ...patch } })} />
        ) : (
          <p className="text-xs text-muted-foreground">Как у всех украшений — общая анимация в «Оформлении» → «Анимации».</p>
        )}
      </div>
    </li>
  );
}
