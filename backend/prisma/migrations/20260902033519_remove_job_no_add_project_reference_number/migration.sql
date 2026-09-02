/*
  Warnings:

  - You are about to drop the column `activity` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `job_no` on the `projects` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "projects" DROP COLUMN "activity",
DROP COLUMN "job_no",
ADD COLUMN     "reference_number" TEXT;
