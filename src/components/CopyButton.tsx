"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Копирует текст в буфер. Иконка сменяется галочкой, а скринридер слышит «Скопировано» (живой регион),
 * фокус при этом не уходит. `children` — видимая подпись; без неё кнопка-иконка с `label` в aria-label.
 */
export function CopyButton({
  text,
  label,
  children,
  ...props
}: { text: string; label: string; children?: React.ReactNode } & Omit<React.ComponentProps<typeof Button>, "onClick" | "children">) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={children ? "sm" : "icon-sm"}
        aria-label={children ? undefined : label}
        {...props}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setState("copied");
          } catch {
            setState("failed");
          }
          setTimeout(() => setState("idle"), 1800);
        }}
      >
        {state === "copied" ? <Check /> : <Copy />}
        {children && (state === "copied" ? "Скопировано" : children)}
      </Button>
      <span role="status" className="sr-only">
        {state === "copied" ? "Скопировано" : state === "failed" ? "Не удалось скопировать — выделите ссылку вручную" : ""}
      </span>
    </>
  );
}
