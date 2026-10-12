import prisma from '../server/lib/prisma';
import { backendSarvamProvider } from '../server/services/sarvamProvider';

async function main() {
  const attemptId = process.argv[2] || 'dbe2d96e-d9f9-4292-a080-d1ba830af787';

  console.log(`\n📄 =========================================================`);
  console.log(`📄 FETCHING TRANSCRIPT & ANALYTICS FROM SARVAM API`);
  console.log(`📄 Attempt / Interaction ID: ${attemptId}`);
  console.log(`📄 Org ID: ${process.env.SARVAM_ORG_ID}`);
  console.log(`📄 Workspace ID: ${process.env.SARVAM_WORKSPACE_ID}`);
  console.log(`📄 App ID: ${process.env.SARVAM_APP_ID}`);
  console.log(`📄 =========================================================\n`);

  try {
    // 1. Fetch direct transcript for interaction
    const transcriptData = await backendSarvamProvider.fetchCallTranscript(attemptId);
    console.log('\n💬 Transcript Response from Sarvam API:');
    console.log(JSON.stringify(transcriptData, null, 2));

    // 2. Fetch interactions list from past 24h
    console.log('\n📊 Fetching Interactions List from Sarvam Analytics API:');
    const interactionsData = await backendSarvamProvider.fetchInteractions({ limit: 10 });
    console.log(JSON.stringify(interactionsData, null, 2));

  } catch (err: any) {
    console.error('\n❌ Error fetching transcript/analytics:', err?.message || err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
