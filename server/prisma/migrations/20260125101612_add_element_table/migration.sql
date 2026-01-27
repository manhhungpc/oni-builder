-- CreateTable
CREATE TABLE "Element" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "texture" TEXT NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "Element_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Element_name_key" ON "Element"("name");

-- CreateIndex
CREATE INDEX "Element_type_idx" ON "Element"("type");
