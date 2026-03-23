-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditActionType" ADD VALUE 'update_event';
ALTER TYPE "AuditActionType" ADD VALUE 'logout';
ALTER TYPE "AuditActionType" ADD VALUE 'update_profile';

-- AlterEnum
ALTER TYPE "AuditTargetType" ADD VALUE 'user';
