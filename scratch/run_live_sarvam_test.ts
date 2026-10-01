import prisma from '../server/lib/prisma';
import { backendSarvamProvider } from '../server/services/sarvamProvider';

async function main() {
  console.log('⚡ Starting Live Sarvam Provider Verification...');
  console.log('SARVAM_API_KEY present:', Boolean(process.env.SARVAM_API_KEY));
  if (process.env.SARVAM_API_KEY) {
    console.log('Key prefix:', process.env.SARVAM_API_KEY.substring(0, 8) + '...');
  }

  // 1. Fetch an existing Agent & Version from Neon DB
  const agent = await prisma.agent.findFirst({
    include: { versions: true },
  });

  if (!agent) {
    console.error('❌ No agent found in Neon database.');
    return;
  }

  const version = agent.versions[0];
  if (!version) {
    console.error('❌ No version found for agent:', agent.id);
    return;
  }

  console.log(`\n1. Syncing Agent Config for Agent: ${agent.name} (${agent.id}), Version: ${version.id}`);
  
  try {
    const mapping = await backendSarvamProvider.syncAgentConfig(
      agent.id,
      version.id,
      version.config as any
    );
    console.log('✅ Sync Result:', mapping);
  } catch (err: any) {
    console.error('❌ Agent sync threw error:', err?.message || err);
  }

  // 2. Fetch Phone Number and Lead
  const phone = await prisma.phoneNumber.findFirst();
  const lead = await prisma.lead.findFirst();

  console.log('\n2. Database Context:');
  console.log('   - From Phone Number:', phone ? phone.phoneNumber : 'None');
  console.log('   - Target Lead:', lead ? `${lead.name} (${lead.phone})` : 'None');

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Fatal error in live test:', err);
  prisma.$disconnect();
});
