import { blockLabels } from "./blocks";
import { library, surfaceLabels } from "./library";
import type { BlockType, EnvelopeStyle, Font, InvitationData, MotionStyle, Surface } from "./schema";
import { titleFonts } from "./theme";
import { envelopeStyleLabels, motionStyleLabels, variantLabels, type VariantOf } from "./variants";

/**
 * Платные элементы оформления. В редакторе ими можно пользоваться и всё видеть в превью — они помечены «PRO».
 * Проверять тариф нужно на сервере при публикации (premiumUsage), а не в браузере.
 * Список — продуктовое решение: чтобы сделать элемент платным или бесплатным, поправьте его здесь.
 */
export const premiumVariants: { [K in BlockType]: VariantOf<K>[] } = {
  hero: ["polaroid", "minimal", "ticket"],
  countdown: ["cards"],
  calendar: ["week", "tearoff"],
  story: ["letter"],
  program: ["icons"],
  location: ["postcard"],
  dresscode: ["chips"],
  rsvp: [],
  text: [],
  photo: ["polaroid"],
  gallery: ["collage"],
  contacts: [],
};
export const premiumMotionStyles: MotionStyle[] = ["playful", "cinematic"];
export const premiumEnvelopeStyles: EnvelopeStyle[] = ["flap", "curtains", "book"];
export const premiumSurfaces: Surface[] = [
  "vellum",
  "frame",
  "frame-gold",
  "frame-baroque",
  "frame-filigree",
  "frame-roses",
  "ticket-gold",
  "plate",
  "plate-roses",
  "wreath-garden",
  "wreath-blue",
  "wreath-peony",
];
export const premiumFonts: Font[] = ["comforter-brush", "ruslan", "cormorant-unicase", "playfair-sc", "gabriela", "pattaya"];
const premiumAssets = new Set(library.filter((a) => a.premium).map((a) => a.src));

export const isPremiumVariant = <T extends BlockType>(type: T, variant: VariantOf<T>) =>
  (premiumVariants[type] as string[]).includes(variant);
export const isPremiumAsset = (src: string | null | undefined) => !!src && premiumAssets.has(src);

/** Какие платные элементы использованы в приглашении — понятными словами, без повторов. */
export function premiumUsage(data: InvitationData): string[] {
  const used = new Set<string>();
  const { theme } = data;
  if (premiumMotionStyles.includes(theme.motion.style)) used.add(`Анимации «${motionStyleLabels[theme.motion.style].label}»`);
  if (premiumEnvelopeStyles.includes(theme.envelope.style)) used.add(`Заставка «${envelopeStyleLabels[theme.envelope.style]}»`);
  if (premiumFonts.includes(theme.font)) used.add(`Шрифт ${titleFonts[theme.font].label}`);
  if (isPremiumAsset(theme.envelope.ornament) || isPremiumAsset(theme.decor.image)) used.add("Картинки из PRO-библиотеки");
  for (const b of data.blocks) {
    if (!b.visible) continue;
    if (isPremiumVariant(b.type, b.variant as never)) {
      used.add(`${blockLabels[b.type]}: вид «${(variantLabels[b.type] as Record<string, string>)[b.variant]}»`);
    }
    if (premiumSurfaces.includes(b.surface)) used.add(`Фон блока «${surfaceLabels[b.surface]}»`);
    if (b.ornaments.some((o) => isPremiumAsset(o.src))) used.add("Картинки из PRO-библиотеки");
  }
  return [...used];
}
