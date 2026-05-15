import { Router } from 'express';
import { ingestOpenData } from '../controller/openData.controller.js';
import { listGroupFeatureServices } from '../controller/arcgisDiscover.controller.js';
import { searchArcgis } from '../controller/arcgisSearch.controller.js';
import { ingestEventsScrape } from '../controller/eventsScrape.controller.js';
import { ingestGtfs } from '../controller/gtfs.controller.js';
import { ingestVisitorCentres } from '../controller/visitorCentres.controller.js';
import { recomputePlaceScores, setPlaceFeatured, setPlaceImage } from '../controller/places.controller.js';

const router = Router();

// Post endpoints for ingesting data
router.post('/ingest/open-data', ingestOpenData);
router.post('/ingest/events/scrape', ingestEventsScrape);
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
