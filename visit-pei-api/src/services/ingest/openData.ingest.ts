/***
 * Open Data ingestion (ArcGIS → Place)
 * ArcGIS FeatureServer layer query (GeoJSON) with pagination via:
 *  - resultOffset
 *  - resultRecordCount
 * (official query behavior)
 * :contentReference[oaicite:1]{index=1}
 *
 */

import { prisma } from '../../config/prisma.js';
import { Prisma } from '@prisma/client';
import { getJson } from '../https.js';

type GeoJsonFeature = {
  type: 'Features';
  geometry: {
    type: string;
    coordinates: any;
  };
  properties: Record<string, any>;
};

type GeoJsonResponse = {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
  exceededTransferLimit?: boolean;
};

const geoJsonToWktPoint = (
  geometry: any,
): {
  wktPoint?: string;
  lat?: number;
  lng?: number;
} => {
  if (!geometry) return {};

  // Point
  if (geometry.type === 'Point' && Array.isArray(geometry.coordinates)) {
    const [lng, lat] = geometry.coordinates;
    if (typeof lat === 'number' && typeof lng === 'number') {
      return { wktPoint: `POINT(${lng} ${lat})`, lat, lng };
    }
  }

  // Polygon / MultiPolygon / LineString / MultiLineString
  // We will store a representative point using PostGIS later.
  // For now we return no point here; we'll handle it with ST_PointOnSurface from GeoJSON.
  return {};
};

// Parse a string like "(46.255358, -63.100222)" or "46.255358,-63.100222" into lat/lng
const parseLatLngFromString = (val: any): { lat?: number; lng?: number } => {
  if (typeof val !== 'string') return {};
  const s = val.trim();

  // Matches "(46.255358, -63.100222)" or "46.255358,-63.100222"
  const m = s.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!m) return {};

  const lat = Number(m[1]);
  const lng = Number(m[2]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return {};
  return { lat, lng };
};

// ArcGIS REST API query parameters
const clean = (s: any) => {
  return typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : undefined;
};

// Convert ArcGIS geometry to latitude and longitude
const toLatLng = (geom: GeoJsonFeature['geometry']) => {
  if (!geom) return {};
  if (
    geom.type === 'Point' &&
    Array.isArray(geom.coordinates) &&
    geom.coordinates.length >= 2
  ) {
    const [longitude, latitude] = geom.coordinates;
    if (typeof latitude === 'number' && typeof longitude === 'number') {
      return { latitude, longitude };
    }
  }
  return {};
};
const queryAll = async (layerUrl: String) => {
  const pageSize = 2000;
  let offset = 0;
  let allFeatures: GeoJsonFeature[] = [];

  while (true) {
    const url =
      `${layerUrl}/query` +
      `?where=1%3D1&outFields=*` +
      `&f=geojson` +
      `&resultOffset=${offset}` +
      `&resultRecordCount=${pageSize}`;

    const resp = await getJson<GeoJsonResponse>(url);
    const features = resp.features ?? [];
    allFeatures = allFeatures.concat(features);

    const exceeded = resp.exceededTransferLimit === true;
    if (!exceeded || features.length === 0) break;
    offset += pageSize;
  }
  return allFeatures;
};

// Ingest ArcGIS FeatureServer layer as Places
export const ingestArcGisPlaces = async (args: {
  layerUrl: string;
  category: string; // e.g. "TRAIL"
  nameField: string; // e.g. "NAME"
  descriptionField?: string; // e.g. "DESCRIPTION"
  imageField?: string; // e.g. "IMAGE_URL"
  addressField?: string; // e.g. "ADDRESS"
  websiteField?: string; // e.g. "URL"
  phoneField?: string; // e.g. "PHONE"
  latLngField?: string;
  tags?: string[];
}) => {
  const features = await queryAll(args.layerUrl);

  let upserts = 0;
  let withGeo = 0;

  for (const f of features) {
    const props = f.properties ?? {};
    const name = clean(props[args.nameField]);
    if (!name) continue;

    const description = args.descriptionField
      ? clean(props[args.descriptionField])
      : undefined;
    const imageUrl = args.imageField ? clean(props[args.imageField]) : undefined;
    const address = args.addressField
      ? clean(props[args.addressField])
      : undefined;
    const website = args.websiteField
      ? clean(props[args.websiteField])
      : undefined;
    const phone = args.phoneField ? clean(props[args.phoneField]) : undefined;

    // const { latitude, longitude } = toLatLng(f.geometry);
    // 1) Try GeoJSON geometry (Point) if present
    let lat: number | undefined;
    let lng: number | undefined;

    if (
      f.geometry &&
      f.geometry.type === 'Point' &&
      Array.isArray(f.geometry.coordinates)
    ) {
      const [gLng, gLat] = f.geometry.coordinates;
      if (typeof gLat === 'number' && typeof gLng === 'number') {
        lat = gLat;
        lng = gLng;
      }
    }

    // 2) Fallback: parse a coordinate-string field (like "Location_1")
    const llField = args.latLngField ?? 'Location_1';
    if ((lat === undefined || lng === undefined) && props[llField]) {
      const parsed = parseLatLngFromString(props[llField]);
      lat = parsed.lat;
      lng = parsed.lng;
    }

    // Generate a unique ID based on the layer URL and place name
    const id = `od:${Buffer.from(`${args.layerUrl}:${name}`).toString('base64')}`;

    const place = await prisma.place.upsert({
      where: { id },
      update: {
        name,
        category: args.category as any,
        description,
        imageUrl,
        address,
        website,
        phone,
        lat: typeof lat === 'number' ? lat : undefined,
        lng: typeof lng === 'number' ? lng : undefined,
        tags: args.tags ?? [],
        source: 'OPEN_DATA',
        sourceUrl: args.layerUrl,
      },
      create: {
        id,
        name,
        category: args.category as any,
        description,
        imageUrl,
        address,
        website,
        phone,
        lat: typeof lat === 'number' ? lat : undefined,
        lng: typeof lng === 'number' ? lng : undefined,
        tags: args.tags ?? [],
        source: 'OPEN_DATA',
        sourceUrl: args.layerUrl,
      },
    });

    if (typeof lat === 'number' && typeof lng === 'number') {
      await prisma.$executeRaw(
        Prisma.sql`UPDATE "Place"
            SET "geo" = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
            WHERE "id" = ${place.id}`,
      );
      withGeo++;
    } else if (f.geometry) {
      // Save a representative point on surface into geo and update lat/lng from it
      const geojson = JSON.stringify(f.geometry).replace(/'/g, "''");

      await prisma.$executeRawUnsafe(`
      UPDATE "Place"
      SET
        "geo" = ST_PointOnSurface(ST_SetSRID(ST_GeomFromGeoJSON('${geojson}'), 4326))::geography,
        "lng" = ST_X(ST_PointOnSurface(ST_SetSRID(ST_GeomFromGeoJSON('${geojson}'), 4326))),
        "lat" = ST_Y(ST_PointOnSurface(ST_SetSRID(ST_GeomFromGeoJSON('${geojson}'), 4326)))
      WHERE "id" = '${place.id.replace(/'/g, "''")}'
    `);

      withGeo++;
    }
    upserts++;
  }
  return {
    layerUrl: args.layerUrl,
    totalFeatures: features.length,
    upserts,
    withGeo,
  };
};
