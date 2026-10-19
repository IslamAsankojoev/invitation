import { ImageResponse } from "next/og";
import { mixHex } from "@/lib/color";
import { getInvitationBySlug } from "@/lib/invitations";
import { loadGoogleFont, loadPhoto, namesFontSize, OG_SIZE, ogFontFamilies, toJpeg } from "@/lib/ogImage";
import { linkPreview } from "@/lib/share";
import { themePalette } from "@/lib/theme";

export const alt = "Приглашение";
export const size = OG_SIZE;
// JPEG, а не PNG по умолчанию: с фото он в разы легче (см. toJpeg).
export const contentType = "image/jpeg";

/**
 * Картинка превью ссылки /i/<slug> для WhatsApp и Telegram: «конверт» цветов палитры поверх фото обложки — надпись,
 * имена шрифтом приглашения, дата как на конверте и место. Главное — в центральном квадрате: WhatsApp иногда
 * показывает превью квадратом.
 */
export default async function Image({ params }: { params: { slug: string } }) {
  const inv = await getInvitationBySlug(params.slug);
  if (!inv) return new Response("Не найдено", { status: 404 });

  const p = linkPreview(inv.data);
  const colors = themePalette(inv.data.theme);
  const families = ogFontFamilies(inv.data.theme, inv.data.language);
  const label = p.label.toUpperCase();
  const names = p.names.length ? p.names : [p.label];
  const [photo, title, body, heading] = await Promise.all([
    loadPhoto(p.photo),
    loadGoogleFont(families.title, names.join("")),
    loadGoogleFont(families.body, `&${p.place ?? ""}`),
    loadGoogleFont(families.heading, `${label}${p.date ?? ""}`),
  ]);
  const fonts = (
    [
      ["Title", title],
      ["Body", body],
      ["Heading", heading],
    ] as const
  ).flatMap(([name, data]) => (data ? [{ name, data, weight: 400 as const, style: "normal" as const }] : []));

  const nameSize = namesFontSize(names, families.titleScale);
  const card = (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        backgroundColor: colors.dark ? mixHex(colors.bg, "#000000", 0.45) : mixHex(colors.bg, colors.accent, 0.22),
        // Мягкий свет за карточкой; на тёмной палитре слабее, иначе фон сереет.
        backgroundImage: `radial-gradient(circle at 50% 45%, rgba(255,255,255,${colors.dark ? 0.07 : 0.22}), rgba(255,255,255,0) 70%)`,
      }}
    >
      {photo && (
        <img src={photo} alt="" width={OG_SIZE.width} height={OG_SIZE.height} style={{ position: "absolute", top: 0, left: 0 }} />
      )}
      <div
        style={{
          width: 600,
          height: 556,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          padding: "36px 48px",
          backgroundColor: colors.bg,
          color: colors.text,
          borderRadius: 6,
          boxShadow: "0 20px 60px rgba(0,0,0,.30)",
          textAlign: "center",
        }}
      >
        <div style={{ position: "absolute", top: 18, left: 18, right: 18, bottom: 18, display: "flex", border: `2px solid ${colors.accent}`, opacity: 0.45 }} />
        <div style={{ fontFamily: "Heading", fontSize: 19, letterSpacing: 5, opacity: 0.75, marginBottom: 26 }}>{label}</div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "Title", fontSize: nameSize, lineHeight: 1.1 }}>
          {/* Без фрагмента: satori кладёт его детей в один ряд. */}
          <div>{names[0]}</div>
          {names[1] && <div style={{ fontFamily: "Body", fontSize: Math.round(nameSize * 0.42), color: colors.accent, margin: "4px 0" }}>&amp;</div>}
          {names[1] && <div>{names[1]}</div>}
        </div>
        {p.date && <div style={{ fontFamily: "Heading", fontSize: 30, letterSpacing: 9, opacity: 0.8, marginTop: 30 }}>{p.date}</div>}
        {p.place && <div style={{ fontFamily: "Body", fontSize: 27, opacity: 0.72, marginTop: 10, maxWidth: 500 }}>{p.place}</div>}
      </div>
    </div>
  );

  const render = (withFonts: boolean) => new ImageResponse(card, { ...OG_SIZE, fonts: withFonts ? fonts : undefined }).arrayBuffer();
  // Битый шрифт не должен оставить ссылку без картинки — тогда рисуем запасным шрифтом next/og.
  const png = await render(true).catch(() => render(false));
  return new Response(new Uint8Array(await toJpeg(png)), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=600" },
  });
}
