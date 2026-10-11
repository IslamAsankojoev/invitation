// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeleteInvitationButton } from "@/components/account/DeleteInvitationButton";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

afterEach(() => {
  vi.unstubAllGlobals();
  refresh.mockReset();
});

describe("«Удалить» в «Моих приглашениях»", () => {
  it("спрашивает подтверждение, удаляет и обновляет список; «Отмена» ничего не делает", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<DeleteInvitationButton id="inv1" name="Айгерим & Нурлан" />);

    await user.click(screen.getByRole("button", { name: "Удалить приглашение «Айгерим & Нурлан»" }));
    expect(screen.getByRole("alertdialog", { name: "Удалить приглашение «Айгерим & Нурлан»?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Отмена" }));
    expect(fetchMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Удалить приглашение «Айгерим & Нурлан»" }));
    await user.click(screen.getByRole("button", { name: "Удалить" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/invitations/inv1", { method: "DELETE" });
    expect(refresh).toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("ошибка сервера — окно остаётся открытым с сообщением", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 500 })));
    const user = userEvent.setup();
    render(<DeleteInvitationButton id="inv1" name="Без имён" />);
    await user.click(screen.getByRole("button", { name: "Удалить приглашение «Без имён»" }));
    await user.click(screen.getByRole("button", { name: "Удалить" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Не удалось удалить");
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });
});
