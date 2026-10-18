"use client";

import type { AdminTemplate, VideoFile } from "@/lib/adminFiles";
import type { VideoJob } from "@/lib/videoJobs";

export type { AdminTemplate, VideoFile, VideoJob };

/** Запросы админки: ошибка сервера — исключение с его текстом (показываем человеку как есть). */
export function adminApi(adminKey: string) {
  const base = `/api/admin/${adminKey}`;
  async function call<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
    const res = await fetch(`${base}${path}`, {
      ...init,
      ...(init?.json !== undefined && { body: JSON.stringify(init.json), headers: { "content-type": "application/json" } }),
    }).catch(() => null);
    if (!res) throw new Error("Нет связи с сервером");
    const body = res.status === 204 ? null : await res.json().catch(() => null);
    if (!res.ok) throw new Error(body?.error ?? `Ошибка ${res.status}`);
    return body as T;
  }
  return {
    videoUrl: (name: string) => `${base}/videos/${encodeURIComponent(name)}`,
    media: () => call<{ videos: VideoFile[]; jobs: VideoJob[] }>("/videos"),
    record: (templates: string[], options: { fullscreen: boolean; bg: string; sound: boolean }) =>
      call<{ jobs: VideoJob[] }>("/videos", { method: "POST", json: { templates, ...options } }),
    cancelJob: (id: string) => call<null>(`/jobs/${id}`, { method: "DELETE" }),
    deleteVideo: (name: string) => call<null>(`/videos/${encodeURIComponent(name)}`, { method: "DELETE" }),
    rename: (id: string, name: string, description: string) => call(`/templates/${id}`, { method: "PATCH", json: { name, description } }),
    duplicate: (id: string) => call<{ template: { id: string } }>(`/templates/${id}`, { method: "POST" }),
    reset: (id: string) => call<null>(`/templates/${id}`, { method: "DELETE" }),
    setPublished: (id: string, published: boolean) => call<{ published: boolean }>(`/templates/${id}`, { method: "PATCH", json: { published } }),
    reorder: (order: string[]) => call<{ order: string[] }>("/templates", { method: "PUT", json: { order } }),
  };
}

export type AdminApi = ReturnType<typeof adminApi>;

/** «12 окт., 14:03». */
export const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export const formatSize = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} МБ`;
