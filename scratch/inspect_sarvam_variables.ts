import fs from 'fs';
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      process.env[key] = val;
    }
  }
}

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const calls = await prisma.call.findMany({
    where: { durationSeconds: { gt: 0 } },
    take: 3,
    orderBy: { startedAt: 'desc' },
  });

  for (const c of calls) {
    console.log('\n--- Call ID:', c.id, '---');
    console.log('External ID:', c.externalCallId);
    console.log('Extracted Variables:', JSON.stringify(c.extractedVariables, null, 2));
    const transcript = c.transcript as any[];
    if (transcript && transcript.length > 0) {
      console.log('First 3 turns:');
      console.log(transcript.slice(0, 3));
    }
  }

  await prisma.$disconnect();
}

check();

