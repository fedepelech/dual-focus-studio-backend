-- CreateTable
CREATE TABLE "PortfolioVideo" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "streamUid" TEXT NOT NULL,
    "title" TEXT,
    "thumbnailUrl" TEXT,
    "playbackUrl" TEXT,
    "size" INTEGER,
    "duration" DOUBLE PRECISION,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioVideo_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PortfolioVideo" ADD CONSTRAINT "PortfolioVideo_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "PortfolioProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
