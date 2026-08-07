-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UserSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'SYSTEM',
    "dailyGoalMinutes" INTEGER NOT NULL DEFAULT 30,
    "weeklyGoalMinutes" INTEGER NOT NULL DEFAULT 210,
    "preferredTime" TEXT NOT NULL DEFAULT 'any',
    "learningMode" TEXT NOT NULL DEFAULT 'READING',
    "instructorMode" BOOLEAN NOT NULL DEFAULT false,
    "notifications" JSONB NOT NULL,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_UserSetting" ("createdAt", "dailyGoalMinutes", "emailNotifications", "id", "notifications", "preferredTime", "theme", "updatedAt", "userId", "weeklyGoalMinutes") SELECT "createdAt", "dailyGoalMinutes", "emailNotifications", "id", "notifications", "preferredTime", "theme", "updatedAt", "userId", "weeklyGoalMinutes" FROM "UserSetting";
DROP TABLE "UserSetting";
ALTER TABLE "new_UserSetting" RENAME TO "UserSetting";
CREATE UNIQUE INDEX "UserSetting_userId_key" ON "UserSetting"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
