"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, ChevronDown, Circle, Copy, Ellipsis, GripVertical, ListChecks, Plus, Trash2, X } from "lucide-react";
import { useEffect, useId, useState, type ComponentType } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  addOrnament,
  blockById,
  blockName,
  blockSummary,
  canAddBlock,
  canRemoveBlock,
  duplicateBlock,
  insertBlock,
  moveBlock,
  newBlockId,
  removeBlock,
  removeOrnament,
  toggleBlock,
  updateBlock,
  updateOrnament,
} from "@/lib/blocks";
import type { Block, BlockType, InvitationData, Ornament } from "@/lib/schema";
import { checklist, type ChecklistItem } from "@/lib/checklist";
import { createBlock } from "@/lib/templates";
import { cn } from "@/lib/utils";
import { AddBlockDialog } from "./AddBlockDialog";
import { blockFields } from "./BlockFields";
import { BlockTitleFields, BlockView } from "./BlockStyle";
import { VariantPicker } from "./VariantPicker";

type Props = {
  data: InvitationData;
  onChange: (data: InvitationData) => void;
  /** Раскрытый блок (id) — всегда не больше одного: открыли другой, предыдущий закрылся. */
  expanded: string | null;
  onExpandedChange: (id: string | null) => void;
  /** Появился новый блок (добавлен или скопирован) — его раскрывают и показывают в превью. */
  onAdded?: (id: string) => void;
  /** Подвкладка раскрытого блока и «Тонкая настройка» — общие для всех блоков: оформляешь блоки подряд, не переключая. */
  view?: BlockViewState;
  onViewChange?: (view: BlockViewState) => void;
};

/** Подвкладка раскрытого блока: «Текст и фото» или «Вид». */
export type BlockTab = "content" | "view";
export type BlockViewState = { tab: BlockTab; fineOpen: boolean };
const DEFAULT_VIEW: BlockViewState = { tab: "content", fineOpen: false };

/** Объявления для скринридеров при перетаскивании (по умолчанию dnd-kit говорит по-английски). */
function announcementsFor(data: InvitationData): Announcements {
  const name = (id: unknown) => {
    const block = blockById(data, String(id));
    return block ? blockName(data, block) : String(id);
  };
  return {
    onDragStart: ({ active }) => `Блок «${name(active.id)}» взят.`,
    onDragOver: ({ active, over }) => (over ? `Блок «${name(active.id)}» над блоком «${name(over.id)}».` : undefined),
    onDragEnd: ({ active, over }) =>
      over ? `Блок «${name(active.id)}» перемещён на место блока «${name(over.id)}».` : `Блок «${name(active.id)}» отпущен.`,
    onDragCancel: ({ active }) => `Перемещение блока «${name(active.id)}» отменено.`,
  };
}

/** «⋯» в строке блока: «Дублировать» и «Удалить» — редкие действия, в строке им не место. */
function BlockMenu({ label, onDuplicate, onRemove }: { label: string; onDuplicate?: () => void; onRemove?: () => void }) {
  const [open, setOpen] = useState(false);
  if (!onDuplicate && !onRemove) return null;
  const run = (action: () => void) => () => {
    setOpen(false);
    action();
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label={`Ещё: блок «${label}»`} title="Ещё">
          <Ellipsis />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto gap-1 p-1">
        {onDuplicate && (
          <Button type="button" variant="ghost" size="sm" className="justify-start" aria-label={`Дублировать блок «${label}»`} onClick={run(onDuplicate)}>
            <Copy /> Дублировать
          </Button>
        )}
        {onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="justify-start text-destructive hover:text-destructive"
            aria-label={`Удалить блок «${label}»`}
            onClick={run(onRemove)}
          >
            <Trash2 /> Удалить
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function BlocksPanel({ data, onChange, expanded, onExpandedChange, onAdded, view: viewProp, onViewChange }: Props) {
  const [adding, setAdding] = useState(false);
  // Без Editor (в тестах панели) состояние подвкладок живёт здесь.
  const [ownView, setOwnView] = useState(DEFAULT_VIEW);
  const view = viewProp ?? ownView;
  const setView = onViewChange ?? setOwnView;
  const [removing, setRemoving] = useState<Block | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const index = (id: unknown) => data.blocks.findIndex((b) => b.id === id);
    onChange(moveBlock(data, index(active.id), index(over.id)));
  }

  function add(type: BlockType, preset?: string) {
    const block = createBlock(data, type, preset);
    onChange(insertBlock(data, block, expanded));
    setAdding(false);
    onAdded?.(block.id);
  }

  function duplicate(id: string) {
    const copyId = newBlockId(blockById(data, id)!.type, data.blocks.map((b) => b.id));
    onChange(duplicateBlock(data, id, copyId));
    onAdded?.(copyId);
  }

  function remove() {
    if (!removing) return;
    onChange(removeBlock(data, removing.id));
    if (expanded === removing.id) onExpandedChange(null);
    setRemoving(null);
  }

  return (
    <>
      <Checklist items={checklist(data)} onOpen={(id) => onExpandedChange(id)} />
      <DndContext
        // Стабильный id: иначе счётчик dnd-kit даёт разные aria-describedby на сервере и клиенте (hydration mismatch).
        id="blocks-dnd"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
        accessibility={{
          announcements: announcementsFor(data),
          screenReaderInstructions: {
            draggable: "Чтобы взять блок, нажмите пробел. Стрелками перемещайте, пробелом отпустите, Escape — отмена.",
          },
        }}
      >
        <SortableContext items={data.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col gap-2">
            {data.blocks.map((block) => (
              <BlockItem
                key={block.id}
                block={block}
                name={blockName(data, block)}
                summary={blockSummary(data, block)}
                data={data}
                expanded={expanded === block.id}
                onExpand={() => onExpandedChange(expanded === block.id ? null : block.id)}
                onToggle={() => onChange(toggleBlock(data, block.id))}
                onDuplicate={canAddBlock(data, block.type) ? () => duplicate(block.id) : undefined}
                onRemove={canRemoveBlock(block) ? () => setRemoving(block) : undefined}
                onFieldsChange={(patch) => onChange(updateBlock(data, block.id, patch))}
                onAddOrnament={(o) => onChange(addOrnament(data, block.id, o))}
                onUpdateOrnament={(i, patch) => onChange(updateOrnament(data, block.id, i, patch))}
                onRemoveOrnament={(i) => onChange(removeOrnament(data, block.id, i))}
                view={view}
                onViewChange={setView}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <Button type="button" variant="outline" className="mt-3 w-full border-dashed" onClick={() => setAdding(true)}>
        <Plus /> Добавить блок
      </Button>
      <AddBlockDialog open={adding} onOpenChange={setAdding} data={data} onPick={add} />

      <AlertDialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить блок «{removing ? blockName(data, removing) : ""}»?</AlertDialogTitle>
            <AlertDialogDescription>
              Его тексты, фото и оформление пропадут. Если блок нужен позже — его можно просто скрыть переключателем.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={remove}>
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

type ItemProps = {
  block: Block;
  /** Название в списке: «Текст», при нескольких — «Текст 2». */
  name: string;
  /** Сводка под названием: что в блоке сейчас («Анна & Иван · 19.06.2027»). */
  summary: string;
  data: InvitationData;
  expanded: boolean;
  onExpand: () => void;
  onToggle: () => void;
  /** Нет — копировать нельзя (одиночный тип или лимит блоков). */
  onDuplicate?: () => void;
  /** Нет — удалять нельзя (главный экран). */
  onRemove?: () => void;
  onFieldsChange: (patch: Partial<Block>) => void;
  onAddOrnament: (o: Ornament) => void;
  onUpdateOrnament: (index: number, patch: Partial<Ornament>) => void;
  onRemoveOrnament: (index: number) => void;
  view: BlockViewState;
  onViewChange: (view: BlockViewState) => void;
};

function BlockItem({ block, name, summary, data, expanded, onExpand, onToggle, onDuplicate, onRemove, onFieldsChange, view, onViewChange, ...ornamentHandlers }: ItemProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });
  const label = name;
  const summaryId = useId();
  const Fields = blockFields[block.type] as ComponentType<{ block: Block; onChange: (patch: Partial<Block>) => void }>;

  return (
    <li
      ref={setNodeRef}
      data-testid={`block-item-${block.type}`}
      data-block-item={block.id}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "rounded-xl border bg-card text-card-foreground shadow-xs transition-shadow",
        isDragging && "relative z-10 shadow-lg ring-2 ring-ring/40",
        expanded && "ring-1 ring-foreground/10",
      )}
    >
      <div className="flex items-center gap-1 p-1.5 pr-3">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Перетащить блок «${label}»`}
          className="flex size-8 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>
        <button
          type="button"
          onClick={onExpand}
          aria-expanded={expanded}
          aria-describedby={summary ? summaryId : undefined}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
            !block.visible && "text-muted-foreground",
          )}
        >
          <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", !expanded && "-rotate-90")} />
          <span className="flex min-w-0 flex-col">
            <span className="truncate">{label}</span>
            {/* Сводка — второй строкой; в доступное имя кнопки не входит (имя — название блока), а описывает её. */}
            {summary && (
              <span id={summaryId} aria-hidden="true" className="truncate text-xs font-normal text-muted-foreground">
                {summary}
              </span>
            )}
          </span>
        </button>
        <BlockMenu label={label} onDuplicate={onDuplicate} onRemove={onRemove} />
        <Switch checked={block.visible} onCheckedChange={onToggle} aria-label={`Показывать блок «${label}»`} />
      </div>
      {expanded && (
        // Сначала текст (за ним блок и открывают), оформление — на соседней подвкладке.
        <Tabs value={view.tab} onValueChange={(tab) => onViewChange({ ...view, tab: tab as BlockTab })} className="gap-0 border-t">
          <div className="px-4 pt-3">
            <TabsList className="w-full">
              <TabsTrigger value="content">Текст и фото</TabsTrigger>
              <TabsTrigger value="view">Вид</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="content" className="flex flex-col gap-4 p-4">
            <BlockTitleFields block={block} onChange={onFieldsChange} />
            <Fields block={block} onChange={onFieldsChange} />
          </TabsContent>
          <TabsContent value="view" className="flex flex-col gap-4 p-4">
            <VariantPicker data={data} block={block} onChange={(variant) => onFieldsChange({ variant })} />
            <BlockView
              block={block}
              theme={data.theme}
              onChange={onFieldsChange}
              {...ornamentHandlers}
              fineOpen={view.fineOpen}
              onFineOpenChange={(fineOpen) => onViewChange({ ...view, fineOpen })}
            />
          </TabsContent>
        </Tabs>
      )}
    </li>
  );
}

/** Ключ localStorage: карточку «Что осталось заполнить» закрыли. */
const CHECKLIST_HIDDEN_KEY = "editor-checklist-hidden";

/**
 * «Что осталось заполнить»: главное, что в приглашении ещё из примера шаблона (lib/checklist.ts). Пункт открывает
 * свой блок. Всё сделано — карточки нет; закрыть можно и раньше (запоминается в браузере).
 */
function Checklist({ items, onOpen }: { items: ChecklistItem[]; onOpen: (blockId: string) => void }) {
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    try {
      setHidden(localStorage.getItem(CHECKLIST_HIDDEN_KEY) === "1");
    } catch {
      setHidden(false);
    }
  }, []);
  const left = items.filter((i) => !i.done).length;
  if (hidden || left === 0) return null;
  return (
    <section aria-label="Что осталось заполнить" className="mb-3 rounded-xl border bg-muted/40 p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <ListChecks className="size-4 text-muted-foreground" />
        <span className="flex-1">Что осталось заполнить</span>
        <span className="text-xs font-normal text-muted-foreground">
          {items.length - left} из {items.length}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Скрыть список «Что осталось заполнить»"
          onClick={() => {
            setHidden(true);
            try {
              localStorage.setItem(CHECKLIST_HIDDEN_KEY, "1");
            } catch {
              // приватный режим — список просто покажется снова
            }
          }}
        >
          <X />
        </Button>
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <li key={item.key}>
            <Button
              type="button"
              variant={item.done ? "ghost" : "outline"}
              size="sm"
              aria-label={`${item.label}: ${item.done ? "заполнено" : "заполнить"}`}
              className={cn("bg-background", item.done && "text-muted-foreground line-through decoration-muted-foreground/40")}
              onClick={() => onOpen(item.blockId)}
            >
              {item.done ? <Check className="text-emerald-600" /> : <Circle className="text-muted-foreground" />}
              {item.label}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
