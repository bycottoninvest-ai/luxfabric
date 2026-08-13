-- AlterTable
ALTER TABLE "Order" ADD COLUMN "deviceTokenHash" TEXT;

-- CreateIndex
CREATE INDEX "Order_customerPhone_idx" ON "Order"("customerPhone");
