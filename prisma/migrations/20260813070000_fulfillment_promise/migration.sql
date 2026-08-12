-- AlterTable
ALTER TABLE "Order" ADD COLUMN "regionCode" TEXT;
ALTER TABLE "Order" ADD COLUMN "handoffMode" TEXT;
ALTER TABLE "Order" ADD COLUMN "promisedBy" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "shipBy" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "promiseLabel" TEXT;

-- CreateIndex
CREATE INDEX "Order_shipBy_status_idx" ON "Order"("shipBy", "status");

-- CreateIndex
CREATE INDEX "Order_regionCode_idx" ON "Order"("regionCode");
