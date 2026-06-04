/** Created by Edwin Mfone on 12/12/2025  for server api.*/

import 'dotenv/config';
import { app } from './app.js';
import { connectToDatabase } from './config/dbConn.js';
import dotenv from 'dotenv';
import { config } from './config/config.js';
import cron from 'node-cron';
import { ingestTransitlandGtfs } from './services/ingest/gtfsTransitland.ingest.js';

// options: load from .env.local overrides .env
dotenv.config({ path: '.env', override: false, quiet: true });
dotenv.config({ path: '.env.local', override: true, quiet: true });

// const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

const startServer = async () => {
  await connectToDatabase();

  console.log(process.env.NODE_ENV);

  app.listen(config.PORT, () => {
    console.log(`Server started and running on port ${config.PORT}`);

    cron.schedule('0 3 * * 0', async () => {
      console.log('[cron] GTFS refresh started');
      try {
        const result = await ingestTransitlandGtfs({ feedKey: 'f-coachatlantic~pe~ca', replace: true });
        console.log('[cron] GTFS refresh complete', result);
      } catch (err) {
        console.error('[cron] GTFS refresh failed', err);
      }
    });
  });
};

startServer().catch((err) => {
  console.error('❌ Server failed to start');
  console.error(err);
  process.exit(1);
});
