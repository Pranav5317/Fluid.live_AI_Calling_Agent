import * as assert from 'node:assert/strict';
import prisma from '../../backend/src/lib/prisma.js';
import { callSchedulerService, buildLeadAgentVariables } from '../../backend/src/services/callSchedulerService.js';
import { leadRepository } from '../../backend/src/repositories/leadRepository.js';

function assertActiveDispatch(
  tickResult: Awaited<ReturnType<typeof callSchedulerService.runSchedulerTick>>,
  expectedLeadName: string
) {
  assert.equal(tickResult.dispatchedCount, 1, `Expected 1 dry-run dispatch for active interval, got ${tickResult.dispatchedCount}`);
  assert.ok(tickResult.dispatches && tickResult.dispatches.length === 1, 'Expected non-empty dispatches array');
  const [firstDispatch] = tickResult.dispatches;
  assert.equal(firstDispatch.leadName, expectedLeadName);
  assert.equal(firstDispatch.intervalSlot, 'Between 6:00 PM – 8:00 PM');
  assert.equal(firstDispatch.agentVariables.user_name, expectedLeadName);
  assert.equal(firstDispatch.status, 'simulated_dispatched');
}

async function main() {
  console.log('=== 1. Unit Sanity Checks ===');

  // 2026-11-11 is Wednesday. 18:54 IST = 13:24 UTC (default window 10:00 - 20:30 IST)
  const wedEveningOpen = new Date('2026-11-11T13:24:00.000Z');
  const openInfo = callSchedulerService.getCallingWindowInfo(wedEveningOpen);
  assert.equal(openInfo.isOpen, true, `Expected 18:54 IST Wednesday to be open, got closed`);
  assert.equal(openInfo.currentISTHour, 18);
  console.log('[PASS] getCallingWindowInfo open at 6:54 PM IST');

  // 21:30 IST = 16:00 UTC -> closed
  const wedNightClosed = new Date('2026-11-11T16:00:00.000Z');
  const closedInfo = callSchedulerService.getCallingWindowInfo(wedNightClosed);
  assert.equal(closedInfo.isOpen, false, 'Expected 21:30 IST to be closed');
  console.log('[PASS] getCallingWindowInfo closed at 9:30 PM IST');

  // Sunday 2026-11-15 12:30 IST = 07:00 UTC -> Sunday exclusion
  const sundayNoon = new Date('2026-11-15T07:00:00.000Z');
  const sunInfo = callSchedulerService.getCallingWindowInfo(sundayNoon);
  assert.equal(sunInfo.isOpen, false, 'Expected Sunday to be closed');
  console.log('[PASS] getCallingWindowInfo closed on Sunday IST');

  // snapToCallingWindow respects custom windowStartHour = 9 (09:00 IST = 03:30 UTC)
  const snappedExact = callSchedulerService.snapToCallingWindow(wedNightClosed, {
    windowStartHour: 9,
    enableJitter: false,
  });
  assert.equal(snappedExact.toISOString(), '2026-11-12T03:30:00.000Z', 'Expected exact snap to 09:00 IST next day without jitter');

  const snappedJittered = callSchedulerService.snapToCallingWindow(wedNightClosed, {
    windowStartHour: 9,
    enableJitter: true,
    maxJitterMinutes: 18,
  });
  const snappedMs = snappedJittered.getTime();
  assert.ok(
    snappedMs >= new Date('2026-11-12T03:45:00.000Z').getTime() &&
      snappedMs <= new Date('2026-11-12T04:10:00.000Z').getTime(),
    `Expected jittered snap within [03:45, 04:10] UTC, got ${snappedJittered.toISOString()}`
  );
  console.log('[PASS] snapToCallingWindow respects policy.windowStartHour (9 AM IST) with & without jitter');

  // buildLeadAgentVariables preserves distinct portal variables
  const pranavVars = buildLeadAgentVariables({
    name: 'Pranav L',
    metadata: {
      role: 'Senior Software / AI Systems Engineer',
      experience: '3.5 Years',
      notice: 'Immediate',
      workMode: 'Hybrid, Pune',
    },
  });
  const rohnitVars = buildLeadAgentVariables({
    name: 'Rohnit Roy',
    metadata: {
      applied_role: 'Frontend Developer',
      portal_experience: '2 Years',
      portal_notice_period: '30 Days',
      portal_work_mode: 'On Site, Pune',
    },
  });
  assert.equal(pranavVars.applied_role, 'Senior Software / AI Systems Engineer');
  assert.equal(pranavVars.portal_experience, '3.5 Years');
  assert.equal(rohnitVars.applied_role, 'Frontend Developer');
  assert.equal(rohnitVars.portal_notice_period, '30 Days');
  console.log('[PASS] buildLeadAgentVariables extracts distinct portal variables cleanly');

  console.log('\n=== 2. End-to-End DB & Scheduler Dry-Run Checks ===');

  const initialLeads = await prisma.lead.findMany({ orderBy: { id: 'asc' } });
  const initialCampaignLeads = await prisma.campaignLead.findMany({ orderBy: { id: 'asc' } });

  console.log(`Current leads in DB (${initialLeads.length}):`, initialLeads.map(l => `${l.id}:${l.name}:${l.phone}`));
  assert.equal(initialLeads.length, 2, 'Expected strictly 2 leads (Pranav L & Rohnit Roy) in DB');

  const testLead = initialLeads.find(l => l.id === 'lead_rohnit_roy_01') || initialLeads[0];
  const origMeta = { ...((testLead.metadata as Record<string, any>) || {}) };
  const now = Date.now();

  try {
    // --- Case A: Active 2-hour interval window [now - 30m, now + 90m] ---
    const activeStart = new Date(now - 30 * 60 * 1000).toISOString();
    const activeEnd = new Date(now + 90 * 60 * 1000).toISOString();

    await leadRepository.updateLead(testLead.id, {
      metadata: {
        ...origMeta,
        scheduledCallTime: activeStart,
        scheduledWindowEnd: activeEnd,
        scheduledSlotLabel: 'Between 6:00 PM – 8:00 PM',
        scheduledTimezone: 'Asia/Kolkata',
      },
    } as any);

    const statusActive = await callSchedulerService.getSchedulerStatus();
    const scheduledEntry = statusActive.upcomingSchedule.find(u => u.leadName === testLead.name);
    assert.ok(scheduledEntry, 'Expected lead in upcomingSchedule after setting active interval');
    assert.equal(scheduledEntry.intervalSlot, 'Between 6:00 PM – 8:00 PM');
    assert.equal(scheduledEntry.isWindowActive, true);
    console.log('[PASS] Case A1: getSchedulerStatus lists active interval window & slot label');

    const tickActive = await callSchedulerService.runSchedulerTick({
      dryRun: true,
      forceIgnoreWindow: true,
      leadId: testLead.id,
    });
    assert.equal(tickActive.isDryRun, true);
    if ((tickActive.skippedCount ?? 0) > 0 && tickActive.skippedLeads?.[0]?.reason === 'anti_fatigue_cap') {
      console.log('[INFO] Case A hit real anti-fatigue guard (2+ calls in 24h in DB); raising policy cap for dry-run check...');
      callSchedulerService.updatePolicy({ maxCallsPer24Hours: 99 });
      const tickActiveRetry = await callSchedulerService.runSchedulerTick({
        dryRun: true,
        forceIgnoreWindow: true,
        leadId: testLead.id,
      });
      assertActiveDispatch(tickActiveRetry, testLead.name);
    } else {
      assertActiveDispatch(tickActive, testLead.name);
    }
    console.log('[PASS] Case A2: Active interval eligible in dry-run tick with correct agentVariables');

    // --- Case B: Future 2-hour interval window [now + 2h, now + 4h] ---
    const futureStart = new Date(now + 2 * 60 * 60 * 1000).toISOString();
    const futureEnd = new Date(now + 4 * 60 * 60 * 1000).toISOString();

    await leadRepository.updateLead(testLead.id, {
      metadata: {
        ...origMeta,
        scheduledCallTime: futureStart,
        scheduledWindowEnd: futureEnd,
        scheduledSlotLabel: 'Between 6:00 PM – 8:00 PM',
        scheduledTimezone: 'Asia/Kolkata',
      },
    } as any);

    const statusFuture = await callSchedulerService.getSchedulerStatus();
    const futureEntry = statusFuture.upcomingSchedule.find(u => u.leadName === testLead.name);
    assert.ok(futureEntry, 'Expected lead in upcomingSchedule for future slot');
    assert.equal(futureEntry.isDue, false);
    assert.equal(futureEntry.isWindowActive, false);

    const tickFuture = await callSchedulerService.runSchedulerTick({
      dryRun: true,
      forceIgnoreWindow: true,
      leadId: testLead.id,
    });
    assert.equal(tickFuture.dispatchedCount, 0, 'Expected 0 dispatches for future interval');
    console.log('[PASS] Case B: Future interval is queued in upcomingSchedule but NOT dispatched early');

    // --- Case C: Expired 2-hour interval window [now - 3h, now - 1h] ---
    const expiredStart = new Date(now - 3 * 60 * 60 * 1000).toISOString();
    const expiredEnd = new Date(now - 1 * 60 * 60 * 1000).toISOString();

    await leadRepository.updateLead(testLead.id, {
      metadata: {
        ...origMeta,
        scheduledCallTime: expiredStart,
        scheduledWindowEnd: expiredEnd,
        scheduledSlotLabel: 'Between 6:00 PM – 8:00 PM',
        scheduledTimezone: 'Asia/Kolkata',
      },
    } as any);

    const tickExpired = await callSchedulerService.runSchedulerTick({
      dryRun: true,
      forceIgnoreWindow: true,
      leadId: testLead.id,
    });
    assert.equal(tickExpired.dispatchedCount, 0, 'Expected 0 dispatches for expired interval');
    const rolledSkip = (tickExpired.skippedLeads ?? []).find((s) => s.leadName === testLead.name);
    assert.ok(rolledSkip, 'Expected expired interval lead in skippedLeads');
    assert.equal(rolledSkip.reason, 'interval_expired', `Unexpected skip reason: ${rolledSkip.reason}`);
    assert.ok(rolledSkip.nextAttemptAt, 'Expected nextAttemptAt on rolled-forward skip');
    assert.ok(new Date(rolledSkip.nextAttemptAt).getTime() > now, 'Expected rolled-forward nextAttemptAt in the future');
    console.log(`[PASS] Case C: Expired interval blocked & computed roll-forward (${rolledSkip.detail})`);

    // --- Case D: DNC Enforcement & DB Policy Persistence ---
    await leadRepository.updateLead(testLead.id, {
      doNotCall: true,
      dncReason: 'Candidate requested opt-out in sanity test',
      metadata: {
        ...origMeta,
        scheduledCallTime: activeStart,
        scheduledWindowEnd: activeEnd,
        scheduledSlotLabel: 'Between 6:00 PM – 8:00 PM',
        scheduledTimezone: 'Asia/Kolkata',
      },
    } as any);

    const tickDnc = await callSchedulerService.runSchedulerTick({
      dryRun: true,
      forceIgnoreWindow: true,
      leadId: testLead.id,
    });
    assert.equal(tickDnc.dispatchedCount, 0, 'Expected 0 dispatches for DNC lead');
    const dncSkip = (tickDnc.skippedLeads ?? []).find((s) => s.leadName === testLead.name);
    assert.ok(dncSkip, 'Expected DNC lead in skippedLeads');
    assert.equal(dncSkip.reason, 'do_not_call', `Unexpected DNC skip reason: ${dncSkip.reason}`);
    console.log('[PASS] Case D1: DNC compliance lock blocks autonomous dispatch cleanly');

    await callSchedulerService.updatePolicyAndPersist({ maxAttempts: 4 });
    callSchedulerService.updatePolicy({ maxAttempts: 3 }); // Mutate in-memory, then verify DB reload restores 4
    const reloadedPolicy = await callSchedulerService.loadPolicyFromDb();
    assert.equal(reloadedPolicy.maxAttempts, 4, 'Expected persisted scheduler policy to survive reload');
    console.log('[PASS] Case D2: Scheduler policy persists to SystemSetting & reloads across cold starts');
  } finally {
    // Restore original metadata, DNC state, CampaignLead rows, and default policy so DB remains spotless
    console.log('\nRestoring initial Lead metadata, DNC, Policy, and CampaignLead state...');
    await callSchedulerService.updatePolicyAndPersist({
      presetName: 'standard',
      maxAttempts: 3,
      maxCallsPer24Hours: 2,
      windowStartHour: 10.0,
      windowEndHour: 20.5,
      blockSundays: true,
    });
    for (const lead of initialLeads) {
      const cleanMeta = { ...((lead.metadata as Record<string, any>) || {}) };
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          doNotCall: lead.doNotCall,
          dncReason: lead.dncReason,
          dncUpdatedAt: lead.dncUpdatedAt,
          metadata: cleanMeta,
        },
      });
    }
    await prisma.campaignLead.deleteMany({});
    for (const cl of initialCampaignLeads) {
      await prisma.campaignLead.create({ data: cl });
    }
    const finalLeads = await prisma.lead.findMany({ orderBy: { id: 'asc' } });
    assert.equal(finalLeads.length, 2, 'Expected strictly 2 leads preserved after cleanup');
    console.log('[PASS] Database state cleanly restored; retained leads:', finalLeads.map(l => `${l.name} (${l.phone})`));
  }
}

main()
  .catch((err) => {
    console.error('SANITY TEST FAILED:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
