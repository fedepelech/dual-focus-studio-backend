-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "amenities" TEXT,
ADD COLUMN     "roomCount" INTEGER;

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "dependsOnOptionId" TEXT,
ADD COLUMN     "displaySection" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "pricingBaseUnits" DOUBLE PRECISION,
ADD COLUMN     "pricingStepPrice" DOUBLE PRECISION,
ADD COLUMN     "pricingStepSize" DOUBLE PRECISION;
