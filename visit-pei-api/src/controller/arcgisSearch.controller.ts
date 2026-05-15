import { Request, Response } from 'express';
import { z } from 'zod';
import { getJson } from '../services/https.js';

/**
 * ArcGIS Sharing Search API
 * https://www.arcgis.com/sharing/rest/search
 */
export async function searchArcgis(req: Request, res: Response) {
  const q = z.string().min(1).parse(req.query.q);
  const start = z.coerce
    .number()
    .int()
    .min(1)
    .default(1)
    .parse(req.query.start ?? 1);
  const num = z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(50)
    .parse(req.query.num ?? 50);

  // Keep results focused:
  // - Feature Service (best for ingestion)
  // - Hosted Feature Layer can also be valid depending on publishing
  const query = `${q} AND (type:"Feature Service" OR type:"Feature Layer")`;

  const url =
    `https://www.arcgis.com/sharing/rest/search` +
    `?f=pjson&start=${start}&num=${num}` +
    `&q=${encodeURIComponent(query)}`;

  const data = await getJson<any>(url);

  const items = (data.results ?? []).map((it: any) => ({
    id: it.id,
    title: it.title,
    type: it.type,
    access: it.access,
    // Most important part:
    url: it.url, // usually .../FeatureServer
    owner: it.owner,
    snippet: it.snippet,
  }));

  res.json({ ok: true, total: data.total ?? items.length, start, num, items });
}
