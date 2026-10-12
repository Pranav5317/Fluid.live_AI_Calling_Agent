async function testOutboundCall() {
  const apiKey = process.env.SARVAM_API_KEY;
  const orgId = process.env.SARVAM_ORG_ID || '019e9100-606e-790c-92e0-0bcfbf8523a6';
  const workspaceId = process.env.SARVAM_WORKSPACE_ID || '019e9100-60a1-7bd7-bdb5-3b118f090be9';

  const endpoint = `https://apps.sarvam.ai/api/outbounds/v1/orgs/${orgId}/workspaces/${workspaceId}/outbounds`;
  console.log(`📞 Testing Outbound Endpoint: ${endpoint}`);

  const payload = {
    app_config: {
      app_id: 'test_app_id',
      app_version: 1,
      connection_config: {
        connection_id: 'test_connection_id',
        agent_phone_number: '+919876543210',
      },
    },
    user_config: {
      user_phone_number: '+919876543210',
    },
  };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log(`Status: ${res.status} ${res.statusText}`);
    const text = await res.text();
    console.log(`Response Body:`, text);
  } catch (err: any) {
    console.error('Network Error:', err?.message);
  }
}

testOutboundCall();
