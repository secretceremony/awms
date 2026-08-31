/*
  Warnings:

  - Added the required column `city` to the `warehouses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `city_code` to the `warehouses` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "warehouses" ADD COLUMN     "city" TEXT NOT NULL,
ADD COLUMN     "city_code" TEXT NOT NULL;
