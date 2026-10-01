import { Lead, CampaignLead, CampaignLeadStatus } from '../../src/types';
import { leadRepository } from '../repositories/leadRepository';

export interface LeadFilterParams {
  search?: string;
  status?: string;
  campaignId?: string;
  page?: number;
  pageSize?: number;
}

export interface ServerLeadResult {
  items: Array<{ lead: Lead; campaignLead?: CampaignLead; allCampaignLeads: CampaignLead[] }>;
  total: number;
  untouchedTotal: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class ServerLeadService {
  async getLeads(options: LeadFilterParams = {}): Promise<ServerLeadResult> {
    return leadRepository.getLeads(options);
  }

  async getAllLeadsRaw(): Promise<Lead[]> {
    return leadRepository.getAllLeadsRaw();
  }

  async getLeadById(id: string): Promise<Lead | null> {
    return leadRepository.getLeadById(id);
  }

  async addLead(leadData: Omit<Lead, 'id' | 'createdAt'>, campaignId?: string): Promise<Lead> {
    return leadRepository.addLead(leadData, campaignId);
  }

  async importLeads(
    leadsData: Array<Omit<Lead, 'id' | 'createdAt'>>,
    campaignId?: string
  ): Promise<{ importedCount: number }> {
    for (const data of leadsData) {
      await leadRepository.addLead(data, campaignId);
    }
    return { importedCount: leadsData.length };
  }

  async enrollLeadInCampaign(leadId: string, campaignId: string): Promise<CampaignLead> {
    return leadRepository.enrollLeadInCampaign(leadId, campaignId);
  }

  async enrollLeadsInCampaign(leadIds: string[], campaignId: string): Promise<{ enrolledCount: number }> {
    return leadRepository.enrollLeadsInCampaign(leadIds, campaignId);
  }
}

export const serverLeadService = new ServerLeadService();
