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

import { backendSarvamProvider } from '../server/services/sarvamProvider';

async function main() {
  const interactions = await backendSarvamProvider.fetchInteractions({ limit: 50 });
  console.log(`Checking ${interactions.items.length} interactions for working recordings:`);

  const working: any[] = [];
  for (const it of interactions.items) {
    const audio = await backendSarvamProvider.fetchCallRecording(it.interaction_id);
    if (audio && audio.buffer.length > 0) {
      console.log(`✅ Working Audio: ${it.interaction_id} | Dur: ${Math.round(it.duration_in_seconds || 0)}s | Bytes: ${audio.buffer.length} | Contact: ${it.user_contact}`);
      working.push({
        id: it.interaction_id,
        duration: Math.round(it.duration_in_seconds || 0),
        contact: it.user_contact,
        bytes: audio.buffer.length,
        vars: it.agent_variables,
        date: it.start_datetime || it.call_date,
      });
    } else {
      console.log(`❌ No audio: ${it.interaction_id} | Dur: ${Math.round(it.duration_in_seconds || 0)}s`);
    }
  }

  console.log(`\nFound ${working.length} interactions with WORKING audio recordings!`);
  fs.writeFileSync('scratch/working_audio_calls.json', JSON.stringify(working, null, 2));
}

main().catch(console.error);

