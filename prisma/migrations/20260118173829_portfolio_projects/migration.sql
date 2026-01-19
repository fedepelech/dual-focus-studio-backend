/*
  Warnings:

  - You are about to drop the column `category` on the `PortfolioImage` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `PortfolioImage` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `PortfolioImage` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `PortfolioImage` table. All the data in the column will be lost.
  - Added the required column `projectId` to the `PortfolioImage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PortfolioImage" DROP COLUMN "category",
DROP COLUMN "description",
DROP COLUMN "isActive",
DROP COLUMN "title",
ADD COLUMN     "caption" TEXT,
ADD COLUMN     "projectId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "PortfolioProject" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "ServiceCategory",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioProject_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PortfolioImage" ADD CONSTRAINT "PortfolioImage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "PortfolioProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
