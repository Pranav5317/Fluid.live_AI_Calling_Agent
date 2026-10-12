async function discoverWorkspaceResources() {
  const apiKey = process.env.SARVAM_API_KEY;
  const orgId = process.env.SARVAM_ORG_ID;
  const workspaceId = process.env.SARVAM_WORKSPACE_ID;

  console.log('🔍 Discovering Sarvam Voice Agent Workspace Resources...');
  console.log('Key:', apiKey ? `${apiKey.substring(0, 15)}...` : 'MISSING');
  console.log('Org ID:', orgId);
  console.log('Workspace ID:', workspaceId);

  if (!apiKey || !orgId || !workspaceId) return;

  const endpoints = [
    { name: 'List Apps (v1)', url: `https://apps.sarvam.ai/api/v1/orgs/${orgId}/workspaces/${workspaceId}/apps` },
    { name: 'List Deployments', url: `https://apps.sarvam.ai/api/v1/orgs/${orgId}/workspaces/${workspaceId}/deployments` },
    { name: 'List Connections', url: `https://apps.sarvam.ai/api/v1/orgs/${orgId}/workspaces/${workspaceId}/connections` },
    { name: 'List Telephony / Phone Numbers', url: `https://apps.sarvam.ai/api/v1/orgs/${orgId}/workspaces/${workspaceId}/telephony` },
    { name: 'List Phone Numbers (alt)', url: `https://apps.sarvam.ai/api/v1/orgs/${orgId}/workspaces/${workspaceId}/phone-numbers` },
    { name: 'List Campaigns', url: `https://apps.sarvam.ai/api/v1/orgs/${orgId}/workspaces/${workspaceId}/campaigns` },
  ];

  for (const ep of endpoints) {
    console.log(`\nTesting [${ep.name}] -> ${ep.url}`);
    try {
      const res = await fetch(ep.url, {
        method: 'GET',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
      });
      console.log(`  Status: ${res.status} ${res.statusText}`);
      const text = await res.text();
      console.log(`  Response Body (${text.length} chars):`, text.substring(0, 500));
    } catch (err: any) {
      console.log(`  Error: ${err?.message}`);
    }
  }
}

discoverWorkspaceResources();
