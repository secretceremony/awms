/*
  Warnings:

  - You are about to drop the column `description` on the `projects` table. All the data in the column will be lost.
  - Added the required column `location` to the `projects` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

-- DropForeignKey
ALTER TABLE "projects" DROP CONSTRAINT "projects_customer_id_fkey";

-- AlterTable
ALTER TABLE "projects" DROP COLUMN "description",
ADD COLUMN     "activity" TEXT,
ADD COLUMN     "attn_name" TEXT,
ADD COLUMN     "ended_at" TIMESTAMP(3),
ADD COLUMN     "job_no" TEXT,
ADD COLUMN     "leader_name" TEXT,
ADD COLUMN     "location" TEXT NOT NULL,
ADD COLUMN     "started_at" TIMESTAMP(3),
ADD COLUMN     "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
ALTER COLUMN "customer_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
