"use client";

import { Clapperboard, Download, Play, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
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
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { formatDate, formatSize, type AdminApi, type VideoFile } from "./api";

type Props = {
  api: AdminApi;
  videos: VideoFile[];
  /** id шаблона → название (у ролика удалённого шаблона — его id). */
  names: Record<string, string>;
  filter: string;
  onFilter: (templateId: string) => void;
  onChanged: () => void;
  onGoRecord: () => void;
};

/** Ролики: превью-кадр, просмотр в окне (только по нажатию — без автозапуска в сетке), скачать, удалить. */
export function AdminVideos({ api, videos, names, filter, onFilter, onChanged, onGoRecord }: Props) {
  const [playing, setPlaying] = useState<VideoFile | null>(null);
  const [removing, setRemoving] = useState<VideoFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const shown = useMemo(() => (filter ? videos.filter((v) => v.templateId === filter) : videos), [videos, filter]);
  const templateIds = useMemo(() => [...new Set(videos.map((v) => v.templateId))], [videos]);
  const nameOf = (v: VideoFile) => names[v.templateId] ?? v.templateId;

  async function remove(video: VideoFile) {
    setError(null);
    try {
      await api.deleteVideo(video.name);
      if (playing?.name === video.name) setPlaying(null);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить");
    }
  }

  if (!videos.length)
    return (
      <Card className="items-center gap-3 px-6 py-12 text-center">
        <Clapperboard aria-hidden="true" className="size-8 text-muted-foreground" />
        <p className="font-medium">Видео пока нет</p>
        <p className="max-w-sm text-sm text-muted-foreground">Запишите ролик шаблона — он появится здесь: посмотреть, скачать для Instagram или удалить.</p>
        <Button type="button" onClick={onGoRecord}>
          <Clapperboard /> К шаблонам
        </Button>
      </Card>
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {shown.length} из {videos.length} · {formatSize(shown.reduce((s, v) => s + v.size, 0))}
        </p>
        <NativeSelect aria-label="Шаблон" value={filter} onChange={(e) => onFilter(e.target.value)} className="min-w-52">
          <NativeSelectOption value="">Все шаблоны</NativeSelectOption>
          {templateIds.map((id) => (
            <NativeSelectOption key={id} value={id}>
              {names[id] ?? id}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" aria-label="Видео">
        {shown.map((v) => (
          <li key={v.name}>
            <Card className="gap-0 overflow-hidden p-0">
              <button
                type="button"
                onClick={() => setPlaying(v)}
                className="group relative block aspect-[9/16] w-full overflow-hidden bg-black outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset"
                aria-label={`Смотреть видео «${nameOf(v)}», ${formatDate(v.createdAt)}`}
              >
                {/* #t=1 — браузер показывает кадр с первой секунды (в нулевой — ещё пустой экран перед конвертом). */}
                <video src={`${api.videoUrl(v.name)}#t=1`} preload="metadata" muted playsInline className="h-full w-full object-cover" aria-hidden="true" tabIndex={-1} />
                <span className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors group-hover:bg-black/30 motion-reduce:transition-none">
                  <span className="flex size-12 items-center justify-center rounded-full bg-white/90 text-black shadow-lg transition-transform group-hover:scale-110 motion-reduce:transition-none">
                    <Play className="size-5 translate-x-px fill-current" aria-hidden="true" />
                  </span>
                </span>
                <Badge variant="secondary" className="absolute top-2 left-2">
                  {v.fullscreen ? "Весь кадр" : "Телефон"}
                </Badge>
              </button>
              <div className="flex flex-col gap-2 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium" title={nameOf(v)}>
                    {nameOf(v)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(v.createdAt)} · {formatSize(v.size)}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <Button asChild variant="outline" size="sm" className="flex-1 pointer-coarse:h-10">
                    <a href={`${api.videoUrl(v.name)}?download`} download={v.name}>
                      <Download /> Скачать
                    </a>
                  </Button>
                  <Button type="button" variant="outline" size="icon-sm" className="pointer-coarse:size-10" aria-label={`Удалить видео «${nameOf(v)}», ${formatDate(v.createdAt)}`} onClick={() => setRemoving(v)}>
                    <Trash2 />
                  </Button>
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <Dialog open={!!playing} onOpenChange={(open) => !open && setPlaying(null)}>
        <DialogContent className="max-h-svh gap-3 overflow-y-auto sm:max-w-md">
          {playing && (
            <>
              <DialogHeader>
                <DialogTitle>{nameOf(playing)}</DialogTitle>
                <DialogDescription>
                  {formatDate(playing.createdAt)} · {formatSize(playing.size)} · {playing.fullscreen ? "весь кадр" : "телефон в рамке"}
                </DialogDescription>
              </DialogHeader>
              <video key={playing.name} src={api.videoUrl(playing.name)} controls autoPlay playsInline className="mx-auto aspect-[9/16] max-h-[70svh] w-auto rounded-lg bg-black" />
              <div className="flex gap-2">
                <Button asChild className="flex-1">
                  <a href={`${api.videoUrl(playing.name)}?download`} download={playing.name}>
                    <Download /> Скачать
                  </a>
                </Button>
                <Button type="button" variant="destructive" onClick={() => setRemoving(playing)}>
                  <Trash2 /> Удалить
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removing} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить видео?</AlertDialogTitle>
            <AlertDialogDescription>
              {removing && `«${nameOf(removing)}», ${formatDate(removing.createdAt)}. Файл ${removing.name} удалится из папки videos/ — вернуть его нельзя.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => removing && remove(removing)}>
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
