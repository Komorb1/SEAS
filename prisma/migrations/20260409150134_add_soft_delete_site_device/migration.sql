-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "deleted_at" TIMESTAMPTZ(6),
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Site" ADD COLUMN     "deleted_at" TIMESTAMPTZ(6),
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Device_is_deleted_idx" ON "Device"("is_deleted");

-- CreateIndex
CREATE INDEX "Site_is_deleted_idx" ON "Site"("is_deleted");
