// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminTemplates } from "@/components/admin/AdminTemplates";
import { AdminVideos } from "@/components/admin/AdminVideos";
import { adminApi } from "@/components/admin/api";
import { RecordDialog } from "@/components/admin/RecordDialog";
import { TemplateEditor } from "@/components/admin/TemplateEditor";
import { findBlock, updateBlock } from "@/lib/blocks";
import { createFromTemplate, findTemplate, templates } from "@/lib/templates";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const KEY = "admin-test-key-0123456789";
const api = adminApi(KEY);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("админка: шаблоны", () => {
  it("у каждой карточки — «Редактировать» и «Записать видео» с названием; у изменённого — пометка и сброс", async () => {
    const user = userEvent.setup();
    const list = templates.slice(0, 3).map((template, i) => ({ template, status: i === 1 ? ("edited" as const) : ("base" as const) }));
    const onRecord = vi.fn();
    render(<AdminTemplates api={api} adminKey={KEY} templates={list} videoCount={{}} showcaseKey={null} onRecord={onRecord} onShowVideos={vi.fn()} onChanged={vi.fn()} />);
    const [first, second] = list.map((t) => t.template);
    expect(screen.getByRole("link", { name: `Редактировать шаблон «${first.name}»` })).toHaveAttribute("href", `/admin/${KEY}/templates/${first.id}`);
    await user.click(screen.getByRole("button", { name: `Записать видео «${first.name}»` }));
    expect(onRecord).toHaveBeenCalledWith([first]);
    expect(screen.getAllByText("Изменён")).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: `Ещё действия с шаблоном «${second.name}»` }));
    expect(screen.getByRole("menuitem", { name: "Сбросить изменения" })).toBeInTheDocument();
  });

  it("окно записи: выбранный кадр и цвет уходят в запись, ошибка сервера видна в окне", async () => {
    const user = userEvent.setup();
    const onRecord = vi.fn().mockRejectedValueOnce(new Error("Нет SHOWCASE_KEY в .env")).mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    render(<RecordDialog templates={[findTemplate("mocha")!]} open onOpenChange={onOpenChange} onRecord={onRecord} />);
    await user.click(screen.getByRole("radio", { name: "#111111" }));
    await user.click(screen.getByRole("button", { name: "Записать" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Нет SHOWCASE_KEY");
    expect(onRecord).toHaveBeenLastCalledWith({ fullscreen: false, bg: "#111111" });
    await user.click(screen.getByRole("radio", { name: /На весь кадр/ }));
    // На весь кадр фона вокруг телефона нет — и выбора цвета тоже.
    expect(screen.queryByRole("radiogroup", { name: "Фон вокруг телефона" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Записать" }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(onRecord).toHaveBeenLastCalledWith({ fullscreen: true, bg: "#111111" });
  });
});

describe("админка: видео", () => {
  const videos = [
    { name: "mocha--2026-10-12_14-00-00.mp4", templateId: "mocha", fullscreen: false, size: 4_200_000, createdAt: "2026-10-12T08:00:00.000Z" },
    { name: "lago--2026-10-11_10-00-00--full.mp4", templateId: "lago", fullscreen: true, size: 7_000_000, createdAt: "2026-10-11T04:00:00.000Z" },
  ];
  const names = { mocha: "Шоколад и сургуч", lago: "Итальянское озеро" };

  it("пусто — объяснение и путь к записи", async () => {
    const onGoRecord = vi.fn();
    render(<AdminVideos api={api} videos={[]} names={names} filter="" onFilter={vi.fn()} onChanged={vi.fn()} onGoRecord={onGoRecord} />);
    await userEvent.click(screen.getByRole("button", { name: "К шаблонам" }));
    expect(onGoRecord).toHaveBeenCalled();
  });

  it("смотреть в окне, скачать, удалить с подтверждением; фильтр по шаблону", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const onChanged = vi.fn();
    const { rerender } = render(<AdminVideos api={api} videos={videos} names={names} filter="" onFilter={vi.fn()} onChanged={onChanged} onGoRecord={vi.fn()} />);
    const list = within(screen.getByRole("list", { name: "Видео" }));
    expect(list.getAllByRole("listitem")).toHaveLength(2);
    expect(list.getAllByRole("link", { name: "Скачать" })[0]).toHaveAttribute("href", `/api/admin/${KEY}/videos/${videos[0].name}?download`);

    await user.click(screen.getByRole("button", { name: /^Смотреть видео «Шоколад и сургуч»/ }));
    const dialog = screen.getByRole("dialog", { name: "Шоколад и сургуч" });
    expect(dialog.querySelector("video")).toHaveAttribute("src", `/api/admin/${KEY}/videos/${videos[0].name}`);
    await user.click(within(dialog).getByRole("button", { name: "Удалить" }));
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Удалить" }));
    expect(fetchMock).toHaveBeenCalledWith(`/api/admin/${KEY}/videos/${videos[0].name}`, { method: "DELETE" });
    await waitFor(() => expect(onChanged).toHaveBeenCalled());

    rerender(<AdminVideos api={api} videos={videos} names={names} filter="lago" onFilter={vi.fn()} onChanged={onChanged} onGoRecord={vi.fn()} />);
    expect(within(screen.getByRole("list", { name: "Видео" })).getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText("Весь кадр")).toBeInTheDocument();
  });
});

describe("админка: правка шаблона", () => {
  it("«Сохранить в шаблон» доступно после правки; сохраняет и подставляет новые адреса фото", async () => {
    const user = userEvent.setup();
    const mocha = findTemplate("mocha")!;
    const draftData = updateBlock(createFromTemplate(mocha), "hero", { photo: "/uploads/new.webp" });
    let saved: unknown = null;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url.startsWith("/api/admin/") && init?.method === "PUT") {
          saved = JSON.parse(String(init.body)).data;
          return new Response(JSON.stringify({ template: { ...mocha }, replaced: { "/uploads/new.webp": "/templates/mocha-abc12345.webp" } }), { status: 200 });
        }
        return new Response("{}", { status: 200 });
      }),
    );
    render(<TemplateEditor adminKey={KEY} template={mocha} draft={{ id: "d1", token: "t", slug: "tpl-mocha", data: draftData }} showcaseHref={null} />);
    expect(screen.getByRole("link", { name: "Админка" })).toHaveAttribute("href", `/admin/${KEY}`);
    const button = screen.getByRole("button", { name: "Сохранить в шаблон" });
    expect(button).toBeEnabled();
    await user.click(button);
    expect(findBlock(saved as never, "hero")!.photo).toBe("/uploads/new.webp");
    // Новое фото черновика теперь — копия в public/templates.
    await waitFor(() => expect(screen.getByTestId("preview").innerHTML).toContain("/templates/mocha-abc12345.webp"));
  });

  it("черновик как шаблон — сохранять нечего", () => {
    const mocha = findTemplate("mocha")!;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 200 })));
    render(<TemplateEditor adminKey={KEY} template={mocha} draft={{ id: "d1", token: "t", slug: "tpl-mocha", data: createFromTemplate(mocha) }} showcaseHref={null} />);
    expect(screen.getByRole("button", { name: "Сохранено" })).toBeDisabled();
  });
});
