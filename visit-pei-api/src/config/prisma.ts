import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;

if (typeof connectionString !== 'string' || connectionString.length === 0) {
  throw new Error(
    'DATABASE_URL is missing. Make sure it exists in .env or .env.local and is being loaded.',
  );
}

const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({ adapter });
