"use client";

import { useMemo } from "react";
import { DecorLayer } from "@/components/invitation/DecorLayer";
import { InvitationView } from "@/components/invitation/InvitationView";
import { createFromTemplate, type Template } from "@/lib/templates";
import { cn } from "@/lib/utils";

const PHONE_WIDTH = 390;
const PHONE_HEIGHT = 700;

/**
 * Живое превью шаблона: настоящий главный экран приглашения (шрифты, украшения, падающий декор),
 * уменьшенный до `width` пикселей. Некликабельно и недоступно с клавиатуры — это картинка.
 */
export function TemplatePreview({
  template,
  width,
  animated = true,
  className,
}: {
  template: Template;
  width: number;
  animated?: boolean;
  className?: string;
}) {
  const scale = width / PHONE_WIDTH;
  const data = useMemo(() => {
    const full = createFromTemplate(template);
    return { ...full, blocks: full.blocks.filter((b) => b.type === "hero") };
  }, [template]);

  return (
    <div
      aria-hidden="true"
      inert
      data-testid={`template-preview-${template.id}`}
      className={cn("relative overflow-hidden", className)}
      style={{ width, height: PHONE_HEIGHT * scale }}
    >
      <div
        className="pointer-events-none absolute top-0 left-0 origin-top-left"
        style={{ width: PHONE_WIDTH, height: PHONE_HEIGHT, transform: `scale(${scale})` }}
      >
        <div className="h-full [&_[data-block=hero]]:min-h-[700px]">
          <InvitationView data={data} slug="preview" preview motion="off" />
        </div>
        {animated && <DecorLayer decor={data.theme.decor} contained />}
      </div>
    </div>
  );
}
