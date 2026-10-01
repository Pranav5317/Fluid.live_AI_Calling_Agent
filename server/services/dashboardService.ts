import { DashboardMetrics, CallActivityPoint, RecentActivity, Campaign } from '../../src/types';
import { dashboardRepository } from '../repositories/dashboardRepository';
import { campaignRepository } from '../repositories/campaignRepository';

export class ServerDashboardService {
  async getMetrics(): Promise<DashboardMetrics> {
    return dashboardRepository.getMetrics();
  }

  async getCallActivityChart(): Promise<CallActivityPoint[]> {
    return dashboardRepository.getCallActivityChart();
  }

  async getRecentActivities(): Promise<RecentActivity[]> {
    return dashboardRepository.getRecentActivities();
  }

  async getOverviewCampaigns(): Promise<Campaign[]> {
    return campaignRepository.getCampaigns();
  }
}

export const serverDashboardService = new ServerDashboardService();
