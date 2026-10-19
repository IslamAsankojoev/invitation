import { createHash, randomBytes } from "node:crypto";

/**
 * Секрет для правки ответа гостя. Отдаётся браузеру один раз при первом ответе, в базе — только его sha256:
 * утечка таблицы не даёт править чужие ответы. Секрет случайный (192 бита), поэтому соль не нужна.
 */
export const newRsvpSecret = () => randomBytes(24).toString("base64url");

export const hashRsvpSecret = (secret: string) => createHash("sha256").update(secret).digest("hex");
