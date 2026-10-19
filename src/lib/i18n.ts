import { guestsWord } from "./rsvp";
import type { Language } from "./schema";

/**
 * Подписи страницы гостя на языке приглашения (data.language). Тексты блоков пишет организатор — здесь только то,
 * что приглашение пишет само: кнопки, подсказки, подписи дат и форм. Редактор и подсказки превью — всегда русские.
 * Тип общий для языков: TypeScript не даст забыть перевод. Кыргызские тексты — черновик, их вычитывает носитель.
 */
export type GuestText = {
  invitation: string;
  openInvitation: string;
  tapToOpen: string;
  musicWillPlay: string;
  /** Подпись на письме конверта «от Айгерим & Нурлан»; в кыргызском — просто имена. */
  fromNames: (names: string) => string;
  musicOn: string;
  musicOff: string;
  addToCalendar: string;
  scrollDown: string;
  more: string;
  showOnMap: string;
  waitingAt: string;
  withLove: string;
  call: string;
  /** Союз между именами в две строки («и» / «жана»). */
  and: string;
  /** «в 16:00» */
  at: (time: string) => string;
  /** «2027 год» */
  year: (year: number) => string;
  weekOf: (dayMonth: string) => string;
  countdown: { days: string; hours: string; minutes: string; seconds: string; passed: string };
  gallery: { open: (i: number, n: number) => string; photo: (i: number, n: number) => string; close: string; prev: string; next: string };
  ticket: { departure: string; label: string; date: string; time: string; place: string; boarding: string };
  rsvp: {
    choiceAlone: string;
    choiceSpouse: string;
    choiceDeclined: string;
    pickNameAndAnswer: string;
    sendFailed: string;
    /** Ошибка проверки формы (на русском показывается текст ошибки схемы). */
    checkForm: string;
    thanks: string;
    /** Гость вернулся на страницу, а ответ с этого устройства уже есть. */
    alreadyAnswered: string;
    thanksAttending: (first: string, guests: number) => string;
    thanksDeclined: (first: string) => string;
    changeAnswer: string;
    until: (date: string) => string;
    namesLabel: string;
    namesPlaceholder: string;
    yourAnswer: string;
    sending: string;
    send: string;
    gladlyCome: string;
    sadlyNot: string;
    youCome: string;
    sorry: string;
    change: string;
    nameLabel: string;
    namePlaceholder: string;
    willYouCome: string;
    yes: string;
    no: string;
    howMany: string;
    lessGuests: string;
    guestsCount: string;
    moreGuests: string;
    comment: string;
    commentPlaceholder: string;
    confirm: string;
  };
};

const ru: GuestText = {
  invitation: "Приглашение",
  openInvitation: "Открыть приглашение",
  tapToOpen: "Нажмите, чтобы открыть",
  musicWillPlay: "♪ включится музыка",
  fromNames: (names) => `от ${names}`,
  musicOn: "Включить музыку",
  musicOff: "Выключить музыку",
  addToCalendar: "Добавить в календарь",
  scrollDown: "Листать вниз",
  more: "Подробнее",
  showOnMap: "Посмотреть на карте",
  waitingAt: "Ждём вас по адресу",
  withLove: "С любовью,",
  call: "Позвонить",
  and: "и",
  at: (time) => `в ${time}`,
  year: (year) => `${year} год`,
  weekOf: (dayMonth) => `Неделя ${dayMonth}`,
  countdown: { days: "дней", hours: "часов", minutes: "минут", seconds: "секунд", passed: "Событие состоялось" },
  gallery: {
    open: (i, n) => `Открыть фото ${i} из ${n}`,
    photo: (i, n) => `Фото ${i} из ${n}`,
    close: "Закрыть",
    prev: "Предыдущее фото",
    next: "Следующее фото",
  },
  ticket: { departure: "▲ Вылет", label: "Свадебный билет", date: "Дата", time: "Время", place: "Место", boarding: "Посадка на любовь" },
  rsvp: {
    choiceAlone: "Конечно, приду",
    choiceSpouse: "Приду с супругом / супругой",
    choiceDeclined: "Не смогу прийти",
    pickNameAndAnswer: "Укажите имя и выберите ответ.",
    sendFailed: "Не удалось отправить ответ",
    checkForm: "Проверьте имя и число гостей.",
    thanks: "Спасибо!",
    alreadyAnswered: "Вы уже ответили",
    thanksAttending: (first, guests) => `${first}, мы получили ваше подтверждение: ${guests} ${guestsWord(guests)}.`,
    thanksDeclined: (first) => `${first}, жаль, что вы не сможете прийти. Ваш ответ получен.`,
    changeAnswer: "Изменить ответ",
    until: (date) => `до ${date}`,
    namesLabel: "Имя или имена гостей",
    namesPlaceholder: "Например, Айжан или Айжан и Бакыт",
    yourAnswer: "Ваш ответ",
    sending: "Отправляю…",
    send: "Отправить ответ",
    gladlyCome: "С радостью приду",
    sadlyNot: "К сожалению, не смогу",
    youCome: "Вы придёте — ура! ♡",
    sorry: "Жаль, что не получится.",
    change: "изменить",
    nameLabel: "Ваше имя",
    namePlaceholder: "Имя и фамилия",
    willYouCome: "Придёте?",
    yes: "Приду",
    no: "Не смогу",
    howMany: "Сколько вас будет",
    lessGuests: "Убрать гостя",
    guestsCount: "Количество гостей",
    moreGuests: "Добавить гостя",
    comment: "Комментарий",
    commentPlaceholder: "Пожелания ...",
    confirm: "Подтвердить",
  },
};

const ky: GuestText = {
  invitation: "Чакыруу",
  openInvitation: "Чакырууну ачуу",
  tapToOpen: "Ачуу үчүн басыңыз",
  musicWillPlay: "♪ музыка ойнойт",
  fromNames: (names) => names,
  musicOn: "Музыканы күйгүзүү",
  musicOff: "Музыканы өчүрүү",
  addToCalendar: "Календарга кошуу",
  scrollDown: "Ылдый түшүү",
  more: "Кененирээк",
  showOnMap: "Картадан көрүү",
  waitingAt: "Сиздерди бул даректе күтөбүз",
  withLove: "Сүйүү менен,",
  call: "Чалуу",
  and: "жана",
  at: (time) => `саат ${time}`,
  year: (year) => `${year}-жыл`,
  weekOf: (dayMonth) => `${dayMonth} жумасы`,
  countdown: { days: "күн", hours: "саат", minutes: "мүнөт", seconds: "секунд", passed: "Майрам өттү" },
  gallery: {
    open: (i, n) => `Сүрөттү ачуу: ${i} / ${n}`,
    photo: (i, n) => `Сүрөт ${i} / ${n}`,
    close: "Жабуу",
    prev: "Мурунку сүрөт",
    next: "Кийинки сүрөт",
  },
  ticket: { departure: "▲ Учуу", label: "Той билети", date: "Күнү", time: "Убактысы", place: "Орду", boarding: "Бакытка учабыз" },
  rsvp: {
    choiceAlone: "Албетте, келем",
    choiceSpouse: "Жубайым менен келем",
    choiceDeclined: "Келе албайм",
    pickNameAndAnswer: "Атыңызды жазып, жоопту тандаңыз.",
    sendFailed: "Жоопту жөнөтүү мүмкүн болгон жок",
    checkForm: "Атыңызды жана коноктордун санын текшериңиз.",
    thanks: "Рахмат!",
    alreadyAnswered: "Сиз жооп бергенсиз",
    thanksAttending: (first, guests) => `${first}, жообуңуз кабыл алынды: ${guests} конок.`,
    thanksDeclined: (first) => `${first}, келе албай турганыңызга өкүнүчтүү. Жообуңуз кабыл алынды.`,
    changeAnswer: "Жоопту өзгөртүү",
    until: (date) => `${date} чейин`,
    namesLabel: "Коноктун же коноктордун аты",
    namesPlaceholder: "Мисалы, Айжан же Айжан жана Бакыт",
    yourAnswer: "Жообуңуз",
    sending: "Жөнөтүлүүдө…",
    send: "Жоопту жөнөтүү",
    gladlyCome: "Кубаныч менен келем",
    sadlyNot: "Тилекке каршы, келе албайм",
    youCome: "Келесиз — абдан жакшы! ♡",
    sorry: "Келе албай турганыңыз өкүнүчтүү.",
    change: "өзгөртүү",
    nameLabel: "Атыңыз",
    namePlaceholder: "Аты-жөнүңүз",
    willYouCome: "Келесизби?",
    yes: "Келем",
    no: "Келе албайм",
    howMany: "Канча киши болосуздар",
    lessGuests: "Конокту азайтуу",
    guestsCount: "Коноктордун саны",
    moreGuests: "Конок кошуу",
    comment: "Комментарий",
    commentPlaceholder: "Каалоолоруңуз ...",
    confirm: "Ырастоо",
  },
};

const texts: Record<Language, GuestText> = { ru, ky };

export const guestText = (lang: Language = "ru"): GuestText => texts[lang];

/** Подписи языков в редакторе. */
export const languageLabels: Record<Language, string> = { ru: "Русский", ky: "Кыргызча" };

/**
 * Шрифты без кыргызских букв ү, ө, ң (нет набора cyrillic-ext в Google Fonts): в кыргызском приглашении эти буквы
 * подставятся из другого шрифта. Редактор помечает такие шрифты; заголовки-капитель на кыргызском — не Tenor Sans
 * (globals.css, `[data-inv-lang="ky"]`).
 */
export const FONTS_WITHOUT_KYRGYZ = new Set([
  "amatic",
  "bellota",
  "comforter",
  "comforter-brush",
  "marck",
  "pattaya",
  "playfair",
  "playfair-sc",
  "poiret",
  "ruslan",
  "jost",
]);
