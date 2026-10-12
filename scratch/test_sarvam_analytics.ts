import { backendSarvamProvider } from '../server/services/sarvamProvider';
import prisma from '../server/lib/prisma';

async function diagnoseAnalytics() {
  console.log('--- Querying Sarvam AI Analytics API for Calls & Transcripts ---');

  // 1. Fetch recent interactions from Sarvam
  console.log('\n[1] Fetching recent interactions list from Sarvam Analytics API...');
  const interactions = await backendSarvamProvider.fetchInteractions({ limit: 10 });
  console.log('Interactions Response:', JSON.stringify(interactions, null, 2));

  // 2. Fetch calls stored in Neon DB
  console.log('\n[2] Recent Call records in Neon DB:');
  const dbCalls = await prisma.call.findMany({ orderBy: { startedAt: 'desc' }, take: 10 });
  console.log(dbCalls.map(c => ({ id: c.id, externalCallId: c.externalCallId, status: c.status, startedAt: c.startedAt })));

  // 3. For each call in DB, attempt transcript fetch
  for (const call of dbCalls) {
    console.log(`\n--- Fetching transcript for call ${call.id} (externalCallId: ${call.externalCallId}) ---`);
    const transcriptData = await backendSarvamProvider.fetchCallTranscript(call.externalCallId);
    console.log('Transcript Response:', JSON.stringify(transcriptData, null, 2));
  }

  process.exit(0);
}

diagnoseAnalytics();
