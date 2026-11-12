import * as assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import prisma from '../../backend/src/lib/prisma.js';
import { leadRepository } from '../../backend/src/repositories/leadRepository.js';
import { ServerCampaignService } from '../../backend/src/services/campaignService.js';
import { webhookRepository } from '../../backend/src/repositories/webhookRepository.js';
import { integrationRoutes } from '../../backend/src/routes/integrationRoutes.js';

const campaignService = new ServerCampaignService();

async function startIntegrationServer() {
  const app = express();
  app.use(express.json());
  app.use('/api/integrations', integrationRoutes);
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  return { server, baseUrl: `http://127.0.0.1:${port}` };
}

async function postJson(url: string, body: Record<string, any>) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await resp.json();
  return { status: resp.status, json };
}

async function main() {
  console.log('=== End-to-End Workflow Audit Suite ===');

  const initialLeads = await prisma.lead.findMany({ orderBy: { id: 'asc' } });
  assert.equal(initialLeads.length, 2, 'Expected strictly 2 leads (Pranav L & Rohnit Roy) in DB');
  const testLead = initialLeads.find((l) => l.id === 'lead_rohnit_roy_01') || initialLeads[0];
  const origMeta = { ...((testLead.metadata as Record<string, any>) || {}) };
  const origDnc = testLead.doNotCall;
  const origDncReason = testLead.dncReason;
  const origCampaignLeads = await prisma.campaignLead.findMany({ where: { leadId: testLead.id } });

  const origGuardrailRow = await prisma.systemSetting.findUnique({ where: { key: 'billing_guardrails' } });
  const origPeriod = await prisma.billingPeriod.findFirst({ where: { status: 'current' } });
  const existingCampaign = await prisma.campaign.findFirst({ orderBy: { createdAt: 'desc' } });

  const { server, baseUrl } = await startIntegrationServer();
  let tempDlqId: string | null = null;
  const origAtsUrl = process.env.ATS_WEBHOOK_URL;

  try {
    // 1. DNC vs Scheduled Slot Conflict
    await leadRepository.updateLead(testLead.id, {
      doNotCall: true,
      dncReason: 'workflow_audit_test',
      metadata: {
        ...origMeta,
        scheduledCallTime: new Date(Date.now() + 3600000).toISOString(),
      },
    });
    const afterDncWithSchedule = await prisma.campaignLead.findMany({ where: { leadId: testLead.id } });
    for (const cl of afterDncWithSchedule) {
      assert.equal(cl.status, 'dnc_blocked', `Expected dnc_blocked even when scheduledCallTime is present, got ${cl.status}`);
      assert.equal(cl.nextAttemptAt, null, 'Expected nextAttemptAt to be null for dnc_blocked lead');
    }

    await leadRepository.updateLead(testLead.id, {
      metadata: { ...origMeta, scheduledCallTime: null },
    });
    const afterDncClearSchedule = await prisma.campaignLead.findMany({ where: { leadId: testLead.id } });
    for (const cl of afterDncClearSchedule) {
      assert.equal(cl.status, 'dnc_blocked', `Expected dnc_blocked to persist when clearing schedule on DNC lead, got ${cl.status}`);
    }
    console.log('[PASS] DNC guard overrides schedule sync/clear on CampaignLead');

    // 2. Integration Route Validation & Callback Slot Guard
    const dncSlotResp = await postJson(`${baseUrl}/api/integrations/callback-slot`, {
      leadId: testLead.id,
      slotPreset: 'evening_6_8',
    });
    assert.equal(dncSlotResp.status, 403, 'Expected 403 when scheduling callback-slot on DNC lead');

    // Restore DNC before testing valid/invalid interval payloads
    await prisma.lead.update({
      where: { id: testLead.id },
      data: { doNotCall: origDnc, dncReason: origDncReason, dncUpdatedAt: null },
    });

    const badTimeResp = await postJson(`${baseUrl}/api/integrations/callback-slot`, {
      leadId: testLead.id,
      startTime: '25:99',
      endTime: '26:00',
    });
    assert.equal(badTimeResp.status, 400, 'Expected 400 on invalid HH:mm time format');

    const reversedWindowResp = await postJson(`${baseUrl}/api/integrations/callback-slot`, {
      leadId: testLead.id,
      startTime: '18:00',
      endTime: '16:00',
    });
    assert.equal(reversedWindowResp.status, 400, 'Expected 400 when endTime <= startTime');

    const badPresetResp = await postJson(`${baseUrl}/api/integrations/callback-slot`, {
      leadId: testLead.id,
      slotPreset: 'invalid_preset_xyz',
    });
    assert.equal(badPresetResp.status, 400, 'Expected 400 on unknown slotPreset');

    const partialAtsResp = await postJson(`${baseUrl}/api/integrations/ats/leads`, {
      name: 'Audit Validation Check',
      phone: '+919999999999',
      startTime: '18:00',
    });
    assert.equal(partialAtsResp.status, 400, 'Expected 400 on ATS lead with startTime without endTime');

    const validSlotResp = await postJson(`${baseUrl}/api/integrations/callback-slot`, {
      leadId: testLead.id,
      slotPreset: 'evening_6_8',
    });
    assert.equal(validSlotResp.status, 200, `Expected 200 on valid callback-slot, got ${validSlotResp.status}`);
    assert.equal(validSlotResp.json.data.scheduledInterval.scheduledSlotLabel, 'Between 6:00 PM – 8:00 PM');
    console.log('[PASS] Integration interval validation & callback-slot workflow verified');

    // 3. Budget Guardrail Enforcement on Manual startCampaign & dialBatch
    if (existingCampaign && origPeriod) {
      await prisma.systemSetting.upsert({
        where: { key: 'billing_guardrails' },
        create: { key: 'billing_guardrails', value: { monthlyBudgetCapUsd: 0.01, enforceHardCap: true } },
        update: { value: { monthlyBudgetCapUsd: 0.01, enforceHardCap: true } },
      });
      await prisma.billingPeriod.update({
        where: { id: origPeriod.id },
        data: { estimatedTotalCost: Math.max(origPeriod.estimatedTotalCost, 1.0) },
      });

      await assert.rejects(
        () => campaignService.startCampaign(existingCampaign.id),
        /Monthly budget cap/,
        'Expected startCampaign to reject when hard budget cap is exceeded'
      );
      await assert.rejects(
        () => campaignService.dialBatch(existingCampaign.id),
        /Monthly budget cap/,
        'Expected dialBatch to reject when hard budget cap is exceeded'
      );
      console.log('[PASS] Budget hard cap blocks manual startCampaign and dialBatch');
    } else {
      console.log('[SKIP] No existing campaign or billingPeriod for budget cap test');
    }

    // 4. Dead-Letter reprocessEvent Validation
    delete process.env.ATS_WEBHOOK_URL;
    const dlqEvent = await prisma.webhookEvent.create({
      data: {
        provider: 'sarvam',
        eventType: 'ats_outbound',
        externalId: `dlq_audit_test_${Date.now()}`,
        payload: { test: true },
        status: 'failed',
        error: 'Simulated delivery failure',
      },
    });
    tempDlqId = dlqEvent.id;

    await assert.rejects(
      () => webhookRepository.reprocessEvent(dlqEvent.id),
      /not configured/,
      'Expected reprocessEvent to reject when target webhook URL is missing'
    );
    const afterRetryFail = await prisma.webhookEvent.findUnique({ where: { id: dlqEvent.id } });
    assert.equal(afterRetryFail?.status, 'failed', 'Expected failed DLQ event to remain failed when retry fails');
    console.log('[PASS] Dead-letter reprocessEvent validates & preserves failed state on error');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));

    if (origAtsUrl !== undefined) process.env.ATS_WEBHOOK_URL = origAtsUrl;
    else delete process.env.ATS_WEBHOOK_URL;

    if (tempDlqId) {
      await prisma.webhookEvent.deleteMany({ where: { id: tempDlqId } });
    }

    if (origGuardrailRow) {
      await prisma.systemSetting.upsert({
        where: { key: 'billing_guardrails' },
        create: { key: 'billing_guardrails', value: origGuardrailRow.value as any },
        update: { value: origGuardrailRow.value as any },
      });
    } else {
      await prisma.systemSetting.deleteMany({ where: { key: 'billing_guardrails' } });
    }

    if (origPeriod) {
      await prisma.billingPeriod.update({
        where: { id: origPeriod.id },
        data: { estimatedTotalCost: origPeriod.estimatedTotalCost },
      });
    }

    await prisma.lead.update({
      where: { id: testLead.id },
      data: {
        doNotCall: origDnc,
        dncReason: origDncReason,
        dncUpdatedAt: testLead.dncUpdatedAt,
        metadata: origMeta,
      },
    });

    for (const cl of origCampaignLeads) {
      await prisma.campaignLead.update({
        where: { id: cl.id },
        data: { status: cl.status, nextAttemptAt: cl.nextAttemptAt },
      });
    }

    const finalCount = await prisma.lead.count();
    assert.equal(finalCount, 2, `Expected strictly 2 leads after cleanup, found ${finalCount}`);
    await prisma.$disconnect();
  }

  console.log('\nALL WORKFLOW AUDIT CHECKS PASSED CLEANLY!');
}

main().catch((err) => {
  console.error('WORKFLOW AUDIT FAILED:', err);
  process.exit(1);
});
