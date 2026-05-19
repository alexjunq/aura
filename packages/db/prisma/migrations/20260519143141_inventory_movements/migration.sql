-- CreateEnum
CREATE TYPE "inventory_movement_kind" AS ENUM ('purchase', 'usage', 'adjustment');

-- CreateTable
CREATE TABLE "inventory_movement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "kind" "inventory_movement_kind" NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "supplierId" TEXT,
    "unitCost" DECIMAL(14,4),
    "currency" TEXT,
    "fxRateToBase" DECIMAL(14,8),
    "pieceId" TEXT,
    "reference" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_movement_tenantId_materialId_occurredAt_idx" ON "inventory_movement"("tenantId", "materialId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "inventory_movement_tenantId_occurredAt_idx" ON "inventory_movement"("tenantId", "occurredAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_movement_pieceId_materialId_kind_key" ON "inventory_movement"("pieceId", "materialId", "kind");

-- AddForeignKey
ALTER TABLE "inventory_movement" ADD CONSTRAINT "inventory_movement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movement" ADD CONSTRAINT "inventory_movement_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movement" ADD CONSTRAINT "inventory_movement_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movement" ADD CONSTRAINT "inventory_movement_pieceId_fkey" FOREIGN KEY ("pieceId") REFERENCES "piece"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Per-row CHECK invariants for inventory_movement:
--   kind='purchase'   : quantity > 0, supplierId/unitCost/currency/fxRateToBase NOT NULL
--   kind='usage'      : quantity < 0, pieceId NOT NULL
--   kind='adjustment' : quantity != 0
ALTER TABLE "inventory_movement"
ADD CONSTRAINT "inventory_movement_kind_invariants_chk"
CHECK (
  (kind = 'purchase'
    AND quantity > 0
    AND "supplierId"   IS NOT NULL
    AND "unitCost"     IS NOT NULL
    AND currency       IS NOT NULL
    AND "fxRateToBase" IS NOT NULL)
  OR
  (kind = 'usage'
    AND quantity < 0
    AND "pieceId" IS NOT NULL)
  OR
  (kind = 'adjustment'
    AND quantity <> 0)
);
