// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { galleryColumns } from "@/components/invitation/blocks/GalleryBlock";
import { InvitationView } from "@/components/invitation/InvitationView";
import { insertBlock, updateBlock } from "@/lib/blocks";
import { createDefaultInvitation } from "@/lib/defaults";
import type { Block, BlockType } from "@/lib/schema";
import { createBlock } from "@/lib/templates";

const withBlock = (type: BlockType, patch: Partial<Block> = {}) => {
  const data = createDefaultInvitation();
  const block = createBlock(data, type);
  return { data: updateBlock(insertBlock(data, block), block.id, patch), id: block.id };
};

describe("Новые блоки", () => {
  it("«Текст»: значок, текст и кнопка-ссылка; без ссылки кнопки нет", () => {
    const { data } = withBlock("text", { buttonLabel: "Список подарков", buttonUrl: "https://example.com/list" } as Partial<Block>);
    const { container } = render(<InvitationView data={data} slug="demo" />);
    const section = within(container.querySelector<HTMLElement>('[data-block="text"]')!);
    expect(section.getByRole("heading", { name: "Пожелания" })).toBeInTheDocument();
    expect(section.getByRole("link", { name: "Список подарков" })).toHaveAttribute("href", "https://example.com/list");

    const plain = withBlock("text").data;
    const { container: c2 } = render(<InvitationView data={plain} slug="demo" />);
    expect(within(c2.querySelector<HTMLElement>('[data-block="text"]')!).queryByRole("link")).toBeNull();
  });

  it("«Фото» и «Галерея» без фото: гость их не видит, в превью — подсказка", () => {
    let { data } = withBlock("photo");
    data = insertBlock(data, createBlock(data, "gallery"));
    const guest = render(<InvitationView data={data} slug="demo" />);
    expect(guest.container.querySelector('[data-block="photo"]')).toBeNull();
    expect(guest.container.querySelector('[data-block="gallery"]')).toBeNull();
    guest.unmount();
    render(<InvitationView data={data} slug="demo" preview />);
    expect(screen.getByText("Загрузите фото в редакторе")).toBeInTheDocument();
    expect(screen.getByText("Добавьте фото в редакторе")).toBeInTheDocument();
  });

  it("галерея открывает фото во весь экран; стрелки листают по кругу, Escape закрывает", () => {
    const photos = ["/uploads/a.jpg", "/uploads/b.jpg", "/uploads/c.jpg"];
    const { data } = withBlock("gallery", { photos } as Partial<Block>);
    render(<InvitationView data={data} slug="demo" />);
    fireEvent.click(screen.getByRole("button", { name: "Открыть фото 3 из 3" }));
    const dialog = screen.getByRole("dialog", { name: "Фото 3 из 3" });
    expect(dialog.querySelector("img")).toHaveAttribute("src", "/uploads/c.jpg");
    fireEvent.click(within(dialog).getByRole("button", { name: "Следующее фото" }));
    expect(screen.getByRole("dialog", { name: "Фото 1 из 3" })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("в превью редактора фото галереи не открываются", () => {
    const { data } = withBlock("gallery", { photos: ["/uploads/a.jpg", "/uploads/b.jpg"] } as Partial<Block>);
    render(<InvitationView data={data} slug="demo" preview />);
    fireEvent.click(screen.getByRole("button", { name: "Открыть фото 1 из 2" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("колонки сетки галереи", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9].map(galleryColumns)).toEqual([1, 2, 3, 2, 2, 3, 3, 3, 3]);
  });

  it("«Контакты»: кнопки только для заполненного, WhatsApp можно выключить", () => {
    const { data } = withBlock("contacts", {
      people: [
        { name: "Мария", role: "Организатор", phone: "+7 900 000-00-00", whatsapp: false, telegram: "@maria_wed" },
        { name: "Олег", whatsapp: true },
      ],
    } as Partial<Block>);
    const { container } = render(<InvitationView data={data} slug="demo" />);
    const section = within(container.querySelector<HTMLElement>('[data-block="contacts"]')!);
    expect(section.getByRole("link", { name: "Позвонить — Мария" })).toHaveAttribute("href", "tel:+79000000000");
    expect(section.getByRole("link", { name: "Telegram — Мария" })).toHaveAttribute("href", "https://t.me/maria_wed");
    expect(section.queryByRole("link", { name: /WhatsApp/ })).toBeNull();
    expect(section.queryByRole("link", { name: /Олег/ })).toBeNull();
  });

  it("два блока одного типа рендерятся оба, у каждого свой data-block-id", () => {
    const { data, id } = withBlock("story");
    const { container } = render(<InvitationView data={data} slug="demo" />);
    const ids = [...container.querySelectorAll('[data-block="story"]')].map((el) => el.getAttribute("data-block-id"));
    expect(ids).toEqual(["b-story", id]);
  });
});
