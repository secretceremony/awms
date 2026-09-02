-- AlterTable
ALTER TABLE "stock_movements" ADD COLUMN     "movement_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "notes" TEXT;
