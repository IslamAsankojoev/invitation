"use client";

import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Clock,
  Heart,
  Image,
  Images,
  MapPin,
  Phone,
  Shirt,
  Timer,
  Type,
  type LucideIcon,
} from "lucide-react";
import { textIcons } from "@/components/invitation/blocks/TextBlock";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { blockDescriptions, blockLabels, canAddBlock, isSingleType } from "@/lib/blocks";
import { MAX_BLOCKS, type BlockType, type InvitationData } from "@/lib/schema";
import { TEXT_PRESETS } from "@/lib/templates";
import { cn } from "@/lib/utils";

/** Порядок типов в окне: сначала новые универсальные, потом остальные — в порядке страницы. */
const TYPES: BlockType[] = ["text", "photo", "gallery", "contacts", "story", "program", "location", "dresscode", "countdown", "calendar", "rsvp", "hero"];

const typeIcons: Record<BlockType, LucideIcon> = {
  hero: Heart,
  countdown: Timer,
  calendar: CalendarDays,
  story: BookOpen,
  program: Clock,
  location: MapPin,
  dresscode: Shirt,
  rsvp: ClipboardCheck,
  text: Type,
  photo: Image,
  gallery: Images,
  contacts: Phone,
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: InvitationData;
  /** Выбран тип (и для «Текста» — готовый вариант). */
  onPick: (type: BlockType, preset?: string) => void;
};

const tile =
  "flex items-start gap-3 rounded-lg border bg-card p-3 text-left outline-none transition hover:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50";

/** Окно «Добавить блок»: тип блока (одиночные, которые уже есть, неактивны) и готовые тексты. */
export function AddBlockDialog({ open, onOpenChange, data, onPick }: Props) {
  const full = data.blocks.length >= MAX_BLOCKS;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85svh] flex-col gap-4 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Добавить блок</DialogTitle>
          <DialogDescription>
            {full ? `В приглашении уже ${MAX_BLOCKS} блоков — это максимум.` : "Блок появится под открытым блоком, или в конце, если все закрыты."}
          </DialogDescription>
        </DialogHeader>
        <div className="-mx-1 flex min-h-0 flex-col gap-4 overflow-y-auto px-1 pb-1">
          <div className="grid grid-cols-2 gap-2">
            {TYPES.map((type) => {
              const Icon = typeIcons[type];
              const taken = isSingleType(type) && data.blocks.some((b) => b.type === type);
              return (
                <button
                  key={type}
                  type="button"
                  className={tile}
                  disabled={!canAddBlock(data, type)}
                  aria-label={`Добавить блок «${blockLabels[type]}»`}
                  onClick={() => onPick(type)}
                >
                  <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{blockLabels[type]}</span>
                    <span className="block text-xs text-muted-foreground">{taken ? "Уже есть — может быть только один" : blockDescriptions[type]}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Готовые тексты</p>
            <div className="flex flex-wrap gap-2">
              {TEXT_PRESETS.map((p) => {
                const Icon = textIcons[p.icon];
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={full}
                    onClick={() => onPick("text", p.id)}
                    className={cn(tile, "items-center gap-2 px-3 py-2 text-sm")}
                  >
                    <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
                    {p.title}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
