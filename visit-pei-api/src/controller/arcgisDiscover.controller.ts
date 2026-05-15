import { Request, Response } from 'express';
import { getJson } from '../services/https.js';

// Searches content inside a group (public).
// ArcGIS REST: group content search. :contentReference[oaicite:8]{index=8}
export async function listGroupFeatureServices(req: Request, res: Response) {
  const groupId = req.params.groupId;
  const start = Number(req.query.start ?? 1);
  const num = Number(req.query.num ?? 50);

  // q filters items in a group; type filters to feature services/layers.
  const url =
    `https://www.arcgis.com/sharing/rest/content/groups/${groupId}/search` +
    `?f=pjson&start=${start}&num=${num}` +
    `&q=type%3A%22Feature%20Service%22%20OR%20type%3A%22Feature%20Layer%22`;

  const data = await getJson<any>(url);

  const items = (data.results ?? []).map((it: any) => ({
    id: it.id,
    title: it.title,
    type: it.type,
    access: it.access,
    url: it.url, // often FeatureServer root
  }));

  res.json({ ok: true, total: data.total ?? items.length, start, num, items });
}
