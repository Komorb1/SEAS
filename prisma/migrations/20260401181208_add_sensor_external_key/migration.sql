/*
  Warnings:

  - A unique constraint covering the columns `[device_id,external_key]` on the table `Sensor` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `external_key` to the `Sensor` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Sensor" ADD COLUMN     "external_key" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Sensor_device_id_external_key_key" ON "Sensor"("device_id", "external_key");
