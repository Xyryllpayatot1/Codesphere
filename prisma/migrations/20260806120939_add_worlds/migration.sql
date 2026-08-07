-- CreateTable
CREATE TABLE "World" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "difficulty" TEXT NOT NULL DEFAULT 'BEGINNER',
    "order" INTEGER NOT NULL DEFAULT 0,
    "courseSlugs" JSONB NOT NULL,
    "unlockCriteria" JSONB,
    "masteryConfig" JSONB,
    "rewardXp" INTEGER NOT NULL DEFAULT 0,
    "rewardCoins" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserWorldProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'LOCKED',
    "lessonPoints" INTEGER NOT NULL DEFAULT 0,
    "gamePoints" INTEGER NOT NULL DEFAULT 0,
    "quizPoints" INTEGER NOT NULL DEFAULT 0,
    "projectPoints" INTEGER NOT NULL DEFAULT 0,
    "bossPoints" INTEGER NOT NULL DEFAULT 0,
    "practicePoints" INTEGER NOT NULL DEFAULT 0,
    "perfectBonus" INTEGER NOT NULL DEFAULT 0,
    "quizFailMap" JSONB,
    "masteryPercent" INTEGER NOT NULL DEFAULT 0,
    "bossDefeated" BOOLEAN NOT NULL DEFAULT false,
    "certificateEarned" BOOLEAN NOT NULL DEFAULT false,
    "unlockedAt" DATETIME,
    "masteredAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserWorldProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserWorldProgress_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MasteryEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MasteryEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MasteryEvent_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorldCertificate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorldCertificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorldCertificate_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Game" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "difficulty" TEXT NOT NULL DEFAULT 'BEGINNER',
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 10,
    "xpReward" INTEGER NOT NULL DEFAULT 30,
    "rewardCoins" INTEGER NOT NULL DEFAULT 0,
    "levelRequirement" INTEGER NOT NULL DEFAULT 1,
    "unlockCriteria" JSONB,
    "worldId" TEXT,
    "isBoss" BOOLEAN NOT NULL DEFAULT false,
    "certificateTitle" TEXT,
    "learningObjectives" JSONB NOT NULL,
    "hints" JSONB NOT NULL,
    "badges" JSONB NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Game_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Game" ("badges", "color", "createdAt", "description", "difficulty", "estimatedMinutes", "hints", "icon", "id", "isActive", "key", "kind", "learningObjectives", "levelRequirement", "name", "order", "slug", "unlockCriteria", "updatedAt", "xpReward") SELECT "badges", "color", "createdAt", "description", "difficulty", "estimatedMinutes", "hints", "icon", "id", "isActive", "key", "kind", "learningObjectives", "levelRequirement", "name", "order", "slug", "unlockCriteria", "updatedAt", "xpReward" FROM "Game";
DROP TABLE "Game";
ALTER TABLE "new_Game" RENAME TO "Game";
CREATE UNIQUE INDEX "Game_key_key" ON "Game"("key");
CREATE UNIQUE INDEX "Game_slug_key" ON "Game"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "World_key_key" ON "World"("key");

-- CreateIndex
CREATE UNIQUE INDEX "World_slug_key" ON "World"("slug");

-- CreateIndex
CREATE INDEX "UserWorldProgress_userId_idx" ON "UserWorldProgress"("userId");

-- CreateIndex
CREATE INDEX "UserWorldProgress_worldId_idx" ON "UserWorldProgress"("worldId");

-- CreateIndex
CREATE UNIQUE INDEX "UserWorldProgress_userId_worldId_key" ON "UserWorldProgress"("userId", "worldId");

-- CreateIndex
CREATE INDEX "MasteryEvent_userId_worldId_createdAt_idx" ON "MasteryEvent"("userId", "worldId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorldCertificate_code_key" ON "WorldCertificate"("code");

-- CreateIndex
CREATE INDEX "WorldCertificate_userId_idx" ON "WorldCertificate"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorldCertificate_userId_worldId_key" ON "WorldCertificate"("userId", "worldId");
