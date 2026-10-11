import { NextResponse } from "next/server";
import { adminKeyValid } from "@/lib/admin";

/** Неверный ключ или админка недоступна (Vercel, нет ADMIN_KEY) — как будто адреса нет. */
export const adminGuard = (key: string) => (adminKeyValid(key) ? null : NextResponse.json({ error: "Не найдено" }, { status: 404 }));
