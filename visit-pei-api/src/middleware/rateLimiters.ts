import rateLimit from 'express-rate-limit';

// If deployed behind a reverse proxy, app.set('trust proxy', 1) is required
// for per-IP keys to reflect the real client address.

// Lenient global limiter — Expo app clients, per IP.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { ok: false, message: 'Too many requests, try again later' },
});

// Strict limiter for the admin surface (also throttles key brute-forcing).
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { ok: false, message: 'Too many admin requests' },
});
