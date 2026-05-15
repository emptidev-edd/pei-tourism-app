import fs from 'fs';
import os from 'os';
import path from 'path';
import unzipper from 'unzipper';
import { parse } from 'csv-parse';
import { prisma } from '../../config/prisma.js';

const TRANSITLAND_BASE = 'https://transit.land/api/v2/rest';

const downloadLatestGtfsZip = async (feedKey: string): Promise<Buffer> => {
  // Transitland: download_latest_feed_version endpoint
  // Docs: /api/v2/rest/feeds/{feed_key}/download_latest_feed_version :contentReference[oaicite:3]{index=3}
  const url = `${TRANSITLAND_BASE}/feeds/${encodeURIComponent(feedKey)}/download_latest_feed_version`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'visit-pei-api/1.0',
      apikey: process.env.TRANSITLAND_API_KEY!,
    },
    redirect: 'follow',
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(
      `Transitland download failed (${res.status}) ${txt.slice(0, 200)}`,
    );
  }

  const arr = await res.arrayBuffer();
  return Buffer.from(arr);
};

const unzipToTemp = async (zip: Buffer) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gtfs-'));
  await new Promise<void>((resolve, reject) => {
    const stream = unzipper.Extract({ path: dir });
    stream.on('close', () => resolve());
    stream.on('error', reject);
    stream.end(zip);
  });
  return dir;
};

const readCsv = (filePath: string): Promise<Record<string, string>[]> => {
  return new Promise((resolve, reject) => {
    const rows: Record<string, string>[] = [];
    fs.createReadStream(filePath)
      .pipe(
        parse({
          columns: true,
          bom: true,
          relax_quotes: true,
          relax_column_count: true,
          trim: true,
        }),
      )
      .on('data', (r) => rows.push(r))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
};

const feedIdFromKey = (feedKey: string) => `transitland:${feedKey}`;

export const ingestTransitlandGtfs = async (args: {
  feedKey: string; // e.g. "f-coachatlantic~pe~ca" :contentReference[oaicite:4]{index=4}
  replace?: boolean; // if true: delete old for this feed first
}) => {
  const feedId = feedIdFromKey(args.feedKey);

  // optional reset
  if (args.replace) {
    await prisma.gtfsStopTime.deleteMany({ where: { feedId } });
    await prisma.gtfsTrip.deleteMany({ where: { feedId } });
    await prisma.gtfsStop.deleteMany({ where: { feedId } });
    await prisma.gtfsRoute.deleteMany({ where: { feedId } });
    await prisma.gtfsAgency.deleteMany({ where: { feedId } });
    await prisma.gtfsCalendarDate.deleteMany({ where: { feedId } });
    await prisma.gtfsCalendar.deleteMany({ where: { feedId } });
    await prisma.gtfsFeed.deleteMany({ where: { id: feedId } });
  }

  await prisma.gtfsFeed.upsert({
    where: { id: feedId },
    update: {
      fetchedAt: new Date(),
      source: 'TRANSITLAND',
      feedKey: args.feedKey,
    },
    create: { id: feedId, source: 'TRANSITLAND', feedKey: args.feedKey },
  });

  const zip = await downloadLatestGtfsZip(args.feedKey);
  const dir = await unzipToTemp(zip);

  const p = (name: string) => path.join(dir, name);

  // Parse required GTFS core files :contentReference[oaicite:5]{index=5}
  const agencyRows = fs.existsSync(p('agency.txt'))
    ? await readCsv(p('agency.txt'))
    : [];
  const routesRows = fs.existsSync(p('routes.txt'))
    ? await readCsv(p('routes.txt'))
    : [];
  const stopsRows = fs.existsSync(p('stops.txt'))
    ? await readCsv(p('stops.txt'))
    : [];
  const tripsRows = fs.existsSync(p('trips.txt'))
    ? await readCsv(p('trips.txt'))
    : [];
  const stopTimesRows = fs.existsSync(p('stop_times.txt'))
    ? await readCsv(p('stop_times.txt'))
    : [];
  const calRows = fs.existsSync(p('calendar.txt'))
    ? await readCsv(p('calendar.txt'))
    : [];
  const calDateRows = fs.existsSync(p('calendar_dates.txt'))
    ? await readCsv(p('calendar_dates.txt'))
    : [];

  // Agencies
  if (agencyRows.length) {
    await prisma.gtfsAgency.createMany({
      data: agencyRows.map((r) => {
        const agencyId = r.agency_id || null;
        return {
          id: `${feedId}:${agencyId ?? 'default'}`,
          feedId,
          agencyId,
          name: r.agency_name || null,
          url: r.agency_url || null,
          timezone: r.agency_timezone || null,
          lang: r.agency_lang || null,
          phone: r.agency_phone || null,
        };
      }),
      skipDuplicates: true,
    });
  }

  // Routes
  if (routesRows.length) {
    await prisma.gtfsRoute.createMany({
      data: routesRows.map((r) => ({
        id: `${feedId}:${r.route_id}`,
        feedId,
        routeId: r.route_id,
        agencyId: r.agency_id || null,
        shortName: r.route_short_name || null,
        longName: r.route_long_name || null,
        desc: r.route_desc || null,
        type: r.route_type ? Number(r.route_type) : null,
      })),
      skipDuplicates: true,
    });
  }

  // Stops (with PostGIS point)
  if (stopsRows.length) {
    await prisma.gtfsStop.createMany({
      data: stopsRows.map((r) => {
        const lat = r.stop_lat ? Number(r.stop_lat) : null;
        const lon = r.stop_lon ? Number(r.stop_lon) : null;

        return {
          id: `${feedId}:${r.stop_id}`,
          feedId,
          stopId: r.stop_id,
          code: r.stop_code || null,
          name: r.stop_name || null,
          desc: r.stop_desc || null,
          lat,
          lon,
          zoneId: r.zone_id || null,
          url: r.stop_url || null,
          locationType: r.location_type ? Number(r.location_type) : null,
          parentStation: r.parent_station || null,
        };
      }),
      skipDuplicates: true,
    });

    // Update geometry using raw SQL (Unsupported fields can't be set in createMany)
    await prisma.$executeRaw`
      UPDATE "GtfsStop"
      SET geom = ST_SetSRID(ST_MakePoint(lon, lat), 4326)
      WHERE "feedId" = ${feedId} AND lat IS NOT NULL AND lon IS NOT NULL
    `;
  }

  // Trips
  if (tripsRows.length) {
    await prisma.gtfsTrip.createMany({
      data: tripsRows.map((r) => ({
        id: `${feedId}:${r.trip_id}`,
        feedId,
        tripId: r.trip_id,
        routeId: r.route_id,
        serviceId: r.service_id || null,
        headsign: r.trip_headsign || null,
        directionId: r.direction_id ? Number(r.direction_id) : null,
        shapeId: r.shape_id || null,
      })),
      skipDuplicates: true,
    });
  }

  // Stop times (can be large; still okay for small agencies)
  if (stopTimesRows.length) {
    // Insert in chunks to avoid big payloads
    const chunkSize = 5000;
    for (let i = 0; i < stopTimesRows.length; i += chunkSize) {
      const chunk = stopTimesRows.slice(i, i + chunkSize);
      await prisma.gtfsStopTime.createMany({
        data: chunk.map((r) => ({
          id: `${feedId}:${r.trip_id}:${r.stop_sequence}`,
          feedId,
          tripId: r.trip_id,
          arrivalTime: r.arrival_time || null,
          departureTime: r.departure_time || null,
          stopId: r.stop_id,
          stopSequence: r.stop_sequence ? Number(r.stop_sequence) : 0,
        })),
        skipDuplicates: true,
      });
    }
  }

  // Calendar
  if (calRows.length) {
    await prisma.gtfsCalendar.createMany({
      data: calRows.map((r) => ({
        id: `${feedId}:${r.service_id}`,
        feedId,
        serviceId: r.service_id,
        monday: Number(r.monday || 0),
        tuesday: Number(r.tuesday || 0),
        wednesday: Number(r.wednesday || 0),
        thursday: Number(r.thursday || 0),
        friday: Number(r.friday || 0),
        saturday: Number(r.saturday || 0),
        sunday: Number(r.sunday || 0),
        startDate: r.start_date,
        endDate: r.end_date,
      })),
      skipDuplicates: true,
    });
  }

  // Calendar dates
  if (calDateRows.length) {
    await prisma.gtfsCalendarDate.createMany({
      data: calDateRows.map((r) => ({
        id: `${feedId}:${r.service_id}:${r.date}:${r.exception_type}`,
        feedId,
        serviceId: r.service_id,
        date: r.date,
        exceptionType: Number(r.exception_type || 0),
      })),
      skipDuplicates: true,
    });
  }

  return {
    ok: true,
    feedKey: args.feedKey,
    feedId,
    counts: {
      agencies: agencyRows.length,
      routes: routesRows.length,
      stops: stopsRows.length,
      trips: tripsRows.length,
      stopTimes: stopTimesRows.length,
      calendar: calRows.length,
      calendarDates: calDateRows.length,
    },
  };
};
