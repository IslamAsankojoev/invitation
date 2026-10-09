// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CopyButton } from "@/components/CopyButton";

describe("CopyButton", () => {
  it("копирует текст и объявляет «Скопировано», не уводя фокус", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    render(<CopyButton text="https://x.test/i/demo" label="Скопировать ссылку" />);
    const button = screen.getByRole("button", { name: "Скопировать ссылку" });
    await user.click(button);
    expect(writeText).toHaveBeenCalledWith("https://x.test/i/demo");
    expect(await screen.findByRole("status")).toHaveTextContent("Скопировано");
    expect(button).toHaveFocus();
  });

  it("если буфер недоступен — подсказывает скопировать вручную", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
    render(<CopyButton text="x" label="Скопировать">Скопировать</CopyButton>);
    await user.click(screen.getByRole("button", { name: "Скопировать" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Не удалось скопировать");
  });
});
