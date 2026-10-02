/**
 * Встроенные песни (`public/music/`, исходники — папка `musics/`). Пока своя музыка выключена
 * (CUSTOM_MUSIC_ENABLED): не копим загрузки mp3 — приглашение выбирает песню из этого списка.
 */
export const CUSTOM_MUSIC_ENABLED = false;

export type MusicTrack = { id: string; title: string; artist: string; src: string };

const track = (id: string, title: string, artist: string): MusicTrack => ({ id, title, artist, src: `/music/${id}.mp3` });

export const musicTracks: MusicTrack[] = [
  track("perfect", "Perfect", "Ed Sheeran"),
  track("a-thousand-years", "A Thousand Years", "Christina Perri"),
  track("cant-help-falling-in-love", "Can't Help Falling in Love", "Elvis Presley"),
  track("marry-you", "Marry You", "Bruno Mars"),
  track("ozgocho-kun", "Өзгөчө күн", "Jax 02.14"),
];

/** Песня нового приглашения. */
export const DEFAULT_MUSIC_URL = musicTracks[0].src;

/** Встроенная песня по адресу; null — своя (загружена до ограничения) или нет музыки. */
export const findTrack = (url: string | null | undefined) => musicTracks.find((t) => t.src === url) ?? null;
