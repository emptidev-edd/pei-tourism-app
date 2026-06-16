import { Request, Response } from 'express';
import { z } from 'zod';
import { ingestGovPeiEvents } from '../services/ingest/govPeiEvents.ingest.js';
import { ingestDiscoverCharlottetown } from '../services/ingest/discoverCharlottetown.ingest.js';
import { ingestPeiExhibitions } from '../services/ingest/peiExhibitions.ingest.js';
import { ingestSummersideCity } from '../services/ingest/summersideCity.ingest.js';
import { ingestExploreSummerside } from '../services/ingest/exploreSummerside.ingest.js';
import { ingestCultureSummerside } from '../services/ingest/cultureSummerside.ingest.js';
import { ingestEastlinkCentre } from '../services/ingest/eastlinkCentre.ingest.js';

const PagesBody = z.object({ maxPages: z.number().int().min(1).max(20).optional() });

const run = async (fn: () => Promise<any>, res: Response) => {
  const result = await fn();
  res.json({ ok: true, ...result });
};

export const ingestAllSources = async (_req: Request, res: Response) => {
  const [govPei, charlottetown, exhibitions, summersideCity, exploreSummerside, cultureSummerside, eastlink] =
    await Promise.allSettled([
      ingestGovPeiEvents(),
      ingestDiscoverCharlottetown(),
      ingestPeiExhibitions(),
      ingestSummersideCity(),
      ingestExploreSummerside(),
      ingestCultureSummerside(),
      ingestEastlinkCentre(),
    ]);

  const summarise = (r: PromiseSettledResult<any>, name: string) =>
    r.status === 'fulfilled'
      ? { source: name, ...r.value }
      : { source: name, error: (r.reason as Error)?.message ?? 'Unknown' };

  res.json({
    ok: true,
    results: [
      summarise(govPei, 'GOV_PEI_EVENTS'),
      summarise(charlottetown, 'DISCOVER_CHARLOTTETOWN'),
      summarise(exhibitions, 'PEI_EXHIBITIONS'),
      summarise(summersideCity, 'SUMMERSIDE_CITY'),
      summarise(exploreSummerside, 'EXPLORE_SUMMERSIDE'),
      summarise(cultureSummerside, 'CULTURE_SUMMERSIDE'),
      summarise(eastlink, 'EASTLINK_CENTRE'),
    ],
  });
};

export const ingestGovPei = async (req: Request, res: Response) => {
  const { data } = PagesBody.safeParse(req.body ?? {});
  await run(() => ingestGovPeiEvents(data ?? {}), res);
};

export const ingestCharlottetown = async (req: Request, res: Response) => {
  const { data } = PagesBody.safeParse(req.body ?? {});
  await run(() => ingestDiscoverCharlottetown(data ?? {}), res);
};

export const ingestExhibitions = async (_req: Request, res: Response) => {
  await run(() => ingestPeiExhibitions(), res);
};

export const ingestSummerside = async (req: Request, res: Response) => {
  const { data } = PagesBody.safeParse(req.body ?? {});
  await run(() => ingestSummersideCity(data ?? {}), res);
};

export const ingestExplore = async (req: Request, res: Response) => {
  const { data } = PagesBody.safeParse(req.body ?? {});
  await run(() => ingestExploreSummerside(data ?? {}), res);
};

export const ingestCulture = async (_req: Request, res: Response) => {
  await run(() => ingestCultureSummerside(), res);
};

export const ingestEastlink = async (req: Request, res: Response) => {
  const { data } = PagesBody.safeParse(req.body ?? {});
  await run(() => ingestEastlinkCentre(data ?? {}), res);
};
