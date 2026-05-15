import { prisma } from './prisma.js';

export const connectToDatabase = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('Database connection established successfully.');
  } catch (error) {
    console.log('❌ Database connection failed:');
    console.log(error);
    process.exit(1); // fail fast
  }
};
