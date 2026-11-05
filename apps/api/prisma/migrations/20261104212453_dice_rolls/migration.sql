-- CreateTable
CREATE TABLE "DiceRoll" (
    "id" UUID NOT NULL,
    "roomId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "roomCharacterId" UUID,
    "characterName" TEXT,
    "label" TEXT NOT NULL,
    "pool" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "visibility" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiceRoll_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiceRoll_roomId_createdAt_id_idx" ON "DiceRoll"("roomId", "createdAt" DESC, "id" DESC);

-- AddForeignKey
ALTER TABLE "DiceRoll" ADD CONSTRAINT "DiceRoll_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiceRoll" ADD CONSTRAINT "DiceRoll_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
