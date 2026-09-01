/*
  Warnings:

  - You are about to drop the column `status` on the `item_serials` table. All the data in the column will be lost.
  - You are about to drop the column `sku` on the `items` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "items_sku_key";

-- AlterTable
ALTER TABLE "item_serials" DROP COLUMN "status",
ADD COLUMN     "condition_label" TEXT,
ADD COLUMN     "current_project_id" INTEGER,
ADD COLUMN     "current_warehouse_id" INTEGER,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "state" TEXT NOT NULL DEFAULT 'STANDBY_GOOD';

-- AlterTable
ALTER TABLE "items" DROP COLUMN "sku",
ADD COLUMN     "brand" TEXT;

-- DropEnum
DROP TYPE "SerialStatus";

-- CreateIndex
CREATE INDEX "item_serials_current_warehouse_id_idx" ON "item_serials"("current_warehouse_id");

-- CreateIndex
CREATE INDEX "item_serials_current_project_id_idx" ON "item_serials"("current_project_id");

-- AddForeignKey
ALTER TABLE "item_serials" ADD CONSTRAINT "item_serials_current_warehouse_id_fkey" FOREIGN KEY ("current_warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_serials" ADD CONSTRAINT "item_serials_current_project_id_fkey" FOREIGN KEY ("current_project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
