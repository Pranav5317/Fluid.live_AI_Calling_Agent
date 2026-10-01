import { Campaign } from '../../src/types';
import { campaignRepository, ServerCreateCampaignDTO } from '../repositories/campaignRepository';
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

    await backendSarvamProvider.startCampaign(
      id,
      campaign.agentId,
      campaign.agentVersionId,
      campaign.phoneNumberId
    );

    return campaignRepository.updateCampaignStatus(id, 'running');
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
