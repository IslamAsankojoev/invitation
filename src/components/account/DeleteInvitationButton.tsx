"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/** «Удалить» в «Моих приглашениях»: подтверждение, DELETE по сессии владельца, затем список обновляется. */
export function DeleteInvitationButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/invitations/${id}`, { method: "DELETE" }).catch(() => null);
    // 404 — уже удалено (например, в другой вкладке): для человека результат тот же.
    if (!res || (!res.ok && res.status !== 404)) {
      setDeleting(false);
      return setError("Не удалось удалить. Попробуйте ещё раз.");
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <AlertDialog open={open} onOpenChange={(v) => !deleting && (setOpen(v), setError(null))}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="icon-sm" className="pointer-coarse:size-10" aria-label={`Удалить приглашение «${name}»`}>
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Удалить приглашение «{name}»?</AlertDialogTitle>
          <AlertDialogDescription>
            Ссылка для гостей перестанет открываться, ответы гостей и загруженные фото удалятся. Отменить это нельзя.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Отмена</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleting}
            onClick={(e) => {
              // Окно закрываем сами после ответа сервера — иначе ошибку негде показать.
              e.preventDefault();
              remove();
            }}
          >
            {deleting && <Loader2 className="animate-spin motion-reduce:animate-none" />} Удалить
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
