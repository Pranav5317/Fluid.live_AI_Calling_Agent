import prisma from '../server/lib/prisma';

async function main() {
  const calls = await prisma.call.findMany({
    orderBy: { startedAt: 'desc' },
    include: {
      lead: true,
      agent: true,
    },
  });

  console.log(`Found ${calls.length} calls in database:`);
  for (const c of calls) {
    console.log(`\nID: ${c.id} | Ext: ${c.externalCallId} | Lead: ${c.lead?.name} | Duration: ${c.durationSeconds}s | Date: ${c.startedAt}`);
    console.log('Vars:', JSON.stringify(c.extractedVariables, null, 2));
  }

  await prisma.$disconnect();
}

main().catch(console.error);
