-- CreateEnum
CREATE TYPE "sales_channel_type" AS ENUM ('online', 'physical_store', 'event', 'direct');

-- CreateTable
CREATE TABLE "sales_channel" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "sales_channel_type" NOT NULL DEFAULT 'direct',
    "commissionPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" JSONB,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_channel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sales_channel_tenantId_idx" ON "sales_channel"("tenantId");

-- CreateIndex
CREATE INDEX "sales_channel_tenantId_active_idx" ON "sales_channel"("tenantId", "active");

-- AddForeignKey
ALTER TABLE "sales_channel" ADD CONSTRAINT "sales_channel_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
