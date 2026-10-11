"use client";

import { AlertCircle, CheckCircle2, Clapperboard, ExternalLink, Film, LayoutTemplate, Loader2, Play, RotateCw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Template } from "@/lib/templates";
import { cn } from "@/lib/utils";
import { AdminTemplates } from "./AdminTemplates";
import { AdminVideos } from "./AdminVideos";
import { adminApi, type AdminTemplate, type VideoFile, type VideoJob } from "./api";
import { RecordDialog } from "./RecordDialog";

type Props = {
  adminKey: string;
  templates: AdminTemplate[];
  videos: VideoFile[];
  jobs: VideoJob[];
  showcaseKey: string | null;
};

type Tab = "templates" | "videos";
/** Как часто спрашивать сервер, пока идёт запись. */
const POLL_MS = 1500;

/** Скрытая админка: шаблоны (правка, видео, копии) и ролики (смотреть, скачать, удалить), сверху — ход записи. */
export function AdminDashboard({ adminKey, templates, videos: initialVideos, jobs: initialJobs, showcaseKey }: Props) {
  const router = useRouter();
  const api = useMemo(() => adminApi(adminKey), [adminKey]);
  const [tab, setTab] = useState<Tab>("templates");
  const [videoFilter, setVideoFilter] = useState("");
  const [videos, setVideos] = useState(initialVideos);
  const [jobs, setJobs] = useState(initialJobs);
  const [recordFor, setRecordFor] = useState<Template[] | null>(null);
  /** Законченные записи, которые человек уже убрал из панели. */
  const [dismissed, setDismissed] = useState<string[]>(() => initialJobs.filter((j) => j.endedAt).map((j) => j.id));

  // Вкладка — в адресе (#videos): после перезагрузки и по ссылке открывается та же.
  useEffect(() => {
    if (window.location.hash === "#videos") setTab("videos");
  }, []);
  const switchTab = (next: Tab) => {
    setTab(next);
    history.replaceState(null, "", next === "videos" ? "#videos" : window.location.pathname);
  };

  const refreshMedia = useCallback(async () => {
    try {
      const media = await api.media();
      setVideos(media.videos);
      setJobs(media.jobs);
    } catch {
      // Сервер перезапускается (dev) — следующий опрос повторит.
    }
  }, [api]);

  const active = jobs.some((j) => !j.endedAt);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(refreshMedia, POLL_MS);
    return () => clearInterval(timer);
  }, [active, refreshMedia]);

  const names = useMemo(() => Object.fromEntries(templates.map(({ template: t }) => [t.id, t.name])), [templates]);
  const videoCount = useMemo(() => videos.reduce<Record<string, number>>((n, v) => ({ ...n, [v.templateId]: (n[v.templateId] ?? 0) + 1 }), {}), [videos]);
  const panelJobs = jobs.filter((j) => !dismissed.includes(j.id));
  const showVideos = (templateId: string) => {
    setVideoFilter(templateId);
    switchTab("videos");
  };

  return (
    <main className="min-h-dvh bg-muted/60">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 sm:py-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/logo.webp" alt="" width={40} height={29} className="h-7 w-auto" />
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Админка</h1>
              <p className="text-xs text-muted-foreground">Только на этом компьютере · правки шаблонов — в src/lib/template-overrides.json, их нужно закоммитить</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button asChild variant="ghost" size="sm" className="pointer-coarse:h-10">
              <a href="/" target="_blank" rel="noopener">
                <ExternalLink /> Сайт
              </a>
            </Button>
            <ThemeToggle />
          </div>
        </header>

        {panelJobs.length > 0 && (
          <JobsPanel
            jobs={panelJobs}
            onCancel={(id) => api.cancelJob(id).then(refreshMedia, refreshMedia)}
            onDismiss={(id) => setDismissed((d) => [...d, id])}
            onRetry={(job) => api.record([job.templateId], job.fullscreen, job.bg).then(refreshMedia)}
            onWatch={(job) => {
              setDismissed((d) => [...d, job.id]);
              showVideos(job.templateId);
            }}
          />
        )}

        <Tabs value={tab} onValueChange={(v) => switchTab(v as Tab)} className="gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="templates" className="pointer-coarse:h-10">
                <LayoutTemplate /> Шаблоны <span className="text-muted-foreground tabular-nums">{templates.length}</span>
              </TabsTrigger>
              <TabsTrigger value="videos" className="pointer-coarse:h-10">
                <Film /> Видео <span className="text-muted-foreground tabular-nums">{videos.length}</span>
              </TabsTrigger>
            </TabsList>
            {tab === "templates" && (
              <Button type="button" variant="outline" size="sm" className="pointer-coarse:h-10" onClick={() => setRecordFor(templates.map((t) => t.template))}>
                <Clapperboard /> Записать все
              </Button>
            )}
          </div>
          <TabsContent value="templates">
            <AdminTemplates
              api={api}
              adminKey={adminKey}
              templates={templates}
              videoCount={videoCount}
              showcaseKey={showcaseKey}
              onRecord={setRecordFor}
              onShowVideos={showVideos}
              onChanged={() => router.refresh()}
            />
          </TabsContent>
          <TabsContent value="videos">
            <AdminVideos api={api} videos={videos} names={names} filter={videoFilter} onFilter={setVideoFilter} onChanged={refreshMedia} onGoRecord={() => switchTab("templates")} />
          </TabsContent>
        </Tabs>
      </div>

      <RecordDialog
        templates={recordFor ?? []}
        open={!!recordFor}
        onOpenChange={(open) => !open && setRecordFor(null)}
        onRecord={async ({ fullscreen, bg }) => {
          await api.record(recordFor!.map((t) => t.id), fullscreen, bg);
          await refreshMedia();
        }}
      />
    </main>
  );
}

const STAGE: Record<VideoJob["stage"], string> = {
  queued: "В очереди",
  open: "Открываю страницу показа…",
  record: "Снимаю",
  encode: "Склеиваю видео…",
  done: "Готово",
  error: "Ошибка",
  canceled: "Остановлено",
};

/** Ход записи: текущий ролик с прогрессом, очередь, законченные — со ссылкой на видео или с ошибкой и «Повторить». */
function JobsPanel({
  jobs,
  onCancel,
  onDismiss,
  onRetry,
  onWatch,
}: {
  jobs: VideoJob[];
  onCancel: (id: string) => void;
  onDismiss: (id: string) => void;
  onRetry: (job: VideoJob) => void;
  onWatch: (job: VideoJob) => void;
}) {
  return (
    <Card className="gap-0 p-0" aria-label="Запись видео" role="region">
      <ul className="divide-y">
        {jobs.map((job) => {
          const running = job.stage === "open" || job.stage === "record" || job.stage === "encode";
          // Прогресс: открытие — 0–5%, съёмка — 5–90% (доля пролистанной страницы), склейка — 90–100%.
          const percent = job.stage === "encode" ? 92 : job.stage === "record" ? Math.round(5 + job.progress * 85) : job.stage === "open" ? 3 : 0;
          return (
            <li key={job.id} className="flex items-center gap-3 px-4 py-3">
              <span aria-hidden="true" className="shrink-0">
                {running ? (
                  <Loader2 className="size-5 animate-spin text-primary motion-reduce:animate-none" />
                ) : job.stage === "done" ? (
                  <CheckCircle2 className="size-5 text-primary" />
                ) : job.stage === "error" ? (
                  <AlertCircle className="size-5 text-destructive" />
                ) : (
                  <Clapperboard className="size-5 text-muted-foreground" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {job.templateName} <span className="font-normal text-muted-foreground">· {job.fullscreen ? "весь кадр" : "телефон"}</span>
                </p>
                <p className={cn("truncate text-xs", job.stage === "error" ? "text-destructive" : "text-muted-foreground")} title={job.error}>
                  {job.stage === "error" ? job.error : job.stage === "record" ? `${STAGE.record} · ${percent}%` : STAGE[job.stage]}
                </p>
                {running && (
                  <div
                    role="progressbar"
                    aria-label={`Запись «${job.templateName}»`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percent}
                    className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"
                  >
                    <div className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out motion-reduce:transition-none" style={{ width: `${percent}%` }} />
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {job.stage === "done" && (
                  <Button type="button" size="sm" variant="outline" className="pointer-coarse:h-10" onClick={() => onWatch(job)}>
                    <Play /> Смотреть
                  </Button>
                )}
                {job.stage === "error" && (
                  <Button type="button" size="sm" variant="outline" className="pointer-coarse:h-10" onClick={() => onRetry(job)}>
                    <RotateCw /> Повторить
                  </Button>
                )}
                {job.endedAt ? (
                  <Button type="button" size="icon-sm" variant="ghost" className="pointer-coarse:size-10" aria-label={`Убрать «${job.templateName}» из списка`} onClick={() => onDismiss(job.id)}>
                    <X />
                  </Button>
                ) : (
                  <Button type="button" size="sm" variant="ghost" className="pointer-coarse:h-10" onClick={() => onCancel(job.id)}>
                    <X /> {job.stage === "queued" ? "Убрать" : "Остановить"}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
