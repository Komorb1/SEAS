-- CreateEnum
CREATE TYPE "SecurityMode" AS ENUM ('disarmed', 'armed');

-- AlterTable
ALTER TABLE "Site" ADD COLUMN     "security_mode" "SecurityMode" NOT NULL DEFAULT 'disarmed';
