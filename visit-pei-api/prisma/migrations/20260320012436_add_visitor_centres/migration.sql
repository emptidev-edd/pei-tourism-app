-- CreateTable
CREATE TABLE "VisitorCentre" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "community" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "hours" TEXT,
    "season" TEXT,
    "imageUrl" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "geom" geometry(Point, 4326),
    "source" TEXT NOT NULL,
    "sourceRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisitorCentre_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VisitorCentre_community_idx" ON "VisitorCentre"("community");

-- CreateIndex
CREATE INDEX "VisitorCentre_source_idx" ON "VisitorCentre"("source");
