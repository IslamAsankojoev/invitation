// Создаёт (или обновляет) бакет фото в Supabase Storage. Запуск: npm run storage:setup (берёт ключи из .env.supabase).
// Публичный на чтение — гости видят фото по прямой ссылке; писать может только сервер с секретным ключом.
import { StorageClient } from "@supabase/storage-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Нет SUPABASE_URL / SUPABASE_SECRET_KEY (.env.supabase)");
  process.exit(1);
}

const BUCKET = "uploads";
const options = {
  public: true,
  fileSizeLimit: "5MB",
  allowedMimeTypes: ["image/webp", "image/gif", "image/png", "image/jpeg"],
};

const storage = new StorageClient(`${url}/storage/v1`, { apikey: key, Authorization: `Bearer ${key}` });
const { data: existing } = await storage.getBucket(BUCKET);
const { error } = existing ? await storage.updateBucket(BUCKET, options) : await storage.createBucket(BUCKET, options);
if (error) {
  console.error("Ошибка:", error.message);
  process.exit(1);
}
const { data } = await storage.getBucket(BUCKET);
console.log(existing ? "Бакет обновлён:" : "Бакет создан:", JSON.stringify({ id: data.id, public: data.public, file_size_limit: data.file_size_limit, allowed_mime_types: data.allowed_mime_types }));
