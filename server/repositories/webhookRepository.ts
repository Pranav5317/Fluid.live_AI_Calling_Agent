import prisma from '../lib/prisma';
import { WebhookEvent } from '../../src/types';
import { WebhookProcessingResult } from '../contracts/apiContracts';
import { backendSarvamProvider } from '../services/sarvamProvider';

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
            await tx.campaignLead.update({
              where: { id: cmpLead.id },
              data: {
                status: norm.canonicalStatus === 'completed' ? 'completed' : 'failed',
                attemptCount: { increment: 1 },
                lastAttemptAt: receivedAt,
              },
            });
          }
        }
      }

      return {
        receivedEventId: dbEventId,
        externalId: norm.providerEventId,
        status: 'processed',
        processedAt: receivedAt.toISOString(),
      };
    });
  }

  async reprocessEvent(eventId: string): Promise<WebhookEvent> {
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
