import prisma from '../lib/prisma';
import { Campaign } from '../../src/types';
import { campaignRepository, ServerCreateCampaignDTO } from '../repositories/campaignRepository';
import { callRepository } from '../repositories/callRepository';
import { backendSarvamProvider } from './sarvamProvider';
import { callSchedulerService } from './callSchedulerService';

export class ServerCampaignService {
  async getCampaigns(search = '', status = 'all'): Promise<Campaign[]> {
    return campaignRepository.getCampaigns(search, status);
  }

  async getCampaignById(id: string): Promise<Campaign | null> {
    return campaignRepository.getCampaignById(id);
  }

  async createCampaign(dto: ServerCreateCampaignDTO): Promise<Campaign> {
    return campaignRepository.createCampaign(dto);
  }

  async startCampaign(id: string): Promise<Campaign> {
    const campaign = await campaignRepository.getCampaignById(id);
    if (!campaign) throw new Error(`Campaign not found: ${id}`);

    // 1. Update campaign status to running
    const runningCampaign = await campaignRepository.updateCampaignStatus(id, 'running');

    // 2. Fetch enrolled leads for this campaign
    const campaignLeads = await prisma.campaignLead.findMany({
      where: { campaignId: id },
      include: { lead: true },
    });

    const phoneNumberObj = await prisma.phoneNumber.findUnique({
      where: { id: campaign.phoneNumberId },
    });
    const fromPhone = phoneNumberObj?.phoneNumber || process.env.SARVAM_AGENT_PHONE_NUMBER || '+917965480599';
    const sarvamAppId = process.env.SARVAM_APP_ID || 'Conversatio-b063cf10-e735';

    console.log(`[Campaign Engine] Dispatching calls for campaign "${campaign.name}" (${campaignLeads.length} lead(s))...`);

    const agentVersion = await prisma.agentVersion.findUnique({
      where: { id: campaign.agentVersionId },
    });
    const config = (agentVersion?.config as any) || {};

    // 3. Dispatch live outbound calls to Sarvam Voice Agents API for each enrolled lead
    for (const cl of campaignLeads) {
      try {
        console.log(`[Campaign Engine] Calling lead ${cl.lead.name} (${cl.lead.phone}) via Sarvam API...`);

        const callResult = await backendSarvamProvider.initiateOutboundCall({
          agentVersionId: campaign.agentVersionId,
          sarvamAgentId: config.sarvamAppId || sarvamAppId,
          connectionId: config.sarvamConnectionId || phoneNumberObj?.providerId || undefined,
          fromPhoneNumber: fromPhone,
          toPhoneNumber: cl.lead.phone,
          leadId: cl.lead.id,
          campaignId: campaign.id,
          userName: cl.lead.name,
          initialBotMessage: config.firstGreeting || config.openingLine,
          outroMessage: config.closingBehavior || config.outroMessage,
          systemPrompt: config.systemPrompt,
        });

        // 4. Create pending Call record in Neon PostgreSQL
        await callRepository.createCall({
          externalCallId: callResult.providerCallId,
          campaignId: campaign.id,
          agentId: campaign.agentId,
          agentVersionId: campaign.agentVersionId,
          leadId: cl.lead.id,
          phoneNumberId: campaign.phoneNumberId,
          status: 'initiated' as any,
        });

        // 5. Update campaign lead status & increment attempt count
        await prisma.campaignLead.update({
          where: { campaignId_leadId: { campaignId: campaign.id, leadId: cl.lead.id } },
          data: {
            status: 'calling',
            attemptCount: { increment: 1 },
            lastAttemptAt: new Date(),
          },
        });

        // 6. Increment campaign callsAttempted counter
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: { callsAttempted: { increment: 1 } },
        });

        console.log(`[Campaign Engine] Live call dispatched to ${cl.lead.phone}. Attempt ID: ${callResult.providerCallId}`);
      } catch (err: any) {
        console.error(`[Campaign Engine] Failed to dispatch call to ${cl.lead.phone}: ${err?.message}`);
        await prisma.campaignLead.update({
          where: { campaignId_leadId: { campaignId: campaign.id, leadId: cl.lead.id } },
          data: { status: 'failed' },
        });
      }
    }

    return runningCampaign;
  }

  async pauseCampaign(id: string): Promise<Campaign> {
    const campaign = await campaignRepository.getCampaignById(id);
    if (!campaign) throw new Error(`Campaign not found: ${id}`);

    await backendSarvamProvider.pauseCampaign(`srv_cmp_${id}_${campaign.agentVersionId}`);

    return campaignRepository.updateCampaignStatus(id, 'paused');
  }

  async resumeCampaign(id: string): Promise<Campaign> {
    return this.startCampaign(id);
  }

  async stopCampaign(id: string): Promise<Campaign> {
    return campaignRepository.updateCampaignStatus(id, 'cancelled');
  }

  // --- FEATURE 2: LIVE BATCH CAMPAIGN DIALER & EXECUTION MONITOR ---
  async dialBatch(campaignId: string, options?: { leadIds?: string[]; maxBatch?: number }) {
    const campaign = await campaignRepository.getCampaignById(campaignId);
    if (!campaign) throw new Error(`Campaign not found: ${campaignId}`);

    const phoneNumberObj = await prisma.phoneNumber.findUnique({
      where: { id: campaign.phoneNumberId },
    });
    const fromPhone = phoneNumberObj?.phoneNumber || process.env.SARVAM_AGENT_PHONE_NUMBER || '+917965480599';
    const sarvamAppId = process.env.SARVAM_APP_ID || 'Conversatio-b063cf10-e735';

    const agentVersion = await prisma.agentVersion.findUnique({
      where: { id: campaign.agentVersionId },
    });
    const config = (agentVersion?.config as any) || {};

    // Select eligible leads
    let whereClause: any = { campaignId };
    if (options?.leadIds && options.leadIds.length > 0) {
      whereClause.leadId = { in: options.leadIds };
    } else {
      whereClause.status = { in: ['untouched', 'queued', 'retry_scheduled', 'failed', 'callback'] };
    }

    const campaignLeads = await prisma.campaignLead.findMany({
      where: whereClause,
      include: { lead: true },
      take: options?.maxBatch || 10,
    });

    if (campaignLeads.length === 0) {
      return {
        campaign,
        totalTargeted: 0,
        successfulDispatches: 0,
        failedDispatches: 0,
        results: [],
        message: 'No eligible leads waiting to be dialed in this campaign batch.',
      };
    }

    // Ensure campaign status is running
    await campaignRepository.updateCampaignStatus(campaignId, 'running');

    const results: Array<{
      leadId: string;
      leadName: string;
      phone: string;
      status: string;
      callId?: string;
      externalCallId?: string;
      error?: string;
      attemptNumber: number;
    }> = [];

    for (const cl of campaignLeads) {
      try {
        console.log(`[Batch Dialer] Dialing lead ${cl.lead.name} (${cl.lead.phone}) for campaign "${campaign.name}"...`);

        const callResult = await backendSarvamProvider.initiateOutboundCall({
          agentVersionId: campaign.agentVersionId,
          sarvamAgentId: config.sarvamAppId || sarvamAppId,
          connectionId: config.sarvamConnectionId || phoneNumberObj?.providerId || undefined,
          fromPhoneNumber: fromPhone,
          toPhoneNumber: cl.lead.phone,
          leadId: cl.lead.id,
          campaignId: campaign.id,
          userName: cl.lead.name,
          initialBotMessage: config.firstGreeting || config.openingLine,
          outroMessage: config.closingBehavior || config.outroMessage,
          systemPrompt: config.systemPrompt,
        });

        // Create pending Call record
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

        // Update campaignLead
        await prisma.campaignLead.update({
          where: { campaignId_leadId: { campaignId: campaign.id, leadId: cl.lead.id } },
          data: {
            status: 'calling',
            attemptCount: newAttemptCount,
            lastAttemptAt: new Date(),
          },
        });

        await prisma.campaign.update({
          where: { id: campaign.id },
          data: { callsAttempted: { increment: 1 } },
        });

        results.push({
          leadId: cl.lead.id,
          leadName: cl.lead.name,
          phone: cl.lead.phone,
          status: 'initiated',
          callId: call.id,
          externalCallId: callResult.providerCallId,
          attemptNumber: newAttemptCount,
        });
      } catch (err: any) {
        console.error(`[Batch Dialer] Error dialing ${cl.lead.phone}: ${err?.message}`);

        const newAttemptCount = cl.attemptCount + 1;
        const nextAttemptAt = newAttemptCount < 3 ? new Date(Date.now() + 4 * 3600000) : null;
        const finalStatus = newAttemptCount >= 3 ? 'exhausted' : 'retry_scheduled';

        await prisma.campaignLead.update({
          where: { campaignId_leadId: { campaignId: campaign.id, leadId: cl.lead.id } },
          data: {
            status: finalStatus,
            attemptCount: newAttemptCount,
            lastAttemptAt: new Date(),
            nextAttemptAt,
          },
        });

        results.push({
          leadId: cl.lead.id,
          leadName: cl.lead.name,
          phone: cl.lead.phone,
          status: 'failed',
          error: err?.message || 'Handshake failed',
          attemptNumber: newAttemptCount,
        });
      }
    }

    const successfulDispatches = results.filter(r => r.status === 'initiated').length;
    const failedDispatches = results.filter(r => r.status === 'failed').length;

    return {
      campaign: await campaignRepository.getCampaignById(campaignId),
      totalTargeted: results.length,
      successfulDispatches,
      failedDispatches,
      results,
    };
  }

  async getExecutionMonitor(campaignId: string) {
    const campaign = await campaignRepository.getCampaignById(campaignId);
    if (!campaign) throw new Error(`Campaign not found: ${campaignId}`);

    const [campaignLeads, recentCalls] = await Promise.all([
      prisma.campaignLead.findMany({
        where: { campaignId },
        include: { lead: true },
      }),
      prisma.call.findMany({
        where: { campaignId },
        orderBy: { startedAt: 'desc' },
        take: 20,
        include: { lead: true },
      }),
    ]);

    const breakdown = {
      untouched: campaignLeads.filter(l => l.status === 'untouched').length,
      queued: campaignLeads.filter(l => l.status === 'queued').length,
      calling: campaignLeads.filter(l => l.status === 'calling').length,
      completed: campaignLeads.filter(l => l.status === 'completed' || l.status === 'contacted').length,
      retry_scheduled: campaignLeads.filter(l => l.status === 'retry_scheduled' || l.status === 'callback').length,
      failed: campaignLeads.filter(l => l.status === 'failed' || l.status === 'exhausted').length,
    };

    return {
      campaign,
      totalLeads: campaignLeads.length,
      breakdown,
      recentCalls: recentCalls.map(c => ({
        id: c.id,
        externalCallId: c.externalCallId,
        leadId: c.leadId,
        leadName: c.lead?.name || 'Contact',
        leadPhone: c.lead?.phone || '',
        status: c.status,
        outcome: c.outcome,
        durationSeconds: c.durationSeconds,
        startedAt: c.startedAt.toISOString(),
      })),
      leads: campaignLeads.map(cl => ({
        id: cl.id,
        leadId: cl.leadId,
        name: cl.lead.name,
        phone: cl.lead.phone,
        status: cl.status,
        attemptCount: cl.attemptCount,
        lastAttemptAt: cl.lastAttemptAt?.toISOString(),
        nextAttemptAt: cl.nextAttemptAt?.toISOString(),
      })),
    };
  }

  // --- FEATURE 3: IN-HOUSE AUTOMATED RETRY WATERFALL & CADENCE ENGINE ---
  async getRetryQueue(campaignId?: string) {
    const policy = callSchedulerService.getPolicy();
    const where: any = {
      OR: [
        { status: { in: ['retry_scheduled', 'callback', 'failed', 'busy', 'unanswered'] }, attemptCount: { lt: policy.maxAttempts } },
        { nextAttemptAt: { not: null }, attemptCount: { lt: policy.maxAttempts } },
        { status: 'untouched', attemptCount: 0 },
      ],
    };

    if (campaignId) {
      where.campaignId = campaignId;
    }

    const leadsInQueue = await prisma.campaignLead.findMany({
      where,
      include: {
        lead: true,
        campaign: {
          include: {
            agent: true,
            phoneNumber: true,
          },
        },
        calls: {
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: [
        { nextAttemptAt: 'asc' },
        { lastAttemptAt: 'desc' },
      ],
      take: 50,
    });

    const now = new Date();

    return leadsInQueue.map(cl => {
      const isDue = cl.nextAttemptAt ? new Date(cl.nextAttemptAt) <= now : true;
      let cadenceTier = 'Tier 1: Initial Outreach';
      if (cl.attemptCount === 1) {
        cadenceTier = `Tier 2: ${policy.tier2DelayHours}-Hour Spaced Interval`;
      } else if (cl.attemptCount === 2) {
        cadenceTier = `Tier 3: ${policy.tier3DelayHours}-Hour Final Window`;
      } else if (cl.attemptCount >= policy.maxAttempts) {
        cadenceTier = 'Cadence Exhausted';
      }

      return {
        campaignLeadId: cl.id,
        campaignId: cl.campaignId,
        campaignName: cl.campaign?.name || 'Direct Outreach',
        leadId: cl.leadId,
        leadName: cl.lead.name,
        phone: cl.lead.phone,
        email: cl.lead.email || undefined,
        attemptCount: cl.attemptCount,
        maxAttempts: policy.maxAttempts,
        status: cl.status,
        cadenceTier,
        lastAttemptAt: cl.lastAttemptAt?.toISOString() || null,
        nextAttemptAt: cl.nextAttemptAt?.toISOString() || null,
        isDue,
        lastOutcome: cl.calls[0]?.outcome || cl.calls[0]?.status || (cl.attemptCount === 0 ? 'not_yet_called' : 'unreachable'),
        agentName: cl.campaign?.agent?.name || 'Autonomous Voice Agent',
      };
    });
  }

  async executeRetryNow(campaignLeadId: string) {
    const campaignLead = await prisma.campaignLead.findUnique({
      where: { id: campaignLeadId },
      include: {
        lead: true,
        campaign: true,
      },
    });

    if (!campaignLead) throw new Error(`Campaign lead not found: ${campaignLeadId}`);

    const campaign = campaignLead.campaign;
    const lead = campaignLead.lead;

    const phoneNumberObj = await prisma.phoneNumber.findUnique({
      where: { id: campaign.phoneNumberId },
    });
    const fromPhone = phoneNumberObj?.phoneNumber || process.env.SARVAM_AGENT_PHONE_NUMBER || '+917965480599';
    const sarvamAppId = process.env.SARVAM_APP_ID || 'Conversatio-b063cf10-e735';

    const agentVersion = await prisma.agentVersion.findUnique({
      where: { id: campaign.agentVersionId },
    });
    const config = (agentVersion?.config as any) || {};

    console.log(`[Cadence Engine] Executing immediate manual retry for ${lead.name} (${lead.phone}). Current attempt: ${campaignLead.attemptCount}...`);

    const callResult = await backendSarvamProvider.initiateOutboundCall({
      agentVersionId: campaign.agentVersionId,
      sarvamAgentId: config.sarvamAppId || sarvamAppId,
      connectionId: config.sarvamConnectionId || phoneNumberObj?.providerId || undefined,
      fromPhoneNumber: fromPhone,
      toPhoneNumber: lead.phone,
      leadId: lead.id,
      campaignId: campaign.id,
      userName: lead.name,
      initialBotMessage: config.firstGreeting || config.openingLine,
      outroMessage: config.closingBehavior || config.outroMessage,
      systemPrompt: config.systemPrompt,
    });

    const newAttemptCount = campaignLead.attemptCount + 1;
    // Waterfall calculation for next attempt
    const nextAttemptAt = callSchedulerService.calculateNextAttempt(newAttemptCount, 'dialed');
    const newStatus = 'calling';

    // Create call record
    const call = await callRepository.createCall({
      externalCallId: callResult.providerCallId,
      campaignId: campaign.id,
      agentId: campaign.agentId,
      agentVersionId: campaign.agentVersionId,
      leadId: lead.id,
      phoneNumberId: campaign.phoneNumberId,
      status: 'initiated' as any,
    });

    // Update campaignLead record
    const updatedCl = await prisma.campaignLead.update({
      where: { id: campaignLeadId },
      data: {
        status: newStatus,
        attemptCount: newAttemptCount,
        lastAttemptAt: new Date(),
        nextAttemptAt,
      },
    });

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { callsAttempted: { increment: 1 } },
    });

    return {
      success: true,
      externalCallId: callResult.providerCallId,
      callId: call.id,
      attemptNumber: newAttemptCount,
      nextAttemptAt: nextAttemptAt?.toISOString() || null,
      status: newStatus,
    };
  }

  async processDueRetries(campaignId?: string) {
    const queue = await this.getRetryQueue(campaignId);
    const dueItems = queue.filter(item => item.isDue);

    const executedResults: any[] = [];
    for (const item of dueItems.slice(0, 10)) { // Batch limit 10 for safety
      try {
        const res = await this.executeRetryNow(item.campaignLeadId);
        executedResults.push({
          campaignLeadId: item.campaignLeadId,
          leadName: item.leadName,
          phone: item.phone,
          ...res,
        });
      } catch (err: any) {
        executedResults.push({
          campaignLeadId: item.campaignLeadId,
          leadName: item.leadName,
          phone: item.phone,
          success: false,
          error: err?.message,
        });
      }
    }

    return {
      processedCount: executedResults.length,
      totalDue: dueItems.length,
      results: executedResults,
    };
  }
}

export const serverCampaignService = new ServerCampaignService();
