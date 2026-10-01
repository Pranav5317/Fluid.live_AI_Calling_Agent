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
    };
  }
}

export const callRepository = new CallRepository();

