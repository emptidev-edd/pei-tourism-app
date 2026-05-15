import { prisma } from '../config/prisma.js';

const main = async () => {
  await prisma.event.upsert({
    where: { id: 'test-event-1' },
    update: {},
    create: {
      id: 'test-event-1',
      title: 'PEI Food & Music Night',
      description: 'Sample event for testing the Events API.',
      startAt: new Date(
        new Date().toISOString().slice(0, 10) + 'T18:00:00.000Z',
      ),
      endAt: new Date(new Date().toISOString().slice(0, 10) + 'T21:00:00.000Z'),
      community: 'Charlottetown',
      venueName: 'Downtown Waterfront',
      categories: ['food', 'music'],
      source: 'MANUAL',
    },
  });

  await prisma.event.upsert({
    where: { id: 'test-event-2' },
    update: {},
    create: {
      id: 'test-event-2',
      title: 'Trail Cleanup Day',
      description: 'Community cleanup on a local trail.',
      startAt: new Date(Date.now() + 86400000),
      community: 'Summerside',
      categories: ['community'],
      source: 'MANUAL',
    },
  });
};

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
