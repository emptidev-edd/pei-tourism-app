import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';

export const listEvents = async (req: Request, res: Response) => {
  const q = z.string().optional().parse(req.query.q);
  const from = z.string().optional().parse(req.query.from);
  const to = z.string().optional().parse(req.query.to);
  const community = z.string().optional().parse(req.query.community);

  const limit = z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(30)
    .parse(req.query.limit ?? 30);
  const page = z.coerce
    .number()
    .int()
    .min(1)
    .default(1)
    .parse(req.query.page ?? 1);
  const skip = (page - 1) * limit;

  const where: any = {};

  // Date window: events that overlap [from,to]
  if (from || to) {
    const fromDt = from ? new Date(from) : new Date('1970-01-01');
    const toDt = to ? new Date(to) : new Date('2999-12-31');
    where.AND = [
      {
        OR: [
          {
            endAt: null,
            startAt: {
              gte: fromDt,
              lte: toDt,
            },
          },
          {
            startAt: { lte: toDt },
            endAt: { gte: fromDt },
          },
        ],
      },
    ];
  }

  if (community) where.community = { equals: community, mode: 'insensitive' };

  if (q && q.trim()) {
    where.OR = [
      { title: { contains: q.trim(), mode: 'insensitive' } },
      { description: { contains: q.trim(), mode: 'insensitive' } },
      { venueName: { contains: q.trim(), mode: 'insensitive' } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.event.count({ where }),
    prisma.event.findMany({
      where,
      orderBy: { startAt: 'asc' },
      take: limit,
      skip,
    }),
  ]);

  res.json({ ok: true, total, page, limit, items });
};

export const getEventById = async (req: Request, res: Response) => {
  const id = z.string().min(1).parse(req.params.id);

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event)
    return res.status(404).json({ ok: false, message: 'Event not found' });

  res.json({ ok: true, event });
};
