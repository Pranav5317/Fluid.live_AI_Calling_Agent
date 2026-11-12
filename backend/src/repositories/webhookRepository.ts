import prisma from '../lib/prisma';
import { WebhookEvent } from '../../../packages/contracts/types';
import { WebhookProcessingResult } from '../contracts/apiContracts';
import { backendSarvamProvider } from '../services/sarvamProvider';
import { callSchedulerService } from '../services/callSchedulerService';

export class WebhookRepository {
  async getWebhookEvents(): Promise<WebhookEvent[]> {
    const list = await prisma.webhookEvent.findMany({
      orderBy: { receivedAt: 'desc' },
    });
    return list.map(e => ({
      id: e.id,
      provider: e.provider as any,
      eventType: e.eventType,
      externalId: e.externalId,
      payload: (e.payload as Record<string, any>) || {},
      status: e.status as any,
      receivedAt: e.receivedAt.toISOString(),
      error: e.error || undefined,
    }));
  }

  async processSarvamWebhook(payload: Record<string, any>): Promise<WebhookProcessingResult> {
    const norm = backendSarvamProvider.normalizeWebhookPayload(payload);
    const receivedAt = new Date();
    const dbEventId = `wh_evt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // 1. Webhook Event Idempotency Check on providerEventId
    const existingEvent = await prisma.webhookEvent.findFirst({
      where: { externalId: norm.providerEventId, status: 'processed' },
    });

    if (existingEvent) {
      // Record duplicate delivery attempt log without modifying domain entities
      await prisma.webhookEvent.create({
        data: {
          id: dbEventId,
          provider: 'sarvam',
          eventType: norm.eventType,
          externalId: `dup_${norm.providerEventId}_${Date.now()}`,
          payload: payload as any,
          status: 'processed',
          receivedAt,
        },
      });

      return {
        receivedEventId: dbEventId,
        externalId: norm.providerEventId,
        status: 'duplicate_ignored',
        processedAt: receivedAt.toISOString(),
      };
    }

    // 2. Execute Atomic Webhook Transaction
    return await prisma.$transaction(async (tx) => {
      // Persist raw WebhookEvent
      await tx.webhookEvent.create({
        data: {
          id: dbEventId,
          provider: 'sarvam',
          eventType: norm.eventType,
          externalId: norm.providerEventId,
          payload: payload as any,
          status: 'processed',
          receivedAt,
          processedAt: receivedAt,
        },
      });

      let sideEffectContext: {
        callId: string;
        leadId: string;
        campaignId: string | null;
        status: string;
        outcome?: string;
        extractedVariables: Record<string, any>;
      } | null = null;
      const extracted = (norm.extractedVariables || {}) as Record<string, any>;

      // Handle Call Lifecycle Correlation if externalCallId is present
      if (norm.externalCallId && norm.canonicalStatus !== 'unknown') {
        const firstAgent = await tx.agent.findFirst();
        const firstLead = await tx.lead.findFirst();
        const firstPhone = await tx.phoneNumber.findFirst();

        const agentId = norm.agentId || firstAgent?.id || 'ag_default';
        const agentVersionId = norm.agentVersionId || firstAgent?.currentVersionId || 'agv_default';
        const leadId = norm.leadId || firstLead?.id || 'lead_default';
        const phoneNumberId = firstPhone?.id || 'phone_default';
        const campaignId = norm.campaignId || null;

        let existingCall = await tx.call.findUnique({
          where: { externalCallId: norm.externalCallId },
        });

        if (!existingCall) {
          // Create Call record if first time seen
          existingCall = await tx.call.create({
            data: {
              id: `call_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
              externalCallId: norm.externalCallId,
              campaignId,
              agentId,
              agentVersionId,
              leadId,
              phoneNumberId,
              status: norm.canonicalStatus,
              outcome: norm.outcome || (norm.canonicalStatus === 'completed' ? 'successful_contact' : 'unreachable'),
              durationSeconds: norm.durationSeconds || 0,
              startedAt: new Date(Date.now() - (norm.durationSeconds || 0) * 1000),
              endedAt: norm.canonicalStatus === 'completed' || norm.canonicalStatus === 'failed' ? receivedAt : null,
              transcript: (norm.transcript as any) || [
                { id: 't1', speaker: 'agent', text: 'Hello, calling on behalf of Fluid.Live.', timestampSeconds: 2 },
                { id: 't2', speaker: 'lead', text: 'Thank you.', timestampSeconds: 8 },
              ],
              extractedVariables: (norm.extractedVariables as any) || {},
            },
          });
        } else {
          // Update Call record status and metrics
          existingCall = await tx.call.update({
            where: { id: existingCall.id },
            data: {
              status: norm.canonicalStatus,
              ...(norm.outcome ? { outcome: norm.outcome } : {}),
              ...(norm.durationSeconds ? { durationSeconds: norm.durationSeconds } : {}),
              ...(norm.canonicalStatus === 'completed' || norm.canonicalStatus === 'failed' ? { endedAt: receivedAt } : {}),
              ...(norm.transcript ? { transcript: norm.transcript as any } : {}),
              ...(norm.extractedVariables ? { extractedVariables: norm.extractedVariables as any } : {}),
            },
          });
        }

        // Create UsageEvent if call completed and no UsageEvent exists yet for this call
        if ((norm.canonicalStatus === 'completed' || norm.canonicalStatus === 'in-progress') && norm.durationSeconds! > 0) {
          const existingUsage = await tx.usageEvent.findFirst({
            where: { callId: existingCall.id },
          });

          if (!existingUsage) {
            const usageId = `usg_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            const durationMinutes = Number(((norm.durationSeconds || 0) / 60).toFixed(2));

            const newUsage = await tx.usageEvent.create({
              data: {
                id: usageId,
                callId: existingCall.id,
                campaignId,
                agentId: existingCall.agentId,
                durationMinutes,
                providerCostUnits: norm.providerCostUnits || Number((durationMinutes * 0.05).toFixed(3)),
                platformCostUnits: norm.platformCostUnits || Number((durationMinutes * 0.08).toFixed(3)),
                timestamp: receivedAt,
              },
            });

            // Link usage event to call
            await tx.call.update({
              where: { id: existingCall.id },
              data: { usageEventId: newUsage.id },
            });
          }
        }

        // Update Campaign & CampaignLead if this call belongs to a Campaign
        if (campaignId) {
          await tx.campaign.update({
            where: { id: campaignId },
            data: {
              callsAttempted: { increment: 1 },
              ...(norm.canonicalStatus === 'completed' ? { completedCalls: { increment: 1 } } : {}),
              minutesUsed: { increment: Number(((norm.durationSeconds || 0) / 60).toFixed(2)) },
            },
          });

          const cmpLead = await tx.campaignLead.findUnique({
            where: { campaignId_leadId: { campaignId, leadId: existingCall.leadId } },
          });

          if (cmpLead) {
            const newAttemptCount = cmpLead.attemptCount + 1;
            const isCompleted = norm.canonicalStatus === 'completed' && norm.outcome !== 'unreachable';
            const requestedCallback = (norm.extractedVariables as any)?.callback_time;

            let nextStatus = isCompleted ? 'completed' : 'retry_scheduled';
            let nextAttemptAt: Date | null = null;

            if (requestedCallback) {
              nextStatus = 'callback';
              nextAttemptAt = callSchedulerService.snapToCallingWindow(new Date(requestedCallback));
            } else if (!isCompleted) {
              if (newAttemptCount >= callSchedulerService.getPolicy().maxAttempts) {
                nextStatus = 'exhausted';
                nextAttemptAt = null;
              } else {
                nextAttemptAt = callSchedulerService.calculateNextAttempt(newAttemptCount, norm.outcome || 'unreachable');
              }
            }

            await tx.campaignLead.update({
              where: { id: cmpLead.id },
              data: {
                status: nextStatus,
                attemptCount: newAttemptCount,
                lastAttemptAt: receivedAt,
                nextAttemptAt,
                ...(isCompleted ? { completedAt: receivedAt } : {}),
              },
            });
          }
        }
        if (existingCall) {
          sideEffectContext = {
            callId: existingCall.id,
            leadId: existingCall.leadId,
            campaignId,
            status: norm.canonicalStatus,
            outcome: norm.outcome,
            extractedVariables: extracted,
          };

          if (extracted.do_not_call === true || extracted.opt_out === true) {
            await tx.lead.update({
              where: { id: existingCall.leadId },
              data: {
                doNotCall: true,
                dncReason: 'Candidate opted out during AI screening call',
                dncUpdatedAt: receivedAt,
              },
            });
            await tx.campaignLead.updateMany({
              where: { leadId: existingCall.leadId },
              data: { status: 'dnc_blocked', nextAttemptAt: null },
            });
          }
        }
      }

      return {
        receivedEventId: dbEventId,
        externalId: norm.providerEventId,
        status: 'processed',
        processedAt: receivedAt.toISOString(),
        _sideEffectContext: sideEffectContext,
      } as any;
    }).then(async (txResult: any) => {
      const ctx = txResult._sideEffectContext;
      delete txResult._sideEffectContext;
      if (!ctx) return txResult;

      // Fire non-blocking outbound hooks (ATS sync, WhatsApp callback invite, Calendar booking)
      await this.dispatchPostCallWebhooks(ctx);
      return txResult as WebhookProcessingResult;
    });
  }

  private async dispatchPostCallWebhooks(ctx: {
    callId: string;
    leadId: string;
    campaignId: string | null;
    status: string;
    outcome?: string;
    extractedVariables: Record<string, any>;
  }) {
    const lead = await prisma.lead.findUnique({ where: { id: ctx.leadId } });
    if (!lead) return;

    const dispatch = async (provider: string, url: string | undefined, eventType: string, body: Record<string, any>) => {
      if (!url) return;
      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }
      } catch (err: any) {
        await prisma.webhookEvent.create({
          data: {
            provider,
            eventType,
            externalId: `dlq_${provider}_${ctx.callId}_${Date.now()}`,
            payload: body as any,
            status: 'failed',
            error: err?.message || 'Outbound webhook delivery failed',
            receivedAt: new Date(),
          },
        });
      }
    };

    await dispatch(
      'ats_outbound',
      process.env.ATS_WEBHOOK_URL,
      'screening.completed',
      {
        event: 'screening.completed',
        callId: ctx.callId,
        campaignId: ctx.campaignId,
        lead: { id: lead.id, name: lead.name, phone: lead.phone, email: lead.email },
        status: ctx.status,
        outcome: ctx.outcome,
        extractedVariables: ctx.extractedVariables,
      }
    );

    if (ctx.outcome === 'unreachable' || ctx.status === 'busy' || ctx.status === 'no_answer') {
      await dispatch(
        'whatsapp_callback',
        process.env.WHATSAPP_WEBHOOK_URL,
        'callback.invite_requested',
        {
          event: 'callback.invite_requested',
          leadId: lead.id,
          name: lead.name,
          phone: lead.phone,
          callbackEndpoint: '/api/integrations/callback-slot',
          availablePresets: ['morning_10_12', 'midday_12_2', 'afternoon_2_4', 'late_afternoon_4_6', 'evening_6_8'],
        }
      );
    }

    if (ctx.extractedVariables?.screening_status === 'passed') {
      await dispatch(
        'calendar_booking',
        process.env.CALENDAR_BOOKING_WEBHOOK_URL,
        'interview.ready_to_book',
        {
          event: 'interview.ready_to_book',
          leadId: lead.id,
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          role: ctx.extractedVariables?.applied_role || (lead.metadata as any)?.applied_role,
        }
      );
    }
  }

  async reprocessEvent(eventId: string): Promise<WebhookEvent> {
    const existing = await prisma.webhookEvent.findUnique({ where: { id: eventId } });
    if (!existing) {
      throw new Error(`Webhook event not found: ${eventId}`);
    }

    if (existing.externalId?.startsWith('dlq_')) {
      const targetUrlMap: Record<string, string | undefined> = {
        ats_outbound: process.env.ATS_WEBHOOK_URL,
        whatsapp_callback: process.env.WHATSAPP_WEBHOOK_URL,
        calendar_booking: process.env.CALENDAR_BOOKING_WEBHOOK_URL,
      };
      const targetUrl = targetUrlMap[existing.eventType];
      if (!targetUrl) {
        const msg = `Target webhook URL for '${existing.eventType}' is not configured in environment variables`;
        await prisma.webhookEvent.update({ where: { id: eventId }, data: { status: 'failed', error: msg } });
        throw new Error(msg);
      }

      const resp = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(existing.payload || {}),
      });
      if (!resp.ok) {
        const msg = `Retry failed with HTTP ${resp.status}`;
        await prisma.webhookEvent.update({ where: { id: eventId }, data: { status: 'failed', error: msg } });
        throw new Error(msg);
      }
    } else if (existing.provider === 'sarvam') {
      await this.processSarvamWebhook((existing.payload as Record<string, any>) || {});
    }

    const updated = await prisma.webhookEvent.update({
      where: { id: eventId },
      data: {
        status: 'processed',
        error: null,
        receivedAt: new Date(),
      },
    });

    return {
      id: updated.id,
      provider: updated.provider as any,
      eventType: updated.eventType,
      externalId: updated.externalId,
      payload: (updated.payload as Record<string, any>) || {},
      status: updated.status as any,
      receivedAt: updated.receivedAt.toISOString(),
    };
  }
}

export const webhookRepository = new WebhookRepository();
