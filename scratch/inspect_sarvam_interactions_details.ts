import fs from 'fs';
import path from 'path';

// Load .env manually if needed
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

import { backendSarvamProvider } from '../server/services/sarvamProvider';

async function main() {
  const ids = [
    '20261104/358ff422-16:21:53-0be4e20b',
    '20261007/8adebeb7-14:38:29-b142976d',
    '20261008/8adebeb7-12:30:12-480a5942',
    '20261008/8adebeb7-12:18:26-ff179ef6',
    '20261007/8adebeb7-13:54:12-991aaeb4',
    '20261012/8adebeb7-19:40:16-837f68c0',
  ];

  for (const id of ids) {
    console.log(`\n================== ${id} ==================`);
    const transcriptData = await backendSarvamProvider.fetchCallTranscript(id);
    console.log('Duration:', transcriptData?.duration_in_seconds);
    console.log('Vars:', transcriptData?.agent_variables);
    console.log('Turns count:', transcriptData?.messages?.length);
    if (transcriptData?.messages && transcriptData.messages.length > 0) {
      console.log('Sample turns:', transcriptData.messages.slice(0, 3).map(m => `${m.role}: ${m.content}`));
    }
    const audio = await backendSarvamProvider.fetchCallRecording(id);
    console.log('Audio received:', Boolean(audio), 'Bytes:', audio?.buffer?.length);
  }
}

main().catch(console.error);
