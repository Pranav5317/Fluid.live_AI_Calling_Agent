const apiKey = process.env.SARVAM_API_KEY;
const orgId = process.env.SARVAM_ORG_ID || '019e9100-606e-790c-92e0-0bcfbf8523a6';
const workspaceId = process.env.SARVAM_WORKSPACE_ID || '019e9100-60a1-7bd7-bdb5-3b118f090be9';
const appId = process.env.SARVAM_APP_ID || 'Conversatio-b063cf10-e735';
const baseUrl = 'https://apps.sarvam.ai/api';

async function testAppEndpoints() {
  console.log('--- Testing Sarvam App GET/PATCH/PUT Endpoints ---');

  const testPaths = [
    { method: 'GET', url: `${baseUrl}/v1/orgs/${orgId}/workspaces/${workspaceId}/apps/${appId}` },
    { method: 'GET', url: `${baseUrl}/apps/v1/${orgId}/${workspaceId}/${appId}` },
    { method: 'GET', url: `${baseUrl}/v1/apps/${appId}` },
    { method: 'GET', url: `${baseUrl}/analytics/v1/${orgId}/${workspaceId}/${appId}` },
  ];

  for (const t of testPaths) {
    try {
      const res = await fetch(t.url, {
        method: t.method,
        headers: {
          'X-API-Key': apiKey || '',
          'Content-Type': 'application/json',
        },
      });
      const text = await res.text();
      console.log(`[${res.status}] ${t.method} ${t.url} -> ${text.substring(0, 150)}`);
    } catch (e: any) {
      console.error(`Error ${t.url}:`, e.message);
    }
  }

  process.exit(0);
}

testAppEndpoints();
