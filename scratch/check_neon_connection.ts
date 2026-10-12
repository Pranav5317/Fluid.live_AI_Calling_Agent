import prisma from '../server/lib/prisma';

async function checkNeonConnection() {
  console.log('\n🐘 Testing Neon PostgreSQL Database Connection...');
  console.log('Database URL Host:', process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'Unknown');

  try {
    const startTime = Date.now();
    // Execute simple count query
    const callCount = await prisma.call.count();
    const leadCount = await prisma.lead.count();
    const agentCount = await prisma.agent.count();
    const webhookCount = await prisma.webhookEvent.count();
    const latency = Date.now() - startTime;

    console.log(`\n✅ NEON POSTGRESQL IS CONNECTED & FULLY FUNCTIONAL! (${latency}ms latency)`);
    console.log(`\n📊 Current Table Row Counts in Neon DB:`);
    console.log(`  - Calls: ${callCount} records`);
    console.log(`  - Leads: ${leadCount} records`);
    console.log(`  - Agents: ${agentCount} records`);
    console.log(`  - Webhook Events: ${webhookCount} records`);

    // Fetch latest call record
    const latestCall = await prisma.call.findFirst({
      orderBy: { startedAt: 'desc' },
    });

    if (latestCall) {
      console.log(`\n📞 Latest Live Call Record in Neon DB:`);
      console.log(`  - ID: ${latestCall.id}`);
      console.log(`  - External Call ID: ${latestCall.externalCallId}`);
      console.log(`  - Status: ${latestCall.status}`);
      console.log(`  - Started At: ${latestCall.startedAt.toISOString()}`);
    }
  } catch (err: any) {
    console.error('\n❌ Neon DB Connection Error:', err?.message || err);
  } finally {
    await prisma.$disconnect();
  }
}

checkNeonConnection();
