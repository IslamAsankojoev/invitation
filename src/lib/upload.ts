import { CUSTOM_MUSIC_ENABLED } from "./music";

const MB = 1024 * 1024;

/** Vercel принимает запрос не больше 4.5 МБ; браузер заранее уменьшает фото (shrinkImage), так что это — запас. */
export const MAX_IMAGE_BYTES = 4 * MB;
export const MAX_AUDIO_BYTES = 10 * MB;

/** Возвращает текст ошибки или null, если файл можно принять. */
export function checkUpload(type: string, size: number): string | null {
  if (type.startsWith("image/")) return size <= MAX_IMAGE_BYTES ? null : "Изображение должно быть не больше 4 МБ";
  if (type === "audio/mpeg") {
    // Пока своя музыка выключена — не храним загруженные mp3, песни только из встроенного списка.
    if (!CUSTOM_MUSIC_ENABLED) return "Своя музыка пока недоступна — выберите песню из списка";
    return size <= MAX_AUDIO_BYTES ? null : "MP3 должен быть не больше 10 МБ";
  }
  return "Можно загрузить только изображение или MP3";
}
