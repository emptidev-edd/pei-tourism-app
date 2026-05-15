import { Request, Response } from 'express';
import { z } from 'zod';
import { scrapeTourismPeiEvents } from '../services/ingest/eventsScrape.ingest.js';

const Body = z.object({
  startDate: z.string().optional(), // "2026-02-01"
  endDate: z.string().optional(), // "2026-03-31"
  maxPages: z.number().int().min(1).max(50).optional(), // safety limit
  tags: z.array(z.string()).optional(),
});

export async function ingestEventsScrape(req: Request, res: Response) {
  const parsed = Body.safeParse(req.body ?? {});
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });

  const result = await scrapeTourismPeiEvents(parsed.data);
  res.json({ ok: true, ...result });
}
