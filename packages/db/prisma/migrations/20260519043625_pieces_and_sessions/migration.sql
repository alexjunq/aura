-- CreateEnum
CREATE TYPE "piece_status" AS ENUM ('in_progress', 'in_studio', 'reserved', 'on_sale', 'sold', 'returned', 'lost_damaged');

-- CreateTable
CREATE TABLE "piece" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "status" "piece_status" NOT NULL DEFAULT 'in_progress',
    "currentLocationText" TEXT,
    "primaryPhotoKey" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "piece_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "piece_material" (
    "pieceId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "capturedPricePerUnit" DECIMAL(14,4) NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "piece_material_pkey" PRIMARY KEY ("pieceId","materialId")
);

-- CreateTable
CREATE TABLE "work_session" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pieceId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "piece_status_history" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pieceId" TEXT NOT NULL,
    "fromStatus" "piece_status" NOT NULL,
    "toStatus" "piece_status" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "context" JSONB,

    CONSTRAINT "piece_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "piece_tenantId_idx" ON "piece"("tenantId");

-- CreateIndex
CREATE INDEX "piece_tenantId_status_idx" ON "piece"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "piece_tenantId_slug_key" ON "piece"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "piece_material_pieceId_idx" ON "piece_material"("pieceId");

-- CreateIndex
CREATE INDEX "piece_material_materialId_idx" ON "piece_material"("materialId");

-- CreateIndex
CREATE INDEX "work_session_tenantId_idx" ON "work_session"("tenantId");

-- CreateIndex
CREATE INDEX "work_session_pieceId_idx" ON "work_session"("pieceId");

-- CreateIndex
CREATE INDEX "piece_status_history_pieceId_idx" ON "piece_status_history"("pieceId");

-- CreateIndex
CREATE INDEX "piece_status_history_pieceId_changedAt_idx" ON "piece_status_history"("pieceId", "changedAt" DESC);

-- AddForeignKey
ALTER TABLE "piece" ADD CONSTRAINT "piece_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "piece_material" ADD CONSTRAINT "piece_material_pieceId_fkey" FOREIGN KEY ("pieceId") REFERENCES "piece"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "piece_material" ADD CONSTRAINT "piece_material_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_session" ADD CONSTRAINT "work_session_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_session" ADD CONSTRAINT "work_session_pieceId_fkey" FOREIGN KEY ("pieceId") REFERENCES "piece"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "piece_status_history" ADD CONSTRAINT "piece_status_history_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "piece_status_history" ADD CONSTRAINT "piece_status_history_pieceId_fkey" FOREIGN KEY ("pieceId") REFERENCES "piece"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Partial unique index: at most one open work_session per tenant (spec §4.4, Flow F).
CREATE UNIQUE INDEX "work_session_one_open_per_tenant"
  ON "work_session" ("tenantId")
  WHERE "endedAt" IS NULL;
