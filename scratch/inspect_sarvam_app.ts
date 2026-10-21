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

async function inspectSarvamApp() {
  const apiKey = process.env.SARVAM_API_KEY;
  const orgId = process.env.SARVAM_ORG_ID;
  const workspaceId = process.env.SARVAM_WORKSPACE_ID;
  const appId = process.env.SARVAM_APP_ID;

  console.log('Inspecting Sarvam App details...');
  console.log('Org:', orgId);
  console.log('Workspace:', workspaceId);
  console.log('App ID:', appId);

  const testEndpoints = [
    // Check apps under workspace
    `https://apps.sarvam.ai/api/v1/orgs/${orgId}/workspaces/${workspaceId}/apps/${appId}`,
    `https://apps.sarvam.ai/api/v1/orgs/${orgId}/workspaces/${workspaceId}/apps`,
    `https://apps.sarvam.ai/api/apps/v1/${orgId}/${workspaceId}/${appId}`,
    `https://apps.sarvam.ai/api/app-management/v1/orgs/${orgId}/workspaces/${workspaceId}/apps/${appId}`,
    `https://apps.sarvam.ai/api/conversation/v1/orgs/${orgId}/workspaces/${workspaceId}/apps/${appId}`,
    `https://api.sarvam.ai/apps/${appId}`,
    `https://api.sarvam.ai/v1/apps/${appId}`,
  ];

  for (const url of testEndpoints) {
    try {
      const res = await fetch(url, {
        headers: {
          'X-API-Key': apiKey!,
          'Content-Type': 'application/json'
        }
      });
      console.log(`\nEndpoint: ${url} -> Status: ${res.status}`);
      if (res.ok) {
        const data = await res.json();
        console.log('SUCCESS Response:', JSON.stringify(data, null, 2).slice(0, 500));
      } else {
        const text = await res.text();
        console.log('Error text:', text.slice(0, 200));
      }
    } catch (e: any) {
      console.log('Fetch error:', e.message);
    }
  }
}

inspectSarvamApp();

