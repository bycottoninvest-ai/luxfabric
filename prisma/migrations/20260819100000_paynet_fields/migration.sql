-- AlterTable
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paynetTransactionId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paynetProviderTrnId" INTEGER;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paynetState" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Order_paynetTransactionId_key" ON "Order"("paynetTransactionId");
