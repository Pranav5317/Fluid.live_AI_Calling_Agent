import prisma from '../lib/prisma';
import { WebhookEvent } from '../../src/types';
import { SarvamWebhookPayload, WebhookProcessingResult } from '../contracts/apiContracts';

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

  async processSarvamWebhook(payload: SarvamWebhookPayload): Promise<WebhookProcessingResult> {
    const interactionId = payload.interactionId || `srv_evt_${Date.now()}`;
    const receivedAt = new Date();
    const eventId = `wh_evt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // 1. Idempotency Check on PostgreSQL externalId (Sarvam interactionId)
    const existingProcessedEvent = await prisma.webhookEvent.findFirst({
      where: { externalId: interactionId, status: 'processed' },
    });

    if (existingProcessedEvent) {
      // Duplicate delivery detected; record log without duplicating Call or UsageEvent
      await prisma.webhookEvent.create({
        data: {
          id: eventId,
          provider: 'sarvam',
          eventType: payload.eventType,
          externalId: `dup_${interactionId}_${Date.now()}`,
          payload: payload as any,
          status: 'processed',
          receivedAt,
        },
      });

      return {
        receivedEventId: eventId,
        externalId: interactionId,
        status: 'duplicate_ignored',
        processedAt: receivedAt.toISOString(),
      };
    }

    // 2. Execute Atomic Webhook Transaction
    return await prisma.$transaction(async (tx) => {
      // Persist raw WebhookEvent
      await tx.webhookEvent.create({
        data: {
          id: eventId,
          provider: 'sarvam',
          eventType: payload.eventType,
          externalId: interactionId,
          payload: payload as any,
          status: 'processed',
          receivedAt,
          processedAt: receivedAt,
        },
      });

      if (payload.eventType === 'call.completed' || payload.eventType === 'call.failed') {
        const callId = payload.callId || `call_${Date.now()}`;
        const duration = payload.durationSeconds || 120;
        const durationMinutes = Number((duration / 60).toFixed(2));

        // Get or fallback IDs
        const firstCmp = await tx.campaign.findFirst();
        const firstAgent = await tx.agent.findFirst();
        const firstLead = await tx.lead.findFirst();
        const firstPhone = await tx.phoneNumber.findFirst();

        const campaignId = payload.campaignId || firstCmp?.id || 'cmp_csat_q3';
        const agentId = payload.agentId || firstAgent?.id || 'ag_csat_01';
        const agentVersionId = payload.agentVersionId || firstCmp?.agentVersionId || 'agv_csat_v2';
        const leadId = firstLead?.id || 'lead_101';
        const phoneNumberId = firstPhone?.id || 'phone_01';
        const usageId = `usg_${Date.now()}`;

        // Create UsageEvent first
        await tx.usageEvent.create({
          data: {
            id: usageId,
            campaignId,
            agentId,
            durationMinutes,
            providerCostUnits: payload.providerCostUnits || Number((durationMinutes * 0.05).toFixed(3)),
            platformCostUnits: payload.platformCostUnits || Number((durationMinutes * 0.08).toFixed(3)),
            timestamp: receivedAt,
          },
        });

        // Create Call record
        await tx.call.create({
          data: {
            id: callId,
            externalCallId: interactionId,
            campaignId,
            agentId,
            agentVersionId,
            leadId,
            phoneNumberId,
            status: payload.eventType === 'call.completed' ? 'completed' : 'failed',
            outcome: (payload.outcome as any) || (payload.eventType === 'call.completed' ? 'successful_contact' : 'unreachable'),
            durationSeconds: duration,
            startedAt: new Date(Date.now() - duration * 1000),
            endedAt: receivedAt,
            transcript: payload.transcript || [
              { id: 't1', speaker: 'agent', text: 'Hello, calling on behalf of Apex Enterprises.', timestampSeconds: 2 },
              { id: 't2', speaker: 'lead', text: 'Thank you for following up.', timestampSeconds: 12 },
            ],
            extractedVariables: payload.extractedVariables || { satisfaction_rating: 5 },
            usageEventId: usageId,
          },
        });

        // Update Campaign counters
        await tx.campaign.update({
          where: { id: campaignId },
          data: {
            callsAttempted: { increment: 1 },
            ...(payload.eventType === 'call.completed' ? { completedCalls: { increment: 1 } } : {}),
            minutesUsed: { increment: durationMinutes },
          },
        });

        // Update CampaignLead membership
        const cmpLead = await tx.campaignLead.findUnique({
          where: { campaignId_leadId: { campaignId, leadId } },
        });

        if (cmpLead) {
          await tx.campaignLead.update({
            where: { id: cmpLead.id },
            data: {
              status: payload.eventType === 'call.completed' ? 'completed' : 'failed',
              attemptCount: { increment: 1 },
              lastAttemptAt: receivedAt,
            },
          });
        }
      }

      return {
        receivedEventId: eventId,
        externalId: interactionId,
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

