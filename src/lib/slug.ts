import { z } from "zod";

export const slugSchema = z
  .string()
  .regex(/^[a-z0-9-]{3,40}$/, "Ссылка: 3–40 символов, только латиница в нижнем регистре, цифры и дефис");

export function isValidSlug(slug: string): boolean {
  return slugSchema.safeParse(slug).success;
}

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function randomSlug(length = 8): string {
  let s = "";
  for (let i = 0; i < length; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}
