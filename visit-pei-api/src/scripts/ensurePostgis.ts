import { prisma } from '../config/prisma.js';

const main = async () => {
  await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS postgis;');
  console.log('postGIS extension ensured');

  // Verify it works
  const result = await prisma.$queryRaw<
    { version: string }[]
  >`SELECT PostGIS_version() as version;`;
  console.log('PostGIS version:', result[0]?.version);
};

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('Error ensuring PostGIS:', e.message);
    prisma.$disconnect();
    process.exit(1);
  });
