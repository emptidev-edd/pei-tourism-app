import { Router } from 'express';
import { ingestOpenData } from '../controller/openData.controller.js';
import { listGroupFeatureServices } from '../controller/arcgisDiscover.controller.js';
import { searchArcgis } from '../controller/arcgisSearch.controller.js';
import { ingestEventsScrape } from '../controller/eventsScrape.controller.js';
import { ingestGtfs } from '../controller/gtfs.controller.js';
import { ingestVisitorCentres } from '../controller/visitorCentres.controller.js';
import { recomputePlaceScores, setPlaceFeatured, setPlaceImage } from '../controller/places.controller.js';
import {
  ingestAllSources,
  ingestGovPei,
  ingestCharlottetown,
  ingestExhibitions,
  ingestSummerside,
  ingestExplore,
  ingestCulture,
  ingestEastlink,
} from '../controller/eventsMultiIngest.controller.js';

const router = Router();

// Post endpoints for ingesting data
router.post('/ingest/open-data', ingestOpenData);
router.post('/ingest/events/scrape', ingestEventsScrape);          // Tourism PEI (existing)
router.post('/ingest/events/all', ingestAllSources);               // All 7 sources at once
router.post('/ingest/events/gov-pei', ingestGovPei);               // Government of PEI
router.post('/ingest/events/charlottetown', ingestCharlottetown);  // Discover Charlottetown
router.post('/ingest/events/exhibitions', ingestExhibitions);      // PEI Exhibitions
router.post('/ingest/events/summerside-city', ingestSummerside);   // City of Summerside
router.post('/ingest/events/explore-summerside', ingestExplore);   // Explore Summerside
router.post('/ingest/events/culture-summerside', ingestCulture);   // Culture Summerside
router.post('/ingest/events/eastlink', ingestEastlink);            // Eastlink Centre
router.post('/ingest/gtfs', ingestGtfs);
router.post('/ingest/visitor-centres', ingestVisitorCentres);

// Get endpoints for admin/arcgis
router.get('/arcgis/group/:groupId/feature-services', listGroupFeatureServices);
router.get('/arcgis/search', searchArcgis);

// Place utilities
router.post('/places/recompute-scores', recomputePlaceScores);
router.post('/places/:id/feature', setPlaceFeatured);
router.post('/places/:id/image', setPlaceImage);

export default router;
