-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'ISSUED';

-- AlterTable delivery_orders
ALTER TABLE "delivery_orders"
  ALTER COLUMN "do_number" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "activity" TEXT NOT NULL DEFAULT 'General Dispatch',
  ADD COLUMN IF NOT EXISTS "notes" TEXT,
  ADD COLUMN IF NOT EXISTS "issued_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "issued_by_id" INTEGER,
  ADD COLUMN IF NOT EXISTS "stock_movement_id" INTEGER,
  ADD COLUMN IF NOT EXISTS "client_company_name" TEXT,
  ADD COLUMN IF NOT EXISTS "client_type" TEXT,
  ADD COLUMN IF NOT EXISTS "attn_name" TEXT,
  ADD COLUMN IF NOT EXISTS "attn_phone" TEXT,
  ADD COLUMN IF NOT EXISTS "attn_email" TEXT,
  ADD COLUMN IF NOT EXISTS "project_name" TEXT,
  ADD COLUMN IF NOT EXISTS "project_location" TEXT,
  ADD COLUMN IF NOT EXISTS "site_code" TEXT,
  ADD COLUMN IF NOT EXISTS "reference_number" TEXT,
  ADD COLUMN IF NOT EXISTS "warehouse_name" TEXT,
  ADD COLUMN IF NOT EXISTS "warehouse_city_code" TEXT,
  ADD COLUMN IF NOT EXISTS "snapshots" JSONB;

-- Make sure project_id is not null if valid
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "delivery_orders" WHERE "project_id" IS NULL) THEN
    -- If there's any null, leave it nullable or handle
    NULL;
  ELSE
    ALTER TABLE "delivery_orders" ALTER COLUMN "project_id" SET NOT NULL;
  END IF;
END $$;

-- AlterTable delivery_order_items
ALTER TABLE "delivery_order_items"
  ADD COLUMN IF NOT EXISTS "pic" TEXT,
  ADD COLUMN IF NOT EXISTS "remarks" TEXT,
  ADD COLUMN IF NOT EXISTS "item_name" TEXT,
  ADD COLUMN IF NOT EXISTS "brand" TEXT,
  ADD COLUMN IF NOT EXISTS "model_number" TEXT,
  ADD COLUMN IF NOT EXISTS "unit_name" TEXT,
  ADD COLUMN IF NOT EXISTS "unit_symbol" TEXT,
  ADD COLUMN IF NOT EXISTS "tracking_type" "TrackingType";

-- CreateTable delivery_order_item_serials
CREATE TABLE IF NOT EXISTS "delivery_order_item_serials" (
  "id" SERIAL NOT NULL,
  "delivery_order_item_id" INTEGER NOT NULL,
  "item_serial_id" INTEGER NOT NULL,
  "serial_number" TEXT,
  "condition_label" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "delivery_order_item_serials_pkey" PRIMARY KEY ("id")
);

-- AlterTable do_sequences
ALTER TABLE "do_sequences" DROP COLUMN IF EXISTS "prefix";
ALTER TABLE "do_sequences" DROP COLUMN IF EXISTS "month";
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'do_sequences_year_key'
  ) THEN
    ALTER TABLE "do_sequences" ADD CONSTRAINT "do_sequences_year_key" UNIQUE ("year");
  END IF;
END $$;

-- Add Constraints & Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "delivery_orders_stock_movement_id_key" ON "delivery_orders"("stock_movement_id");
CREATE INDEX IF NOT EXISTS "delivery_orders_issued_by_id_idx" ON "delivery_orders"("issued_by_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'delivery_orders_issued_by_id_fkey'
  ) THEN
    ALTER TABLE "delivery_orders" ADD CONSTRAINT "delivery_orders_issued_by_id_fkey" FOREIGN KEY ("issued_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'delivery_orders_stock_movement_id_fkey'
  ) THEN
    ALTER TABLE "delivery_orders" ADD CONSTRAINT "delivery_orders_stock_movement_id_fkey" FOREIGN KEY ("stock_movement_id") REFERENCES "stock_movements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'delivery_order_item_serials_delivery_order_item_id_fkey'
  ) THEN
    ALTER TABLE "delivery_order_item_serials" ADD CONSTRAINT "delivery_order_item_serials_delivery_order_item_id_fkey" FOREIGN KEY ("delivery_order_item_id") REFERENCES "delivery_order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'delivery_order_item_serials_item_serial_id_fkey'
  ) THEN
    ALTER TABLE "delivery_order_item_serials" ADD CONSTRAINT "delivery_order_item_serials_item_serial_id_fkey" FOREIGN KEY ("item_serial_id") REFERENCES "item_serials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "delivery_order_item_serials_delivery_order_item_id_item_serial_id_key" ON "delivery_order_item_serials"("delivery_order_item_id", "item_serial_id");
CREATE INDEX IF NOT EXISTS "delivery_order_item_serials_item_serial_id_idx" ON "delivery_order_item_serials"("item_serial_id");
