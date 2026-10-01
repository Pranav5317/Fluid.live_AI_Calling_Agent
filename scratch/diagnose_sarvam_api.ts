import prisma from '../server/lib/prisma';

async function diagnose() {
  const apiKey = process.env.SARVAM_API_KEY;
  console.log('🔍 Comprehensive Sarvam API Diagnosis');
  console.log('Key:', apiKey ? `${apiKey.substring(0, 8)}...` : 'NOT FOUND');

  if (!apiKey) return;

  const testEndpoints = [
    // Standard Sarvam API endpoints
    { name: 'POST text-to-speech', url: 'https://api.sarvam.ai/text-to-speech', method: 'POST', body: { inputs: ['Hello world'], target_language_code: 'hi-IN' } },
    { name: 'GET agents', url: 'https://api.sarvam.ai/agents', method: 'GET' },
    { name: 'GET v1/agents', url: 'https://api.sarvam.ai/v1/agents', method: 'GET' },
    { name: 'GET call/v1', url: 'https://api.sarvam.ai/call/v1', method: 'GET' },
    { name: 'GET calls', url: 'https://api.sarvam.ai/calls', method: 'GET' },
    // App endpoints
    { name: 'POST apps', url: 'https://api.sarvam.ai/apps', method: 'GET' },
    { name: 'GET apps (apps.sarvam.ai)', url: 'https://apps.sarvam.ai/api/apps', method: 'GET' },
    { name: 'POST apps (apps.sarvam.ai)', url: 'https://apps.sarvam.ai/api/v1/apps', method: 'POST', body: { name: 'test' } },
  ];

  for (const ep of testEndpoints) {
    console.log(`\nTesting [${ep.name}] -> ${ep.method} ${ep.url}`);
    try {
      const res = await fetch(ep.url, {
        method: ep.method,
        headers: {
          'api-subscription-key': apiKey,
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: ep.body ? JSON.stringify(ep.body) : undefined,
      });
      console.log(`  Status: ${res.status} ${res.statusText}`);
      const text = await res.text();
      console.log(`  Response Body (${text.length} chars):`, text.substring(0, 400));
    } catch (err: any) {
      console.log(`  Error: ${err?.message}`);
    }
  }

  await prisma.$disconnect();
}

diagnose();
