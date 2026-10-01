import prisma from '../lib/prisma';
import { BillingPeriod, UsageEvent } from '../../src/types';

export class BillingRepository {
  async getUsageEvents(campaignId?: string): Promise<UsageEvent[]> {
    const where: any = {};
    if (campaignId && campaignId !== 'all') {
      where.campaignId = campaignId;
    }

    const list = await prisma.usageEvent.findMany({
      where,
      orderBy: { timestamp: 'desc' },
    });

    return list.map(u => ({
      id: u.id,
      callId: u.callId || '',
      campaignId: u.campaignId,
      agentId: u.agentId,
      durationMinutes: u.durationMinutes,
      providerCostUnits: u.providerCostUnits,
      platformCostUnits: u.platformCostUnits,
      timestamp: u.timestamp.toISOString(),
    }));
  }

  async getCurrentBillingPeriod(): Promise<BillingPeriod> {
    const events = await prisma.usageEvent.findMany();
    const totalMinutes = events.reduce((acc, u) => acc + u.durationMinutes, 0);
    const totalCalls = events.length;
    const providerCost = events.reduce((acc, u) => acc + u.providerCostUnits, 0);
    const platformCost = events.reduce((acc, u) => acc + u.platformCostUnits, 0);
    const estimatedCost = providerCost + platformCost;

    const basePeriod = await prisma.billingPeriod.findFirst({
      where: { status: 'current' },
      orderBy: { startDate: 'desc' },
    });

    if (!basePeriod) {
      return {
        id: 'bp_current',
        periodName: 'Current Period',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        totalMinutesUsed: Number(totalMinutes.toFixed(1)),
        totalCallsCount: totalCalls,
        estimatedTotalCost: Number(estimatedCost.toFixed(2)),
        providerCostTotal: Number(providerCost.toFixed(2)),
        platformCostTotal: Number(platformCost.toFixed(2)),
        status: 'current',
      };
    }

    return {
      id: basePeriod.id,
      periodName: basePeriod.periodName,
      startDate: basePeriod.startDate.toISOString(),
      endDate: basePeriod.endDate.toISOString(),
      totalMinutesUsed: Number(totalMinutes.toFixed(1)),
      totalCallsCount: totalCalls,
      estimatedTotalCost: Number(estimatedCost.toFixed(2)),
      providerCostTotal: Number(providerCost.toFixed(2)),
      platformCostTotal: Number(platformCost.toFixed(2)),
      status: basePeriod.status as any,
    };
  }

  async getBillingHistory(): Promise<BillingPeriod[]> {
    const current = await this.getCurrentBillingPeriod();
    const pastPeriods = await prisma.billingPeriod.findMany({
      where: { status: { not: 'current' } },
      orderBy: { startDate: 'desc' },
    });

    return [
      current,
      ...pastPeriods.map(bp => ({
        id: bp.id,
        periodName: bp.periodName,
        startDate: bp.startDate.toISOString(),
        endDate: bp.endDate.toISOString(),
        totalMinutesUsed: bp.totalMinutesUsed,
        totalCallsCount: bp.totalCallsCount,
        estimatedTotalCost: bp.estimatedTotalCost,
        providerCostTotal: bp.providerCostTotal,
        platformCostTotal: bp.platformCostTotal,
        status: bp.status as any,
      })),
    ];
  }
}

export const billingRepository = new BillingRepository();

