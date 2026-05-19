-- CreateEnum
CREATE TYPE "buyer_interaction_kind" AS ENUM ('meeting', 'message', 'inquiry', 'note', 'other');

-- CreateTable
CREATE TABLE "buyer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "instagram" TEXT,
    "birthdate" DATE,
    "address" JSONB,
    "interests" TEXT[],
    "notes" TEXT,
    "retiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buyer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buyer_interaction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "kind" "buyer_interaction_kind" NOT NULL DEFAULT 'note',
    "summary" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "buyer_interaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "buyer_tenantId_idx" ON "buyer"("tenantId");

-- CreateIndex
CREATE INDEX "buyer_tenantId_retiredAt_idx" ON "buyer"("tenantId", "retiredAt");

-- CreateIndex
CREATE INDEX "buyer_interaction_buyerId_occurredAt_idx" ON "buyer_interaction"("buyerId", "occurredAt" DESC);

-- AddForeignKey
ALTER TABLE "buyer" ADD CONSTRAINT "buyer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyer_interaction" ADD CONSTRAINT "buyer_interaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyer_interaction" ADD CONSTRAINT "buyer_interaction_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "buyer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
