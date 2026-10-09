-- CreateTable
CREATE TABLE "SlugAlias" (
    "slug" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlugAlias_pkey" PRIMARY KEY ("slug")
);

-- CreateIndex
CREATE INDEX "SlugAlias_invitationId_idx" ON "SlugAlias"("invitationId");

-- AddForeignKey
ALTER TABLE "SlugAlias" ADD CONSTRAINT "SlugAlias_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
