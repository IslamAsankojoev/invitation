import { prisma } from "../src/lib/db";
import { createInvitation } from "../src/lib/invitations";
import { createFromTemplate, templates } from "../src/lib/templates";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

/** По демо-приглашению на каждый шаблон; первый шаблон — со slug «demo». */
const slugFor = (index: number, id: string) => (index === 0 ? "demo" : `demo-${id}`);

async function main() {
  const slugs = templates.map((t, i) => slugFor(i, t.id));
  // Пересоздаём демо-приглашения, чтобы сид можно было запускать повторно.
  await prisma.invitation.deleteMany({ where: { slug: { in: slugs } } });

  console.log("Демо-приглашения созданы:\n");
  for (const [i, template] of templates.entries()) {
    const inv = await createInvitation(createFromTemplate(template), slugs[i]);
    await prisma.rsvp.createMany({
      data: [
        { invitationId: inv.id, name: "Ольга", attending: true, guestsCount: 2, comment: "Будем обязательно!" },
        { invitationId: inv.id, name: "Сергей", attending: false, guestsCount: 1 },
      ],
    });
    console.log(`  ${template.name}`);
    console.log(`    Публичная страница: ${BASE_URL}/i/${inv.slug}`);
    console.log(`    Редактор:           ${BASE_URL}/edit/${inv.id}?token=${inv.editToken}`);
    console.log(`    Ответы гостей:      ${BASE_URL}/edit/${inv.id}/guests?token=${inv.editToken}\n`);
  }
}

main().finally(() => prisma.$disconnect());
