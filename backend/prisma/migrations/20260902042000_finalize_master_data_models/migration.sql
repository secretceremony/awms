-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('PHM', 'OTHER');

-- AlterEnum
BEGIN;
CREATE TYPE "ProjectStatus_new" AS ENUM ('ACTIVE', 'COMPLETED');
ALTER TABLE "public"."projects" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "projects" ALTER COLUMN "status" TYPE "ProjectStatus_new" USING ("status"::text::"ProjectStatus_new");
ALTER TYPE "ProjectStatus" RENAME TO "ProjectStatus_old";
ALTER TYPE "ProjectStatus_new" RENAME TO "ProjectStatus";
DROP TYPE "public"."ProjectStatus_old";
ALTER TABLE "projects" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- DropForeignKey
ALTER TABLE "projects" DROP CONSTRAINT "projects_customer_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "customers_code_key";

-- AlterTable
ALTER TABLE "customers" DROP COLUMN IF EXISTS "attn_name",
DROP COLUMN IF EXISTS "code",
ADD COLUMN     "client_type" "ClientType" NOT NULL DEFAULT 'OTHER';

-- AlterTable
ALTER TABLE "projects" DROP COLUMN IF EXISTS "attn_name",
DROP COLUMN IF EXISTS "is_active",
DROP COLUMN IF EXISTS "leader_name",
ADD COLUMN     "client_contact_id" INTEGER,
ADD COLUMN     "site_code" TEXT,
ALTER COLUMN "customer_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "units" DROP COLUMN IF EXISTS "description",
ALTER COLUMN "symbol" SET NOT NULL;

-- AlterTable
ALTER TABLE "warehouses" DROP COLUMN IF EXISTS "description";

-- CreateTable
CREATE TABLE "client_contacts" (
    "id" SERIAL NOT NULL,
    "client_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_contacts_client_id_idx" ON "client_contacts"("client_id");

-- CreateIndex
CREATE INDEX "projects_client_contact_id_idx" ON "projects"("client_contact_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "units_symbol_key" ON "units"("symbol");

-- AddForeignKey
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_contact_id_fkey" FOREIGN KEY ("client_contact_id") REFERENCES "client_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
