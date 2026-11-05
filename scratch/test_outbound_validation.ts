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

async function test() {
  console.log('Testing Sarvam outbound initiation with sanitized agent variables...');
  
  // Note: we pass dummy target phone or test phone number
  try {
    const res = await backendSarvamProvider.initiateOutboundCall({
      agentVersionId: 'agv_sarvam_prod_v1',
      sarvamAgentId: process.env.SARVAM_APP_ID || 'Conversatio-b063cf10-e735',
      fromPhoneNumber: process.env.SARVAM_AGENT_PHONE_NUMBER || '+917965480599',
      toPhoneNumber: '+917522911068',
      leadId: 'lead_rohnit_roy_01',
      userName: 'Rohnit Roy',
    });
    console.log('✅ Call initiated successfully:', res);
  } catch (err: any) {
    console.error('❌ Initiation error:', err.message);
  }
}

test().catch(console.error);
