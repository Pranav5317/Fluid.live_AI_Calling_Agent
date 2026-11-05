import prisma from '../server/lib/prisma';

async function main() {
  console.log('🧹 Pruning leads: Keeping ONLY Rohnit Roy and Pranav L...');

  // Leads to keep
  const keepIds = ['lead_rohnit_roy_01', 'lead_pranav_02'];

  // Delete calls of other leads first
  const deletedCalls = await prisma.call.deleteMany({
    where: {
      leadId: { notIn: keepIds },
    },
  });
  console.log(`🗑️ Deleted ${deletedCalls.count} non-retained calls.`);

  // Delete campaign leads of other leads
  const deletedCampaignLeads = await prisma.campaignLead.deleteMany({
    where: {
      leadId: { notIn: keepIds },
    },
  });
  console.log(`🗑️ Deleted ${deletedCampaignLeads.count} non-retained campaign lead links.`);

  // Delete non-retained leads
  const deletedLeads = await prisma.lead.deleteMany({
    where: {
      id: { notIn: keepIds },
    },
  });
  console.log(`🗑️ Deleted ${deletedLeads.count} leads.`);

  // Verify remaining leads
  const remaining = await prisma.lead.findMany({
    include: { calls: true },
  });
  console.log(`\nRemaining leads (${remaining.length}):`);
  for (const l of remaining) {
    console.log(`- ${l.name} (${l.phone}) | Calls: ${l.calls.length} | Role: ${(l.metadata as any)?.role}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
