-- AlterTable
ALTER TABLE "Order" DROP COLUMN IF EXISTS "zone",
DROP COLUMN IF EXISTS "gbaSubzone",
ADD COLUMN "barrio" TEXT;

-- DropTable
DROP TABLE IF EXISTS "GbaSubzoneConfig";

-- DropEnum
DROP TYPE IF EXISTS "Zone";

-- CreateTable
CREATE TABLE "BarrioConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BarrioConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BarrioConfig_name_key" ON "BarrioConfig"("name");
