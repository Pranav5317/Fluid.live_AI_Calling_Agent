import prisma from '../lib/prisma';
import { Call, CallStatus, CallOutcome } from '../../src/types';

export interface CallFilterParams {
  search?: string;
  status?: string;
  outcome?: string;
  campaignId?: string;
  agentId?: string;
}

export class CallRepository {
  async getCalls(options: CallFilterParams = {}): Promise<Call[]> {
    const where: any = {};
    if (options.status && options.status !== 'all') {
      where.status = options.status;
    }
    if (options.outcome && options.outcome !== 'all') {
      where.outcome = options.outcome;
    }
    if (options.campaignId && options.campaignId !== 'all') {
      where.campaignId = options.campaignId;
    }
    if (options.agentId && options.agentId !== 'all') {
      where.agentId = options.agentId;
    }

    if (options.search?.trim()) {
      const q = options.search.trim().toLowerCase();
      where.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { externalCallId: { contains: q, mode: 'insensitive' } },
        { leadId: { contains: q, mode: 'insensitive' } },
      ];
    }

    const list = await prisma.call.findMany({
      where,
      orderBy: { startedAt: 'desc' },
    });

    return list.map(c => ({
      id: c.id,
      externalCallId: c.externalCallId,
      campaignId: c.campaignId,
      agentId: c.agentId,
      agentVersionId: c.agentVersionId,
      leadId: c.leadId,
      phoneNumberId: c.phoneNumberId,
      status: c.status as CallStatus,
      outcome: c.outcome as CallOutcome,
      durationSeconds: c.durationSeconds,
      startedAt: c.startedAt.toISOString(),
      endedAt: c.endedAt ? c.endedAt.toISOString() : undefined,
      transcript: (c.transcript as any) || [],
      extractedVariables: (c.extractedVariables as any) || {},
      usageEventId: c.usageEventId || undefined,
    }));
  }

  async getCallById(id: string): Promise<Call | null> {
    const c = await prisma.call.findUnique({ where: { id } });
    if (!c) return null;
    return {
      id: c.id,
      externalCallId: c.externalCallId,
      campaignId: c.campaignId || undefined,
      agentId: c.agentId,
      agentVersionId: c.agentVersionId,
      leadId: c.leadId,
      phoneNumberId: c.phoneNumberId,
      status: c.status as CallStatus,
      outcome: c.outcome as CallOutcome,
      durationSeconds: c.durationSeconds,
      startedAt: c.startedAt.toISOString(),
      endedAt: c.endedAt ? c.endedAt.toISOString() : undefined,
      transcript: (c.transcript as any) || [],
      extractedVariables: (c.extractedVariables as any) || {},
      usageEventId: c.usageEventId || undefined,
    };
  }

  async createCall(data: {
    externalCallId: string;
    campaignId?: string | null;
    agentId: string;
    agentVersionId: string;
    leadId: string;
    phoneNumberId: string;
    status: CallStatus;
    outcome?: CallOutcome;
  }): Promise<Call> {
    const created = await prisma.call.upsert({
      where: { externalCallId: data.externalCallId },
      create: {
        id: `call_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        externalCallId: data.externalCallId,
        campaignId: data.campaignId || null,
        agentId: data.agentId,
        agentVersionId: data.agentVersionId,
        leadId: data.leadId,
        phoneNumberId: data.phoneNumberId,
        status: data.status,
        outcome: data.outcome || 'successful_contact',
        durationSeconds: 0,
        startedAt: new Date(),
      },
      update: {
        agentId: data.agentId,
        agentVersionId: data.agentVersionId,
        leadId: data.leadId,
        phoneNumberId: data.phoneNumberId,
        ...(data.campaignId !== undefined ? { campaignId: data.campaignId } : {}),
      },
    });

    return {
      id: created.id,
      externalCallId: created.externalCallId,
      campaignId: created.campaignId || undefined,
      agentId: created.agentId,
      agentVersionId: created.agentVersionId,
      leadId: created.leadId,
      phoneNumberId: created.phoneNumberId,
      status: created.status as CallStatus,
      outcome: created.outcome as CallOutcome,
      durationSeconds: created.durationSeconds,
      startedAt: created.startedAt.toISOString(),
      transcript: [],
      extractedVariables: {},
    };
  }
}

export const callRepository = new CallRepository();

