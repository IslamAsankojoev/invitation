import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { createDefaultInvitation } from "./defaults";
import { invitationDataSchema, type InvitationData } from "./schema";
import { randomSlug } from "./slug";

export type Invitation = {
  id: string;
  slug: string;
  editToken: string;
  /** Владелец по аккаунту; null — создано без входа. */
  userId: string | null;
  data: InvitationData;
  updatedAt: Date;
};

type Row = { id: string; slug: string; editToken: string; userId: string | null; data: Prisma.JsonValue; updatedAt: Date };

/** InvitationData — обычный JSON-объект (схема Zod гарантирует), Prisma просто нужен его тип. */
const toJson = (data: InvitationData) => data as unknown as Prisma.InputJsonValue;

function fromRow(row: Row): Invitation {
  return {
    id: row.id,
    slug: row.slug,
    editToken: row.editToken,
    userId: row.userId,
    data: invitationDataSchema.parse(row.data),
    updatedAt: row.updatedAt,
  };
}

export async function createInvitation(
  data: InvitationData = createDefaultInvitation(),
  slug?: string,
  userId: string | null = null,
): Promise<Invitation> {
  let finalSlug = slug ?? randomSlug();
  while (!slug && (await isSlugTaken(finalSlug))) finalSlug = randomSlug();
  const row = await prisma.invitation.create({
    data: { slug: finalSlug, editToken: randomBytes(24).toString("hex"), data: toJson(data), userId },
  });
  return fromRow(row);
}

/** Приглашения пользователя, свежие сверху. Битые (не прошли схему) пропускаются, а не роняют страницу. */
export async function listUserInvitations(userId: string): Promise<Invitation[]> {
  const rows = await prisma.invitation.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } });
  return rows.flatMap((row) => {
    try {
      return [fromRow(row)];
    } catch {
      return [];
    }
  });
}

/** Привязать приглашение к аккаунту, только если у него ещё нет владельца (атомарно). */
export async function claimInvitation(id: string, userId: string): Promise<boolean> {
  const { count } = await prisma.invitation.updateMany({ where: { id, userId: null }, data: { userId } });
  return count === 1;
}

export async function getInvitationById(id: string): Promise<Invitation | null> {
  const row = await prisma.invitation.findUnique({ where: { id } });
  return row ? fromRow(row) : null;
}

export async function getInvitationBySlug(slug: string): Promise<Invitation | null> {
  const row = await prisma.invitation.findUnique({ where: { slug } });
  return row ? fromRow(row) : null;
}

export function hasValidToken(invitation: Pick<Invitation, "editToken"> | null, token: string | null | undefined): boolean {
  return !!invitation && !!token && invitation.editToken === token;
}

export async function isSlugTaken(slug: string, exceptId?: string): Promise<boolean> {
  const row = await prisma.invitation.findUnique({ where: { slug }, select: { id: true } });
  return !!row && row.id !== exceptId;
}

export async function updateInvitation(id: string, patch: { data?: InvitationData; slug?: string }): Promise<Invitation> {
  const row = await prisma.invitation.update({
    where: { id },
    data: { slug: patch.slug, data: patch.data ? toJson(patch.data) : undefined },
  });
  return fromRow(row);
}

/** Ответы гостей для организатора — без editKey (это секрет гостя для правки своего ответа). */
export async function listRsvps(invitationId: string) {
  return prisma.rsvp.findMany({ where: { invitationId }, orderBy: { createdAt: "desc" }, omit: { editKey: true } });
}

/** Публичное представление — без editToken. */
export function toPublic(inv: Invitation) {
  return { id: inv.id, slug: inv.slug, data: inv.data };
}
