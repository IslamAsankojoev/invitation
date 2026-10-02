import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export type StoredFile = { name: string; type: string; bytes: Uint8Array };

/** Абстракция файлового хранилища. Для продакшена достаточно реализовать её для S3/Supabase Storage. */
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

export class LocalStorage implements Storage {
  constructor(
    private dir = path.join(process.cwd(), "public", "uploads"),
    private publicPrefix = "/uploads",
  ) {}

  async save(file: StoredFile): Promise<string> {
    const ext = EXTENSIONS[file.type] ?? path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, "");
    const fileName = `${randomUUID()}${ext}`;
    await mkdir(this.dir, { recursive: true });
    await writeFile(path.join(this.dir, fileName), file.bytes);
    return `${this.publicPrefix}/${fileName}`;
  }
}

export const storage: Storage = new LocalStorage();
