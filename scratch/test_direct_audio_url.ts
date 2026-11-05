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

async function test() {
  const audioUrl = 'https://indus.sarvam.ai/media?org_id=019e9100-606e-790c-92e0-0bcfbf8523a6&workspace_id=019e9100-60a1-7bd7-bdb5-3b118f090be9&app_id=Conversatio-b063cf10-e735&interaction_id=20261104/358ff422-16:21:53-0be4e20b&audio_hash=merged_audio';
  const apiKey = process.env.SARVAM_API_KEY;

  console.log('Testing audioUrl without headers:');
  const r1 = await fetch(audioUrl);
  console.log('Status no headers:', r1.status, r1.headers.get('content-type'));
  if (r1.ok) {
    const buf = await r1.arrayBuffer();
    console.log('Bytes:', buf.byteLength);
  }

  console.log('Testing audioUrl with X-API-Key:');
  const r2 = await fetch(audioUrl, { headers: { 'X-API-Key': apiKey || '' } });
  console.log('Status X-API-Key:', r2.status, r2.headers.get('content-type'));
  if (r2.ok) {
    const buf = await r2.arrayBuffer();
    console.log('Bytes:', buf.byteLength);
  }

  console.log('Testing audioUrl with api-subscription-key:');
  const r3 = await fetch(audioUrl, { headers: { 'api-subscription-key': apiKey || '' } });
  console.log('Status api-subscription-key:', r3.status, r3.headers.get('content-type'));
  if (r3.ok) {
    const buf = await r3.arrayBuffer();
    console.log('Bytes:', buf.byteLength);
  }
}

test().catch(console.error);

