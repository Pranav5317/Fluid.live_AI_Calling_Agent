import { BillingPeriod, UsageEvent } from '../types';
import { apiClient } from './apiClient';

export interface IBillingService {
  getCurrentBillingPeriod(): Promise<BillingPeriod>;
  getBillingHistory(): Promise<BillingPeriod[]>;
  getUsageEvents(campaignId?: string): Promise<UsageEvent[]>;
  recordUsageEvent(event: Omit<UsageEvent, 'id' | 'timestamp'>): Promise<UsageEvent>;
}

class BillingService implements IBillingService {
  async getUsageEvents(campaignId?: string): Promise<UsageEvent[]> {
    const url = campaignId && campaignId !== 'all' ? `/usage?campaignId=${campaignId}` : '/usage';
    return await apiClient.get<UsageEvent[]>(url);
  }

  async recordUsageEvent(eventData: Omit<UsageEvent, 'id' | 'timestamp'>): Promise<UsageEvent> {
    return await apiClient.post<UsageEvent>('/usage', eventData);
  }

  async getCurrentBillingPeriod(): Promise<BillingPeriod> {
    return await apiClient.get<BillingPeriod>('/billing/current');
  }

  async getBillingHistory(): Promise<BillingPeriod[]> {
    return await apiClient.get<BillingPeriod[]>('/billing/history');
  }
}

export const billingService = new BillingService();
