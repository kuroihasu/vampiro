-- CreateEnum
CREATE TYPE "RoomRole" AS ENUM ('master', 'player');

-- CreateTable
CREATE TABLE "Room" (
    "id" UUID NOT NULL,
    "masterId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "edition" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "inviteExpiresAt" TIMESTAMP(3),
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomMember" (
    "roomId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "RoomRole" NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomMember_pkey" PRIMARY KEY ("roomId","userId")
);

-- CreateTable
CREATE TABLE "RoomCharacter" (
    "id" UUID NOT NULL,
    "roomId" UUID NOT NULL,
    "characterId" UUID NOT NULL,
    "controlledBy" UUID NOT NULL,
    "isNpc" BOOLEAN NOT NULL DEFAULT false,
    "compliant" BOOLEAN NOT NULL DEFAULT false,
    "state" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomCharacter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Room_inviteCode_key" ON "Room"("inviteCode");

-- CreateIndex
CREATE INDEX "RoomMember_userId_idx" ON "RoomMember"("userId");

-- CreateIndex
CREATE INDEX "RoomCharacter_characterId_idx" ON "RoomCharacter"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomCharacter_roomId_characterId_key" ON "RoomCharacter"("roomId", "characterId");

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomMember" ADD CONSTRAINT "RoomMember_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomMember" ADD CONSTRAINT "RoomMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomCharacter" ADD CONSTRAINT "RoomCharacter_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomCharacter" ADD CONSTRAINT "RoomCharacter_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomCharacter" ADD CONSTRAINT "RoomCharacter_controlledBy_fkey" FOREIGN KEY ("controlledBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
