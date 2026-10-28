import prisma from '../lib/prisma';
import { backendSarvamProvider } from './sarvamProvider';
import { callRepository } from '../repositories/callRepository';
import { campaignRepository } from '../repositories/campaignRepository';

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
    windowEndHour: 19.5,
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
    windowEndHour: 20.0,
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
    windowEndHour: 18.5,
    blockSundays: true,
  },
};

export class CallSchedulerService {
  private policy: RetryPolicyConfig = { ...CADENCE_PRESETS.standard };

  getPolicy(): RetryPolicyConfig {
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
  private isTickRunning = false;

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
      windowRules: `Calling Window: ${windowStartHour}:00 - ${windowEndHour}:00 IST (${this.policy.blockSundays ? 'Mon-Sat' : 'Mon-Sun'}) [Preset: ${this.policy.presetName}]`,
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

    // If target is earlier than 10:00 AM IST today, snap to 10:15 AM
    if (timeFrac < policy.windowStartHour) {
      const jitterMin = 5 + Math.floor(Math.random() * 20); // 10:05 - 10:25 AM
      targetIST.setUTCHours(10, jitterMin, 0, 0);
    }
    // If target is after 7:30 PM (19.5) IST, snap to next business day at 10:30 AM
    else if (timeFrac >= policy.windowEndHour) {
      const daysToAdd = day === 6 ? 2 : 1; // Skip Sunday if Saturday night
      targetIST.setUTCDate(targetIST.getUTCDate() + daysToAdd);
      const jitterMin = 15 + Math.floor(Math.random() * 25); // 10:15 - 10:40 AM
      targetIST.setUTCHours(10, jitterMin, 0, 0);
    }

    // If day is Sunday, push to Monday
    if (policy.blockSundays && targetIST.getUTCDay() === 0) {
      targetIST.setUTCDate(targetIST.getUTCDate() + 1);
      targetIST.setUTCHours(10, 20, 0, 0);
    }

    return new Date(targetIST.getTime() - istOffsetMs);
  }

  /**
   * Main Dynamic Scheduler Engine Tick.
   * Can be invoked via Vercel Cron, background setInterval, or Manual Trigger.
   */
  async runSchedulerTick(options?: { forceIgnoreWindow?: boolean; maxConcurrency?: number }) {
    if (this.isTickRunning) {
      return {
        success: true,
        skipped: true,
        message: 'A scheduler tick is already in progress. Skipping concurrent run.',
      };
    }

    this.isTickRunning = true;
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
          message: `Consumer calling window is closed (${windowInfo.currentISTTime}). Dispatches pause outside 10:00 AM - 7:30 PM IST.`,
          windowInfo,
          dispatchedCount: 0,
        };
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
        };
      }

      // 3. Query Due Campaign Leads
      // Filter leads where:
      // - status in ('retry_scheduled', 'callback', 'queued', 'untouched')
      // - attemptCount < 3
      // - (nextAttemptAt <= now OR (attemptCount == 0 AND campaign is running))
      const now = new Date();
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 3600000);

      const dueLeads = await prisma.campaignLead.findMany({
        where: {
          campaign: { status: 'running' },
          attemptCount: { lt: this.policy.maxAttempts },
          status: { in: ['retry_scheduled', 'callback', 'queued', 'untouched', 'failed'] },
          OR: [
            { nextAttemptAt: { lte: now } },
            { status: 'queued' },
            { status: 'untouched', attemptCount: 0 },
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
          message: 'No leads currently due for dynamic dispatch.',
          windowInfo,
          activeCallsCount,
          dispatchedCount: 0,
        };
      }

      // 4. Anti-Fatigue Filter: Disallow more than 2 calls to the same lead within 24 hours
      const eligibleLeads = [];
      for (const cl of dueLeads) {
        const callsIn24h = await prisma.call.count({
          where: {
            leadId: cl.leadId,
            startedAt: { gte: twentyFourHoursAgo },
          },
        });

        if (callsIn24h >= this.policy.maxCallsPer24Hours) {
          // Delay this lead to avoid consumer fatigue
          const postponed = this.snapToCallingWindow(new Date(Date.now() + this.policy.postponeHoursOnFatigue * 3600000));
          await prisma.campaignLead.update({
            where: { id: cl.id },
            data: { nextAttemptAt: postponed },
          });
          console.log(`[Dynamic Scheduler] Lead ${cl.lead.phone} reached ${callsIn24h} dials in 24h. Postponing to ${postponed.toISOString()}`);
          continue;
        }

        eligibleLeads.push(cl);
        if (eligibleLeads.length >= availableCapacity) break;
      }

      // 5. Dispatch Selected Batch
      const sarvamAppId = process.env.SARVAM_APP_ID || 'Conversatio-b063cf10-e735';
      const dispatches: any[] = [];

      for (const cl of eligibleLeads) {
        const campaign = cl.campaign;
        const config = (campaign.agentVersion?.config as any) || {};
        const fromPhone = campaign.phoneNumber?.phoneNumber || process.env.SARVAM_AGENT_PHONE_NUMBER || '+917965480599';

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
        message: `Dynamic Scheduler dispatched ${dispatches.filter(d => d.status === 'dispatched').length} call(s) autonomously.`,
        durationMs: Date.now() - startTime,
        windowInfo,
        activeCallsCount: activeCallsCount + dispatches.filter(d => d.status === 'dispatched').length,
        dispatchedCount: dispatches.filter(d => d.status === 'dispatched').length,
        dispatches,
      };
    } finally {
      this.isTickRunning = false;
    }
  }

  /**
   * Retrieves overall telemetry and queued upcoming dispatches for the UI.
   */
  async getSchedulerStatus() {
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
            { status: 'queued' },
            { status: 'untouched', attemptCount: 0 },
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
        isDue: cl.nextAttemptAt ? cl.nextAttemptAt <= now : true,
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
    const updated = await prisma.campaignLead.update({
      where: { id: campaignLeadId },
      data: {
        nextAttemptAt: snapped,
        status: 'retry_scheduled',
      },
      include: {
        lead: true,
        campaign: true,
      },
    });

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

