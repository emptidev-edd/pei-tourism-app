import { timingSafeEqual, createHash } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { logEvents } from './logger.js';

const sha256 = (s: string) => createHash('sha256').update(s).digest();

const requireAdminKey = (req: Request, res: Response, next: NextFunction) => {
  // Read lazily so .env.local overrides (loaded in server.ts after config.ts
  // is evaluated) are respected.
  const expected = process.env.ADMIN_API_KEY;

  // Fail closed: no configured key means no admin access, in every environment.
  if (!expected) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[admin] ADMIN_API_KEY is not set — admin routes are disabled');
    }
    return res.status(401).json({ ok: false, message: 'Unauthorized' });
  }

  const provided = req.header('x-admin-key');
  // Hash both sides so timingSafeEqual gets equal-length buffers.
  if (!provided || !timingSafeEqual(sha256(provided), sha256(expected))) {
    logEvents(`Admin auth failure\t${req.method}\t${req.url}\t${req.ip}`, 'errLog.log');
    return res.status(401).json({ ok: false, message: 'Unauthorized' });
  }

  next();
};

export default requireAdminKey;
