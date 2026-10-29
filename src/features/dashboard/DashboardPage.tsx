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
        title="Dashboard Overview"
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

      {/* Enterprise Conversational Intelligence & Script Audit Summary */}
      {metrics.intelligenceSummary && (
        <Card className="border-indigo-500/20 bg-gradient-to-br from-indigo-950/40 via-[#0A0E24]/90 to-purple-950/30">
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-2xl bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.25)]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-white">
                    Enterprise Conversational Intelligence & Quality Assurance
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Real-time conversational dynamics, script compliance audits, and intent signal analytics
                  </CardDescription>
                </div>
              </div>
              <Badge variant="neutral" size="sm" className="bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 rounded-full font-mono">
                Autonomous Engine
              </Badge>
            </div>
          </CardHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
            {/* Metric 1: Avg Talk-to-Listen Ratio */}
            <div className="p-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Talk-to-Listen Ratio
                </span>
                <BarChart2 className="h-4 w-4 text-indigo-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold font-mono text-white">
                  {metrics.intelligenceSummary.avgTalkListenRatio.agentPct}% / {metrics.intelligenceSummary.avgTalkListenRatio.leadPct}%
                </span>
              </div>
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden flex shadow-inner">
                <div
                  style={{ width: `${metrics.intelligenceSummary.avgTalkListenRatio.agentPct}%` }}
                  className="bg-indigo-500 h-full"
                  title={`Agent: ${metrics.intelligenceSummary.avgTalkListenRatio.agentPct}%`}
                />
                <div
                  style={{ width: `${metrics.intelligenceSummary.avgTalkListenRatio.leadPct}%` }}
                  className="bg-emerald-500 h-full"
                  title={`Lead: ${metrics.intelligenceSummary.avgTalkListenRatio.leadPct}%`}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                <span>Agent Airtime</span>
                <span>Customer Response</span>
              </div>
            </div>

            {/* Metric 2: Script Compliance Score */}
            <div className="p-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  QA Script Audit Score
                </span>
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold font-mono text-white">
                  {metrics.intelligenceSummary.avgQaScore}/100
                </span>
                <Badge variant={metrics.intelligenceSummary.avgQaScore >= 80 ? 'success' : 'warning'} size="sm">
                  {metrics.intelligenceSummary.avgQaScore >= 90 ? 'Grade A+' : metrics.intelligenceSummary.avgQaScore >= 80 ? 'Grade A' : 'Grade B'}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400">
                5-point automated script audit: intro, verification, pitch, consent, sign-off
              </p>
            </div>

            {/* Metric 3: High-Intent Lead Conversion */}
            <div className="p-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  High-Intent Lead Rate
                </span>
                <Zap className="h-4 w-4 text-amber-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold font-mono text-white">
                  {metrics.intelligenceSummary.highIntentLeadRate}%
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Calls exhibiting high-converting intent (WhatsApp/Demo request)
              </p>
            </div>

            {/* Metric 4: Positive Dialogue Sentiment */}
            <div className="p-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Positive Sentiment Rate
                </span>
                <ThumbsUp className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold font-mono text-white">
                  {metrics.intelligenceSummary.positiveSentimentRate}%
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Multi-phase sentiment trajectory (opening → pitch → close)
              </p>
            </div>
          </div>

          {/* Top Buying Signals & Objections Breakdown */}
          {metrics.intelligenceSummary.topBuyingSignals.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/[0.08] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                <span className="font-bold text-slate-200 block mb-2 text-[11px] uppercase tracking-wider font-mono">
                  Top Detected Intent Signals
                </span>
                <div className="space-y-1.5">
                  {metrics.intelligenceSummary.topBuyingSignals.map((sig, i) => (
                    <div key={i} className="flex items-center justify-between text-slate-300">
                      <span className="truncate pr-2 font-medium">• {sig.label}</span>
                      <span className="font-mono font-bold text-indigo-400 shrink-0">{sig.count} calls ({sig.percentage}%)</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                <span className="font-bold text-slate-200 block mb-2 text-[11px] uppercase tracking-wider font-mono">
                  Customer Objections & Hesitation
                </span>
                {metrics.intelligenceSummary.topObjections.length === 0 ? (
                  <p className="text-slate-400 italic text-[11px]">
                    Zero friction or objections recorded across completed campaigns.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {metrics.intelligenceSummary.topObjections.map((obj, i) => (
                      <div key={i} className="flex items-center justify-between text-slate-300">
                        <span className="truncate pr-2 font-medium">• {obj.label}</span>
                        <span className="font-mono font-bold text-amber-400 shrink-0">{obj.count} calls ({obj.percentage}%)</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Conversational Script Drop-Off Funnel & Waterfall */}
          {metrics.intelligenceSummary.dropOffFunnel && (
            <div className="mt-4 pt-4 border-t border-white/[0.08] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5 font-mono">
                    <TrendingDown className="h-4 w-4 text-rose-400" />
                    <span>Script Drop-Off Waterfall & Dialogue Retention</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Stage-by-stage conversational retention analysis across {metrics.intelligenceSummary.dropOffFunnel.totalConnectedCalls} active call sessions
                  </p>
                </div>
                <Badge variant="warning" size="sm">
                  Top Drop: {metrics.intelligenceSummary.dropOffFunnel.biggestDropOffStage}
                </Badge>
              </div>

              {/* 5-Stage Waterfall Funnel Graphic */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                {metrics.intelligenceSummary.dropOffFunnel.stages.map((stage, idx) => {
                  const isBiggest = stage.stageName === metrics.intelligenceSummary?.dropOffFunnel?.biggestDropOffStage;
                  return (
                    <div
                      key={stage.stageId}
                      className={`p-3 rounded-2xl border transition-all ${
                        isBiggest
                          ? 'bg-rose-500/10 border-rose-500/30 ring-1 ring-rose-400/30'
                          : 'bg-white/[0.03] border-white/[0.08]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase font-mono">
                        <span>Step {idx + 1}</span>
                        {stage.dropOffCount > 0 && (
                          <span className="text-rose-400 font-mono font-bold">-{stage.dropOffCount} left</span>
                        )}
                      </div>

                      <span className="text-xs font-bold text-white block mt-1 line-clamp-1" title={stage.stageName}>
                        {stage.stageName}
                      </span>

                      <div className="mt-2 space-y-1">
                        <div className="flex items-baseline justify-between text-xs">
                          <span className="text-base font-bold font-mono text-white">
                            {stage.retentionRate}%
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {stage.callsReached} calls
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${stage.retentionRate}%` }}
                            className={`h-full rounded-full transition-all ${
                              isBiggest ? 'bg-rose-500' : 'bg-indigo-500'
                            }`}
                          />
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-400 mt-2 line-clamp-2 leading-tight">
                        {stage.description}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* AI Script Recommendation Banner */}
              <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex items-start gap-2.5 text-xs text-indigo-200">
                <Lightbulb className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold uppercase tracking-wider text-[10px] text-indigo-300 block font-mono">
                    Autonomous Script Optimization Recommendation
                  </span>
                  <p className="mt-0.5 text-slate-300 leading-relaxed">
                    {metrics.intelligenceSummary.dropOffFunnel.scriptRecommendation}
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Main Overview Grid: Call Activity Chart & Recent System Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Call Activity Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2 text-white">
                <Activity className="h-4 w-4 text-indigo-400" />
                Call Activity & Completion
              </CardTitle>
              <CardDescription className="text-slate-400">Daily call attempts vs successful completed connections over time</CardDescription>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                <span className="text-slate-300">Attempts</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                <span className="text-slate-300">Completed</span>
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
                        className="w-1/2 max-w-[16px] bg-gradient-to-t from-indigo-700 to-indigo-500 rounded-t-full transition-all group-hover:brightness-125"
                        title={`Attempts: ${pt.attempts}`}
                      />
                      {/* Bar 2: Completed */}
                      <div
                        style={{ height: `${completedHeight}%` }}
                        className="w-1/2 max-w-[16px] bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-full transition-all group-hover:brightness-125 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                        title={`Completed: ${pt.completed}`}
                      />
                    </div>
                    <span className="text-[10px] font-mono font-medium text-slate-400">{pt.date}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Recent Activity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-white">Recent Activity</CardTitle>
            <CardDescription className="text-slate-400">Latest campaign & system events</CardDescription>
          </CardHeader>
          <div className="space-y-3 mt-2">
            {recentActivities.map(act => (
              <div key={act.id} className="flex items-start gap-3 text-xs border-b border-white/[0.06] pb-3 last:border-0 last:pb-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.06] border border-white/[0.08] text-indigo-400 mt-0.5 shadow-sm">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="font-semibold text-white leading-snug">{act.title}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{act.description}</p>
                  <span className="text-[10px] font-mono text-slate-500 mt-1 block">
                    {formatDate(act.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Campaign Overview Data Table */}
      <Card noPadding className="overflow-hidden">
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Active Campaign Performance</h3>
            <p className="text-xs text-slate-400">Live progress tracking across assigned AI calling agents</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            rightIcon={<ChevronRight className="h-4 w-4" />}
            onClick={() => onNavigate('campaigns')}
            className="rounded-full"
          >
            View All Campaigns
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-white/[0.02] text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/[0.08] font-mono">
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
            <tbody className="divide-y divide-white/[0.04] bg-transparent">
              {campaigns.map(cmp => {
                const progressPct = Math.round((cmp.completedCalls / (cmp.totalLeads || 1)) * 100);
                return (
                  <tr key={cmp.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-5 py-3.5 font-bold text-white">{cmp.name}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 font-medium text-slate-300">
                        <Bot className="h-3.5 w-3.5 text-indigo-400" />
                        <span>{cmp.agentId}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-200">{cmp.totalLeads}</td>
                    <td className="px-5 py-3.5 font-mono text-slate-200">{cmp.callsAttempted}</td>
                    <td className="px-5 py-3.5 w-40">
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-blue-600 to-indigo-500 h-2 rounded-full transition-all shadow-[0_0_10px_rgba(79,70,229,0.5)]"
                            style={{ width: `${Math.min(progressPct, 100)}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-mono font-bold text-slate-300">{progressPct}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-200">{cmp.minutesUsed.toFixed(1)}m</td>
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
                        className="rounded-full"
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

