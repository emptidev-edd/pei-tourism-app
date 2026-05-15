CREATE EXTENSION IF NOT EXISTS postgis;
-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('GOV_PEI', 'PEI_511', 'TOURISM_PEI', 'OPEN_DATA', 'TRANSIT', 'OTHER');

-- CreateEnum
CREATE TYPE "PlaceCategory" AS ENUM ('VISITOR_CENTRE', 'ATTRACTION', 'BEACH', 'PARK', 'TRAIL', 'LIGHTHOUSE', 'MUSEUM', 'FOOD_DRINK', 'TRANSPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'MINOR', 'MAJOR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TravelEventType" AS ENUM ('ROAD_CONDITION', 'CAMERA', 'FERRY', 'EVENT', 'ADVISORY', 'PARK', 'OTHER');

-- CreateTable
CREATE TABLE "SourceSnapshot" (
    "id" TEXT NOT NULL,
    "source" "SourceType" NOT NULL,
    "endpoint" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Place" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "PlaceCategory" NOT NULL,
    "description" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "hoursJson" JSONB,
    "region" TEXT,
    "community" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "geo" geography,
    "source" "SourceType" NOT NULL,
    "sourceUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "category" TEXT,
    "community" TEXT,
    "region" TEXT,
    "url" TEXT,
    "imageUrl" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "geo" geography,
    "source" "SourceType" NOT NULL,
    "sourceUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicAlert" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'INFO',
    "alertType" TEXT,
    "publishedAt" TIMESTAMP(3),
    "source" "SourceType" NOT NULL,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelItem" (
    "id" TEXT NOT NULL,
    "type" "TravelEventType" NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "status" TEXT,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "imageUrl" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "geo" geography,
    "source" "SourceType" NOT NULL,
    "sourceUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TravelItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransitStop" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stopCode" TEXT,
    "community" TEXT,
    "region" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "geo" geography,
    "source" "SourceType" NOT NULL,
    "sourceUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransitStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransitArrival" (
    "id" TEXT NOT NULL,
    "stopId" TEXT NOT NULL,
    "routeName" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "isRealtime" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransitArrival_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SourceSnapshot_source_fetchedAt_idx" ON "SourceSnapshot"("source", "fetchedAt");

-- CreateIndex
CREATE INDEX "Place_category_idx" ON "Place"("category");

-- CreateIndex
CREATE INDEX "Place_region_idx" ON "Place"("region");

-- CreateIndex
CREATE INDEX "Event_startAt_idx" ON "Event"("startAt");

-- CreateIndex
CREATE INDEX "PublicAlert_publishedAt_idx" ON "PublicAlert"("publishedAt");

-- CreateIndex
CREATE INDEX "TravelItem_type_idx" ON "TravelItem"("type");

-- CreateIndex
CREATE INDEX "TransitArrival_stopId_scheduledAt_idx" ON "TransitArrival"("stopId", "scheduledAt");

-- AddForeignKey
ALTER TABLE "TransitArrival" ADD CONSTRAINT "TransitArrival_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "TransitStop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- --- ADD THESE LINES TO THE END ---
-- Spatial indexes (safe even if geo is null)
CREATE INDEX IF NOT EXISTS idx_place_geo ON "Place" USING GIST ("geo");
CREATE INDEX IF NOT EXISTS idx_event_geo ON "Event" USING GIST ("geo");
CREATE INDEX IF NOT EXISTS idx_travel_geo ON "TravelItem" USING GIST ("geo");
CREATE INDEX IF NOT EXISTS idx_stop_geo ON "TransitStop" USING GIST ("geo");
-- ----------------------------------