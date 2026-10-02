import {
  Alegreya,
  Alice,
  Amatic_SC,
  Arsenal,
  Bellota,
  Comforter,
  Comforter_Brush,
  Cormorant_Infant,
  Cormorant_Unicase,
  Gabriela,
  Jost,
  Kurale,
  Literata,
  Pattaya,
  Philosopher,
  Playfair_Display_SC,
  Ruslan_Display,
  Spectral,
  Vollkorn,
  Bad_Script,
  Caveat,
  Comfortaa,
  Cormorant_Garamond,
  Cormorant_SC,
  EB_Garamond,
  Forum,
  Great_Vibes,
  Inter,
  Lobster,
  Lora,
  Manrope,
  Marck_Script,
  Montserrat,
  Old_Standard_TT,
  Oranienbaum,
  Pacifico,
  Playfair_Display,
  Poiret_One,
  Prata,
  PT_Serif,
  Raleway,
  Tenor_Sans,
  Yeseva_One,
} from "next/font/google";

/**
 * Все шрифты приглашений. Каждый объявляет CSS-переменную --font-<ключ>, которую используют
 * titleFonts/bodyFonts в src/lib/theme.ts. Файл шрифта скачивается браузером только когда шрифт
 * реально применён; заранее (preload) грузим лишь шрифты стартового шаблона и заголовков.
 * Аргументы — только литералы: next/font разбирает их при сборке.
 */
const cormorant = Cormorant_Garamond({
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});
const greatVibes = Great_Vibes({ subsets: ["latin", "cyrillic"], weight: "400", variable: "--font-great-vibes" });
const tenor = Tenor_Sans({ subsets: ["latin", "cyrillic"], weight: "400", variable: "--font-tenor" });
const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter" });

const marck = Marck_Script({ subsets: ["latin", "cyrillic"], preload: false, weight: "400", variable: "--font-marck" });
const badScript = Bad_Script({ subsets: ["latin", "cyrillic"], preload: false, weight: "400", variable: "--font-bad-script" });
const caveat = Caveat({ subsets: ["latin", "cyrillic"], preload: false, variable: "--font-caveat" });
const lobster = Lobster({ subsets: ["latin", "cyrillic"], preload: false, weight: "400", variable: "--font-lobster" });
const pacifico = Pacifico({ subsets: ["latin", "cyrillic"], preload: false, weight: "400", variable: "--font-pacifico" });
const amatic = Amatic_SC({ subsets: ["latin", "cyrillic"], preload: false, weight: ["400", "700"], variable: "--font-amatic" });
const playfair = Playfair_Display({ subsets: ["latin", "cyrillic"], preload: false, style: ["normal", "italic"], variable: "--font-playfair" });
const prata = Prata({ subsets: ["latin", "cyrillic"], preload: false, weight: "400", variable: "--font-prata" });
const forum = Forum({ subsets: ["latin", "cyrillic"], preload: false, weight: "400", variable: "--font-forum" });
const yeseva = Yeseva_One({ subsets: ["latin", "cyrillic"], preload: false, weight: "400", variable: "--font-yeseva" });
const cormorantSc = Cormorant_SC({ subsets: ["latin", "cyrillic"], preload: false, weight: ["400", "500"], variable: "--font-cormorant-sc" });
const oranienbaum = Oranienbaum({ subsets: ["latin", "cyrillic"], preload: false, weight: "400", variable: "--font-oranienbaum" });
const poiret = Poiret_One({ subsets: ["latin", "cyrillic"], preload: false, weight: "400", variable: "--font-poiret" });
const comfortaa = Comfortaa({ subsets: ["latin", "cyrillic"], preload: false, variable: "--font-comfortaa" });

const comforter = Comforter({ subsets: ["latin", "cyrillic"], preload: false, weight: "400", variable: "--font-comforter" });
const comforterBrush = Comforter_Brush({ subsets: ["latin", "cyrillic"], preload: false, weight: "400", variable: "--font-comforter-brush" });
const alice = Alice({ subsets: ["latin", "cyrillic"], preload: false, weight: "400", variable: "--font-alice" });
const kurale = Kurale({ subsets: ["latin", "cyrillic"], preload: false, weight: "400", variable: "--font-kurale" });
const philosopher = Philosopher({ subsets: ["latin", "cyrillic"], preload: false, weight: ["400", "700"], style: ["normal", "italic"], variable: "--font-philosopher" });
const ruslan = Ruslan_Display({ subsets: ["latin", "cyrillic"], preload: false, weight: "400", variable: "--font-ruslan" });
const cormorantUnicase = Cormorant_Unicase({ subsets: ["latin", "cyrillic"], preload: false, weight: ["400", "500"], variable: "--font-cormorant-unicase" });
const cormorantInfant = Cormorant_Infant({ subsets: ["latin", "cyrillic"], preload: false, weight: ["300", "400"], style: ["normal", "italic"], variable: "--font-cormorant-infant" });
const playfairSc = Playfair_Display_SC({ subsets: ["latin", "cyrillic"], preload: false, weight: "400", variable: "--font-playfair-sc" });
const gabriela = Gabriela({ subsets: ["latin", "cyrillic"], preload: false, weight: "400", variable: "--font-gabriela" });
const pattaya = Pattaya({ subsets: ["latin", "cyrillic"], preload: false, weight: "400", variable: "--font-pattaya" });
const bellota = Bellota({ subsets: ["latin", "cyrillic"], preload: false, weight: ["300", "400"], style: ["normal", "italic"], variable: "--font-bellota" });

const lora = Lora({ subsets: ["latin", "cyrillic"], preload: false, style: ["normal", "italic"], variable: "--font-lora" });
const ebGaramond = EB_Garamond({ subsets: ["latin", "cyrillic"], preload: false, style: ["normal", "italic"], variable: "--font-eb-garamond" });
const oldStandard = Old_Standard_TT({ subsets: ["latin", "cyrillic"], preload: false, weight: ["400", "700"], style: ["normal", "italic"], variable: "--font-old-standard" });
const ptSerif = PT_Serif({ subsets: ["latin", "cyrillic"], preload: false, weight: ["400", "700"], style: ["normal", "italic"], variable: "--font-pt-serif" });
const montserrat = Montserrat({ subsets: ["latin", "cyrillic"], preload: false, variable: "--font-montserrat" });
const raleway = Raleway({ subsets: ["latin", "cyrillic"], preload: false, variable: "--font-raleway" });
const manrope = Manrope({ subsets: ["latin", "cyrillic"], preload: false, variable: "--font-manrope" });
const literata = Literata({ subsets: ["latin", "cyrillic"], preload: false, style: ["normal", "italic"], variable: "--font-literata" });
const spectral = Spectral({ subsets: ["latin", "cyrillic"], preload: false, weight: ["300", "400"], style: ["normal", "italic"], variable: "--font-spectral" });
const vollkorn = Vollkorn({ subsets: ["latin", "cyrillic"], preload: false, style: ["normal", "italic"], variable: "--font-vollkorn" });
const alegreya = Alegreya({ subsets: ["latin", "cyrillic"], preload: false, style: ["normal", "italic"], variable: "--font-alegreya" });
const jost = Jost({ subsets: ["latin", "cyrillic"], preload: false, style: ["normal", "italic"], variable: "--font-jost" });
const arsenal = Arsenal({ subsets: ["latin", "cyrillic"], preload: false, weight: ["400", "700"], style: ["normal", "italic"], variable: "--font-arsenal" });

export const fontVariables = [
  cormorant, greatVibes, tenor, inter, marck, badScript, caveat, lobster, pacifico, amatic, playfair, prata,
  forum, yeseva, cormorantSc, oranienbaum, poiret, comfortaa, lora, ebGaramond, oldStandard, ptSerif,
  montserrat, raleway, manrope, comforter, comforterBrush, alice, kurale, philosopher, ruslan, cormorantUnicase,
  cormorantInfant, playfairSc, gabriela, pattaya, bellota, literata, spectral, vollkorn, alegreya, jost, arsenal,
]
  .map((f) => f.variable)
  .join(" ");
