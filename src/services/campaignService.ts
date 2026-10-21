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
  dialBatch(id: string, options?: { leadIds?: string[]; maxBatch?: number }): Promise<any>;
  getExecutionMonitor(id: string): Promise<any>;
  getRetryQueue(campaignId?: string): Promise<any[]>;
  executeRetryNow(campaignLeadId: string): Promise<any>;
  processDueRetries(campaignId?: string): Promise<any>;
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

  async dialBatch(id: string, options?: { leadIds?: string[]; maxBatch?: number }): Promise<any> {
    return await apiClient.post<any>(`/campaigns/${id}/dial-batch`, options || {});
  }

  async getExecutionMonitor(id: string): Promise<any> {
    return await apiClient.get<any>(`/campaigns/${id}/monitor`);
  }

  async getRetryQueue(campaignId?: string): Promise<any[]> {
    const q = campaignId ? `?campaignId=${campaignId}` : '';
    return await apiClient.get<any[]>(`/campaigns/retries/queue${q}`);
  }

  async executeRetryNow(campaignLeadId: string): Promise<any> {
    return await apiClient.post<any>(`/campaigns/retries/${campaignLeadId}/execute-now`);
  }

  async processDueRetries(campaignId?: string): Promise<any> {
    return await apiClient.post<any>(`/campaigns/retries/process-due`, { campaignId });
  }
}

export const campaignService = new CampaignService();
