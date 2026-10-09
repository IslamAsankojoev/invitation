"use client";

import { Download, Eye, Inbox, Loader2, Plus, Search, Send, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, type FormEvent } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { filterAnswers, type AnswerFilter } from "@/lib/rsvp";

export type Answer = { id: string; name: string; attending: boolean; guestsCount: number; comment: string | null; createdAt: string };

type Props = {
  invitationId: string;
  slug: string;
  token: string;
  answers: Answer[];
  csvHref: string;
  csvName: string;
  /** Пустой список — повод отправить приглашение: те же ссылки, что во вкладке «Ссылка» редактора. */
  share: { whatsapp: string; telegram: string };
};

const when = (iso: string) => new Date(iso).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });

/**
 * Список ответов для организатора: поиск по имени, «все / придут / не придут», удаление ошибочного ответа и
 * «Добавить ответ» — за гостя, который ответил по телефону. После правки страница перечитывает данные с сервера.
 */
export function GuestAnswers({ invitationId, slug, token, answers, csvHref, csvName, share }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AnswerFilter>("all");
  const [removing, setRemoving] = useState<Answer | null>(null);
  const [adding, setAdding] = useState(false);
  const shown = useMemo(() => filterAnswers(answers, filter, query), [answers, filter, query]);
  const counts = { all: answers.length, yes: answers.filter((a) => a.attending).length, no: answers.filter((a) => !a.attending).length };

  async function remove(answer: Answer) {
    await fetch(`/api/invitations/${invitationId}/rsvp/${answer.id}?token=${encodeURIComponent(token)}`, { method: "DELETE" }).catch(() => null);
    setRemoving(null);
    router.refresh();
  }

  const status = (a: Answer) => (a.attending ? <Badge>Придёт · {a.guestsCount}</Badge> : <Badge variant="secondary">Не придёт</Badge>);
  const deleteButton = (a: Answer) => (
    <Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" aria-label={`Удалить ответ «${a.name}»`} onClick={() => setRemoving(a)}>
      <Trash2 />
    </Button>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Все ответы</CardTitle>
        <CardDescription>{answers.length === 0 ? "Пока никто не ответил" : `Ответов: ${answers.length}`}</CardDescription>
        <CardAction className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)} aria-label="Добавить ответ">
            <Plus /> <span className="max-sm:sr-only">Добавить ответ</span>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={csvHref} download={csvName} aria-label="Экспорт в CSV">
              <Download /> <span className="max-sm:sr-only">Экспорт в CSV</span>
            </a>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {answers.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <Inbox className="size-8 text-muted-foreground" />
            <p className="max-w-xs text-sm text-muted-foreground">
              Отправьте ссылку гостям — как только они ответят, ответы появятся здесь. Кто ответил по телефону — добавьте
              сами.
            </p>
            <div className="grid w-full max-w-sm grid-cols-2 gap-2">
              <Button asChild className="bg-[#25d366] text-white hover:bg-[#1ebe5b]">
                <a href={share.whatsapp} target="_blank" rel="noopener noreferrer" aria-label="Отправить в WhatsApp">
                  <Send /> WhatsApp
                </a>
              </Button>
              <Button asChild className="bg-[#2aabee] text-white hover:bg-[#1e96d4]">
                <a href={share.telegram} target="_blank" rel="noopener noreferrer" aria-label="Отправить в Telegram">
                  <Send /> Telegram
                </a>
              </Button>
            </div>
            <Button asChild variant="ghost" size="sm">
              <a href={`/i/${slug}`} target="_blank">
                <Eye /> Посмотреть как гость
              </a>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="search" aria-label="Поиск по имени" placeholder="Поиск по имени" className="pl-8" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                aria-label="Показать"
                value={filter}
                onValueChange={(v) => v && setFilter(v as AnswerFilter)}
              >
                <ToggleGroupItem value="all">Все · {counts.all}</ToggleGroupItem>
                <ToggleGroupItem value="yes">Придут · {counts.yes}</ToggleGroupItem>
                <ToggleGroupItem value="no">Не придут · {counts.no}</ToggleGroupItem>
              </ToggleGroup>
            </div>

            {shown.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Никого не нашли</p>}

            {/* Телефон: таблица в пять столбцов не помещается — карточки ответов. */}
            <ul data-testid="guest-list" className="flex flex-col divide-y sm:hidden">
              {shown.map((a) => (
                <li key={a.id} className="flex items-start gap-2 py-3">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{a.name}</span>
                      {status(a)}
                    </div>
                    {a.comment && <p className="text-sm text-muted-foreground">{a.comment}</p>}
                    <span className="text-xs text-muted-foreground">{when(a.createdAt)}</span>
                  </div>
                  {deleteButton(a)}
                </li>
              ))}
            </ul>
            <Table className="max-sm:hidden">
              <TableHeader>
                <TableRow>
                  <TableHead>Имя</TableHead>
                  <TableHead>Ответ</TableHead>
                  <TableHead>Комментарий</TableHead>
                  <TableHead className="text-right">Дата</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell>{status(a)}</TableCell>
                    <TableCell className="max-w-64 whitespace-normal text-muted-foreground">{a.comment}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{when(a.createdAt)}</TableCell>
                    <TableCell>{deleteButton(a)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>

      <AlertDialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить ответ «{removing?.name}»?</AlertDialogTitle>
            <AlertDialogDescription>Например, если гость ответил дважды. Вернуть ответ нельзя.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => removing && remove(removing)}>
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogTitle>Добавить ответ</DialogTitle>
          <DialogDescription>Для гостя, который ответил по телефону или лично.</DialogDescription>
          {adding && (
            <AddAnswerForm
              slug={slug}
              token={token}
              onDone={() => {
                setAdding(false);
                router.refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function AddAnswerForm({ slug, token, onDone }: { slug: string; token: string; onDone: () => void }) {
  const ids = useId();
  const [name, setName] = useState("");
  const [attending, setAttending] = useState(true);
  // Число гостей — строкой, пока вводят; 1–10 проверяем при сохранении (иначе стереть «1» и набрать «3» нельзя).
  const [guests, setGuests] = useState("1");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Укажите имя");
    const count = Math.min(10, Math.max(1, Math.round(Number(guests)) || 1));
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/invitations/${slug}/rsvp?token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, attending, guestsCount: attending ? count : 1, comment: comment.trim() || undefined }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) return onDone();
    setError("Не удалось сохранить ответ. Попробуйте ещё раз.");
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <Field data-invalid={!!error || undefined}>
        <FieldLabel htmlFor={`${ids}-name`}>Имя</FieldLabel>
        <Input id={`${ids}-name`} autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Имя и фамилия" />
        {error && <FieldError>{error}</FieldError>}
      </Field>
      <ToggleGroup type="single" variant="outline" aria-label="Ответ" value={attending ? "yes" : "no"} onValueChange={(v) => v && setAttending(v === "yes")}>
        <ToggleGroupItem value="yes">Придёт</ToggleGroupItem>
        <ToggleGroupItem value="no">Не придёт</ToggleGroupItem>
      </ToggleGroup>
      {attending && (
        <Field>
          <FieldLabel htmlFor={`${ids}-guests`}>Сколько гостей</FieldLabel>
          <Input
            id={`${ids}-guests`}
            type="number"
            inputMode="numeric"
            min={1}
            max={10}
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
          />
        </Field>
      )}
      <Field>
        <FieldLabel htmlFor={`${ids}-comment`}>Комментарий</FieldLabel>
        <Textarea id={`${ids}-comment`} rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
      </Field>
      <Button type="submit" disabled={busy}>
        {busy && <Loader2 className="animate-spin" />} Сохранить
      </Button>
    </form>
  );
}
