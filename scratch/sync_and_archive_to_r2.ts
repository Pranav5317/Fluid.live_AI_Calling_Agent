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
import { r2StorageService } from '../server/services/r2StorageService';
import { backendSarvamProvider } from '../server/services/sarvamProvider';

const prisma = new PrismaClient();

async function testArchiving() {
  console.log('--- Cloudflare R2 Live Audio Archiving Test ---');
  r2StorageService.initialize();
  console.log('R2 Configured:', r2StorageService.isConfigured());

  // Find recent calls with duration > 0
  const calls = await prisma.call.findMany({
    where: { durationSeconds: { gt: 0 } },
    take: 5,
    orderBy: { startedAt: 'desc' }
  });

  console.log(`Found ${calls.length} call(s) with duration > 0`);

  for (const call of calls) {
    console.log(`\nProcessing Call: ${call.id} (externalCallId: ${call.externalCallId})`);

    // Check if already in R2
    const alreadyInR2 = await r2StorageService.hasCallAudio(call.id);
    console.log(`Already in R2? ${alreadyInR2}`);

    if (alreadyInR2) {
      const audio = await r2StorageService.getCallAudio(call.id);
      console.log(`Fetched from R2! Size: ${audio?.buffer.length} bytes, Type: ${audio?.contentType}`);
      continue;
    }

    // Resolve interaction ID
    let interactionId = (call.extractedVariables as any)?._sarvam_interaction_id;
    if (!interactionId) {
      if (call.externalCallId && call.externalCallId.includes('/')) {
        interactionId = call.externalCallId;
      } else {
        const resolved = await backendSarvamProvider.resolveInteractionId(call.externalCallId, undefined, call.startedAt);
        if (resolved) {
          interactionId = resolved.interactionId;
        }
      }
    }

    if (!interactionId) {
      console.log('Could not resolve interaction ID for call:', call.id);
      continue;
    }

    console.log(`Fetching recording from Sarvam for interaction: ${interactionId}...`);
    const audioData = await backendSarvamProvider.fetchCallRecording(interactionId);
    if (!audioData) {
      console.log('No audio data returned from Sarvam.');
      continue;
    }

    console.log(`Sarvam audio fetched: ${audioData.buffer.length} bytes (${(audioData.buffer.length / 1024 / 1024).toFixed(2)} MB)`);
    console.log('Uploading to Cloudflare R2 bucket...');

    const uploadRes = await r2StorageService.uploadCallAudio(call.id, audioData.buffer, audioData.contentType);
    console.log('Upload result:', uploadRes);

    if (uploadRes) {
      await prisma.call.update({
        where: { id: call.id },
        data: {
          extractedVariables: {
            ...((call.extractedVariables as any) || {}),
            _r2_audio_key: uploadRes.key,
            ...(uploadRes.url ? { _r2_audio_url: uploadRes.url } : {}),
          }
        }
      });
      console.log('Database updated with R2 audio key!');

      // Verify immediate readback from R2
      const readBack = await r2StorageService.getCallAudio(call.id);
      console.log(`Verification Readback from R2: ${readBack?.buffer.length} bytes verified!`);
    }
  }

  console.log('\n--- Test Completed Successfully! ---');
  await prisma.$disconnect();
}

testArchiving().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
