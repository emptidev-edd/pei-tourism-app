import type { CorsOptions } from 'cors';
import allowedOrigins from './allowedOrigins.js';

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`${origin} Blocked by CORS`));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

export default corsOptions;
