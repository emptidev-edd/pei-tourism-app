import { Router } from "express";
import {getNearbyStops, getNextArrivalsForStop, getRouteStops} from "../controller/transit.controller.js";

const router = Router();

router.get("/transit/stops", getNearbyStops);
router.get("/transit/stops/:stopId/next", getNextArrivalsForStop);
router.get("/transit/routes/:routeId/stops", getRouteStops);

export default router;