-- AlterTable
ALTER TABLE "Place" ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "popularity" INTEGER,
ADD COLUMN     "rating" DOUBLE PRECISION;
