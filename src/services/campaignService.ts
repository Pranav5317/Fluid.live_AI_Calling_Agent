import { Campaign, CampaignStatus } from '../types';
import { apiClient } from './apiClient';

export interface CampaignFilterOptions {
  search?: string;
  status?: CampaignStatus | 'all';
}

export interface CreateCampaignDTO {
  name: string;
  agentId: string;
  agentVersionId: string;
  phoneNumberId: string;
  totalLeads?: number;
  selectedLeadIds?: string[];
  scheduledAt?: string;
}

export interface ICampaignService {
  getCampaigns(options?: CampaignFilterOptions): Promise<Campaign[]>;
  getCampaignById(id: string): Promise<Campaign | undefined>;
  createCampaign(dto: CreateCampaignDTO): Promise<Campaign>;
  startCampaign(id: string): Promise<Campaign>;
  pauseCampaign(id: string): Promise<Campaign>;
  resumeCampaign(id: string): Promise<Campaign>;
  stopCampaign(id: string): Promise<Campaign>;
}

class CampaignService implements ICampaignService {
  async getCampaigns(options: CampaignFilterOptions = {}): Promise<Campaign[]> {
    const query = new URLSearchParams();
    if (options.search) query.append('search', options.search);
    if (options.status) query.append('status', options.status);
    return await apiClient.get<Campaign[]>(`/campaigns?${query.toString()}`);
  }

  async getCampaignById(id: string): Promise<Campaign | undefined> {
    return await apiClient.get<Campaign>(`/campaigns/${id}`);
  }

  async createCampaign(dto: CreateCampaignDTO): Promise<Campaign> {
    return await apiClient.post<Campaign>('/campaigns', dto);
  }

  async startCampaign(id: string): Promise<Campaign> {
    return await apiClient.post<Campaign>(`/campaigns/${id}/start`);
  }

  async pauseCampaign(id: string): Promise<Campaign> {
    return await apiClient.post<Campaign>(`/campaigns/${id}/pause`);
  }

  async resumeCampaign(id: string): Promise<Campaign> {
    return await apiClient.post<Campaign>(`/campaigns/${id}/resume`);
  }

  async stopCampaign(id: string): Promise<Campaign> {
    return await apiClient.post<Campaign>(`/campaigns/${id}/stop`);
  }
}

export const campaignService = new CampaignService();
