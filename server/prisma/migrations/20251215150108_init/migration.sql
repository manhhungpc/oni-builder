-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "texture_name" TEXT NOT NULL,
    "special_texture" TEXT[],
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "placement_offset" JSONB NOT NULL,
    "scene_layer" INTEGER NOT NULL DEFAULT 0,
    "object_layer" INTEGER NOT NULL DEFAULT 0,
    "tile_layer" INTEGER NOT NULL DEFAULT 0,
    "search_term" TEXT[],
    "is_drag_build" BOOLEAN NOT NULL,
    "is_need_foundation" BOOLEAN NOT NULL,
    "is_foundation" BOOLEAN NOT NULL,
    "category" TEXT,
    "type" TEXT,
    "view_mode" INTEGER,
    "build_rule" INTEGER NOT NULL,
    "materials" JSONB NOT NULL,
    "conduit" JSONB,
    "logic_port" JSONB NOT NULL,
    "power_port" JSONB,

    CONSTRAINT "Building_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Blueprint" (
    "id" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "buildings" JSONB NOT NULL,
    "connections" JSONB,
    "lastViewAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,

    CONSTRAINT "Blueprint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Building_name_key" ON "Building"("name");

-- CreateIndex
CREATE INDEX "Building_category_idx" ON "Building"("category");

-- CreateIndex
CREATE INDEX "Building_display_name_idx" ON "Building"("display_name");

-- CreateIndex
CREATE INDEX "Building_search_term_idx" ON "Building" USING GIN ("search_term");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Blueprint_shareId_key" ON "Blueprint"("shareId");

-- CreateIndex
CREATE INDEX "Blueprint_shareId_idx" ON "Blueprint"("shareId");

-- CreateIndex
CREATE INDEX "Blueprint_createdAt_idx" ON "Blueprint"("createdAt");

-- CreateIndex
CREATE INDEX "Blueprint_userId_idx" ON "Blueprint"("userId");

-- AddForeignKey
ALTER TABLE "Blueprint" ADD CONSTRAINT "Blueprint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
