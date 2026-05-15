import { Router } from 'express';
import { getDayPlan } from '../controller/trip.controller.js';

const router = Router();

router.get('/day-plan', getDayPlan);

export default router;
