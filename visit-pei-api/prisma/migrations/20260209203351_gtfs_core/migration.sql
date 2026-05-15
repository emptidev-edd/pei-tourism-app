-- CreateTable
CREATE TABLE "GtfsFeed" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "feedKey" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GtfsFeed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GtfsAgency" (
    "id" TEXT NOT NULL,
    "feedId" TEXT NOT NULL,
    "agencyId" TEXT,
    "name" TEXT,
    "url" TEXT,
    "timezone" TEXT,
    "lang" TEXT,
    "phone" TEXT,

    CONSTRAINT "GtfsAgency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GtfsRoute" (
    "id" TEXT NOT NULL,
    "feedId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "agencyId" TEXT,
    "shortName" TEXT,
    "longName" TEXT,
    "desc" TEXT,
    "type" INTEGER,

    CONSTRAINT "GtfsRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GtfsStop" (
    "id" TEXT NOT NULL,
    "feedId" TEXT NOT NULL,
    "stopId" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT,
    "desc" TEXT,
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "zoneId" TEXT,
    "url" TEXT,
    "locationType" INTEGER,
    "parentStation" TEXT,
    "geom" geometry(Point, 4326),

    CONSTRAINT "GtfsStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GtfsTrip" (
    "id" TEXT NOT NULL,
    "feedId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "serviceId" TEXT,
    "headsign" TEXT,
    "directionId" INTEGER,
    "shapeId" TEXT,

    CONSTRAINT "GtfsTrip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GtfsStopTime" (
    "id" TEXT NOT NULL,
    "feedId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "arrivalTime" TEXT,
    "departureTime" TEXT,
    "stopId" TEXT NOT NULL,
    "stopSequence" INTEGER NOT NULL,

    CONSTRAINT "GtfsStopTime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GtfsCalendar" (
    "id" TEXT NOT NULL,
    "feedId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "monday" INTEGER NOT NULL,
    "tuesday" INTEGER NOT NULL,
    "wednesday" INTEGER NOT NULL,
    "thursday" INTEGER NOT NULL,
    "friday" INTEGER NOT NULL,
    "saturday" INTEGER NOT NULL,
    "sunday" INTEGER NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,

    CONSTRAINT "GtfsCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GtfsCalendarDate" (
    "id" TEXT NOT NULL,
    "feedId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "exceptionType" INTEGER NOT NULL,

    CONSTRAINT "GtfsCalendarDate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GtfsAgency_feedId_idx" ON "GtfsAgency"("feedId");

-- CreateIndex
CREATE INDEX "GtfsRoute_feedId_idx" ON "GtfsRoute"("feedId");

-- CreateIndex
CREATE INDEX "GtfsRoute_routeId_idx" ON "GtfsRoute"("routeId");

-- CreateIndex
CREATE INDEX "GtfsStop_feedId_idx" ON "GtfsStop"("feedId");

-- CreateIndex
CREATE INDEX "GtfsStop_stopId_idx" ON "GtfsStop"("stopId");

-- CreateIndex
CREATE INDEX "GtfsTrip_feedId_idx" ON "GtfsTrip"("feedId");

-- CreateIndex
CREATE INDEX "GtfsTrip_routeId_idx" ON "GtfsTrip"("routeId");

-- CreateIndex
CREATE INDEX "GtfsTrip_tripId_idx" ON "GtfsTrip"("tripId");

-- CreateIndex
CREATE INDEX "GtfsStopTime_feedId_idx" ON "GtfsStopTime"("feedId");

-- CreateIndex
CREATE INDEX "GtfsStopTime_stopId_idx" ON "GtfsStopTime"("stopId");

-- CreateIndex
CREATE INDEX "GtfsStopTime_tripId_idx" ON "GtfsStopTime"("tripId");

-- CreateIndex
CREATE INDEX "GtfsCalendar_feedId_idx" ON "GtfsCalendar"("feedId");

-- CreateIndex
CREATE INDEX "GtfsCalendarDate_feedId_idx" ON "GtfsCalendarDate"("feedId");

-- AddForeignKey
ALTER TABLE "GtfsAgency" ADD CONSTRAINT "GtfsAgency_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "GtfsFeed"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GtfsRoute" ADD CONSTRAINT "GtfsRoute_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "GtfsFeed"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GtfsStop" ADD CONSTRAINT "GtfsStop_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "GtfsFeed"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GtfsTrip" ADD CONSTRAINT "GtfsTrip_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "GtfsFeed"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GtfsStopTime" ADD CONSTRAINT "GtfsStopTime_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "GtfsFeed"("id") ON DELETE CASCADE ON UPDATE CASCADE;
