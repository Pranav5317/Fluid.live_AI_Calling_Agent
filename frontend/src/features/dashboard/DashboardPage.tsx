import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { MetricCard } from '../../components/common/MetricCard';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { dashboardService } from '../../services/dashboardService';
import {
  DashboardMetrics,
  CallActivityPoint,
  RecentActivity,
  Campaign,
} from '../../types';
import { formatNumber, formatDate, formatShortDate } from '../../lib/formatters';
import {
  Users,
  UserCheck,
  Megaphone,
  PhoneCall,
  Clock,
  ArrowUpRight,
  Play,
  Pause,
  Activity,
  ChevronRight,
  Bot,
  Sparkles,
  ShieldCheck,
  BarChart2,
  ThumbsUp,
  Zap,
  TrendingDown,
  Lightbulb,
} from 'lucide-react';

export interface DashboardPageProps {
  onNavigate: (route: any, params?: any) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [activityChart, setActivityChart] = useState<CallActivityPoint[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, cChart, rAct, cmpList] = await Promise.all([
        dashboardService.getMetrics(),
        dashboardService.getCallActivityChart(),
        dashboardService.getRecentActivities(),
        dashboardService.getOverviewCampaigns(),
      ]);
      setMetrics(m);
      setActivityChart(cChart);
      setRecentActivities(rAct);
      setCampaigns(cmpList);
    } catch (err: any) {
      setError(err?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <LoadingState label="Loading overview metrics & activity..." />;
  if (error || !metrics)
    return <ErrorState message={error || 'Failed to initialize metrics'} onRetry={loadData} />;

  // Max value for SVG activity chart scaling
  const maxAttempts = Math.max(...activityChart.map(p => p.attempts), 10);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Dashboard"
        description="Real-time operational summary, call volume trends, active campaigns and agent performance."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Users className="h-4 w-4" />}
              onClick={() => onNavigate('leads')}
            >
              Manage Leads
            </Button>
            <Button
              size="sm"
              leftIcon={<Megaphone className="h-4 w-4" />}
              onClick={() => onNavigate('campaigns')}
            >
              Launch Campaign
            </Button>
          </div>
        }
      />

      {/* 5 Core Required Product Metrics (MetricCards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Number of Leads"
          value={formatNumber(metrics.totalLeads)}
          trendPercentage={metrics.leadsTrendPercentage}
          icon={<Users className="h-4 w-4" />}
        />
        <MetricCard
          title="Untouched Leads"
          value={formatNumber(metrics.untouchedLeads)}
          trendPercentage={metrics.untouchedTrendPercentage}
          icon={<UserCheck className="h-4 w-4" />}
        />
        <MetricCard
          title="Campaigns Built"
          value={formatNumber(metrics.campaignsBuilt)}
          trendPercentage={metrics.campaignsTrendPercentage}
          icon={<Megaphone className="h-4 w-4" />}
        />
        <MetricCard
          title="Calls Attempted"
          value={formatNumber(metrics.callsAttempted)}
          trendPercentage={metrics.callsTrendPercentage}
          icon={<PhoneCall className="h-4 w-4" />}
        />
        <MetricCard
          title="Minutes Utilized"
          value={`${metrics.minutesUtilized.toFixed(1)}m`}
          trendPercentage={metrics.minutesTrendPercentage}
          icon={<Clock className="h-4 w-4" />}
        />
      </div>

      {/* Call Quality & Script Compliance Insights */}
      {metrics.intelligenceSummary && (
        <Card noPadding className="border-slate-200 overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Call Quality & Intent Insights
                </h3>
                <p className="text-xs text-slate-500">
                  Real-time conversational dynamics, compliance score, and detected customer intent
                </p>
              </div>
            </div>
            <Badge variant="neutral" size="sm">
              Live Analytics
            </Badge>
          </div>

          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Metric 1: Avg Talk-to-Listen Ratio */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">
                    Talk-to-Listen Ratio
                  </span>
                  <BarChart2 className="h-4 w-4 text-slate-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-slate-900">
                    {metrics.intelligenceSummary.avgTalkListenRatio.agentPct}% / {metrics.intelligenceSummary.avgTalkListenRatio.leadPct}%
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${metrics.intelligenceSummary.avgTalkListenRatio.agentPct}%` }}
                    className="bg-blue-600 h-full"
                    title={`Agent: ${metrics.intelligenceSummary.avgTalkListenRatio.agentPct}%`}
                  />
                  <div
                    style={{ width: `${metrics.intelligenceSummary.avgTalkListenRatio.leadPct}%` }}
                    className="bg-emerald-500 h-full"
                    title={`Lead: ${metrics.intelligenceSummary.avgTalkListenRatio.leadPct}%`}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                  <span>Agent ({metrics.intelligenceSummary.avgTalkListenRatio.agentPct}%)</span>
                  <span>Lead ({metrics.intelligenceSummary.avgTalkListenRatio.leadPct}%)</span>
                </div>
              </div>

              {/* Metric 2: Script Compliance Score */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">
                    Script Compliance
                  </span>
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-slate-900">
                    {metrics.intelligenceSummary.avgQaScore}<span className="text-xs font-normal text-slate-400">/100</span>
                  </span>
                  <Badge variant={metrics.intelligenceSummary.avgQaScore >= 80 ? 'success' : 'warning'} size="sm">
                    {metrics.intelligenceSummary.avgQaScore >= 90 ? 'Grade A+' : metrics.intelligenceSummary.avgQaScore >= 80 ? 'Grade A' : 'Grade B'}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500">
                  Automated checklist: intro, verification, pitch, consent, sign-off
                </p>
              </div>

              {/* Metric 3: High-Intent Lead Conversion */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">
                    High-Intent Rate
                  </span>
                  <Zap className="h-4 w-4 text-amber-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-slate-900">
                    {metrics.intelligenceSummary.highIntentLeadRate}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Calls exhibiting buying interest or demo requests
                </p>
              </div>

              {/* Metric 4: Positive Dialogue Sentiment */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">
                    Positive Sentiment
                  </span>
                  <ThumbsUp className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-slate-900">
                    {metrics.intelligenceSummary.positiveSentimentRate}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Positive emotional trajectory across completed dialogue
                </p>
              </div>
            </div>

            {/* Top Buying Signals & Objections Breakdown */}
            {metrics.intelligenceSummary.topBuyingSignals.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-semibold text-slate-900 block mb-2 text-xs">
                    Top Detected Intent Signals
                  </span>
                  <div className="space-y-1.5">
                    {metrics.intelligenceSummary.topBuyingSignals.map((sig, i) => (
                      <div key={i} className="flex items-center justify-between text-slate-700">
                        <span className="truncate pr-2 font-medium">• {sig.label}</span>
                        <span className="font-mono text-slate-500 shrink-0">{sig.count} calls ({sig.percentage}%)</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-semibold text-slate-900 block mb-2 text-xs">
                    Customer Objections & Hesitation
                  </span>
                  {metrics.intelligenceSummary.topObjections.length === 0 ? (
                    <p className="text-slate-400 italic text-xs">
                      Zero objections recorded across completed campaigns.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {metrics.intelligenceSummary.topObjections.map((obj, i) => (
                        <div key={i} className="flex items-center justify-between text-slate-700">
                          <span className="truncate pr-2 font-medium">• {obj.label}</span>
                          <span className="font-mono text-amber-600 font-semibold shrink-0">{obj.count} calls ({obj.percentage}%)</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Conversational Script Drop-Off Funnel */}
            {metrics.intelligenceSummary.dropOffFunnel && (
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                      <TrendingDown className="h-4 w-4 text-rose-500" />
                      <span>Script Drop-Off by Stage</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Stage retention across {metrics.intelligenceSummary.dropOffFunnel.totalConnectedCalls} connected calls
                    </p>
                  </div>
                  <Badge variant="warning" size="sm">
                    Top Drop: {metrics.intelligenceSummary.dropOffFunnel.biggestDropOffStage}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  {metrics.intelligenceSummary.dropOffFunnel.stages.map((stage, idx) => {
                    const isBiggest = stage.stageName === metrics.intelligenceSummary?.dropOffFunnel?.biggestDropOffStage;
                    return (
                      <div
                        key={stage.stageId}
                        className={`p-3 rounded-xl border transition-all ${
                          isBiggest
                            ? 'bg-rose-50/70 border-rose-200'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold uppercase">
                          <span>Step {idx + 1}</span>
                          {stage.dropOffCount > 0 && (
                            <span className="text-rose-600 font-medium">-{stage.dropOffCount}</span>
                          )}
                        </div>

                        <span className="text-xs font-semibold text-slate-900 block mt-1 line-clamp-1" title={stage.stageName}>
                          {stage.stageName}
                        </span>

                        <div className="mt-2 space-y-1">
                          <div className="flex items-baseline justify-between text-xs">
                            <span className="text-sm font-bold text-slate-900">
                              {stage.retentionRate}%
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {stage.callsReached} calls
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${stage.retentionRate}%` }}
                              className={`h-full rounded-full transition-all ${
                                isBiggest ? 'bg-rose-500' : 'bg-blue-600'
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Script Recommendation Banner */}
                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start gap-2.5 text-xs text-blue-900">
                  <Lightbulb className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-blue-950 block">
                      Script Optimization Tip
                    </span>
                    <p className="mt-0.5 text-blue-800 leading-relaxed">
                      {metrics.intelligenceSummary.dropOffFunnel.scriptRecommendation}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Main Overview Grid: Call Activity Chart & Recent System Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Call Activity Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2 text-slate-950 font-bold">
                <Activity className="h-4 w-4 text-[#1D4ED8]" />
                Call Activity & Completion
              </CardTitle>
              <CardDescription>Daily call attempts vs successful completed connections over time</CardDescription>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#1D4ED8]" />
                <span className="text-slate-700">Attempts</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                <span className="text-slate-700">Completed</span>
              </div>
            </div>
          </CardHeader>

          {/* Time Series SVG Bar Visualization */}
          <div className="mt-4 pt-2">
            <div className="h-48 flex items-end justify-between gap-3 px-2">
              {activityChart.map((pt, i) => {
                const attemptHeight = (pt.attempts / maxAttempts) * 100;
                const completedHeight = (pt.completed / maxAttempts) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                    <div className="w-full flex items-end justify-center gap-1 h-36 relative">
                      {/* Bar 1: Attempts */}
                      <div
                        style={{ height: `${attemptHeight}%` }}
                        className="w-1/2 max-w-[16px] bg-[#1D4ED8] rounded-t-full transition-all group-hover:brightness-110 shadow-xs"
                        title={`Attempts: ${pt.attempts}`}
                      />
                      {/* Bar 2: Completed */}
                      <div
                        style={{ height: `${completedHeight}%` }}
                        className="w-1/2 max-w-[16px] bg-emerald-500 rounded-t-full transition-all group-hover:brightness-110 shadow-xs"
                        title={`Completed: ${pt.completed}`}
                      />
                    </div>
                    <span className="text-[10px] font-mono font-medium text-slate-500">{pt.date}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Recent Activity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest campaign & system events</CardDescription>
          </CardHeader>
          <div className="space-y-3 mt-2">
            {recentActivities.map(act => (
              <div key={act.id} className="flex items-start gap-3 text-xs border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 border border-blue-100 text-blue-600 mt-0.5 shadow-2xs">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 leading-snug">{act.title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{act.description}</p>
                  <span className="text-[10px] font-mono text-slate-400 mt-1 block">
                    {formatDate(act.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Campaign Overview Data Table */}
      <Card noPadding className="overflow-hidden border-slate-200 shadow-xs">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-950 tracking-tight">Active Campaign Performance</h3>
            <p className="text-xs text-slate-500">Live progress tracking across assigned AI calling agents</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            rightIcon={<ChevronRight className="h-4 w-4" />}
            onClick={() => onNavigate('campaigns')}
          >
            View All Campaigns
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200 font-mono">
              <tr>
                <th className="px-5 py-3.5">Campaign Name</th>
                <th className="px-5 py-3.5">Agent</th>
                <th className="px-5 py-3.5">Leads</th>
                <th className="px-5 py-3.5">Calls Attempted</th>
                <th className="px-5 py-3.5">Progress</th>
                <th className="px-5 py-3.5">Minutes Used</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {campaigns.map(cmp => {
                const progressPct = Math.round((cmp.completedCalls / (cmp.totalLeads || 1)) * 100);
                return (
                  <tr key={cmp.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-950">{cmp.name}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        <Bot className="h-3.5 w-3.5 text-blue-600" />
                        <span>{cmp.agentId}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-800">{cmp.totalLeads}</td>
                    <td className="px-5 py-3.5 font-mono text-slate-800">{cmp.callsAttempted}</td>
                    <td className="px-5 py-3.5 w-40">
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full transition-all"
                            style={{ width: `${Math.min(progressPct, 100)}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-mono font-bold text-slate-800">{progressPct}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-800">{cmp.minutesUsed.toFixed(1)}m</td>
                    <td className="px-5 py-3.5">
                      <Badge
                        variant={
                          cmp.status === 'running'
                            ? 'success'
                            : cmp.status === 'paused'
                            ? 'warning'
                            : cmp.status === 'completed'
                            ? 'neutral'
                            : 'info'
                        }
                        dot
                      >
                        {cmp.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onNavigate('campaigns')}
                      >
                        Details
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

