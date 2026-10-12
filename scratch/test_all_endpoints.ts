import app from '../server/index';
import http from 'http';

async function testEndpoints() {
  const server = app.listen(5005);
  console.log('Testing server started on 5005...');

  const endpoints = [
    '/api/health',
    '/api/leads',
    '/api/agents',
    '/api/campaigns',
    '/api/calls',
    '/api/phone-numbers',
    '/api/knowledge-bases',
    '/api/dashboard/metrics',
    '/api/dashboard/activity',
    '/api/dashboard/chart',
    '/api/dashboard/business',
    '/api/business',
    '/api/billing'
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(`http://localhost:5005${ep}`);
      const text = await res.text();
      console.log(`[${res.status}] ${ep} -> ${text.substring(0, 100)}`);
    } catch (err: any) {
      console.error(`[ERROR] ${ep}:`, err.message);
    }
  }

  server.close();
  process.exit(0);
}

testEndpoints();
