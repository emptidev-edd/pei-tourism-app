import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";

const  parseNearParam = (near?: string) => {
    if (!near) return null;
    const [latStr, lngStr] = near.split(",");
    const lat = Number(latStr);
    const lng = Number(lngStr);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
}

const  getServiceDayParts = (input?: string) => {
    const base = input ? new Date(input) : new Date();
    const y = base.getFullYear();
    const m = String(base.getMonth() + 1).padStart(2, "0");
    const d = String(base.getDate()).padStart(2, "0");
    const ymd = `${y}${m}${d}`;

    const weekdayMap = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
    ] as const;

    const weekday = weekdayMap[base.getDay()];
    return { base, ymd, weekday };
}

const  timeToSeconds = (t?: string | null) =>  {
    if (!t) return null;
    const parts = t.split(":").map(Number);
    if (parts.length < 2) return null;
    const [hh, mm, ss = 0] = parts;
    if (![hh, mm, ss].every(Number.isFinite)) return null;
    return hh * 3600 + mm * 60 + ss;
}

const  currentSecondsOfDay = (d: Date) => {
    return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
}

const  secondsToIso = (base: Date, totalSeconds: number) =>  {
    const dayOffset = Math.floor(totalSeconds / 86400);
    const secs = totalSeconds % 86400;

    const dt = new Date(base);
    dt.setHours(0, 0, 0, 0);
    dt.setDate(dt.getDate() + dayOffset);
    dt.setSeconds(secs);
    return dt.toISOString();
}

/**
 * GET /api/transit/stops?near=46.24,-63.13&radius=800&limit=50
 */
export  const getNearbyStops =  async (req: Request, res: Response) => {
    const near = parseNearParam(req.query.near?.toString());
    const radius = Number(req.query.radius ?? 800);
    const limit = Math.min(Number(req.query.limit ?? 50), 200);

    if (!near) {
        return res.status(400).json({
            ok: false,
            message: "near query param is required in format lat,lng",
        });
    }

    const result = await prisma.$queryRawUnsafe<any[]>(
        `
            SELECT
                id,
                "feedId",
                "stopId",
                code,
                name,
                "desc",
                lat,
                lon,
                ST_Distance(
                        geom::geography,
                        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
                ) AS meters
            FROM "GtfsStop"
            WHERE geom IS NOT NULL
              AND ST_DWithin(
                    geom::geography,
                    ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
                    $3
                  )
            ORDER BY meters ASC
                LIMIT $4
        `,
        near.lng,
        near.lat,
        radius,
        limit,
    );

    res.json({
        ok: true,
        near,
        radius,
        count: result.length,
        items: result,
    });
}



/**
 * GET /api/transit/stops/:stopId/next?feedId=transitland:f-coachatlantic~pe~ca&at=2026-02-09T14:00:00Z&limit=10
 *
 * stopId here is the GTFS raw stop_id, not the Prisma row id.
 */
export async function getNextArrivalsForStop(req: Request, res: Response) {
    const stopId = Array.isArray(req.params.stopId)
        ? req.params.stopId[0]
        : req.params.stopId;
    const feedId = req.query.feedId?.toString() || "transitland:f-coachatlantic~pe~ca";
    const at = req.query.at?.toString();
    const limit = Math.min(Number(req.query.limit ?? 10), 50);

    const { base, ymd, weekday } = getServiceDayParts(at);
    const nowSecs = currentSecondsOfDay(base);

    // 1) base active services from calendar
    const calendars = await prisma.gtfsCalendar.findMany({
        where: {
            feedId,
            startDate: { lte: ymd },
            endDate: { gte: ymd },
        },
    });

    const activeServiceIds = new Set<string>();
    for (const c of calendars) {
        const dayValue = c[weekday];
        if (dayValue === 1) activeServiceIds.add(c.serviceId);
    }

    // apply calendar_dates exceptions
    const exceptions = await prisma.gtfsCalendarDate.findMany({
        where: {
            feedId,
            date: ymd,
        },
    });

    for (const ex of exceptions) {
        if (ex.exceptionType === 1) activeServiceIds.add(ex.serviceId);
        if (ex.exceptionType === 2) activeServiceIds.delete(ex.serviceId);
    }

    if (activeServiceIds.size === 0) {
        return res.json({
            ok: true,
            stopId,
            feedId,
            at: base.toISOString(),
            count: 0,
            items: [],
        });
    }

    // get stop_times for this stop
    const stopTimes = await prisma.gtfsStopTime.findMany({
        where: {
            feedId,
            stopId,
        },
        orderBy: {
            departureTime: "asc",
        },
    });

    if (!stopTimes.length) {
        return res.json({
            ok: true,
            stopId,
            feedId,
            at: base.toISOString(),
            count: 0,
            items: [],
        });
    }

    // get trips referenced by these stop_times
    const tripIds = Array.from(new Set(stopTimes.map((s) => s.tripId)));
    const trips = await prisma.gtfsTrip.findMany({
        where: {
            feedId,
            tripId: { in: tripIds },
            serviceId: { in: Array.from(activeServiceIds) },
        },
    });

    const tripMap = new Map(trips.map((t) => [t.tripId, t]));

    // 5) get routes referenced by trips
    const routeIds = Array.from(new Set(trips.map((t) => t.routeId)));
    const routes = await prisma.gtfsRoute.findMany({
        where: {
            feedId,
            routeId: { in: routeIds },
        },
    });
    const routeMap = new Map(routes.map((r) => [r.routeId, r]));

    // 6) compute next departures
    const items = stopTimes
        .map((st) => {
            const trip = tripMap.get(st.tripId);
            if (!trip) return null;

            const depSecs = timeToSeconds(st.departureTime);
            if (depSecs == null) return null;
            if (depSecs < nowSecs) return null;

            const route = routeMap.get(trip.routeId);

            return {
                feedId,
                stopId,
                tripId: st.tripId,
                routeId: trip.routeId,
                routeShortName: route?.shortName ?? null,
                routeLongName: route?.longName ?? null,
                headsign: trip.headsign ?? null,
                departureTime: st.departureTime,
                arrivalTime: st.arrivalTime,
                departureAtIso: secondsToIso(base, depSecs),
                stopSequence: st.stopSequence,
            };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => {
            const aa = timeToSeconds(a.departureTime) ?? 0;
            const bb = timeToSeconds(b.departureTime) ?? 0;
            return aa - bb;
        })
        .slice(0, limit);

    const stop = await prisma.gtfsStop.findFirst({
        where: {
            feedId,
            stopId,
        },
    });

    res.json({
        ok: true,
        stop: stop
            ? {
                id: stop.id,
                feedId: stop.feedId,
                stopId: stop.stopId,
                name: stop.name,
                lat: stop.lat,
                lon: stop.lon,
            }
            : null,
        at: base.toISOString(),
        count: items.length,
        items,
    });
}

export async function getRouteStops(req: Request, res: Response) {
    const routeId = Array.isArray(req.params.routeId)
        ? req.params.routeId[0]
        : req.params.routeId;
    const feedId =
        req.query.feedId?.toString() || "transitland:f-coachatlantic~pe~ca";

    // Pick one trip for this route to represent the stop pattern.
    // Later we can support direction_id or headsign.
    const trip = await prisma.gtfsTrip.findFirst({
        where: {
            feedId,
            routeId,
        },
        orderBy: {
            tripId: "asc",
        },
    });

    if (!trip) {
        return res.status(404).json({
            ok: false,
            message: "Route not found",
        });
    }

    const stopTimes = await prisma.gtfsStopTime.findMany({
        where: {
            feedId,
            tripId: trip.tripId,
        },
        orderBy: {
            stopSequence: "asc",
        },
    });

    const stopIds = stopTimes.map((s) => s.stopId);

    const stops = await prisma.gtfsStop.findMany({
        where: {
            feedId,
            stopId: { in: stopIds },
        },
    });

    const stopMap = new Map(stops.map((s) => [s.stopId, s]));

    const route = await prisma.gtfsRoute.findFirst({
        where: {
            feedId,
            routeId,
        },
    });

    const items = stopTimes.map((st) => {
        const stop = stopMap.get(st.stopId);
        return {
            stopId: st.stopId,
            stopSequence: st.stopSequence,
            arrivalTime: st.arrivalTime,
            departureTime: st.departureTime,
            stop: stop
                ? {
                    id: stop.id,
                    name: stop.name,
                    code: stop.code,
                    lat: stop.lat,
                    lon: stop.lon,
                }
                : null,
        };
    });

    res.json({
        ok: true,
        route: route
            ? {
                routeId: route.routeId,
                shortName: route.shortName,
                longName: route.longName,
                desc: route.desc,
            }
            : null,
        trip: {
            tripId: trip.tripId,
            headsign: trip.headsign,
            directionId: trip.directionId,
        },
        count: items.length,
        items,
    });
}