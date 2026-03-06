/*
  Warnings:

  - A unique constraint covering the columns `[idx]` on the table `Element` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Element" ADD COLUMN     "idx" INTEGER,
ADD COLUMN     "specificHeatCapacity" DOUBLE PRECISION NOT NULL DEFAULT -1,
ADD COLUMN     "thermalConductivity" DOUBLE PRECISION NOT NULL DEFAULT -1;

-- CreateIndex
CREATE UNIQUE INDEX "Element_idx_key" ON "Element"("idx");
