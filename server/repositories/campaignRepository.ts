import prisma from '../lib/prisma';
import { Campaign, CampaignStatus } from '../../src/types';
import { leadRepository } from './leadRepository';

export interface ServerCreateCampaignDTO {
  name: string;
  agentId: string;
  agentVersionId: string;
  phoneNumberId: string;
  totalLeads?: number;
  selectedLeadIds?: string[];
  scheduledAt?: string;
}

export class CampaignRepository {
  async getCampaigns(search = '', status = 'all'): Promise<Campaign[]> {
    const where: any = {};
    if (search.trim()) {
      where.name = { contains: search.trim(), mode: 'insensitive' };
    }
    if (status && status !== 'all') {
      where.status = status;
    }

    const list = await prisma.campaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return list.map(c => ({
      id: c.id,
      name: c.name,
      agentId: c.agentId,
      agentVersionId: c.agentVersionId,
      phoneNumberId: c.phoneNumberId,
      status: c.status as CampaignStatus,
      scheduledAt: c.scheduledAt ? c.scheduledAt.toISOString() : undefined,
      startedAt: c.startedAt ? c.startedAt.toISOString() : undefined,
      completedAt: c.completedAt ? c.completedAt.toISOString() : undefined,
      totalLeads: c.totalLeads,
      completedCalls: c.completedCalls,
      callsAttempted: c.callsAttempted,
      minutesUsed: c.minutesUsed,
      createdAt: c.createdAt.toISOString(),
    }));
  }

  async getCampaignById(id: string): Promise<Campaign | null> {
    const c = await prisma.campaign.findUnique({ where: { id } });
    if (!c) return null;
    return {
      id: c.id,
      name: c.name,
      agentId: c.agentId,
      agentVersionId: c.agentVersionId,
      phoneNumberId: c.phoneNumberId,
      status: c.status as CampaignStatus,
      scheduledAt: c.scheduledAt ? c.scheduledAt.toISOString() : undefined,
      startedAt: c.startedAt ? c.startedAt.toISOString() : undefined,
      completedAt: c.completedAt ? c.completedAt.toISOString() : undefined,
      totalLeads: c.totalLeads,
      completedCalls: c.completedCalls,
      callsAttempted: c.callsAttempted,
      minutesUsed: c.minutesUsed,
      createdAt: c.createdAt.toISOString(),
    };
  }

  async createCampaign(dto: ServerCreateCampaignDTO): Promise<Campaign> {
    const initialStatus: CampaignStatus = dto.scheduledAt ? 'scheduled' : 'draft';

    return await prisma.$transaction(async (tx) => {
      let leadIdsToEnroll = dto.selectedLeadIds || [];
      if (leadIdsToEnroll.length === 0) {
        const rawLeads = await tx.lead.findMany({ take: dto.totalLeads || 100 });
        leadIdsToEnroll = rawLeads.map(l => l.id);
      }

      const campaign = await tx.campaign.create({
        data: {
          name: dto.name,
          agentId: dto.agentId,
          agentVersionId: dto.agentVersionId, // Locked explicit version
          phoneNumberId: dto.phoneNumberId,
          status: initialStatus,
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
          totalLeads: leadIdsToEnroll.length || dto.totalLeads || 100,
        },
      });

      // Enroll leads atomically inside transaction
      for (const leadId of leadIdsToEnroll) {
        await tx.campaignLead.upsert({
          where: { campaignId_leadId: { campaignId: campaign.id, leadId } },
          update: {},
          create: { campaignId: campaign.id, leadId, status: 'untouched', attemptCount: 0 },
        });
      }

      return {
        id: campaign.id,
        name: campaign.name,
        agentId: campaign.agentId,
        agentVersionId: campaign.agentVersionId,
        phoneNumberId: campaign.phoneNumberId,
        status: campaign.status as CampaignStatus,
        scheduledAt: campaign.scheduledAt ? campaign.scheduledAt.toISOString() : undefined,
        totalLeads: campaign.totalLeads,
        completedCalls: campaign.completedCalls,
        callsAttempted: campaign.callsAttempted,
        minutesUsed: campaign.minutesUsed,
        createdAt: campaign.createdAt.toISOString(),
      };
    });
  }

  async updateCampaignStatus(id: string, status: CampaignStatus): Promise<Campaign> {
    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        status,
        ...(status === 'running' && { startedAt: new Date() }),
        ...(status === 'cancelled' || status === 'completed' ? { completedAt: new Date() } : {}),
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      agentId: updated.agentId,
      agentVersionId: updated.agentVersionId,
      phoneNumberId: updated.phoneNumberId,
      status: updated.status as CampaignStatus,
      scheduledAt: updated.scheduledAt ? updated.scheduledAt.toISOString() : undefined,
      startedAt: updated.startedAt ? updated.startedAt.toISOString() : undefined,
      completedAt: updated.completedAt ? updated.completedAt.toISOString() : undefined,
      totalLeads: updated.totalLeads,
      completedCalls: updated.completedCalls,
      callsAttempted: updated.callsAttempted,
      minutesUsed: updated.minutesUsed,
      createdAt: updated.createdAt.toISOString(),
    };
  }
}

export const campaignRepository = new CampaignRepository();

