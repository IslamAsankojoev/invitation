"use client";

import { ArrowRight, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { forgetInvitation, loadRecent, saveRecent, type RecentInvitation } from "@/lib/recent";
import { dateWords } from "@/lib/share";

/**
 * «Продолжить» на главной: приглашения, которые открывали в этом браузере. Без входа секретная ссылка редактора —
 * единственный путь назад, и её легко потерять; так вернуться можно в одно нажатие.
 */
export function RecentInvitations() {
  // До гидратации — пусто (на сервере localStorage нет), потом — список этого браузера.
  const [list, setList] = useState<RecentInvitation[]>([]);
  useEffect(() => setList(loadRecent()), []);
  if (list.length === 0) return null;

  function forget(id: string) {
    const next = forgetInvitation(list, id);
    saveRecent(next);
    setList(next);
  }

  return (
    <section aria-labelledby="recent-title" className="flex flex-col gap-3">
      <h2 id="recent-title" className="text-lg font-semibold">
        Продолжить
      </h2>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((r) => (
          <li key={r.id} className="flex items-center gap-1 rounded-xl border bg-card p-1.5 pl-4 shadow-xs">
            <a href={`/edit/${r.id}?token=${r.token}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-md py-1.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{r.names || "Приглашение"}</span>
                {r.date && <span className="truncate text-sm text-muted-foreground">{dateWords(r.date)}</span>}
              </span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
            </a>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              aria-label={`Убрать «${r.names || "Приглашение"}» из списка`}
              title="Убрать из списка (само приглашение останется)"
              onClick={() => forget(r.id)}
            >
              <X />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
