"use client";

import { Plus, Trash2, X } from "lucide-react";
import { useId, type ComponentProps, type ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import {
  MAX_CONTACTS,
  MAX_GALLERY_PHOTOS,
  PHOTO_HEIGHTS,
  PROGRAM_ICONS,
  TEXT_ICONS,
  type BlockOf,
  type BlockType,
  type Contact,
  type PhotoHeight,
  type ProgramIcon,
  type TextIcon,
  type TextStyle,
} from "@/lib/schema";
import { withTextStyle, type TextKey } from "@/lib/textStyle";
import { photoHeightLabels, programIconLabels, textIconLabels } from "@/lib/variants";
import { PhotoListField, Segmented, UploadField } from "./controls";
import { TextStylePicker } from "./TextStylePicker";

type FieldsProps<T extends BlockType> = {
  block: BlockOf<T>;
  onChange: (patch: Partial<Omit<BlockOf<T>, "type">>) => void;
};

type ProgramItem = BlockOf<"program">["items"][number];

/** Стиль текста поля для пикера: текущее значение и изменение (пишется в block.textStyles). */
type StyleProp = { value: TextStyle | undefined; onChange: (patch: Partial<TextStyle>) => void };
const styleOf = <T extends BlockType>({ block, onChange }: FieldsProps<T>, key: TextKey): StyleProp => ({
  value: block.textStyles[key],
  onChange: (patch) => onChange({ textStyles: withTextStyle(block.textStyles, key, patch) } as Partial<Omit<BlockOf<T>, "type">>),
});

/** Подпись + поле ввода (+ подсказка), связанные через id для скринридеров и тестов. */
function TextField({
  label,
  value,
  onChange,
  description,
  multiline = false,
  textStyle,
  ...inputProps
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
  multiline?: boolean;
  /** Цвет и шрифт этого текста в приглашении — кнопка «Aa» справа от поля. */
  textStyle?: StyleProp;
} & Omit<ComponentProps<"input">, "value" | "onChange">) {
  const id = useId();
  const describedBy = description ? `${id}-hint` : undefined;
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex gap-2">
        {multiline ? (
          <Textarea id={id} aria-describedby={describedBy} value={value} onChange={(e) => onChange(e.target.value)} rows={4} />
        ) : (
          <Input id={id} aria-describedby={describedBy} value={value} onChange={(e) => onChange(e.target.value)} {...inputProps} />
        )}
        {textStyle && <TextStylePicker label={label} value={textStyle.value} onChange={textStyle.onChange} />}
      </div>
      {description && <FieldDescription id={describedBy}>{description}</FieldDescription>}
    </Field>
  );
}

const Hint = ({ children }: { children: string }) => <p className="text-sm text-muted-foreground">{children}</p>;

function HeroFields(props: FieldsProps<"hero">) {
  const { block, onChange } = props;
  return (
    <>
      <TextField
        textStyle={styleOf(props, "names")}
        label="Имена"
        value={block.names}
        onChange={(names) => onChange({ names })}
        description="Через «&» — имена встанут в две строки"
      />
      <TextField
        label="Дата и время"
        type="datetime-local"
        value={block.date.slice(0, 16)}
        onChange={(date) => date && onChange({ date })}
      />
      <TextField
        textStyle={styleOf(props, "label")}
        label="Надпись над именами"
        placeholder="Приглашение на свадьбу"
        value={block.label ?? ""}
        onChange={(label) => onChange({ label: label || undefined })}
      />
      <TextField
        textStyle={styleOf(props, "subtitle")}
        label="Подзаголовок"
        value={block.subtitle ?? ""}
        onChange={(subtitle) => onChange({ subtitle: subtitle || undefined })}
      />
      <UploadField label="Фото на главном экране" value={block.photo} onChange={(photo) => onChange({ photo })} />
    </>
  );
}

function CountdownFields() {
  return <Hint>Считает время до даты из блока «Главный экран».</Hint>;
}

function CalendarFields() {
  return <Hint>Показывает месяц с датой из блока «Главный экран».</Hint>;
}

function StoryFields(props: FieldsProps<"story">) {
  const { block, onChange } = props;
  return (
    <>
      <TextField textStyle={styleOf(props, "text")} label="Текст" multiline value={block.text} onChange={(text) => onChange({ text })} />
      {block.variant === "photo" && <UploadField label="Фото к истории" value={block.photo} onChange={(photo) => onChange({ photo })} />}
      {block.variant === "letter" && <Hint>Письмо подписано именами из блока «Главный экран».</Hint>}
    </>
  );
}

function ProgramFields(props: FieldsProps<"program">) {
  const { block, onChange } = props;
  const setItem = (i: number, patch: Partial<ProgramItem>) =>
    onChange({ items: block.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FieldLabel>Пункты программы</FieldLabel>
        {/* Стиль один на все пункты: так программа остаётся единой. */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Стиль:
          <TextStylePicker label="время пунктов" className="size-8" {...styleOf(props, "time")} />
          <TextStylePicker label="названия пунктов" className="size-8" {...styleOf(props, "itemTitle")} />
          <TextStylePicker label="описания пунктов" className="size-8" {...styleOf(props, "itemDescription")} />
        </div>
      </div>
      {block.items.map((item, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-2">
          <div className="flex gap-2">
            <Input
              aria-label={`Время пункта ${i + 1}`}
              className="w-20 bg-background"
              value={item.time}
              onChange={(e) => setItem(i, { time: e.target.value })}
            />
            <Input
              aria-label={`Название пункта ${i + 1}`}
              className="bg-background"
              value={item.title}
              onChange={(e) => setItem(i, { title: e.target.value })}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Удалить пункт ${i + 1}`}
              onClick={() => onChange({ items: block.items.filter((_, j) => j !== i) })}
            >
              <Trash2 />
            </Button>
          </div>
          {block.variant === "icons" && (
            <NativeSelect
              aria-label={`Иконка пункта ${i + 1}`}
              size="sm"
              className="w-full [&_select]:bg-background"
              value={item.icon ?? ""}
              onChange={(e) => setItem(i, { icon: (e.target.value || undefined) as ProgramIcon | undefined })}
            >
              <NativeSelectOption value="">Иконка по порядку</NativeSelectOption>
              {PROGRAM_ICONS.map((icon) => (
                <NativeSelectOption key={icon} value={icon}>
                  {programIconLabels[icon]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
          <Input
            aria-label={`Описание пункта ${i + 1}`}
            placeholder="Описание (необязательно)"
            className="bg-background"
            value={item.description ?? ""}
            onChange={(e) => setItem(i, { description: e.target.value || undefined })}
          />
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => onChange({ items: [...block.items, { time: "", title: "" }] })}
      >
        <Plus /> Пункт
      </Button>
    </div>
  );
}

function LocationFields(props: FieldsProps<"location">) {
  const { block, onChange } = props;
  return (
    <>
      <TextField
        textStyle={styleOf(props, "placeName")}
        label="Название места"
        value={block.placeName}
        onChange={(placeName) => onChange({ placeName })}
      />
      <TextField textStyle={styleOf(props, "address")} label="Адрес" value={block.address} onChange={(address) => onChange({ address })} />
      <TextField
        label="Ссылка на карту"
        type="url"
        placeholder="https://2gis.kg/…"
        value={block.mapUrl ?? ""}
        onChange={(mapUrl) => onChange({ mapUrl: mapUrl || undefined })}
      />
      <UploadField label="Фото места" value={block.photo} onChange={(photo) => onChange({ photo })} />
    </>
  );
}

function DresscodeFields(props: FieldsProps<"dresscode">) {
  const { block, onChange } = props;
  return (
    <>
      <TextField textStyle={styleOf(props, "text")} label="Текст" multiline value={block.text} onChange={(text) => onChange({ text })} />
      <div className="flex flex-col gap-2">
        <FieldLabel>Цвета</FieldLabel>
        <div className="flex flex-wrap items-center gap-2">
          {block.colors.map((c, i) => (
            <span key={i} className="group relative">
              <input
                type="color"
                aria-label={`Цвет ${i + 1}`}
                value={c}
                className="size-9 cursor-pointer overflow-hidden rounded-full border-2 border-background shadow-sm ring-1 ring-border [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch-wrapper]:p-0"
                onChange={(e) => onChange({ colors: block.colors.map((x, j) => (j === i ? e.target.value : x)) })}
              />
              <button
                type="button"
                aria-label={`Удалить цвет ${i + 1}`}
                className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-foreground text-background opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
                onClick={() => onChange({ colors: block.colors.filter((_, j) => j !== i) })}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          {block.colors.length < 10 && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-full"
              aria-label="Добавить цвет"
              onClick={() => onChange({ colors: [...block.colors, "#cccccc"] })}
            >
              <Plus />
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

function RsvpFields({ block, onChange }: FieldsProps<"rsvp">) {
  return (
    <TextField
      label="Ответить до"
      type="date"
      value={block.deadline ?? ""}
      onChange={(deadline) => onChange({ deadline: deadline || undefined })}
    />
  );
}

function TextFields(props: FieldsProps<"text">) {
  const { block, onChange } = props;
  return (
    <>
      <Field>
        <FieldLabel htmlFor={`${block.id}-icon`}>Значок</FieldLabel>
        <NativeSelect
          id={`${block.id}-icon`}
          className="w-full"
          value={block.icon ?? ""}
          onChange={(e) => onChange({ icon: (e.target.value || undefined) as TextIcon | undefined })}
        >
          <NativeSelectOption value="">Без значка</NativeSelectOption>
          {TEXT_ICONS.map((icon) => (
            <NativeSelectOption key={icon} value={icon}>
              {textIconLabels[icon]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      <TextField textStyle={styleOf(props, "text")} label="Текст" multiline value={block.text} onChange={(text) => onChange({ text })} />
      <TextField
        textStyle={styleOf(props, "button")}
        label="Подпись кнопки"
        placeholder="Подробнее"
        value={block.buttonLabel ?? ""}
        onChange={(buttonLabel) => onChange({ buttonLabel: buttonLabel || undefined })}
      />
      <TextField
        label="Ссылка кнопки"
        type="url"
        placeholder="https://… или tel:+7…"
        description="Без ссылки кнопки не будет"
        value={block.buttonUrl ?? ""}
        onChange={(buttonUrl) => onChange({ buttonUrl: buttonUrl.trim() || undefined })}
      />
    </>
  );
}

function PhotoFields(props: FieldsProps<"photo">) {
  const { block, onChange } = props;
  return (
    <>
      <UploadField label="Фото" value={block.photo} onChange={(photo) => onChange({ photo })} />
      <TextField
        textStyle={styleOf(props, "caption")}
        label="Подпись"
        placeholder="Необязательно"
        value={block.caption ?? ""}
        onChange={(caption) => onChange({ caption: caption || undefined })}
      />
      <Segmented<PhotoHeight>
        label="Высота фото"
        value={block.height}
        options={Object.fromEntries(PHOTO_HEIGHTS.map((h) => [h, photoHeightLabels[h]])) as Record<PhotoHeight, string>}
        onChange={(height) => onChange({ height })}
      />
    </>
  );
}

function GalleryFields({ block, onChange }: FieldsProps<"gallery">) {
  return (
    <>
      <PhotoListField label="Фото галереи" value={block.photos} max={MAX_GALLERY_PHOTOS} onChange={(photos) => onChange({ photos })} />
      <Hint>Гости открывают фото во весь экран нажатием.</Hint>
    </>
  );
}

function ContactsFields(props: FieldsProps<"contacts">) {
  const { block, onChange } = props;
  const setPerson = (i: number, patch: Partial<Contact>) =>
    onChange({ people: block.people.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  return (
    <>
      <TextField
        textStyle={styleOf(props, "text")}
        label="Текст"
        multiline
        value={block.text ?? ""}
        onChange={(text) => onChange({ text: text || undefined })}
      />
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <FieldLabel>Люди</FieldLabel>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Стиль:
            <TextStylePicker label="имён" className="size-8" {...styleOf(props, "personName")} />
            <TextStylePicker label="ролей" className="size-8" {...styleOf(props, "personRole")} />
          </div>
        </div>
        {block.people.map((p, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-2">
            <div className="flex gap-2">
              <Input aria-label={`Имя ${i + 1}`} placeholder="Имя" className="bg-background" value={p.name} onChange={(e) => setPerson(i, { name: e.target.value })} />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Удалить контакт ${i + 1}`}
                onClick={() => onChange({ people: block.people.filter((_, j) => j !== i) })}
              >
                <Trash2 />
              </Button>
            </div>
            <Input
              aria-label={`Роль ${i + 1}`}
              placeholder="Роль: организатор, мама невесты…"
              className="bg-background"
              value={p.role ?? ""}
              onChange={(e) => setPerson(i, { role: e.target.value || undefined })}
            />
            <Input
              aria-label={`Телефон ${i + 1}`}
              type="tel"
              placeholder="+7 900 000-00-00"
              className="bg-background"
              value={p.phone ?? ""}
              onChange={(e) => setPerson(i, { phone: e.target.value || undefined })}
            />
            <Input
              aria-label={`Telegram ${i + 1}`}
              placeholder="Telegram: ник без @ или номер"
              className="bg-background"
              value={p.telegram ?? ""}
              onChange={(e) => setPerson(i, { telegram: e.target.value || undefined })}
            />
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={p.whatsapp} onCheckedChange={(whatsapp) => setPerson(i, { whatsapp })} aria-label={`Кнопка WhatsApp ${i + 1}`} />
              Кнопка WhatsApp по номеру
            </label>
          </div>
        ))}
        {block.people.length < MAX_CONTACTS && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => onChange({ people: [...block.people, { name: "", whatsapp: true }] })}
          >
            <Plus /> Контакт
          </Button>
        )}
        <Hint>Номер — в международном формате, с кодом страны: так работают WhatsApp и звонок.</Hint>
      </div>
    </>
  );
}

/** Реестр редакторов полей: тип блока → форма. */
export const blockFields: { [K in BlockType]: ComponentType<FieldsProps<K>> } = {
  hero: HeroFields,
  countdown: CountdownFields,
  calendar: CalendarFields,
  story: StoryFields,
  program: ProgramFields,
  location: LocationFields,
  dresscode: DresscodeFields,
  rsvp: RsvpFields,
  text: TextFields,
  photo: PhotoFields,
  gallery: GalleryFields,
  contacts: ContactsFields,
};
