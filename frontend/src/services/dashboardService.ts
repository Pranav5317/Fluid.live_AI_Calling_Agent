import {
  DashboardMetrics,
  CallActivityPoint,
  RecentActivity,
  Campaign
} from '../types';
import { campaignService } from './campaignService';
import { apiClient } from './apiClient';

export interface IDashboardService {
  getMetrics(): Promise<DashboardMetrics>;
  getCallActivityChart(): Promise<CallActivityPoint[]>;
  getRecentActivities(): Promise<RecentActivity[]>;
  getOverviewCampaigns(): Promise<Campaign[]>;
}

class DashboardService implements IDashboardService {
  async getMetrics(): Promise<DashboardMetrics> {
    return await apiClient.get<DashboardMetrics>('/dashboard/metrics');
  }

  async getCallActivityChart(): Promise<CallActivityPoint[]> {
    return await apiClient.get<CallActivityPoint[]>('/dashboard/chart');
  }

  async getRecentActivities(): Promise<RecentActivity[]> {
    return await apiClient.get<RecentActivity[]>('/dashboard/activity');
  }

  async getOverviewCampaigns(): Promise<Campaign[]> {
    return campaignService.getCampaigns();
  }
}

export const dashboardService = new DashboardService();
