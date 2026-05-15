import { Request, Response } from "express";

import { scrapeVisitorCentres } from "../services/ingest/visitorCentres.ingest.js";
import {prisma} from "../config/prisma.js";

export async function ingestVisitorCentres(req: Request, res: Response) {
    const { replace = false } = req.body ?? {};

    const result = await scrapeVisitorCentres({ replace: Boolean(replace) });
    return res.json(result);
}

export async function listVisitorCentres(_req: Request, res: Response) {
    const items = await prisma.visitorCentre.findMany({
        orderBy: [{ community: "asc" }, { name: "asc" }],
    });

    return res.json({
        ok: true,
        total: items.length,
        items,
    });
}

export async function getVisitorCentreById(req: Request, res: Response) {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    const item = await prisma.visitorCentre.findUnique({
        where: { id },
    });

    if (!item) {
        return res.status(404).json({
            ok: false,
            message: "Visitor centre not found",
        });
    }

    return res.json({
        ok: true,
        item,
    });
}