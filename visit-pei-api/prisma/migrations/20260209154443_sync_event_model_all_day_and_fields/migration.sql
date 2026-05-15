/*
  Warnings:

  - You are about to drop the column `category` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `region` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `sourceUrl` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `Event` table. All the data in the column will be lost.
  - The `source` column on the `Event` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Event" DROP COLUMN "category",
DROP COLUMN "region",
DROP COLUMN "sourceUrl",
DROP COLUMN "url",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "allDay" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "sourceRef" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "venueName" TEXT,
ADD COLUMN     "website" TEXT,
DROP COLUMN "source",
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'MANUAL';

-- CreateIndex
CREATE INDEX "Event_community_idx" ON "Event"("community");
