// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Editor } from "@/components/editor/Editor";
import { InvitationView } from "@/components/invitation/InvitationView";
import { createDefaultInvitation } from "@/lib/defaults";
import { invitationDataSchema, type InvitationData } from "@/lib/schema";
import { openThemeSection } from "./editorHelpers";

const withBackground = (patch: Partial<InvitationData["theme"]>): InvitationData => {
  const d = createDefaultInvitation();
  return { ...d, theme: { ...d.theme, background: "/uploads/silk.webp", ...patch } };
};

describe("фон страницы", () => {
  it("«Кремовая классика» — шёлк на всю страницу с параллаксом", () => {
    expect(createDefaultInvitation().theme).toMatchObject({ background: "/templates/cream-classic-silk.webp", backgroundMode: "parallax" });
  });

  it("старые данные без режима — «на всю высоту» и прежнее приглушение 70%", () => {
    const d = createDefaultInvitation();
    const { backgroundMode: _m, backgroundDim: _d, ...oldTheme } = d.theme;
    const parsed = invitationDataSchema.parse({ ...d, theme: { ...oldTheme, background: "/x.webp" } });
    expect(parsed.theme).toMatchObject({ backgroundMode: "stretch", backgroundDim: 0.7 });
  });

  it.each(["stretch", "fixed", "parallax"] as const)("режим %s рисует слой фона с фото", (mode) => {
    render(<InvitationView data={withBackground({ backgroundMode: mode })} slug="demo" />);
    const layer = screen.getByTestId("page-background");
    expect(layer).toHaveAttribute("data-mode", mode);
    expect(layer.innerHTML).toContain("/uploads/silk.webp");
    // fixed и parallax — «окно» высотой в экран, прилипшее к верху; parallax — картинка выше окна.
    if (mode !== "stretch") expect(layer.querySelector(".sticky")).not.toBeNull();
    if (mode === "parallax") expect(layer.innerHTML).toContain("height: 135%");
  });

  it("без фото слоя нет; корень — overflow-clip (иначе sticky не прилипает)", () => {
    render(<InvitationView data={withBackground({ background: null })} slug="demo" />);
    expect(screen.queryByTestId("page-background")).not.toBeInTheDocument();
    expect(screen.getByTestId("invitation")).toHaveClass("overflow-clip");
  });

  it("в редакторе режим и приглушение появляются, когда фото выбрано, и сразу меняют превью", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 200 })));
    const user = userEvent.setup();
    render(<Editor id="inv1" token="t" initialSlug="demo" initialData={withBackground({ backgroundMode: "stretch" })} />);
    await openThemeSection(user, "Фон страницы");
    await user.click(screen.getByRole("radio", { name: "Параллакс" }));
    expect(screen.getByTestId("page-background")).toHaveAttribute("data-mode", "parallax");
    const slider = screen.getByRole("slider", { name: "Приглушение фона страницы" });
    slider.focus();
    await user.keyboard("{Home}");
    expect(screen.getByText("0%")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
