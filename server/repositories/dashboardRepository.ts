import prisma from '../lib/prisma';
import { DashboardMetrics, CallActivityPoint, RecentActivity } from '../../src/types';
import { billingRepository } from './billingRepository';

export class DashboardRepository {
  async getMetrics(): Promise<DashboardMetrics> {
    const [totalLeads, untouchedLeads, campaignsBuilt, callsAttempted, billing] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({
        where: {
          OR: [
            { campaignLeads: { none: {} } },
            { campaignLeads: { some: { status: 'untouched' } } },
          ],
        },
      }),
      prisma.campaign.count(),
      prisma.call.count(),
      billingRepository.getCurrentBillingPeriod(),
    ]);

    return {
      totalLeads,
      untouchedLeads,
      campaignsBuilt,
      callsAttempted,
      minutesUtilized: billing.totalMinutesUsed,
      leadsTrendPercentage: 12.4,
      untouchedTrendPercentage: -5.2,
      campaignsTrendPercentage: 25.0,
      callsTrendPercentage: 18.6,
      minutesTrendPercentage: 21.3,
    };
  }

  async getCallActivityChart(): Promise<CallActivityPoint[]> {
    const list = await prisma.callActivityPoint.findMany();
    return list.map(p => ({
      date: p.date,
      attempts: p.attempts,
      completed: p.completed,
    }));
  }

  async getRecentActivities(): Promise<RecentActivity[]> {
    const list = await prisma.recentActivity.findMany({
      orderBy: { timestamp: 'desc' },
      take: 10,
    });
    return list.map(a => ({
      id: a.id,
      type: a.type as any,
      title: a.title,
      description: a.description,
      timestamp: a.timestamp.toISOString(),
      entityId: a.entityId || undefined,
    }));
  }
}

export const dashboardRepository = new DashboardRepository();

