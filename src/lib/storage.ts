import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { StorageClient } from "@supabase/storage-js";

/** folder — подпапка (например, `inv/<id>`), чтобы потом чистить файлы по приглашению. */
export type StoredFile = { name: string; type: string; bytes: Uint8Array; folder?: string };

/** Абстракция файлового хранилища: локально — public/uploads, на проде — Supabase Storage. */
export interface Storage {
  /** Сохраняет файл и возвращает публичный URL. */
  save(file: StoredFile): Promise<string>;
}

const EXTENSIONS: Record<string, string> = {
  "audio/mpeg": ".mp3",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
};

/** Имя файла в хранилище: случайное (не угадать и не перезаписать чужое) + расширение по типу. */
function storedName(file: StoredFile) {
  const ext = EXTENSIONS[file.type] ?? path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, "");
  return `${randomUUID()}${ext}`;
}

export class LocalStorage implements Storage {
  constructor(
    private dir = path.join(process.cwd(), "public", "uploads"),
    private publicPrefix = "/uploads",
  ) {}

  async save(file: StoredFile): Promise<string> {
    const fileName = storedName(file);
    await mkdir(this.dir, { recursive: true });
    await writeFile(path.join(this.dir, fileName), file.bytes);
    return `${this.publicPrefix}/${fileName}`;
  }
}

/** Supabase Storage: публичный бакет, запись — секретным ключом только с сервера (scripts/supabase-bucket.mjs). */
export class SupabaseStorage implements Storage {
  private client: StorageClient;

  constructor(
    url: string,
    secretKey: string,
    private bucket = "uploads",
    fetchImpl?: typeof fetch,
  ) {
    this.client = new StorageClient(`${url}/storage/v1`, { apikey: secretKey, Authorization: `Bearer ${secretKey}` }, fetchImpl);
  }

  async save(file: StoredFile): Promise<string> {
    const key = [file.folder, storedName(file)].filter(Boolean).join("/");
    const bucket = this.client.from(this.bucket);
    // Имя случайное и не меняется — файл можно кэшировать навсегда.
    const { error } = await bucket.upload(key, file.bytes, { contentType: file.type, cacheControl: "31536000", upsert: false });
    if (error) throw new Error(`Хранилище: ${error.message}`);
    return bucket.getPublicUrl(key).data.publicUrl;
  }
}

/** Есть ключи Supabase — пишем туда (прод), нет — в public/uploads (локальная разработка, тесты). */
export function createStorage(env: Record<string, string | undefined> = process.env): Storage {
  return env.SUPABASE_URL && env.SUPABASE_SECRET_KEY ? new SupabaseStorage(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY) : new LocalStorage();
}

export const storage: Storage = createStorage();
