import { Router } from 'express';
import adminRoutes from './admin.routes.js';
import placesRoutes from './places.routes.js';
import eventsRoutes from './events.routes.js';
import transitRoutes from "./transit.routes.js";
import visitorCentresRoutes from "./visitorCentres.routes.js";
import tripRoutes from './trip.routes.js';

const router = Router();

// Mount sub-routers
router.use('/admin', adminRoutes);
router.use('/places', placesRoutes);
router.use('/events', eventsRoutes);
router.use('/trip', tripRoutes);
router.use("/", transitRoutes);
router.use("/", visitorCentresRoutes);



export default router;
