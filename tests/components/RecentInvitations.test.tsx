// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { Editor } from "@/components/editor/Editor";
import { RecentInvitations } from "@/components/templates/RecentInvitations";
import { createDefaultInvitation } from "@/lib/defaults";
import { RECENT_KEY } from "@/lib/recent";

describe("«Продолжить» на главной", () => {
  beforeEach(() => localStorage.clear());

  it("пусто — блока нет", () => {
    const { container } = render(<RecentInvitations />);
    expect(container).toBeEmptyDOMElement();
  });

  it("редактор запоминает приглашение — на главной ссылка в редактор с token; «×» убирает из списка", async () => {
    const user = userEvent.setup();
    const editor = render(<Editor id="inv1" token="secret" initialSlug="demo" initialData={createDefaultInvitation()} />);
    editor.unmount();
    expect(JSON.parse(localStorage.getItem(RECENT_KEY)!)).toMatchObject([{ id: "inv1", token: "secret", names: "Анна & Иван" }]);

    render(<RecentInvitations />);
    expect(screen.getByRole("heading", { name: "Продолжить" })).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Анна & Иван/ });
    expect(link).toHaveAttribute("href", "/edit/inv1?token=secret");
    expect(link).toHaveTextContent("19 июня 2027, 16:00");

    await user.click(screen.getByRole("button", { name: "Убрать «Анна & Иван» из списка" }));
    expect(screen.queryByRole("link", { name: /Анна & Иван/ })).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(RECENT_KEY)!)).toEqual([]);
  });
});
