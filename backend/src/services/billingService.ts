import { BillingPeriod, UsageEvent } from '../../../packages/contracts/types';
import { billingRepository } from '../repositories/billingRepository';

export class ServerBillingService {
  async getUsageEvents(campaignId?: string): Promise<UsageEvent[]> {
    return billingRepository.getUsageEvents(campaignId);
  }

  async getCurrentBillingPeriod(): Promise<BillingPeriod> {
    return billingRepository.getCurrentBillingPeriod();
  }

  async getBillingHistory(): Promise<BillingPeriod[]> {
    return billingRepository.getBillingHistory();
  }
}

export const serverBillingService = new ServerBillingService();
