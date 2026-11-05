import prisma from '../server/lib/prisma';

async function main() {
  const leads = await prisma.lead.findMany({
    include: {
      calls: { select: { id: true, durationSeconds: true } },
      campaignLeads: true,
    },
  });

  console.log(`Current leads in DB (${leads.length}):`);
  for (const l of leads) {
    console.log(`- ID: ${l.id} | Name: ${l.name} | Phone: ${l.phone} | Calls: ${l.calls.length} | Metadata:`, l.metadata);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
