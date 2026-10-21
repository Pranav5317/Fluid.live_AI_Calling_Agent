import prisma from '../lib/prisma';
import { DashboardMetrics, CallActivityPoint, RecentActivity, DashboardIntelligenceSummary } from '../../src/types';
import { billingRepository } from './billingRepository';
import { callAnalyticsService } from '../services/callAnalyticsService';

export class DashboardRepository {
  async getMetrics(): Promise<DashboardMetrics> {
    const [totalLeads, untouchedLeads, campaignsBuilt, callsAttempted, completedCallsCount, billing, activeCalls] = await Promise.all([
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
      prisma.call.count({ where: { status: 'completed' } }),
      billingRepository.getCurrentBillingPeriod(),
      prisma.call.findMany({
        where: { durationSeconds: { gt: 0 } },
      }),
    ]);

    const completionRate = callsAttempted > 0 ? Number(((completedCallsCount / callsAttempted) * 100).toFixed(1)) : 0;

    // Compute Enterprise Conversational Intelligence Aggregates across real call sessions
    let totalQaScore = 0;
    let totalAgentTalkPct = 0;
    let totalLeadTalkPct = 0;
    let positiveSentimentCalls = 0;
    let highIntentCalls = 0;
    const objectionsMap = new Map<string, number>();
    const buyingSignalsMap = new Map<string, number>();

    for (const rawCall of activeCalls) {
      const callObj: any = {
        ...rawCall,
        startedAt: rawCall.startedAt.toISOString(),
        endedAt: rawCall.endedAt ? rawCall.endedAt.toISOString() : undefined,
        transcript: (rawCall.transcript as any) || [],
        extractedVariables: (rawCall.extractedVariables as any) || {},
      };
      const intelligence = callObj.extractedVariables?.intelligence || callAnalyticsService.analyzeCall(callObj);

      totalQaScore += intelligence.qaScorecard.overallScore;
      totalAgentTalkPct += intelligence.talkToListen.agentTalkPercentage;
      totalLeadTalkPct += intelligence.talkToListen.leadTalkPercentage;

      if (intelligence.sentimentTrajectory.overallSentiment === 'positive') {
        positiveSentimentCalls += 1;
      }
      if (intelligence.buyingSignals.length > 0) {
        highIntentCalls += 1;
      }

      for (const obj of intelligence.objections) {
        objectionsMap.set(obj.label, (objectionsMap.get(obj.label) || 0) + 1);
      }
      for (const sig of intelligence.buyingSignals) {
        buyingSignalsMap.set(sig.label, (buyingSignalsMap.get(sig.label) || 0) + 1);
      }
    }

    const n = activeCalls.length || 1;
    const avgQaScore = activeCalls.length > 0 ? Math.round(totalQaScore / n) : 100;
    const avgTalkListenRatio = {
      agentPct: activeCalls.length > 0 ? Math.round(totalAgentTalkPct / n) : 55,
      leadPct: activeCalls.length > 0 ? Math.round(totalLeadTalkPct / n) : 45,
    };
    const positiveSentimentRate = activeCalls.length > 0 ? Math.round((positiveSentimentCalls / n) * 100) : 0;
    const highIntentLeadRate = activeCalls.length > 0 ? Math.round((highIntentCalls / n) * 100) : 0;

    const topObjections = Array.from(objectionsMap.entries())
      .map(([label, count]) => ({ label, count, percentage: Math.round((count / n) * 100) }))
      .sort((a, b) => b.count - a.count);

    const topBuyingSignals = Array.from(buyingSignalsMap.entries())
      .map(([label, count]) => ({ label, count, percentage: Math.round((count / n) * 100) }))
      .sort((a, b) => b.count - a.count);

    // Compute Script Drop-Off Funnel & Diagnostic across active calls
    const callObjects = activeCalls.map(rawCall => ({
      ...rawCall,
      startedAt: rawCall.startedAt.toISOString(),
      endedAt: rawCall.endedAt ? rawCall.endedAt.toISOString() : undefined,
      transcript: (rawCall.transcript as any) || [],
      extractedVariables: (rawCall.extractedVariables as any) || {},
    }));
    const dropOffFunnel = callAnalyticsService.computeScriptDropOffFunnel(callObjects as any);

    const intelligenceSummary: DashboardIntelligenceSummary = {
      avgTalkListenRatio,
      avgQaScore,
      positiveSentimentRate,
      highIntentLeadRate,
      topObjections,
      topBuyingSignals,
      dropOffFunnel,
    };

    return {
      totalLeads,
      untouchedLeads,
      campaignsBuilt,
      callsAttempted,
      minutesUtilized: billing.totalMinutesUsed,
      leadsTrendPercentage: 0,
      untouchedTrendPercentage: 0,
      campaignsTrendPercentage: 0,
      callsTrendPercentage: completionRate,
      minutesTrendPercentage: 0,
      intelligenceSummary,
    };
  }

  /**
   * Generates real daily call attempts and completions from actual Call records over the last 7 calendar days.
   */
  async getCallActivityChart(): Promise<CallActivityPoint[]> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const calls = await prisma.call.findMany({
      where: {
        startedAt: { gte: sevenDaysAgo },
      },
      orderBy: { startedAt: 'asc' },
    });

    const daysMap = new Map<string, { attempts: number; completed: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      daysMap.set(key, { attempts: 0, completed: 0 });
    }

    for (const call of calls) {
      const key = new Date(call.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (daysMap.has(key)) {
        const entry = daysMap.get(key)!;
        entry.attempts += 1;
        if (call.status === 'completed' || call.durationSeconds > 0) {
          entry.completed += 1;
        }
      }
    }

    return Array.from(daysMap.entries()).map(([date, data]) => ({
      date,
      attempts: data.attempts,
      completed: data.completed,
    }));
  }

  /**
   * Dynamically compiles actual system activities from real Call, Campaign, and Agent database records.
   */
  async getRecentActivities(): Promise<RecentActivity[]> {
    const [recentCalls, recentCampaigns] = await Promise.all([
      prisma.call.findMany({
        take: 6,
        orderBy: { startedAt: 'desc' },
        include: { lead: true, agent: true },
      }),
      prisma.campaign.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' },
        include: { agent: true },
      }),
    ]);

    const activities: RecentActivity[] = [];

    for (const call of recentCalls) {
      const leadName = call.lead?.name || 'Customer';
      const outcomeText = call.outcome ? call.outcome.replace(/_/g, ' ') : 'initiated';
      activities.push({
        id: `act_${call.id}`,
        type: 'call_completed',
        title: `Outbound Call ${call.status === 'completed' ? 'Completed' : 'Initiated'} (${leadName})`,
        description: `Duration: ${call.durationSeconds}s • Outcome: ${outcomeText} • Provider ID: ${call.externalCallId.slice(0, 18)}...`,
        timestamp: call.startedAt.toISOString(),
        entityId: call.id,
      });
    }

    for (const cmp of recentCampaigns) {
      activities.push({
        id: `act_${cmp.id}`,
        type: 'campaign_started',
        title: `Campaign: ${cmp.name}`,
        description: `Agent: ${cmp.agent?.name || cmp.agentId} • Target Audience: ${cmp.totalLeads} lead(s) • Status: ${cmp.status}`,
        timestamp: cmp.createdAt.toISOString(),
        entityId: cmp.id,
      });
    }

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return activities.slice(0, 8);
  }
}

export const dashboardRepository = new DashboardRepository();
