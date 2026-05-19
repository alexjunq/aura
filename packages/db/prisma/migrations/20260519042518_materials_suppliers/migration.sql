-- CreateEnum
CREATE TYPE "material_kind" AS ENUM ('commodity', 'gemstone', 'wood', 'other');

-- CreateEnum
CREATE TYPE "material_price_source" AS ENUM ('manual', 'feed', 'supplier');

-- CreateTable
CREATE TABLE "material" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "kind" "material_kind" NOT NULL DEFAULT 'other',
    "commoditySymbol" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastFeedFetchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_price" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "source" "material_price_source" NOT NULL,
    "supplierId" TEXT,
    "pricePerUnit" DECIMAL(14,4) NOT NULL,
    "currency" TEXT NOT NULL,
    "fxRateToBase" DECIMAL(14,8) NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_price_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "address" JSONB,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_material" (
    "supplierId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "sku" TEXT,
    "defaultLeadTimeDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_material_pkey" PRIMARY KEY ("supplierId","materialId")
);

-- CreateIndex
CREATE INDEX "material_tenantId_idx" ON "material"("tenantId");

-- CreateIndex
CREATE INDEX "material_tenantId_active_idx" ON "material"("tenantId", "active");

-- CreateIndex
CREATE INDEX "material_price_tenantId_idx" ON "material_price"("tenantId");

-- CreateIndex
CREATE INDEX "material_price_materialId_effectiveAt_idx" ON "material_price"("materialId", "effectiveAt" DESC);

-- CreateIndex
CREATE INDEX "material_price_materialId_source_supplierId_effectiveAt_idx" ON "material_price"("materialId", "source", "supplierId", "effectiveAt" DESC);

-- CreateIndex
CREATE INDEX "supplier_tenantId_idx" ON "supplier"("tenantId");

-- CreateIndex
CREATE INDEX "supplier_tenantId_active_idx" ON "supplier"("tenantId", "active");

-- CreateIndex
CREATE INDEX "supplier_material_materialId_idx" ON "supplier_material"("materialId");

-- AddForeignKey
ALTER TABLE "material" ADD CONSTRAINT "material_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_price" ADD CONSTRAINT "material_price_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_price" ADD CONSTRAINT "material_price_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_price" ADD CONSTRAINT "material_price_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_material" ADD CONSTRAINT "supplier_material_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_material" ADD CONSTRAINT "supplier_material_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CHECK: supplierId is required iff source='supplier'.
-- See spec §4.2.
ALTER TABLE "material_price" ADD CONSTRAINT "material_price_supplier_source_chk"
  CHECK (
    (source = 'supplier' AND "supplierId" IS NOT NULL)
    OR (source <> 'supplier' AND "supplierId" IS NULL)
  );
