"use client";

import { Check, SlidersHorizontal } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MULTILINE_FIELDS, QUICK_EDIT_FIELDS, quickEditPatch, quickEditValue, type QuickEditField } from "@/lib/quickEdit";
import type { Block } from "@/lib/schema";

/**
 * Высота экранной клавиатуры: на Android и iOS fixed-элементы снизу оказываются под ней — поднимаем панель на эту
 * величину (visualViewport — видимая часть страницы).
 */
function useKeyboardInset() {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setInset(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
  return inset;
}

type Props = {
  block: Block;
  field: QuickEditField;
  onChange: (patch: Partial<Block>) => void;
  onClose: () => void;
  /** «Все настройки блока» — панель с раскрытым блоком. */
  onMore: () => void;
};

/**
 * Телефон: правка надписи прямо в превью. Нажали на текст в приглашении — снизу (над клавиатурой) поле с ним,
 * шторка с панелью не открывается и не закрывает результат.
 */
export function QuickEditBar({ block, field, onChange, onClose, onMore }: Props) {
  const id = useId();
  const inset = useKeyboardInset();
  const label = QUICK_EDIT_FIELDS[field];
  const value = quickEditValue(block, field);
  const multiline = MULTILINE_FIELDS.has(field);

  return (
    <div
      role="dialog"
      aria-label={`Правка: ${label}`}
      className="fixed inset-x-0 z-[60] flex flex-col gap-2 border-t bg-background px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgb(0_0_0/0.18)] lg:hidden"
      style={{ bottom: inset }}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <Button type="button" variant="ghost" size="sm" className="-mr-2 text-muted-foreground" onClick={onMore}>
          <SlidersHorizontal /> Все настройки блока
        </Button>
      </div>
      <div className="flex items-end gap-2">
        {multiline ? (
          <Textarea id={id} autoFocus rows={3} value={value} onChange={(e) => onChange(quickEditPatch(field, e.target.value))} />
        ) : (
          <Input
            id={id}
            autoFocus
            autoComplete="off"
            enterKeyHint="done"
            value={value}
            onChange={(e) => onChange(quickEditPatch(field, e.target.value))}
            onKeyDown={(e) => e.key === "Enter" && onClose()}
          />
        )}
        <Button type="button" size="icon" aria-label="Готово" onClick={onClose}>
          <Check />
        </Button>
      </div>
    </div>
  );
}
