import prisma from '../server/lib/prisma';

async function main() {
  const leads = await prisma.lead.findMany();
  console.log(`Leads count: ${leads.length}`);
  for (const l of leads) {
    console.log(`- ${l.name} | Phone: ${l.phone} | Email: ${l.email}`);
  }

  const calls = await prisma.call.findMany({ include: { lead: true } });
  console.log(`Calls count: ${calls.length}`);
  for (const c of calls) {
    console.log(`- Call: ${c.id} | Candidate: ${c.lead?.name} | Phone: ${c.lead?.phone} | Duration: ${c.durationSeconds}s`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);

