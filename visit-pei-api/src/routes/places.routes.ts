import { Router } from 'express';
import { getFeatured, getPlace, getPlacesNear, listPlaces } from '../controller/places.controller.js';

const router = Router();

router.get('/featured', getFeatured);
router.get('/near', getPlacesNear);
router.get('/', listPlaces);
router.get('/:id', getPlace);

export default router;
