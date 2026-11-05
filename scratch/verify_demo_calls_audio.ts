import fs from 'fs';
import path from 'path';

try {
  const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.substring(0, idx).trim();
      const val = trimmed.substring(idx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
} catch (e) {}

import { serverCallService } from '../server/services/callService';
import prisma from '../server/lib/prisma';

async function test() {
  const calls = await prisma.call.findMany({
    take: 8,
    orderBy: { startedAt: 'desc' },
    include: { lead: true },
  });

  console.log(`Testing audio retrieval for ${calls.length} calls:`);

  for (const call of calls) {
    const audio = await serverCallService.getCallAudio(call.id);
    console.log(
      `- Call ${call.id} (${call.lead?.name || 'Unknown'}): Audio = ${Boolean(audio)} | Bytes = ${audio?.buffer?.length || 0} | Type = ${audio?.contentType}`
    );
  }

  await prisma.$disconnect();
}

test().catch(console.error);
