import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultInvitation } from "@/lib/defaults";
import { loadGoogleFont, namesFontSize, ogFontFamilies, photoSource } from "@/lib/ogImage";
import { originFrom } from "@/lib/siteUrl";

describe("ogFontFamilies — шрифты картинки превью как в приглашении", () => {
  it("имена Google Fonts, в т.ч. для сокращённых подписей", () => {
    const theme = createDefaultInvitation().theme;
    expect(ogFontFamilies({ ...theme, font: "script", bodyFont: "auto" })).toMatchObject({ title: "Great Vibes", body: "Cormorant Garamond", heading: "Tenor Sans" });
    expect(ogFontFamilies({ ...theme, font: "oranienbaum", bodyFont: "auto" })).toMatchObject({ title: "Oranienbaum", body: "Old Standard TT", titleScale: 0.85 });
  });

  it("на кыргызском капитель — Raleway: в Tenor Sans нет ү, ө, ң", () => {
    expect(ogFontFamilies(createDefaultInvitation().theme, "ky").heading).toBe("Raleway");
  });
});

describe("namesFontSize", () => {
  it("длинное имя мельче, но не меньше 44 px; учитывает масштаб шрифта", () => {
    expect(namesFontSize(["Анна", "Иван"])).toBe(104);
    expect(namesFontSize(["Александра", "Константин"])).toBe(90);
    expect(namesFontSize(["Очень длинное имя без амперсанда"])).toBe(44);
    expect(namesFontSize(["Анна"], 0.5)).toBe(52);
  });
});

describe("photoSource — фото только из своих файлов", () => {
  const pub = path.join("/app", "public");
  const supabase = "https://abc.supabase.co";

  it("свой файл из public/ — да, выход из папки — нет", () => {
    expect(photoSource("/templates/lago-walk.webp?v=1", undefined, pub)).toEqual({ file: path.join(pub, "templates/lago-walk.webp") });
    expect(photoSource("/uploads/%D1%84%D0%BE%D1%82%D0%BE.webp", undefined, pub)).toEqual({ file: path.join(pub, "uploads/фото.webp") });
    expect(photoSource("/../.env", undefined, pub)).toBeNull();
    expect(photoSource("/%2e%2e/.env", undefined, pub)).toBeNull();
    expect(photoSource("/%E0%A4%A", undefined, pub)).toBeNull();
  });

  it("с чужого адреса — только публичный бакет нашего Supabase", () => {
    const own = `${supabase}/storage/v1/object/public/uploads/inv/1/a.webp`;
    expect(photoSource(own, supabase, pub)).toEqual({ remote: own });
    expect(photoSource(own, undefined, pub)).toBeNull();
    expect(photoSource(`${supabase}/rest/v1/secret`, supabase, pub)).toBeNull();
    expect(photoSource("http://169.254.169.254/latest/meta-data", supabase, pub)).toBeNull();
    expect(photoSource("//evil.example/a.webp", supabase, pub)).toBeNull();
  });
});

describe("loadGoogleFont", () => {
  afterEach(() => vi.restoreAllMocks());
  const css = "@font-face { font-family: 'Great Vibes'; src: url(https://fonts.gstatic.com/l/font?kit=abc) format('truetype'); }";

  it("берёт TTF по ссылке из CSS Google Fonts только с нужными буквами и кэширует его", async () => {
    const font = new Uint8Array([1, 2, 3]).buffer;
    const fetchMock = vi.fn(async (url: string | URL | Request) =>
      String(url).startsWith("https://fonts.googleapis.com/") ? new Response(css) : new Response(font),
    );
    const data = await loadGoogleFont("Great Vibes", "Анна", fetchMock as typeof fetch);
    expect(new Uint8Array(data!)).toEqual(new Uint8Array([1, 2, 3]));
    expect(String(fetchMock.mock.calls[0][0])).toBe(`https://fonts.googleapis.com/css2?family=Great%20Vibes&text=${encodeURIComponent("Анна")}`);
    expect(String(fetchMock.mock.calls[1][0])).toBe("https://fonts.gstatic.com/l/font?kit=abc");

    await loadGoogleFont("Great Vibes", "Анна", fetchMock as typeof fetch);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("нет сети — null, и следующий запрос пробует снова", async () => {
    const offline = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    expect(await loadGoogleFont("Prata", "Иван", offline)).toBeNull();
    expect(await loadGoogleFont("Prata", "Иван", offline)).toBeNull();
    expect(offline).toHaveBeenCalledTimes(2);
  });
});

describe("originFrom — адрес сайта по заголовкам запроса", () => {
  const from = (h: Record<string, string>) => originFrom((name) => h[name]).toString();

  it("хост прокси важнее своего; протокол — от прокси, иначе http для localhost и https для остальных", () => {
    expect(from({ host: "localhost:3000" })).toBe("http://localhost:3000/");
    expect(from({ host: "keleber.kg" })).toBe("https://keleber.kg/");
    expect(from({ host: "10.0.0.5:3000", "x-forwarded-host": "invite.kg, proxy", "x-forwarded-proto": "https" })).toBe("https://invite.kg/");
    expect(from({ host: "192.168.1.5:3000", "x-forwarded-proto": "http" })).toBe("http://192.168.1.5:3000/");
    expect(from({})).toBe("http://localhost:3000/");
  });
});
