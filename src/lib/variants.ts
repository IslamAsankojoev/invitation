import type { BlockType, Entrance, EnvelopeStyle, Headings, MotionStyle, OrnamentEnter, OrnamentIdle, PhotoHeight, ProgramIcon, TextIcon } from "./schema";
import { BLOCK_VARIANTS } from "./schema";

export type VariantOf<T extends BlockType> = (typeof BLOCK_VARIANTS)[T][number];

/** Названия видов блоков в редакторе. */
export const variantLabels: { [K in BlockType]: Record<VariantOf<K>, string> } = {
  hero: {
    classic: "Классика",
    arch: "Арка с фото",
    polaroid: "Полароид",
    minimal: "Минимализм",
    cover: "Фото сверху",
    monogram: "Монограмма",
    ticket: "Посадочный талон",
  },
  countdown: { classic: "Цифры", circles: "Кольца", cards: "Карточки" },
  calendar: { classic: "Месяц", date: "Крупная дата", week: "Неделя", tearoff: "Отрывной листок" },
  story: { classic: "Текст или цитата", photo: "Фото и текст", letter: "Письмо" },
  program: { classic: "Таймлайн", cards: "Карточки", icons: "С иконками" },
  location: { classic: "Фото и текст", postcard: "Открытка", minimal: "Табличка" },
  dresscode: { classic: "Кружки", stripes: "Полосы", chips: "Образцы цвета" },
  rsvp: { classic: "Полная форма", compact: "Компактная" },
  text: { classic: "Текст", card: "Карточка", quote: "Цитата" },
  photo: { classic: "Во всю ширину", frame: "В рамке", polaroid: "Полароид" },
  gallery: { classic: "Сетка", collage: "Коллаж", carousel: "Лента" },
  contacts: { classic: "Список", cards: "Карточки" },
};

export const entranceLabels: Record<Entrance, string> = {
  auto: "Как в стиле анимаций",
  rise: "Выплывает снизу",
  fade: "Проявляется",
  slide: "Выезжает сбоку",
  zoom: "Приближается",
  blur: "Из размытия",
  none: "Без анимации",
};

export const ornamentEnterLabels: Record<OrnamentEnter, string> = {
  auto: "Как в стиле анимаций",
  side: "Выезжает со своего края",
  fade: "Проявляется",
  rise: "Всплывает снизу",
  drop: "Опускается сверху",
  zoom: "Приближается",
  grow: "Распускается из угла",
  spin: "С поворотом",
  blur: "Из размытия",
  none: "Сразу на месте",
};

export const ornamentIdleLabels: Record<OrnamentIdle, string> = {
  auto: "Авто: ветки на ветру, банты на ниточке",
  sway: "Покачивается на ветру",
  swing: "Качается на ниточке",
  float: "Парит",
  breathe: "Дышит",
  flutter: "Трепещет",
  shimmer: "Мерцает",
  spin: "Медленно вращается",
  none: "Стоит на месте",
};

export const motionStyleLabels: Record<MotionStyle, { label: string; hint: string }> = {
  elegant: { label: "Элегантный", hint: "Плавное появление, надписи от руки" },
  soft: { label: "Мягкий", hint: "Только тихое проявление" },
  playful: { label: "Игривый", hint: "Пружинки и подпрыгивания" },
  cinematic: { label: "Кино", hint: "Медленный зум и размытие" },
  none: { label: "Без анимаций", hint: "Всё видно сразу" },
};

export const envelopeStyleLabels: Record<EnvelopeStyle, string> = {
  seal: "Печать",
  veil: "Вуаль",
  flap: "Конверт",
  curtains: "Шторки",
  book: "Книга",
};

export const programIconLabels: Record<ProgramIcon, string> = {
  rings: "Кольца",
  glasses: "Бокалы",
  cake: "Торт",
  dinner: "Ужин",
  music: "Музыка",
  camera: "Фото",
  car: "Машина",
  heart: "Сердце",
  church: "Церемония",
  dance: "Танец",
};

export const textIconLabels: Record<TextIcon, string> = {
  ...programIconLabels,
  gift: "Подарок",
  letter: "Письмо",
  child: "Дети",
  info: "Информация",
  flower: "Цветок",
  star: "Звезда",
  plane: "Самолёт",
  globe: "Глобус",
};

export const photoHeightLabels: Record<PhotoHeight, string> = {
  auto: "Как у фото",
  screen: "На весь экран",
  square: "Квадрат",
};

export const headingsLabels: Record<Headings, string> = {
  caps: "Капитель",
  names: "Шрифтом имён",
};
