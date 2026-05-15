import { Request, Response } from 'express';
import { ingestTransitlandGtfs } from '../services/ingest/gtfsTransitland.ingest.js';

export const ingestGtfs = async (req: Request, res: Response) => {
  const { feedKey, replace } = req.body;

  if (!feedKey || typeof feedKey !== 'string') {
    return res.status(400).json({ ok: false, message: 'feedKey is required' });
  }

  const result = await ingestTransitlandGtfs({
    feedKey,
    replace: Boolean(replace),
  });

  return res.json(result);
};
