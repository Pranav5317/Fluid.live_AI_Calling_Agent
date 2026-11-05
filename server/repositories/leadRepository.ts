import prisma from '../lib/prisma';
import { Lead, CampaignLead, CampaignLeadStatus } from '../../src/types';
import { callAnalyticsService } from '../services/callAnalyticsService';

export class LeadRepository {
  async getAllLeadsRaw(): Promise<Lead[]> {
    const list = await prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return list.map(l => ({
      id: l.id,
      name: l.name,
      phone: l.phone,
      email: l.email || undefined,
      metadata: (l.metadata as Record<string, any>) || {},
      createdAt: l.createdAt.toISOString(),
    }));
  }

  async getLeads(options: { search?: string; status?: string; campaignId?: string; page?: number; pageSize?: number }) {
    const page = options.page || 1;
    const pageSize = options.pageSize || 10;
    const search = options.search?.trim().toLowerCase();
    const campaignId = options.campaignId;
    const status = options.status;

    // Build Prisma query condition
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (campaignId && campaignId !== 'all') {
      where.campaignLeads = {
        some: {
          campaignId: campaignId,
          ...(status && status !== 'all' ? { status: status } : {}),
        },
      };
    } else if (status && status !== 'all') {
      if (status === 'untouched') {
        where.OR = [
          { campaignLeads: { none: {} } },
          { campaignLeads: { some: { status: 'untouched' } } },
        ];
      } else {
        where.campaignLeads = { some: { status: status } };
      }
    }

    const [total, rawItems] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        include: { campaignLeads: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const untouchedTotal = await prisma.lead.count({
      where: {
        OR: [
          { campaignLeads: { none: {} } },
          { campaignLeads: { some: { status: 'untouched' } } },
        ],
      },
    });

    const items = rawItems.map(l => {
      const allMemberships: CampaignLead[] = l.campaignLeads.map(cl => ({
        id: cl.id,
        campaignId: cl.campaignId,
        leadId: cl.leadId,
        status: cl.status as CampaignLeadStatus,
        attemptCount: cl.attemptCount,
        lastAttemptAt: cl.lastAttemptAt ? cl.lastAttemptAt.toISOString() : undefined,
        nextAttemptAt: cl.nextAttemptAt ? cl.nextAttemptAt.toISOString() : undefined,
      }));

      const activeMembership = campaignId && campaignId !== 'all'
        ? allMemberships.find(cl => cl.campaignId === campaignId)
        : allMemberships[0];

      return {
        lead: {
          id: l.id,
          name: l.name,
          phone: l.phone,
          email: l.email || undefined,
          metadata: (l.metadata as Record<string, any>) || {},
          createdAt: l.createdAt.toISOString(),
        },
        campaignLead: activeMembership,
        allCampaignLeads: allMemberships,
      };
    });

    const totalPages = Math.ceil(total / pageSize) || 1;

    return {
      items,
      total,
      untouchedTotal,
      page,
      pageSize,
      totalPages,
    };
  }

  async getLeadById(id: string): Promise<Lead | null> {
    const l = await prisma.lead.findUnique({ where: { id } });
    if (!l) return null;
    return {
      id: l.id,
      name: l.name,
      phone: l.phone,
      email: l.email || undefined,
      metadata: (l.metadata as Record<string, any>) || {},
      createdAt: l.createdAt.toISOString(),
    };
  }

  async updateLead(id: string, updates: Partial<Lead>): Promise<Lead> {
    const current = await prisma.lead.findUnique({ where: { id } });
    if (!current) throw new Error(`Lead not found: ${id}`);

    const newMetadata = updates.metadata !== undefined
      ? { ...((current.metadata as Record<string, any>) || {}), ...updates.metadata }
      : (current.metadata as Record<string, any>) || {};

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        name: updates.name !== undefined ? updates.name : current.name,
        phone: updates.phone !== undefined ? updates.phone : current.phone,
        email: updates.email !== undefined ? updates.email : current.email,
        metadata: newMetadata,
      },
    });

    // If scheduledCallTime or scheduledAt was provided, sync to campaignLead queue
    const scheduledTime = updates.metadata?.scheduledCallTime || updates.metadata?.scheduledAt;
    if (scheduledTime) {
      try {
        await prisma.campaignLead.updateMany({
          where: { leadId: id },
          data: {
            nextAttemptAt: new Date(scheduledTime),
            status: 'retry_scheduled',
          },
        });
      } catch (err: any) {
        console.warn('Failed to sync scheduledCallTime to CampaignLead:', err?.message);
      }
    }

    return {
      id: updated.id,
      name: updated.name,
      phone: updated.phone,
      email: updated.email || undefined,
      metadata: (updated.metadata as Record<string, any>) || {},
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async addLead(leadData: Omit<Lead, 'id' | 'createdAt'>, campaignId?: string): Promise<Lead> {
    const created = await prisma.lead.create({
      data: {
        name: leadData.name,
        phone: leadData.phone,
        email: leadData.email,
        metadata: leadData.metadata || {},
      },
    });

    if (campaignId) {
      await this.enrollLeadInCampaign(created.id, campaignId);
    }

    return {
      id: created.id,
      name: created.name,
      phone: created.phone,
      email: created.email || undefined,
      metadata: (created.metadata as Record<string, any>) || {},
      createdAt: created.createdAt.toISOString(),
    };
  }

  async enrollLeadInCampaign(leadId: string, campaignId: string): Promise<CampaignLead> {
    const existing = await prisma.campaignLead.findUnique({
      where: {
        campaignId_leadId: { campaignId, leadId },
      },
    });

    if (existing) {
      return {
        id: existing.id,
        campaignId: existing.campaignId,
        leadId: existing.leadId,
        status: existing.status as CampaignLeadStatus,
        attemptCount: existing.attemptCount,
        lastAttemptAt: existing.lastAttemptAt ? existing.lastAttemptAt.toISOString() : undefined,
        nextAttemptAt: existing.nextAttemptAt ? existing.nextAttemptAt.toISOString() : undefined,
      };
    }

    const created = await prisma.campaignLead.create({
      data: {
        campaignId,
        leadId,
        status: 'untouched',
        attemptCount: 0,
      },
    });

    return {
      id: created.id,
      campaignId: created.campaignId,
      leadId: created.leadId,
      status: created.status as CampaignLeadStatus,
      attemptCount: created.attemptCount,
      lastAttemptAt: created.lastAttemptAt ? created.lastAttemptAt.toISOString() : undefined,
      nextAttemptAt: created.nextAttemptAt ? created.nextAttemptAt.toISOString() : undefined,
    };
  }

  async enrollLeadsInCampaign(leadIds: string[], campaignId: string): Promise<{ enrolledCount: number }> {
    let count = 0;
    for (const leadId of leadIds) {
      await this.enrollLeadInCampaign(leadId, campaignId);
      count++;
    }
    return { enrolledCount: count };
  }

  async getLeadTimeline(leadId: string) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        campaignLeads: {
          include: { campaign: true },
        },
        calls: {
          orderBy: { startedAt: 'desc' },
          include: {
            agent: true,
            agentVersion: true,
            campaign: true,
          },
        },
      },
    });

    if (!lead) return null;

    const callsWithIntelligence = lead.calls.map(c => {
      const callObj: any = {
        id: c.id,
        externalCallId: c.externalCallId,
        campaignId: c.campaignId,
        campaignName: c.campaign?.name || 'Direct Outreach',
        agentId: c.agentId,
        agentName: c.agent?.name || 'Voice Agent',
        agentVersionId: c.agentVersionId,
        leadId: c.leadId,
        leadName: lead.name,
        leadPhone: lead.phone,
        phoneNumberId: c.phoneNumberId,
        status: c.status,
        outcome: c.outcome,
        durationSeconds: c.durationSeconds,
        startedAt: c.startedAt.toISOString(),
        endedAt: c.endedAt ? c.endedAt.toISOString() : undefined,
        transcript: (c.transcript as any) || [],
        extractedVariables: (c.extractedVariables as any) || {},
      };
      if (c.durationSeconds > 0 && !callObj.extractedVariables.intelligence) {
        callObj.extractedVariables.intelligence = callAnalyticsService.analyzeCall(callObj);
      }
      return callObj;
    });

    const totalDurationSeconds = lead.calls.reduce((sum, c) => sum + c.durationSeconds, 0);

    return {
      lead: {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        email: lead.email || undefined,
        metadata: (lead.metadata as Record<string, any>) || {},
        createdAt: lead.createdAt.toISOString(),
      },
      campaigns: lead.campaignLeads.map(cl => ({
        campaignId: cl.campaignId,
        campaignName: cl.campaign?.name || cl.campaignId,
        status: cl.status,
        attemptCount: cl.attemptCount,
        lastAttemptAt: cl.lastAttemptAt?.toISOString(),
        nextAttemptAt: cl.nextAttemptAt?.toISOString(),
      })),
      calls: callsWithIntelligence,
      summary: {
        totalCalls: lead.calls.length,
        totalDurationSeconds,
        latestOutcome: lead.calls[0]?.outcome || 'untouched',
        latestStatus: lead.calls[0]?.status || 'untouched',
        interestLevel: (lead.calls.find(c => (c.extractedVariables as any)?.interest_level)?.extractedVariables as any)?.interest_level || 'not_captured',
        followUpPreference: (lead.calls.find(c => (c.extractedVariables as any)?.follow_up_preference)?.extractedVariables as any)?.follow_up_preference || 'none',
      },
    };
  }

  async deleteLead(id: string): Promise<boolean> {
    await prisma.call.deleteMany({ where: { leadId: id } });
    await prisma.campaignLead.deleteMany({ where: { leadId: id } });
    await prisma.lead.delete({ where: { id } });
    return true;
  }

  async cleanupPlaceholderLeads(keepPhoneDigits: string = '9922935920') {
    const leadsToDelete = await prisma.lead.findMany({
      where: {
        NOT: {
          phone: { contains: keepPhoneDigits },
        },
      },
    });

    const deleteIds = leadsToDelete.map(l => l.id);

    const deletedCalls = await prisma.call.deleteMany({
      where: { leadId: { in: deleteIds } },
    });

    const deletedCampaignLeads = await prisma.campaignLead.deleteMany({
      where: { leadId: { in: deleteIds } },
    });

    const deletedLeads = await prisma.lead.deleteMany({
      where: { id: { in: deleteIds } },
    });

    return {
      deletedLeadsCount: deletedLeads.count,
      deletedCallsCount: deletedCalls.count,
      deletedCampaignLeadsCount: deletedCampaignLeads.count,
    };
  }
}

export const leadRepository = new LeadRepository();

