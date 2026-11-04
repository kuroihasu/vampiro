-- CreateEnum
CREATE TYPE "CharacterStatus" AS ENUM ('draft', 'complete');

-- CreateTable
CREATE TABLE "Character" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "edition" TEXT NOT NULL,
    "rulesetVersion" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "concept" TEXT NOT NULL DEFAULT '',
    "clan" TEXT,
    "status" "CharacterStatus" NOT NULL DEFAULT 'draft',
    "sheet" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Character_ownerId_edition_idx" ON "Character"("ownerId", "edition");

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
