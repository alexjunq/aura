-- CreateTable
CREATE TABLE "sale" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pieceId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "salePrice" DECIMAL(14,4) NOT NULL,
    "currency" TEXT NOT NULL,
    "fxRateToBase" DECIMAL(14,8) NOT NULL,
    "commissionPctSnapshot" DECIMAL(5,2) NOT NULL,
    "commissionAmount" DECIMAL(14,4) NOT NULL,
    "netAmount" DECIMAL(14,4) NOT NULL,
    "soldAt" TIMESTAMP(3) NOT NULL,
    "refundedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sale_tenantId_idx" ON "sale"("tenantId");

-- CreateIndex
CREATE INDEX "sale_tenantId_soldAt_idx" ON "sale"("tenantId", "soldAt" DESC);

-- CreateIndex
CREATE INDEX "sale_buyerId_soldAt_idx" ON "sale"("buyerId", "soldAt" DESC);

-- CreateIndex
CREATE INDEX "sale_channelId_soldAt_idx" ON "sale"("channelId", "soldAt" DESC);

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "sale_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "sale_pieceId_fkey" FOREIGN KEY ("pieceId") REFERENCES "piece"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "sale_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "buyer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "sale_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "sales_channel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Partial unique index: at most one non-refunded sale per piece (spec residual #3).
-- Refunded sales (refundedAt IS NOT NULL) are excluded, so a piece can be
-- resold after a refund.
CREATE UNIQUE INDEX "sale_one_active_per_piece"
  ON "sale" ("pieceId")
  WHERE "refundedAt" IS NULL;
