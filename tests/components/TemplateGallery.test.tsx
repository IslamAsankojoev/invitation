// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TemplateGallery } from "@/components/templates/TemplateGallery";
import { findBlock } from "@/lib/blocks";
import { splitNames } from "@/lib/calendar";
import { createFromTemplate, templates } from "@/lib/templates";

describe("TemplateGallery", () => {
  it("показывает все шаблоны с живым превью и кнопкой выбора", () => {
    const { container } = render(<TemplateGallery />);
    expect(container.querySelectorAll("button button")).toHaveLength(0);
    for (const t of templates) {
      expect(screen.getByText(t.name)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: `Выбрать шаблон «${t.name}»` })).toBeEnabled();
      // Превью — настоящий главный экран шаблона, но недоступный с клавиатуры.
      const preview = screen.getByTestId(`template-preview-${t.id}`);
      expect(preview).toHaveAttribute("aria-hidden", "true");
      // Имена — из примера шаблона (у шаблонов со своей структурой — свои).
      for (const name of splitNames(findBlock(createFromTemplate(t), "hero")!.names)) {
        expect(within(preview).getByTestId("hero-names")).toHaveTextContent(name);
      }
    }
  });
});
