import { Router } from "express";
import {
    listVisitorCentres,
    getVisitorCentreById,
} from "../controller/visitorCentres.controller.js";

const router = Router();


// public
router.get("/visitor-centres", listVisitorCentres);
router.get("/visitor-centres/:id", getVisitorCentreById);

export default router;