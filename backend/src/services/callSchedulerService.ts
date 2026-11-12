import prisma from '../lib/prisma';
import { backendSarvamProvider } from './sarvamProvider';
import { callRepository } from '../repositories/callRepository';

/**
 * Extracts Sarvam Input Variables from a Lead's metadata so scheduled/campaign
 * dispatches carry accurate candidate portal facts instead of provider defaults.
 */
export function buildLeadAgentVariables(lead: { name: string; metadata?: any }) {
  const meta = (lead.metadata as Record<string, any>) || {};
  return {
    user_name: lead.name,
    applied_role: meta.applied_role || meta.role || 'Not specified',
    portal_experience: meta.portal_experience || meta.experience || 'Not specified',
    portal_notice_period: meta.portal_notice_period || meta.notice || 'Not specified',
    portal_work_mode: meta.portal_work_mode || meta.workMode || 'Not specified',
  };
}

function formatHourFraction(hourFrac: number): string {
  const wholeHours = Math.floor(hourFrac);
  const mins = Math.round((hourFrac - wholeHours) * 60);
  const period = wholeHours >= 12 ? 'PM' : 'AM';
  const h12 = wholeHours % 12 === 0 ? 12 : wholeHours % 12;
  return `${h12}:${String(mins).padStart(2, '0')} ${period}`;
}

export interface CallingWindowInfo {
  isOpen: boolean;
  currentISTTime: string;
  currentISTHour: number;
  currentISTMinute: number;
  dayOfWeek: string;
  nextWindowStart: string;
  windowRules: string;
}

export interface RetryPolicyConfig {
  presetName: 'standard' | 'aggressive' | 'gentle' | 'custom';
  maxAttempts: number;
  tier2DelayHours: number;
  tier3DelayHours: number;
  busyOffsetMinutes: number;
  carrierErrorOffsetMinutes: number;
  maxCallsPer24Hours: number;
  postponeHoursOnFatigue: number;
  enableJitter: boolean;
  maxJitterMinutes: number;
  windowStartHour: number;
  windowEndHour: number;
  blockSundays: boolean;
}

export const CADENCE_PRESETS: Record<string, RetryPolicyConfig> = {
  standard: {
    presetName: 'standard',
    maxAttempts: 3,
    tier2DelayHours: 4,
    tier3DelayHours: 24,
    busyOffsetMinutes: 30,
    carrierErrorOffsetMinutes: 15,
    maxCallsPer24Hours: 2,
    postponeHoursOnFatigue: 18,
    enableJitter: true,
    maxJitterMinutes: 18,
    windowStartHour: 10.0,
    windowEndHour: 20.5, // 8:30 PM IST (Supports 6:00 PM - 8:00 PM interval outreach)
    blockSundays: true,
  },
  aggressive: {
    presetName: 'aggressive',
    maxAttempts: 4,
    tier2DelayHours: 1,
    tier3DelayHours: 6,
    busyOffsetMinutes: 15,
    carrierErrorOffsetMinutes: 10,
    maxCallsPer24Hours: 3,
    postponeHoursOnFatigue: 12,
    enableJitter: true,
    maxJitterMinutes: 8,
    windowStartHour: 9.5,
    windowEndHour: 21.0, // 9:00 PM IST
    blockSundays: false,
  },
  gentle: {
    presetName: 'gentle',
    maxAttempts: 2,
    tier2DelayHours: 24,
    tier3DelayHours: 48,
    busyOffsetMinutes: 60,
    carrierErrorOffsetMinutes: 30,
    maxCallsPer24Hours: 1,
    postponeHoursOnFatigue: 24,
    enableJitter: true,
    maxJitterMinutes: 25,
    windowStartHour: 10.5,
    windowEndHour: 20.0, // 8:00 PM IST
    blockSundays: true,
  },
};

export class CallSchedulerService {
  private policy: RetryPolicyConfig = { ...CADENCE_PRESETS.standard };

  private isTickRunning = false;
  private policyLoaded = false;

  getPolicy(): RetryPolicyConfig {
    return { ...this.policy };
  }

  /**
   * Loads persisted cadence policy from SystemSetting (survives serverless cold starts).
   */
  async loadPolicyFromDb(): Promise<RetryPolicyConfig> {
    try {
      const row = await prisma.systemSetting.findUnique({
        where: { key: 'scheduler_policy' },
      });
      if (row?.value && typeof row.value === 'object') {
        this.policy = {
          ...this.policy,
          ...(row.value as Partial<RetryPolicyConfig>),
        };
      }
      this.policyLoaded = true;
    } catch (err: any) {
      console.warn('[Dynamic Scheduler] Could not load policy from DB, using in-memory policy:', err?.message);
    }
    return { ...this.policy };
  }

  updatePolicy(updates: Partial<RetryPolicyConfig>): RetryPolicyConfig {
    this.policy = {
      ...this.policy,
      ...updates,
      presetName: updates.presetName || 'custom',
    };
    return { ...this.policy };
  }

  async updatePolicyAndPersist(updates: Partial<RetryPolicyConfig>): Promise<RetryPolicyConfig> {
    const next = this.updatePolicy(updates);
    await prisma.systemSetting.upsert({
      where: { key: 'scheduler_policy' },
      create: { key: 'scheduler_policy', value: next as any },
      update: { value: next as any },
    });
    this.policyLoaded = true;
    return next;
  }

  private async acquireDistributedTickLock(ttlMs = 90000): Promise<boolean> {
    const now = Date.now();
    const lockOwner = `tick_${now}_${Math.random().toString(36).slice(2, 8)}`;
    try {
      const existing = await prisma.systemSetting.findUnique({
        where: { key: 'scheduler_tick_lock' },
      });
      const existingVal = existing?.value as { expiresAt?: number } | undefined;
      if (existingVal?.expiresAt && existingVal.expiresAt > now) {
        return false;
      }
      await prisma.systemSetting.upsert({
        where: { key: 'scheduler_tick_lock' },
        create: { key: 'scheduler_tick_lock', value: { owner: lockOwner, expiresAt: now + ttlMs } },
        update: { value: { owner: lockOwner, expiresAt: now + ttlMs } },
      });
      return true;
    } catch {
      return true; // Fail-open on transient lock read error; in-memory guard still applies
    }
  }

  private async releaseDistributedTickLock(): Promise<void> {
    try {
      await prisma.systemSetting.upsert({
        where: { key: 'scheduler_tick_lock' },
        create: { key: 'scheduler_tick_lock', value: { owner: null, expiresAt: 0 } },
        update: { value: { owner: null, expiresAt: 0 } },
      });
    } catch {
      // Ignore release errors; TTL expires automatically
    }
  }

  /**
   * Evaluates if current time falls within legal/safe consumer calling windows (TRAI / IST).
   * Safe Calling Window: 10:00 AM - 7:30 PM IST (Monday - Saturday). Sunday cold outreach is blocked.
   */
  getCallingWindowInfo(date = new Date()): CallingWindowInfo {
    // Convert to IST (UTC + 5 hours 30 mins)
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(date.getTime() + istOffsetMs);

    const utcDay = istDate.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = days[utcDay];

    const currentISTHour = istDate.getUTCHours();
    const currentISTMinute = istDate.getUTCMinutes();
    const currentTimeFraction = currentISTHour + currentISTMinute / 60;

    // Window: 10:00 AM (10.0) to 7:30 PM (19.5)
    const windowStartHour = this.policy.windowStartHour;
    const windowEndHour = this.policy.windowEndHour;

    // Sunday restriction
    const isSunday = this.policy.blockSundays && utcDay === 0;
    const isWithinHours = currentTimeFraction >= windowStartHour && currentTimeFraction < windowEndHour;
    const isOpen = !isSunday && isWithinHours;

    // Calculate next window opening time in UTC
    let nextStartIST = new Date(istDate);
    if (currentTimeFraction >= windowEndHour || isSunday) {
      // Advance to tomorrow (or Monday if Sunday)
      const daysToAdd = isSunday ? 1 : (this.policy.blockSundays && utcDay === 6 ? 2 : 1);
      nextStartIST.setUTCDate(nextStartIST.getUTCDate() + daysToAdd);
    }
    nextStartIST.setUTCHours(Math.floor(windowStartHour), Math.round((windowStartHour % 1) * 60), 0, 0);
    // Convert back from IST representation to real UTC Date
    const nextWindowStartUTC = new Date(nextStartIST.getTime() - istOffsetMs);

    const formattedIST = `${String(currentISTHour).padStart(2, '0')}:${String(currentISTMinute).padStart(2, '0')} IST`;

    return {
      isOpen,
      currentISTTime: formattedIST,
      currentISTHour,
      currentISTMinute,
      dayOfWeek,
      nextWindowStart: nextWindowStartUTC.toISOString(),
      windowRules: `Calling Window: ${formatHourFraction(windowStartHour)} - ${formatHourFraction(windowEndHour)} IST (${this.policy.blockSundays ? 'Mon-Sat' : 'Mon-Sun'}) [Preset: ${this.policy.presetName}]`,
    };
  }

  /**
   * Calculates the next attempt date with dynamic interval waterfall,
   * random jitter (anti-spam), and snaps to safe calling windows.
   */
  calculateNextAttempt(attemptCount: number, outcome = 'unreachable', customTarget?: Date | string, policyOverride?: Partial<RetryPolicyConfig>): Date | null {
    const policy = { ...this.policy, ...policyOverride };
    if (attemptCount >= policy.maxAttempts) {
      return null; // Lead exhausted after 3 attempts
    }

    const now = new Date();
    let targetTime: Date;

    if (customTarget) {
      targetTime = new Date(customTarget);
    } else if (attemptCount === 1) {
      // Tier 2 Backoff: +4 hours + random jitter (0 to 18 mins) + time-shift (+30m for busy)
      const jitterMs = policy.enableJitter ? Math.floor(Math.random() * policy.maxJitterMinutes * 60 * 1000) : 0;
      const outcomeBonusMs =
        outcome === 'busy'
          ? policy.busyOffsetMinutes * 60 * 1000
          : outcome === 'carrier_error' || outcome === 'network_error'
          ? policy.carrierErrorOffsetMinutes * 60 * 1000
          : 0;
      targetTime = new Date(now.getTime() + policy.tier2DelayHours * 3600000 + jitterMs + outcomeBonusMs);
    } else {
      // Tier 3 Window: +24 hours + time-shift (+3.5 hours) + jitter
      const jitterMs = policy.enableJitter ? Math.floor(Math.random() * policy.maxJitterMinutes * 60 * 1000) : 0;
      targetTime = new Date(now.getTime() + policy.tier3DelayHours * 3600000 + jitterMs);
    }

    // Snap to calling window if target falls outside 10:00 AM - 7:30 PM IST
    return this.snapToCallingWindow(targetTime, policy);
  }

  /**
   * Ensures any calculated target timestamp lands inside valid calling hours (10:00 AM - 7:30 PM IST).
   * If target is at 9:30 PM, it snaps to 10:30 AM + random jitter the next business morning.
   */
  snapToCallingWindow(target: Date, policyOverride?: Partial<RetryPolicyConfig>): Date {
    const policy = { ...this.policy, ...policyOverride };
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    let targetIST = new Date(target.getTime() + istOffsetMs);

    let day = targetIST.getUTCDay();
    let hour = targetIST.getUTCHours();
    let minute = targetIST.getUTCMinutes();
    let timeFrac = hour + minute / 60;

    const windowStartH = Math.floor(policy.windowStartHour);
    const windowStartM = Math.round((policy.windowStartHour % 1) * 60);

    // If target is earlier than windowStartHour IST today, snap to window start (+ small jitter if enabled)
    if (timeFrac < policy.windowStartHour) {
      const jitterMin = policy.enableJitter ? 5 + Math.floor(Math.random() * 20) : 0;
      targetIST.setUTCHours(windowStartH, windowStartM + jitterMin, 0, 0);
    }
    // If target is at or after windowEndHour IST, snap to next valid business day at window start
    else if (timeFrac >= policy.windowEndHour) {
      const daysToAdd = policy.blockSundays && day === 6 ? 2 : 1; // Skip Sunday if Saturday night
      targetIST.setUTCDate(targetIST.getUTCDate() + daysToAdd);
      const jitterMin = policy.enableJitter ? 15 + Math.floor(Math.random() * 25) : 0;
      targetIST.setUTCHours(windowStartH, windowStartM + jitterMin, 0, 0);
    }

    // If day is Sunday, push to Monday
    if (policy.blockSundays && targetIST.getUTCDay() === 0) {
      targetIST.setUTCDate(targetIST.getUTCDate() + 1);
      const jitterMin = policy.enableJitter ? 20 : 0;
      targetIST.setUTCHours(windowStartH, windowStartM + jitterMin, 0, 0);
    }

    return new Date(targetIST.getTime() - istOffsetMs);
  }

  /**
   * Main Dynamic Scheduler Engine Tick.
   * Can be invoked via Vercel Cron, background setInterval, or Manual Trigger.
   * Supports `dryRun: true` for full sanity testing without consuming telephony credits.
   */
  async runSchedulerTick(options?: { forceIgnoreWindow?: boolean; maxConcurrency?: number; dryRun?: boolean; leadId?: string }) {
    const isDryRun = !!options?.dryRun;
    if (this.isTickRunning) {
      return {
        success: true,
        skipped: true,
        message: 'A scheduler tick is already in progress. Skipping concurrent run.',
      };
    }

    if (!isDryRun) {
      const acquired = await this.acquireDistributedTickLock();
      if (!acquired) {
        return {
          success: true,
          skipped: true,
          message: 'Another scheduler instance holds the distributed tick lock. Skipping.',
        };
      }
    }

    this.isTickRunning = true;
    if (!this.policyLoaded && !isDryRun) {
      await this.loadPolicyFromDb();
    }
    const startTime = Date.now();
    const windowInfo = this.getCallingWindowInfo();

    try {
      // 1. Guard: Check Safe Legal Calling Window
      if (!windowInfo.isOpen && !options?.forceIgnoreWindow) {
        console.log(`[Dynamic Scheduler] Calling window closed (${windowInfo.currentISTTime}, ${windowInfo.dayOfWeek}). Dispatches paused until ${windowInfo.nextWindowStart}.`);
        return {
          success: true,
          skipped: true,
          reason: 'outside_calling_window',
          message: `Consumer calling window is closed (${windowInfo.currentISTTime}). Dispatches pause outside 10:00 AM - 8:30 PM IST.`,
          windowInfo,
          dispatchedCount: 0,
          isDryRun,
        };
      }

      // 1b. Guard: Billing Spend Cap Check (live ticks only)
      if (!isDryRun) {
        const guardrailRow = await prisma.systemSetting.findUnique({ where: { key: 'billing_guardrails' } });
        const guardrails = guardrailRow?.value as { monthlyBudgetCapUsd?: number; enforceHardCap?: boolean } | undefined;
        if (guardrails?.enforceHardCap && typeof guardrails.monthlyBudgetCapUsd === 'number') {
          const currentPeriod = await prisma.billingPeriod.findFirst({ where: { status: 'current' } });
          if (currentPeriod && currentPeriod.estimatedTotalCost >= guardrails.monthlyBudgetCapUsd) {
            return {
              success: true,
              skipped: true,
              reason: 'budget_cap_reached',
              message: `Monthly budget cap ($${guardrails.monthlyBudgetCapUsd}) reached ($${currentPeriod.estimatedTotalCost.toFixed(2)} used). Autonomous dials paused.`,
              windowInfo,
              dispatchedCount: 0,
              isDryRun,
            };
          }
        }
      }

      // 2. Concurrency Check: how many calls are currently 'initiated' in Neon DB
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const activeCallsCount = await prisma.call.count({
        where: {
          status: 'initiated',
          startedAt: { gte: tenMinutesAgo },
        },
      });

      const maxAllowedConcurrency = options?.maxConcurrency || 6;
      const availableCapacity = Math.max(0, maxAllowedConcurrency - activeCallsCount);

      if (availableCapacity <= 0) {
        console.log(`[Dynamic Scheduler] Capacity full (${activeCallsCount} active lines in progress). Throttle engaged.`);
        return {
          success: true,
          skipped: true,
          reason: 'telephony_capacity_full',
          message: `Active calls (${activeCallsCount}) at maximum line capacity (${maxAllowedConcurrency}). Waiting for line clearance.`,
          windowInfo,
          activeCallsCount,
          dispatchedCount: 0,
          isDryRun,
        };
      }

      // 3. Query Due Campaign Leads
      // Leads with a scheduled slot (nextAttemptAt) are due when nextAttemptAt <= now.
      const now = new Date();
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 3600000);

      const dueLeads = await prisma.campaignLead.findMany({
        where: {
          campaign: { status: 'running' },
          attemptCount: { lt: this.policy.maxAttempts },
          status: { in: ['retry_scheduled', 'callback', 'queued', 'untouched', 'failed'] },
          ...(options?.leadId ? { leadId: options.leadId } : {}),
          OR: [
            { nextAttemptAt: { lte: now } },
            { nextAttemptAt: null, status: 'queued' },
            { nextAttemptAt: null, status: 'untouched', attemptCount: 0 },
            { status: 'retry_scheduled', nextAttemptAt: { lte: now } },
            { status: 'callback', nextAttemptAt: { lte: now } },
          ],
        },
        include: {
          lead: true,
          campaign: {
            include: {
              phoneNumber: true,
              agentVersion: true,
            },
          },
        },
        orderBy: [
          { status: 'asc' }, // Prioritize callbacks and retries
          { nextAttemptAt: 'asc' },
        ],
        take: availableCapacity * 2,
      });

      if (dueLeads.length === 0) {
        return {
          success: true,
          skipped: false,
          reason: 'queue_empty',
          message: 'No leads currently due for dynamic dispatch within this time window.',
          windowInfo,
          activeCallsCount,
          dispatchedCount: 0,
          isDryRun,
        };
      }

      // 4. Anti-Fatigue & Interval Window Expiration Filter
      const eligibleLeads = [];
      const skippedLeads: Array<{ campaignLeadId: string; leadName: string; phone: string; reason: string; detail: string; nextAttemptAt?: string }> = [];

      for (const cl of dueLeads) {
        const meta = (cl.lead.metadata as Record<string, any>) || {};

        // 0. DNC Compliance Guard: hard-block any lead marked Do Not Call
        if (cl.lead.doNotCall) {
          if (!isDryRun) {
            await prisma.campaignLead.update({
              where: { id: cl.id },
              data: { status: 'dnc_blocked', nextAttemptAt: null },
            });
          }
          skippedLeads.push({
            campaignLeadId: cl.id,
            leadName: cl.lead.name,
            phone: cl.lead.phone,
            reason: 'do_not_call',
            detail: cl.lead.dncReason || 'Lead is marked Do Not Call (DNC).',
          });
          continue;
        }

        // If lead has a specific window end (e.g. 8:00 PM) and current time has passed it:
        if (meta.scheduledWindowEnd) {
          const windowEnd = new Date(meta.scheduledWindowEnd);
          if (!isNaN(windowEnd.getTime()) && now > windowEnd) {
            // Advance start & end forward by 24h increments until the window is in the future (and skip Sunday if blocked)
            const durationMs = cl.nextAttemptAt
              ? Math.max(3600000, windowEnd.getTime() - cl.nextAttemptAt.getTime())
              : 2 * 3600000;
            let nextStart = new Date(cl.nextAttemptAt ? cl.nextAttemptAt.getTime() : windowEnd.getTime() - durationMs);
            let nextEnd = new Date(nextStart.getTime() + durationMs);
            while (nextEnd <= now) {
              nextStart = new Date(nextStart.getTime() + 24 * 3600000);
              nextEnd = new Date(nextEnd.getTime() + 24 * 3600000);
            }
            const nextStartIST = new Date(nextStart.getTime() + 5.5 * 3600000);
            if (this.policy.blockSundays && nextStartIST.getUTCDay() === 0) {
              nextStart = new Date(nextStart.getTime() + 24 * 3600000);
              nextEnd = new Date(nextEnd.getTime() + 24 * 3600000);
            }
            const rolledIstDate = new Date(nextStart.getTime() + 5.5 * 3600000).toISOString().slice(0, 10);

            if (!isDryRun) {
              await Promise.all([
                prisma.campaignLead.update({
                  where: { id: cl.id },
                  data: { nextAttemptAt: nextStart },
                }),
                prisma.lead.update({
                  where: { id: cl.leadId },
                  data: {
                    metadata: {
                      ...meta,
                      scheduledSlotDate: rolledIstDate,
                      scheduledCallTime: nextStart.toISOString(),
                      scheduledAt: nextStart.toISOString(),
                      scheduledWindowEnd: nextEnd.toISOString(),
                    },
                  },
                }),
              ]);
            }

            skippedLeads.push({
              campaignLeadId: cl.id,
              leadName: cl.lead.name,
              phone: cl.lead.phone,
              reason: 'interval_expired',
              detail: `Window (${meta.scheduledSlotLabel || meta.scheduledWindowEnd}) elapsed; rolled forward to ${rolledIstDate}.`,
              nextAttemptAt: nextStart.toISOString(),
            });
            continue;
          }
        }

        const callsIn24h = await prisma.call.count({
          where: {
            leadId: cl.leadId,
            startedAt: { gte: twentyFourHoursAgo },
          },
        });

        if (callsIn24h >= this.policy.maxCallsPer24Hours) {
          const postponed = this.snapToCallingWindow(new Date(Date.now() + this.policy.postponeHoursOnFatigue * 3600000));
          if (!isDryRun) {
            await prisma.campaignLead.update({
              where: { id: cl.id },
              data: { nextAttemptAt: postponed },
            });
          }
          skippedLeads.push({
            campaignLeadId: cl.id,
            leadName: cl.lead.name,
            phone: cl.lead.phone,
            reason: 'anti_fatigue_cap',
            detail: `Reached ${callsIn24h}/${this.policy.maxCallsPer24Hours} dials in 24h; postponed to ${postponed.toISOString()}.`,
            nextAttemptAt: postponed.toISOString(),
          });
          continue;
        }

        eligibleLeads.push(cl);
        if (eligibleLeads.length >= availableCapacity) break;
      }

      // 5. Dispatch Selected Batch (Real or Dry Run Simulation)
      const sarvamAppId = process.env.SARVAM_APP_ID || 'Conversatio-b063cf10-e735';
      const dispatches: any[] = [];

      for (const cl of eligibleLeads) {
        const campaign = cl.campaign;
        const config = (campaign.agentVersion?.config as any) || {};
        const fromPhone = campaign.phoneNumber?.phoneNumber || process.env.SARVAM_AGENT_PHONE_NUMBER || '+917965480599';
        const meta = (cl.lead.metadata as Record<string, any>) || {};
        const agentVariables = buildLeadAgentVariables(cl.lead);

        if (isDryRun) {
          // DRY RUN MODE: Simulate dispatch validation without telecommunication charges
          dispatches.push({
            campaignLeadId: cl.id,
            leadName: cl.lead.name,
            phone: cl.lead.phone,
            campaignName: campaign.name,
            intervalSlot: meta.scheduledSlotLabel || 'Unconstrained / Immediate',
            slotActive: true,
            scheduledSlotStart: cl.nextAttemptAt?.toISOString() || null,
            scheduledWindowEnd: meta.scheduledWindowEnd || null,
            agentVariables,
            status: 'simulated_dispatched',
            note: 'Sanity test passed: Lead is eligible and within valid calling interval.',
          });
          continue;
        }

        try {
          console.log(`[Dynamic Scheduler] Autonomous dispatch to ${cl.lead.name} (${cl.lead.phone}) for campaign "${campaign.name}"...`);

          const callResult = await backendSarvamProvider.initiateOutboundCall({
            agentVersionId: campaign.agentVersionId,
            sarvamAgentId: config.sarvamAppId || sarvamAppId,
            connectionId: config.sarvamConnectionId || campaign.phoneNumber?.providerId || undefined,
            fromPhoneNumber: fromPhone,
            toPhoneNumber: cl.lead.phone,
            leadId: cl.lead.id,
            campaignId: campaign.id,
            userName: cl.lead.name,
            initialBotMessage: config.firstGreeting || config.openingLine,
            outroMessage: config.closingBehavior || config.outroMessage,
            systemPrompt: config.systemPrompt,
            agentVariables,
          });

          // Create Call record
          const call = await callRepository.createCall({
            externalCallId: callResult.providerCallId,
            campaignId: campaign.id,
            agentId: campaign.agentId,
            agentVersionId: campaign.agentVersionId,
            leadId: cl.lead.id,
            phoneNumberId: campaign.phoneNumberId,
            status: 'initiated' as any,
          });

          const newAttemptCount = cl.attemptCount + 1;
          const nextAttemptAt = this.calculateNextAttempt(newAttemptCount, 'dialed');

          // Update CampaignLead
          await prisma.campaignLead.update({
            where: { id: cl.id },
            data: {
              status: 'calling',
              attemptCount: newAttemptCount,
              lastAttemptAt: new Date(),
              nextAttemptAt,
            },
          });

          await prisma.campaign.update({
            where: { id: campaign.id },
            data: { callsAttempted: { increment: 1 } },
          });

          dispatches.push({
            campaignLeadId: cl.id,
            leadName: cl.lead.name,
            phone: cl.lead.phone,
            campaignName: campaign.name,
            externalCallId: callResult.providerCallId,
            callId: call.id,
            attemptNumber: newAttemptCount,
            intervalSlot: meta.scheduledSlotLabel || null,
            nextCalculatedAttempt: nextAttemptAt?.toISOString() || 'exhausted',
            status: 'dispatched',
          });
        } catch (err: any) {
          console.error(`[Dynamic Scheduler] Error dispatching to ${cl.lead.phone}: ${err?.message}`);
          const newAttemptCount = cl.attemptCount + 1;
          const nextAttemptAt = this.calculateNextAttempt(newAttemptCount, 'carrier_error');

          await prisma.campaignLead.update({
            where: { id: cl.id },
            data: {
              status: newAttemptCount >= this.policy.maxAttempts ? 'exhausted' : 'retry_scheduled',
              attemptCount: newAttemptCount,
              lastAttemptAt: new Date(),
              nextAttemptAt,
            },
          });

          dispatches.push({
            campaignLeadId: cl.id,
            leadName: cl.lead.name,
            phone: cl.lead.phone,
            status: 'failed',
            error: err?.message,
          });
        }
      }

      return {
        success: true,
        message: isDryRun
          ? `Sanity Test / Dry Run Complete: ${dispatches.length} eligible lead(s), ${skippedLeads.length} skipped.`
          : `Dynamic Scheduler dispatched ${dispatches.filter(d => d.status === 'dispatched').length} call(s) autonomously.`,
        durationMs: Date.now() - startTime,
        windowInfo,
        activeCallsCount: activeCallsCount + dispatches.filter(d => d.status === 'dispatched').length,
        dispatchedCount: dispatches.length,
        skippedCount: skippedLeads.length,
        skippedLeads,
        isDryRun,
        dispatches,
      };
    } finally {
      this.isTickRunning = false;
      if (!isDryRun) {
        await this.releaseDistributedTickLock();
      }
    }
  }

  /**
   * Retrieves overall telemetry and queued upcoming dispatches for the UI.
   */
  async getSchedulerStatus() {
    if (!this.policyLoaded) {
      await this.loadPolicyFromDb();
    }
    const windowInfo = this.getCallingWindowInfo();
    const now = new Date();

    const [totalScheduled, dueNow, runningCampaigns, upcomingLeads] = await Promise.all([
      prisma.campaignLead.count({
        where: {
          attemptCount: { lt: this.policy.maxAttempts },
          status: { in: ['retry_scheduled', 'callback', 'queued', 'untouched'] },
        },
      }),
      prisma.campaignLead.count({
        where: {
          attemptCount: { lt: this.policy.maxAttempts },
          campaign: { status: 'running' },
          status: { in: ['retry_scheduled', 'callback', 'queued', 'untouched', 'failed'] },
          OR: [
            { nextAttemptAt: { lte: now } },
            { nextAttemptAt: null, status: 'queued' },
            { nextAttemptAt: null, status: 'untouched', attemptCount: 0 },
          ],
        },
      }),
      prisma.campaign.count({ where: { status: 'running' } }),
      prisma.campaignLead.findMany({
        where: {
          attemptCount: { lt: this.policy.maxAttempts },
          status: { in: ['retry_scheduled', 'callback', 'queued', 'untouched'] },
        },
        include: {
          lead: true,
          campaign: true,
        },
        orderBy: [
          { nextAttemptAt: 'asc' },
          { lastAttemptAt: 'desc' },
        ],
        take: 20,
      }),
    ]);

    return {
      windowInfo,
      cadencePolicy: this.getPolicy(),
      cadencePresets: CADENCE_PRESETS,
      runningCampaigns,
      totalScheduledInCadence: totalScheduled,
      dueNowForDialing: dueNow,
      schedulerEngine: 'Active (Autonomous Polling & Event-Driven)',
      upcomingSchedule: upcomingLeads.map(cl => ({
        campaignLeadId: cl.id,
        leadName: cl.lead.name,
        phone: cl.lead.phone,
        campaignName: cl.campaign?.name || 'Direct Outreach',
        attemptCount: cl.attemptCount,
        maxAttempts: this.policy.maxAttempts,
        status: cl.status,
        nextAttemptAt: cl.nextAttemptAt?.toISOString() || null,
        intervalSlot: (cl.lead.metadata as any)?.scheduledSlotLabel || null,
        isDue: cl.nextAttemptAt ? cl.nextAttemptAt <= now : true,
        isWindowActive: (cl.nextAttemptAt && cl.nextAttemptAt <= now) && (!(cl.lead.metadata as any)?.scheduledWindowEnd || now <= new Date((cl.lead.metadata as any)?.scheduledWindowEnd)),
        cadenceTier:
          cl.attemptCount === 0
            ? 'Tier 1: Initial Dispatch'
            : cl.attemptCount === 1
            ? `Tier 2: ${this.policy.tier2DelayHours}h Backoff + Jitter`
            : `Tier 3: ${this.policy.tier3DelayHours}h Spaced Window`,
      })),
    };
  }

  /**
   * Reschedules an individual lead to a specific target time,
   * automatically snapped to valid calling hours.
   */
  async rescheduleLead(campaignLeadId: string, customTarget: Date | string) {
    const targetDate = new Date(customTarget);
    if (isNaN(targetDate.getTime())) {
      throw new Error('Invalid reschedule target date/time provided');
    }

    const snapped = this.snapToCallingWindow(targetDate);
    const existingCl = await prisma.campaignLead.findUnique({
      where: { id: campaignLeadId },
      include: { lead: true },
    });
    if (!existingCl) {
      throw new Error(`CampaignLead ${campaignLeadId} not found`);
    }

    const updatedMeta = {
      ...((existingCl.lead?.metadata as Record<string, any>) || {}),
      scheduledCallTime: snapped.toISOString(),
      scheduledWindowEnd: null,
      scheduledSlotLabel: null,
      scheduledTimezone: 'Asia/Kolkata',
    };

    const [, updated] = await prisma.$transaction([
      prisma.lead.update({
        where: { id: existingCl.leadId },
        data: { metadata: updatedMeta },
      }),
      prisma.campaignLead.update({
        where: { id: campaignLeadId },
        data: {
          nextAttemptAt: snapped,
          status: 'retry_scheduled',
        },
        include: {
          lead: true,
          campaign: true,
        },
      }),
    ]);

    return {
      campaignLeadId: updated.id,
      leadName: updated.lead.name,
      phone: updated.lead.phone,
      campaignName: updated.campaign.name,
      newNextAttemptAt: snapped.toISOString(),
      status: updated.status,
    };
  }
}

export const callSchedulerService = new CallSchedulerService();

