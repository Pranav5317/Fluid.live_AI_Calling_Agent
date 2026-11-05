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

async function testVersion(v?: number) {
  const endpoint = `https://apps.sarvam.ai/api/outbounds/v1/orgs/${process.env.SARVAM_ORG_ID}/workspaces/${process.env.SARVAM_WORKSPACE_ID}/outbounds`;
  
  const app_config: any = {
    app_id: process.env.SARVAM_APP_ID,
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
  };

  if (v !== undefined) {
    app_config.app_version = v;
  }

  const payload = {
    app_config,
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
  console.log(`[Version: ${v ?? 'omitted'}] -> Status: ${res.status}`);
  console.log(text.slice(0, 300));
}

async function run() {
  await testVersion(undefined);
  await testVersion(1);
  await testVersion(2);
  await testVersion(3);
}

run().catch(console.error);
