import { Request, Response } from 'express';
import { z } from 'zod';
import { ingestArcGisPlaces } from '../services/ingest/openData.ingest.js';

const Body = z.object({
  layerUrl: z.string().url(), // FeatureServer layer URL
  category: z.string().min(2), // "TRAIL" | "PARK" | ...
  nameField: z.string().min(1),
  descriptionField: z.string().optional(),
  imageField: z.string().optional(),
  addressField: z.string().optional(),
  websiteField: z.string().optional(),
  phoneField: z.string().optional(),
  latLngField: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const ingestOpenData = async (req: Request, res: Response) => {
  const parsed = Body.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });

  const result = await ingestArcGisPlaces(parsed.data);
  res.json({ ok: true, ...result });
};
