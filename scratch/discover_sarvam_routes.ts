async function discover() {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) return;

  const paths = [
    '/voice-agent',
    '/voice-agent/outbound',
    '/voice-agent/create',
    '/voice_agent',
    '/voice_agents',
    '/telephony',
    '/telephony/outbound',
    '/telephony/call',
    '/outbound',
    '/outbound-call',
    '/outbound_call',
    '/outbound/v1',
    '/call',
    '/call/outbound',
    '/calls/outbound',
    '/v1/voice-agent',
    '/v1/outbound',
    '/agent',
    '/agents',
    '/agent/call',
  ];

  console.log(`🔎 Probing ${paths.length} candidate endpoints on https://api.sarvam.ai ...\n`);

  for (const path of paths) {
    const url = `https://api.sarvam.ai${path}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'api-subscription-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const text = await res.text();
      let shortRes = text.substring(0, 150).replace(/\n/g, ' ');
      console.log(`[POST ${path}] -> HTTP ${res.status} ${res.statusText} | Body: ${shortRes}`);
    } catch (err: any) {
      console.log(`[POST ${path}] -> ERROR: ${err?.message}`);
    }
  }
}

discover();
