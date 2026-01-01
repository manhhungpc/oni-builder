/*
  Warnings:

  - You are about to drop the column `lastViewAt` on the `Blueprint` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Blueprint" DROP COLUMN "lastViewAt",
ADD COLUMN     "deletedAt" TIMESTAMP(3);
