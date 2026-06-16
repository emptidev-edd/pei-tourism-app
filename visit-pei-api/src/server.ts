/** Created by Edwin Mfone on 12/12/2025  for server api.*/

import 'dotenv/config';
import { app } from './app.js';
import { connectToDatabase } from './config/dbConn.js';
import dotenv from 'dotenv';
import { config } from './config/config.js';
import cron from 'node-cron';
import { ingestTransitlandGtfs } from './services/ingest/gtfsTransitland.ingest.js';
import { ingestGovPeiEvents } from './services/ingest/govPeiEvents.ingest.js';
import { ingestDiscoverCharlottetown } from './services/ingest/discoverCharlottetown.ingest.js';
import { ingestPeiExhibitions } from './services/ingest/peiExhibitions.ingest.js';
import { ingestSummersideCity } from './services/ingest/summersideCity.ingest.js';
import { ingestExploreSummerside } from './services/ingest/exploreSummerside.ingest.js';
import { ingestCultureSummerside } from './services/ingest/cultureSummerside.ingest.js';
import { ingestEastlinkCentre } from './services/ingest/eastlinkCentre.ingest.js';
import { scrapeTourismPeiEvents } from './services/ingest/eventsScrape.ingest.js';

// options: load from .env.local overrides .env
dotenv.config({ path: '.env', override: false, quiet: true });
dotenv.config({ path: '.env.local', override: true, quiet: true });

// const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

const startServer = async () => {
  await connectToDatabase();

  console.log(process.env.NODE_ENV);

  app.listen(config.PORT, () => {
    console.log(`Server started and running on port ${config.PORT}`);

    // Weekly: GTFS transit data (Sundays 3 AM)
    cron.schedule('0 3 * * 0', async () => {
      console.log('[cron] GTFS refresh started');
      try {
        const result = await ingestTransitlandGtfs({ feedKey: 'f-coachatlantic~pe~ca', replace: true });
        console.log('[cron] GTFS refresh complete', result);
      } catch (err) {
        console.error('[cron] GTFS refresh failed', err);
      }
    });

    // Daily: all event sources (2 AM)
    cron.schedule('0 2 * * *', async () => {
      console.log('[cron] Daily event ingest started');
      // maxPages: 50 is effectively unlimited — each scraper stops naturally on empty pages
      const sources = [
        { name: 'Tourism PEI',           fn: () => scrapeTourismPeiEvents({ maxPages: 50 }) },
        { name: 'Gov PEI Events',         fn: () => ingestGovPeiEvents({ maxPages: 50 }) },
        { name: 'Discover Charlottetown', fn: () => ingestDiscoverCharlottetown({ maxPages: 50 }) },
        { name: 'PEI Exhibitions',        fn: () => ingestPeiExhibitions() },
        { name: 'Summerside City',        fn: () => ingestSummersideCity({ maxPages: 50 }) },
        { name: 'Explore Summerside',     fn: () => ingestExploreSummerside({ maxPages: 50 }) },
        { name: 'Culture Summerside',     fn: () => ingestCultureSummerside() },
        { name: 'Eastlink Centre',        fn: () => ingestEastlinkCentre({ maxPages: 50 }) },
      ];

      for (const { name, fn } of sources) {
        try {
          const result = await fn();
          console.log(`[cron] ${name}: ${result.upserts ?? 0} upserts, ${result.errors?.length ?? 0} errors`);
        } catch (err) {
          console.error(`[cron] ${name} failed:`, err);
        }
      }

      console.log('[cron] Daily event ingest complete');
    });
  });
};

startServer().catch((err) => {
  console.error('❌ Server failed to start');
  console.error(err);
  process.exit(1);
});
