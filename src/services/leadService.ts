import { Lead, CampaignLead, CampaignLeadStatus } from '../types';
import { apiClient } from './apiClient';

export interface LeadFilterOptions {
  search?: string;
  status?: CampaignLeadStatus | 'all';
  campaignId?: string | 'all';
  page?: number;
  pageSize?: number;
}

export interface LeadWithCampaignState {
  lead: Lead;
  campaignLead?: CampaignLead;
  allCampaignLeads: CampaignLead[];
}

export interface LeadPaginatedResult {
  items: LeadWithCampaignState[];
  total: number;
  untouchedTotal: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ILeadService {
  getLeads(options?: LeadFilterOptions): Promise<LeadPaginatedResult>;
  getAllLeadsRaw(): Promise<Lead[]>;
  addLead(leadData: Omit<Lead, 'id' | 'createdAt'>, campaignId?: string): Promise<Lead>;
  importLeads(leadsData: Array<Omit<Lead, 'id' | 'createdAt'>>, campaignId?: string): Promise<{ importedCount: number }>;
  enrollLeadInCampaign(leadId: string, campaignId: string): Promise<CampaignLead>;
  enrollLeadsInCampaign(leadIds: string[], campaignId: string): Promise<{ enrolledCount: number }>;
  updateCampaignLeadStatus(campaignLeadId: string, status: CampaignLeadStatus): Promise<CampaignLead>;
  getCampaignLeads(campaignId?: string): Promise<CampaignLead[]>;
}

class LeadService implements ILeadService {
  async getAllLeadsRaw(): Promise<Lead[]> {
    const res = await apiClient.get<LeadPaginatedResult>('/leads?pageSize=1000');
    return res.items.map(i => i.lead);
  }

  async getCampaignLeads(campaignId?: string): Promise<CampaignLead[]> {
    const endpoint = campaignId && campaignId !== 'all' 
      ? `/campaigns/${campaignId}/leads` 
      : '/leads';
    const res = await apiClient.get<any>(endpoint);
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.items)) {
      return res.items.map((i: any) => i.campaignLead).filter(Boolean);
    }
    return [];
  }

  async getLeads(options: LeadFilterOptions = {}): Promise<LeadPaginatedResult> {
    const query = new URLSearchParams();
    if (options.search) query.append('search', options.search);
    if (options.status) query.append('status', options.status);
    if (options.campaignId) query.append('campaignId', options.campaignId);
    if (options.page) query.append('page', String(options.page));
    if (options.pageSize) query.append('pageSize', String(options.pageSize));
    return await apiClient.get<LeadPaginatedResult>(`/leads?${query.toString()}`);
  }

  async addLead(leadData: Omit<Lead, 'id' | 'createdAt'>, campaignId?: string): Promise<Lead> {
    return await apiClient.post<Lead>('/leads', { ...leadData, campaignId });
  }

  async importLeads(
    leadsData: Array<Omit<Lead, 'id' | 'createdAt'>>,
    campaignId?: string
  ): Promise<{ importedCount: number }> {
    return await apiClient.post<{ importedCount: number }>('/leads/import', { leads: leadsData, campaignId });
  }

  async enrollLeadInCampaign(leadId: string, campaignId: string): Promise<CampaignLead> {
    return await apiClient.post<CampaignLead>(`/campaigns/${campaignId}/leads`, { leadId });
  }

  async enrollLeadsInCampaign(leadIds: string[], campaignId: string): Promise<{ enrolledCount: number }> {
    const res = await apiClient.post<{ enrolledCount: number }>(`/campaigns/${campaignId}/leads/batch`, { leadIds });
    return res;
  }

  async updateCampaignLeadStatus(
    campaignLeadId: string,
    status: CampaignLeadStatus
  ): Promise<CampaignLead> {
    return await apiClient.patch<CampaignLead>(`/campaigns/leads/${campaignLeadId}/status`, { status });
  }
}

export const leadService = new LeadService();
