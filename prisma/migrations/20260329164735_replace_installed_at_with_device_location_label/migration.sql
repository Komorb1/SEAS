/*
  Warnings:

  - You are about to drop the column `installed_at` on the `Device` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Device" DROP COLUMN "installed_at",
ADD COLUMN     "location_label" TEXT;
