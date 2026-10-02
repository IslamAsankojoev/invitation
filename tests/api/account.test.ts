import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as CREATE } from "@/app/api/invitations/route";
import { POST as UPLOAD } from "@/app/api/upload/route";
import { GET as CLAIM } from "@/app/edit/[id]/claim/route";
import { createInvitation, getInvitationById, listUserInvitations } from "@/lib/invitations";
import { storage } from "@/lib/storage";
import { signInAs } from "../auth-mock";
import { pngOf } from "../image-fixtures";
import { createUser, jsonRequest, resetDb } from "./helpers";

beforeEach(resetDb);

const claim = (id: string, token?: string, extra = "") =>
  CLAIM(new Request(`http://localhost/edit/${id}/claim${token ? `?token=${token}` : ""}${extra}`), { params: Promise.resolve({ id }) });

describe("аккаунты", () => {
  it("без входа приглашение создаётся ничьим, после входа — сразу своим", async () => {
    const anon = await (await CREATE(jsonRequest("/api/invitations", "POST", {}))).json();
    expect((await getInvitationById(anon.id))!.userId).toBeNull();

    await createUser("u1");
    signInAs({ id: "u1" });
    const mine = await (await CREATE(jsonRequest("/api/invitations", "POST", {}))).json();
    expect((await getInvitationById(mine.id))!.userId).toBe("u1");
    expect((await listUserInvitations("u1")).map((i) => i.id)).toEqual([mine.id]);
  });

  it("«Сохранить в аккаунт»: с token привязывает и возвращает в редактор", async () => {
    await createUser("u1");
    const inv = await createInvitation();
    signInAs({ id: "u1" });
    const res = await claim(inv.id, inv.editToken);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(`http://localhost/edit/${inv.id}?token=${inv.editToken}&saved=1`);
    expect((await getInvitationById(inv.id))!.userId).toBe("u1");
  });

  it("с next=guests после сохранения ведёт к ответам гостей, при отказе — в редактор", async () => {
    await createUser("u1");
    await createUser("u2");
    const inv = await createInvitation();
    signInAs({ id: "u1" });
    expect((await claim(inv.id, inv.editToken, "&next=guests")).headers.get("location")).toBe(`http://localhost/edit/${inv.id}/guests`);
    signInAs({ id: "u2" });
    expect((await claim(inv.id, inv.editToken, "&next=guests")).headers.get("location")).toContain("saved=taken");
  });

  it("без входа, с чужим token и у чужого приглашения ничего не меняется", async () => {
    await createUser("u1");
    await createUser("u2");
    const inv = await createInvitation();

    expect((await claim(inv.id, inv.editToken)).headers.get("location")).toContain("saved=login");

    signInAs({ id: "u1" });
    expect((await claim(inv.id, "wrong")).status).toBe(403);
    expect((await getInvitationById(inv.id))!.userId).toBeNull();

    await claim(inv.id, inv.editToken);
    signInAs({ id: "u2" });
    expect((await claim(inv.id, inv.editToken)).headers.get("location")).toContain("saved=taken");
    expect((await getInvitationById(inv.id))!.userId).toBe("u1");
  });

  it("загрузка файла — только в своё приглашение: по token или владельцу", async () => {
    vi.spyOn(storage, "save").mockResolvedValue("/uploads/x.webp");
    const png = await pngOf(20, 20);
    const upload = (query: string) => {
      const form = new FormData();
      form.append("file", new File([png], "a.png", { type: "image/png" }));
      return UPLOAD(new Request(`http://localhost/api/upload${query}`, { method: "POST", body: form }));
    };
    await createUser("u1");
    const inv = await createInvitation(undefined, undefined, "u1");

    expect((await upload("")).status).toBe(404);
    expect((await upload(`?id=${inv.id}&token=wrong`)).status).toBe(403);
    expect((await upload(`?id=${inv.id}&token=${inv.editToken}`)).status).toBe(201);
    signInAs({ id: "u1" });
    expect((await upload(`?id=${inv.id}`)).status).toBe(201);
  });
});
