import { prisma } from '../config/prisma.js';

const main = async () => {
  const result = await prisma.event.deleteMany({
    where: { source: 'TOURISM_PEI_SCRAPE' },
  });
  console.log('Deleted', result.count, 'stale TOURISM_PEI_SCRAPE events');
};

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
