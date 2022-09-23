/*
  Warnings:

  - Made the column `fullName` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "discordId" TEXT NOT NULL,
    "verifyCode" TEXT NOT NULL,
    "verified" INTEGER NOT NULL DEFAULT 0,
    "verifiedTimestamp" TEXT
);
INSERT INTO "new_User" ("discordId", "email", "fullName", "id", "verified", "verifyCode") SELECT "discordId", "email", "fullName", "id", "verified", "verifyCode" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_discordId_key" ON "User"("discordId");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
