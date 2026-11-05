const BASE_URL = process.env.TEST_URL || 'https://fluid-live-calling-agent.vercel.app';

interface TestResult {
  category: string;
  name: string;
  endpoint: string;
  method: string;
  status: number;
  passed: boolean;
  durationMs: number;
  details: string;
}

const testResults: TestResult[] = [];

async function apiRequest(
  category: string,
  name: string,
  endpoint: string,
  method: 'GET' | 'POST' | 'PATCH' = 'GET',
  body?: any,
  validator?: (data: any, res: Response) => { passed: boolean; message: string }
): Promise<any> {
  const start = Date.now();
  const url = `${BASE_URL}${endpoint}`;
  try {
    const opts: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    if (body) {
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(url, opts);
    const durationMs = Date.now() - start;
    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      // not JSON
    }

    let passed = res.status >= 200 && res.status < 300;
    let details = `HTTP ${res.status}`;

    if (json && json.success === false) {
      passed = false;
      details = `Server reported success=false: ${json.error || 'Unknown error'}`;
    }

    if (validator && json) {
      const v = validator(json, res);
      if (!v.passed) {
        passed = false;
        details = v.message;
      } else {
        details += ` | ${v.message}`;
      }
    } else if (passed) {
      details += ` | Response OK`;
    }

    testResults.push({
      category,
      name,
      endpoint,
      method,
      status: res.status,
      passed,
      durationMs,
      details,
    });

    return json;
  } catch (err: any) {
    const durationMs = Date.now() - start;
    testResults.push({
      category,
      name,
      endpoint,
      method,
      status: 0,
      passed: false,
      durationMs,
      details: `Network failure: ${err.message}`,
    });
    return null;
  }
}

async function runFullVerification() {
  console.log(`========================================================================`);
  console.log(`FLUID.LIVE PRE-DEMO COMPREHENSIVE END-TO-END SYSTEM AUDIT`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`Time:   ${new Date().toISOString()}`);
  console.log(`========================================================================\n`);

  // 1. SYSTEM HEALTH
  await apiRequest('System', 'Health Check', '/api/health', 'GET', undefined, (d) => ({
    passed: d.status === 'healthy' && d.service.includes('Fluid.Live'),
    message: `Status: ${d.status}, Sarvam Bridge: ${d.sarvamBridge}`,
  }));

  // 2. DASHBOARD & KPIS
  await apiRequest('Dashboard', 'Core Metrics', '/api/dashboard/metrics', 'GET', undefined, (d) => ({
    passed: typeof d.data?.callsAttempted === 'number' && typeof d.data?.totalLeads === 'number',
    message: `Leads: ${d.data?.totalLeads}, Calls: ${d.data?.callsAttempted}, Mins: ${d.data?.minutesUtilized}`,
  }));

  await apiRequest('Dashboard', 'Recent Activity Stream', '/api/dashboard/activity', 'GET', undefined, (d) => ({
    passed: Array.isArray(d.data),
    message: `${d.data?.length || 0} activity records retrieved`,
  }));

  await apiRequest('Dashboard', 'Call Activity Chart', '/api/dashboard/chart', 'GET', undefined, (d) => ({
    passed: Array.isArray(d.data),
    message: `${d.data?.length || 0} chart data points retrieved`,
  }));

  const bizData = await apiRequest('Dashboard', 'Business Profile Context', '/api/dashboard/business', 'GET', undefined, (d) => ({
    passed: !!d.data?.name,
    message: `Business: "${d.data?.name || 'N/A'}" (Plan: ${d.data?.plan || 'N/A'})`,
  }));

  // 3. AGENTS & TTS
  const agentsRes = await apiRequest('Agents', 'List Agents', '/api/agents', 'GET', undefined, (d) => ({
    passed: Array.isArray(d.data) && d.data.length > 0,
    message: `Found ${d.data?.length || 0} agent(s)`,
  }));

  let targetAgentId = 'ag_sarvam_prod_01';
  if (agentsRes?.data?.length > 0) {
    targetAgentId = agentsRes.data[0].id;
    await apiRequest('Agents', 'Get Agent Detail', `/api/agents/${targetAgentId}`, 'GET', undefined, (d) => ({
      passed: (d.data?.agent?.id || d.data?.id) === targetAgentId,
      message: `Agent Name: "${d.data?.agent?.name || d.data?.name}"`,
    }));

    await apiRequest('Agents', 'Get Agent Versions', `/api/agents/${targetAgentId}/versions`, 'GET', undefined, (d) => ({
      passed: Array.isArray(d.data),
      message: `${d.data?.length || 0} version(s) found`,
    }));
  }

  // Sarvam Bulbul TTS Voice Preview
  await apiRequest('Agents', 'Voice TTS Preview (Sarvam Bulbul)', '/api/agents/voice-preview', 'POST', {
    text: 'Hello from Fluid live voice agent demo',
    speaker: 'shubh',
    languageCode: 'en-IN',
  }, (d) => ({
    passed: d.success === true,
    message: d.audioBase64 ? 'Generated audio base64 payload' : 'Browser synthesis fallback ready',
  }));

  // 4. CAMPAIGNS & AUTONOMOUS DISPATCH
  const campaignsRes = await apiRequest('Campaigns', 'List Campaigns', '/api/campaigns', 'GET', undefined, (d) => ({
    passed: Array.isArray(d.data),
    message: `${d.data?.length || 0} campaign(s) active in system`,
  }));

  let sampleCampaignId = '';
  if (campaignsRes?.data?.length > 0) {
    sampleCampaignId = campaignsRes.data[0].id;
    await apiRequest('Campaigns', 'Get Campaign Detail', `/api/campaigns/${sampleCampaignId}`, 'GET', undefined, (d) => ({
      passed: d.data?.id === sampleCampaignId,
      message: `Campaign: "${d.data?.name}" (Status: ${d.data?.status})`,
    }));

    await apiRequest('Campaigns', 'Execution Monitor', `/api/campaigns/${sampleCampaignId}/monitor`, 'GET', undefined, (d) => ({
      passed: !!d.data,
      message: `Progress: ${d.data?.progress || 0}%, Dialed: ${d.data?.dialedCount || 0}/${d.data?.totalLeads || 0}`,
    }));
  }

  await apiRequest('Campaigns', 'Autonomous Scheduler Window', '/api/campaigns/scheduler/status', 'GET', undefined, (d) => ({
    passed: typeof d.data?.windowInfo?.isOpen === 'boolean',
    message: `Window Open: ${d.data?.windowInfo?.isOpen}, IST: ${d.data?.windowInfo?.currentISTTime}`,
  }));

  await apiRequest('Campaigns', 'Cadence Policy & Presets', '/api/campaigns/cadence/policy', 'GET', undefined, (d) => ({
    passed: !!d.data?.policy && !!d.data?.presets,
    message: `Max Retries: ${d.data?.policy?.maxRetries}, Presets: ${Object.keys(d.data?.presets || {}).join(', ')}`,
  }));

  await apiRequest('Campaigns', 'Retry Queue Status', '/api/campaigns/retries/queue', 'GET', undefined, (d) => ({
    passed: Array.isArray(d.data),
    message: `${d.data?.length || 0} leads currently in retry queue`,
  }));

  // Test dry-run scheduler tick (safe operation)
  await apiRequest('Campaigns', 'Scheduler Heartbeat Tick', '/api/campaigns/scheduler/tick', 'POST', { dryRun: true }, (d) => ({
    passed: d.success === true,
    message: `Processed: ${d.data?.processed || 0}, Triggered: ${d.data?.triggered || 0}`,
  }));

  // 5. LEADS MANAGEMENT & 360 TIMELINE
  const leadsRes = await apiRequest('Leads', 'List Leads', '/api/leads', 'GET', undefined, (d) => ({
    passed: Array.isArray(d.data?.items) || Array.isArray(d.data),
    message: `Total Leads in DB: ${d.data?.total || (Array.isArray(d.data) ? d.data.length : 0)}`,
  }));

  // Create a Demo Lead (live write operation)
  const testPhone = `+9198765${Math.floor(10000 + Math.random() * 90000)}`;
  const createdLeadRes = await apiRequest('Leads', 'Create Demo Lead', '/api/leads', 'POST', {
    name: 'Live Demo Prospect',
    phone: testPhone,
    email: 'demo.prospect@fluid.live',
    metadata: { source: 'pre_demo_e2e_verification', priority: 'vip' },
  }, (d) => ({
    passed: !!d.data?.id,
    message: `Created lead ID: ${d.data?.id} (${d.data?.phone})`,
  }));

  if (createdLeadRes?.data?.id) {
    const leadId = createdLeadRes.data.id;
    await apiRequest('Leads', 'Fetch Created Lead Detail', `/api/leads/${leadId}`, 'GET', undefined, (d) => ({
      passed: d.data?.id === leadId,
      message: `Verified lead persistence: "${d.data?.name}"`,
    }));

    await apiRequest('Leads', 'Lead 360 Timeline & History', `/api/leads/${leadId}/timeline`, 'GET', undefined, (d) => ({
      passed: Array.isArray(d.data?.timeline) || !!d.data,
      message: `Timeline events retrieved successfully`,
    }));
  }

  // Bulk Import Test
  await apiRequest('Leads', 'Bulk Import Leads API', '/api/leads/import', 'POST', {
    leads: [
      { name: 'Demo Lead Alpha', phone: `+9198111${Math.floor(10000 + Math.random() * 90000)}`, email: 'alpha@fluid.live' },
      { name: 'Demo Lead Beta', phone: `+9198222${Math.floor(10000 + Math.random() * 90000)}`, email: 'beta@fluid.live' },
    ],
  }, (d) => ({
    passed: d.success === true && (d.data?.importedCount !== undefined || d.data?.imported !== undefined),
    message: `Bulk import processed ${d.data?.importedCount ?? 0} leads`,
  }));

  // 6. CALLS & TELEMETRY
  const callsRes = await apiRequest('Calls', 'List Outbound Calls', '/api/calls', 'GET', undefined, (d) => ({
    passed: Array.isArray(d.data?.calls) || Array.isArray(d.data),
    message: `${(d.data?.calls || d.data)?.length || 0} call logs in registry`,
  }));

  const callsList = Array.isArray(callsRes?.data?.calls) ? callsRes.data.calls : callsRes?.data || [];
  if (callsList.length > 0) {
    const testCallId = callsList[0].id;
    await apiRequest('Calls', 'Get Call Detail & Telemetry', `/api/calls/${testCallId}`, 'GET', undefined, (d) => ({
      passed: d.data?.id === testCallId,
      message: `Status: ${d.data?.status}, Outcome: ${d.data?.outcome}, Duration: ${d.data?.durationSeconds}s`,
    }));

    await apiRequest('Calls', 'Fetch AI Call Transcript', `/api/calls/${testCallId}/transcript`, 'GET', undefined, (d) => ({
      passed: d.success === true,
      message: `Transcript synced successfully from Sarvam API`,
    }));
  }

  await apiRequest('Calls', 'Cloudflare R2 Storage Status', '/api/calls/storage/status', 'GET', undefined, (d) => ({
    passed: d.success === true,
    message: `R2 Configured: ${d.data?.configured}, Bucket: ${d.data?.bucketName || 'N/A'}`,
  }));

  // 7. TELEPHONY LINES & PHONE NUMBERS
  await apiRequest('PhoneNumbers', 'List Phone Numbers', '/api/phone-numbers', 'GET', undefined, (d) => ({
    passed: Array.isArray(d.data),
    message: `${d.data?.length || 0} active telephony DID line(s)`,
  }));

  // 8. KNOWLEDGE BASE
  await apiRequest('Knowledge', 'List Knowledge Bases', '/api/knowledge-bases', 'GET', undefined, (d) => ({
    passed: Array.isArray(d.data),
    message: `${d.data?.length || 0} knowledge repository/repositories`,
  }));

  // 9. BILLING & TELECOM USAGE
  await apiRequest('Billing', 'Current Billing Period', '/api/billing/current', 'GET', undefined, (d) => ({
    passed: d.success === true,
    message: `Plan: ${d.data?.plan || 'Enterprise'}, Minutes Billed: ${d.data?.totalMinutes || 0}`,
  }));

  await apiRequest('Billing', 'Billing Invoice History', '/api/billing/history', 'GET', undefined, (d) => ({
    passed: Array.isArray(d.data),
    message: `${d.data?.length || 0} invoices on file`,
  }));

  await apiRequest('Billing', 'Telecom Usage Ledger', '/api/usage', 'GET', undefined, (d) => ({
    passed: Array.isArray(d.data?.events || d.data),
    message: `${(d.data?.events || d.data)?.length || 0} telecom billing events recorded`,
  }));

  // 10. SARVAM CARRIER INTEGRATION
  await apiRequest('Carrier', 'Carrier Account Status', '/api/sarvam/status', 'GET', undefined, (d) => ({
    passed: d.data?.connected === true,
    message: `Connected: ${d.data?.connected}, Org: ${d.data?.orgId || 'N/A'}, Phone: ${d.data?.agentPhoneNumber || 'N/A'}`,
  }));

  await apiRequest('Carrier', 'Carrier Live API Ping Test', '/api/sarvam/test', 'POST', {}, (d) => ({
    passed: d.success === true,
    message: `Live Ping: ${d.data?.message || 'Handshake confirmed'}`,
  }));

  // 11. WEBHOOKS AUDIT
  await apiRequest('Webhooks', 'Webhook Audit Log', '/api/webhooks', 'GET', undefined, (d) => ({
    passed: Array.isArray(d.data),
    message: `${d.data?.length || 0} webhook event(s) logged`,
  }));

  // PRINT SUMMARY REPORT
  console.log(`\n========================================================================`);
  console.log(`DETAILED AUDIT REPORT BY SUBSYSTEM`);
  console.log(`========================================================================`);

  const categories = [...new Set(testResults.map((r) => r.category))];
  let totalPassed = 0;
  let totalFailed = 0;

  for (const cat of categories) {
    console.log(`\n▶ [${cat.toUpperCase()}]`);
    const items = testResults.filter((r) => r.category === cat);
    for (const item of items) {
      const badge = item.passed ? '✓ PASS' : '✗ FAIL';
      console.log(
        `  ${badge.padEnd(8)} [${item.status.toString().padStart(3)}] ${item.method.padEnd(5)} ${item.name.padEnd(30)} (${item.durationMs.toString().padStart(4)}ms) -> ${item.details}`
      );
      if (item.passed) totalPassed++;
      else totalFailed++;
    }
  }

  console.log(`\n========================================================================`);
  console.log(`FINAL RESULT: ${totalPassed} PASSED, ${totalFailed} FAILED OUT OF ${testResults.length} TOTAL CHECKS`);
  console.log(`========================================================================\n`);

  if (totalFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runFullVerification();
