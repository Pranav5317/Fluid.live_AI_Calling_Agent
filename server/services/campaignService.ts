import prisma from '../lib/prisma';
import { Campaign } from '../../src/types';
import { campaignRepository, ServerCreateCampaignDTO } from '../repositories/campaignRepository';
import { callRepository } from '../repositories/callRepository';
import { backendSarvamProvider } from './sarvamProvider';

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
}

export const serverCampaignService = new ServerCampaignService();
