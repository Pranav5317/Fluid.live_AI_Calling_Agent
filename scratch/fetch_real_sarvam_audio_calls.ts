import { backendSarvamProvider } from '../server/services/sarvamProvider';
import prisma from '../server/lib/prisma';

async function main() {
  console.log('🔍 Querying real interactions & audio recordings from Sarvam API...');

  const interactions = await backendSarvamProvider.fetchInteractions({ limit: 20 });
  console.log(`Found ${interactions.items.length} interactions from Sarvam:`);

  for (const it of interactions.items) {
    console.log(`- ID: ${it.interaction_id} | Dur: ${Math.round(it.duration_in_seconds || 0)}s | Contact: ${it.user_contact} | Audio: ${Boolean(it.audio_url)}`);
    console.log(`  Audio URL: ${it.audio_url}`);
    console.log(`  Agent Vars:`, it.agent_variables);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
