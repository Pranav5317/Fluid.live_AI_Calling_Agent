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

async function testExact() {
  const endpoint = `https://apps.sarvam.ai/api/outbounds/v1/orgs/${process.env.SARVAM_ORG_ID}/workspaces/${process.env.SARVAM_WORKSPACE_ID}/outbounds`;
  
  const payload = {
    app_config: {
      app_id: process.env.SARVAM_APP_ID,
      app_version: 3,
      connection_config: {
        connection_id: process.env.SARVAM_CONNECTION_ID,
        agent_phone_number: process.env.SARVAM_AGENT_PHONE_NUMBER,
      },
      agent_variables: {
        user_name: 'Rohnit Roy',
        applied_role: 'Frontend Developer',
        portal_experience: '2 Years',
        portal_notice_period: '30 Days',
        portal_work_mode: 'On Site, Pune'
      },
    },
    user_config: {
      user_phone_number: '+919999999999',
    },
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'X-API-Key': process.env.SARVAM_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  console.log(`[Status ${res.status}]:`, text);
}

testExact().catch(console.error);

