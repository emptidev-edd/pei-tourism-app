import type { ErrorRequestHandler } from 'express';
import { logEvents } from './logger.js';

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  logEvents(
    `${err?.name}: ${err?.message}\t${req.method}\t${req.url}\t${req.headers.origin}`,
    'errLog.log',
  );

  console.error(err?.stack);

  const status =
    res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  res.status(status).json({ message: err?.message || 'Server error' });
};

export default errorHandler;
