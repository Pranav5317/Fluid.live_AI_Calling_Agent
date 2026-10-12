import { serverCallService } from '../server/services/callService';
import prisma from '../server/lib/prisma';

async function testFetchTranscript() {
  console.log('--- Testing Live Transcript Fetch & PostgreSQL Sync ---');

  const calls = await prisma.call.findMany({ orderBy: { startedAt: 'desc' } });
  if (calls.length === 0) {
    console.error('No call records found in Neon DB');
    process.exit(1);
  }

  const latestCall = calls[0];
  console.log(`Target Call ID: ${latestCall.id} (External Call ID: ${latestCall.externalCallId})`);

  const result = await serverCallService.fetchTranscriptForCall(latestCall.id);
  console.log('\n[SUCCESS] Transcript Sync Result:');
  console.log('Status:', result.call.status);
  console.log('Outcome:', result.call.outcome);
  console.log('Duration:', result.call.durationSeconds, 's');
  console.log('Extracted Variables:', JSON.stringify(result.call.extractedVariables, null, 2));
  console.log('Formatted Transcript Turns count:', result.call.transcript.length);
  console.log('First 2 Transcript Turns:', JSON.stringify(result.call.transcript.slice(0, 2), null, 2));

  process.exit(0);
}

testFetchTranscript();
