
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const meetings = await prisma.meeting.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      title: true,
      status: true,
      processingStep: true,
      audioUrl: true,
      createdAt: true
    }
  });
  console.log(JSON.stringify(meetings, null, 2));
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
