import { Router } from "express";
import { getNearbyStops, getNextArrivalsForStop, getRouteStops, getRoutesByFeed, getFullScheduleForStop } from "../controller/transit.controller.js";

const router = Router();

router.get("/transit/stops", getNearbyStops);
router.get("/transit/stops/:stopId/next", getNextArrivalsForStop);
router.get("/transit/stops/:stopId/schedule", getFullScheduleForStop);
router.get("/transit/routes", getRoutesByFeed);
router.get("/transit/routes/:routeId/stops", getRouteStops);

export default router;