/** created by Ed Mfone . App.js handles the server site functionality  */

import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { fileURLToPath } from 'url';

import logger from './middleware/logger.js';
import errorHandler from './middleware/errorHandler.js';
import corsOptions from './config/corsOptions.js';

import routes from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

// custom middleware logger
app.use(logger);

// Cross Origin Resource Sharing
app.use(cors(corsOptions));

// built-in middleware to handle urlencoded form data
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// root HTML page
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../views', 'index.html'));
});

// serve static files (e.g. css)
app.use('/', express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api', routes);

// 404
app.all(/.*/, (req, res) => {
  res.status(404);

  if (req.accepts('html')) {
    res.sendFile(path.join(__dirname, '../views', '404.html'));
  } else if (req.accepts('json')) {
    res.json({ message: '404 Not Found' });
  } else {
    res.type('txt').send('404 Not Found');
  }
});

// custom error handler
app.use(errorHandler);
