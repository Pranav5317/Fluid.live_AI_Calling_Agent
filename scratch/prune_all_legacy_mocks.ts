import prisma from '../server/lib/prisma';

async function pruneLegacyMocks() {
  console.log('\n✂️ Pruning remaining legacy mock records from Neon DB...\n');

  try {
    // 1. Delete mock businesses except Fluid.live Technologies
    const deletedBiz = await prisma.business.deleteMany({
      where: { name: { not: 'Fluid.live Technologies' } },
    });
    console.log(`✅ Pruned ${deletedBiz.count} legacy mock business entities.`);

    // 2. Delete mock agents except production Sarvam Agent
    const deletedAgents = await prisma.agent.deleteMany({
      where: { id: { not: 'ag_sarvam_prod_01' } },
    });
    console.log(`✅ Pruned ${deletedAgents.count} legacy mock agent records.`);

    // 3. Delete mock leads except primary lead
    const deletedLeads = await prisma.lead.deleteMany({
      where: { phone: { not: '+919922935920' } },
    });
    console.log(`✅ Pruned ${deletedLeads.count} legacy mock lead records.`);

    // 4. Print final clean database row counts
    const counts = {
      business: await prisma.business.count(),
      phoneNumber: await prisma.phoneNumber.count(),
      agent: await prisma.agent.count(),
      agentVersion: await prisma.agentVersion.count(),
      lead: await prisma.lead.count(),
      call: await prisma.call.count(),
      webhookEvent: await prisma.webhookEvent.count(),
    };

    console.log('\n💎 PRISTINE PRODUCTION DATABASE STATE:');
    console.log(`   🏢 Businesses: ${counts.business}`);
    console.log(`   📱 Phone Numbers: ${counts.phoneNumber} (+917965480599)`);
    console.log(`   🤖 Agents: ${counts.agent} (Fluid Voice Assistant - Samvaad)`);
    console.log(`   📦 Agent Versions: ${counts.agentVersion}`);
    console.log(`   👤 Leads: ${counts.lead} (+919922935920)`);
    console.log(`   📞 Calls: ${counts.call}`);
    console.log(`   🔔 Webhook Events: ${counts.webhookEvent}`);

  } catch (err: any) {
    console.error('❌ Error pruning legacy mocks:', err?.message || err);
  } finally {
    await prisma.$disconnect();
  }
}

pruneLegacyMocks();
