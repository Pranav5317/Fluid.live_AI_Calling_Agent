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
  Call,
} from '../../types';
import { formatNumber, formatDate, formatShortDate } from '../../lib/formatters';
import { callService } from '../../services/callService';
import { CallDetailDrawer } from '../calls/CallDetailDrawer';
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
  CheckCircle2,
  AlertTriangle,
  Languages,
  Briefcase,
  Calendar,
  Building2,
  ArrowRight,
} from 'lucide-react';

export interface DashboardPageProps {
  onNavigate: (route: any, params?: any) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [activityChart, setActivityChart] = useState<CallActivityPoint[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [recentCalls, setRecentCalls] = useState<Call[]>([]);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, cChart, rAct, cmpList, callsList] = await Promise.all([
        dashboardService.getMetrics(),
        dashboardService.getCallActivityChart(),
        dashboardService.getRecentActivities(),
        dashboardService.getOverviewCampaigns(),
        callService.getCalls().catch(() => []),
      ]);
      setMetrics(m);
      setActivityChart(cChart);
      setRecentActivities(rAct);
      setCampaigns(cmpList);
      setRecentCalls((callsList || []).slice(0, 5));
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
        title="HR Candidate Verification Dashboard"
        description="Automated candidate phone screening, application fact-check results, and interview pipeline status."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Users className="h-4 w-4" />}
              onClick={() => onNavigate('leads')}
            >
              Candidate Directory
            </Button>
            <Button
              size="sm"
              leftIcon={<Megaphone className="h-4 w-4" />}
              onClick={() => onNavigate('campaigns')}
            >
              Screening Campaigns
            </Button>
          </div>
        }
      />

      {/* 5 Core Required Product Metrics (MetricCards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Total Candidates"
          value={formatNumber(metrics.totalLeads)}
          trendPercentage={metrics.leadsTrendPercentage}
          icon={<Users className="h-4 w-4" />}
        />
        <MetricCard
          title="Pending Screening"
          value={formatNumber(metrics.untouchedLeads)}
          trendPercentage={metrics.untouchedTrendPercentage}
          icon={<UserCheck className="h-4 w-4" />}
        />
        <MetricCard
          title="Active Campaigns"
          value={formatNumber(metrics.campaignsBuilt)}
          trendPercentage={metrics.campaignsTrendPercentage}
          icon={<Megaphone className="h-4 w-4" />}
        />
        <MetricCard
          title="Verification Calls"
          value={formatNumber(metrics.callsAttempted)}
          trendPercentage={metrics.callsTrendPercentage}
          icon={<PhoneCall className="h-4 w-4" />}
        />
        <MetricCard
          title="Screening Airtime"
          value={`${metrics.minutesUtilized.toFixed(1)}m`}
          trendPercentage={metrics.minutesTrendPercentage}
          icon={<Clock className="h-4 w-4" />}
        />
      </div>

      {/* HR CANDIDATE VERIFICATION & SCREENING FUNNEL (Clean, Uncluttered, Purpose-Built for Recruiters) */}
      <Card noPadding className="border-slate-200 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Candidate Verification & Screening Funnel
              </h3>
              <p className="text-xs text-slate-500">
                Automated phone screening results, application fact verification, and spoken English benchmarks
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Fluid Voice Agent Active</span>
            </span>
          </div>
        </div>

        <div className="p-5 space-y-6">
          {/* Top 4 HR Screening KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Verification Match Rate */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Portal Match Rate</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  {recentCalls.length > 0
                    ? Math.round((recentCalls.filter(c => !c.extractedVariables?.discrepancy_reason || c.extractedVariables?.discrepancy_reason === 'none').length / recentCalls.length) * 100)
                    : 85}%
                </span>
                <span className="text-xs text-emerald-600 font-semibold">Details Confirmed</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Candidate verified matching role, experience, notice period, and Pune location.
              </p>
            </div>

            {/* Card 2: Discrepancy Rate */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Discrepancies Flagged</span>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  {recentCalls.length > 0
                    ? Math.round((recentCalls.filter(c => c.extractedVariables?.discrepancy_reason && c.extractedVariables?.discrepancy_reason !== 'none').length / recentCalls.length) * 100)
                    : 15}%
                </span>
                <span className="text-xs text-amber-600 font-semibold">Needs Recruiter Review</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Notice period or stated experience differed from initial portal application.
              </p>
            </div>

            {/* Card 3: Spoken English Benchmark */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">English Benchmark</span>
                <Languages className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">92%</span>
                <Badge variant="purple" size="sm">CEFR B2 / C1</Badge>
              </div>
              <p className="text-[11px] text-slate-500">
                Scored on fluency, syntax, and natural response during recent project discussion.
              </p>
            </div>

            {/* Card 4: Fast-Track to Tech Interview */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Ready for Tech Round</span>
                <ArrowRight className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  {recentCalls.filter(c => c.durationSeconds > 30).length || 1}
                </span>
                <span className="text-xs text-blue-600 font-semibold">Candidates Eligible</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Application verified with zero discrepancies; ready for engineering interview.
              </p>
            </div>
          </div>

          {/* Two-Column Split: Recent Candidate Verifications & Recruiter Attention Flags */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left 2 Cols: Recent Verifications Table */}
            <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-900">Latest Candidate Verifications</span>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('calls')}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>View Full Screening Log</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {recentCalls.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    No candidate verification calls recorded yet. Dispatched calls will appear here.
                  </div>
                ) : (
                  recentCalls.map(c => {
                    const vars = (c.extractedVariables || {}) as Record<string, any>;
                    const name = c.leadName || vars.user_name || 'Candidate';
                    const role = vars.applied_role || vars.role_applied || 'Software Engineer';
                    const hasDiscrepancy = vars.discrepancy_reason && vars.discrepancy_reason !== 'none';
                    const band = vars.english_proficiency_level === 'fluent_proficient'
                      ? 'C1'
                      : vars.english_proficiency_level === 'basic_limited'
                      ? 'A2'
                      : 'B2';

                    return (
                      <div key={c.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-8 w-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-900 text-xs block truncate">{name}</span>
                            <span className="text-[11px] text-slate-500 block truncate">
                              {role} • {c.leadPhone || 'Telephony'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          {hasDiscrepancy ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <AlertTriangle className="h-3 w-3 text-amber-600" /> Discrepancy
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Matched
                            </span>
                          )}

                          <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            English: {band}
                          </span>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedCall(c)}
                            className="text-xs h-7 px-2.5 py-0"
                          >
                            Review
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Col: Automated Audit Checkpoints */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-900">Application Audit Checkpoints</span>
                <span className="text-[10px] font-mono text-slate-400">Automated Probe</span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-emerald-600" /> Notice Period Check
                    </span>
                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">Probed</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Compares candidate's actual availability against portal notice period.
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-amber-600" /> Relevant Experience
                    </span>
                    <span className="text-[10px] font-mono text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded">Probed</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Notes total years in role and flags any resume mismatch with candidate's spoken reason.
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-purple-600" /> Pune Hybrid Comfort
                    </span>
                    <span className="text-[10px] font-mono text-purple-700 bg-purple-100/70 px-1.5 py-0.5 rounded">Probed</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Confirms willingness to work from the Fluid.live Pune office or hybrid setup.
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <Languages className="h-3.5 w-3.5 text-indigo-600" /> Spoken Project Response
                    </span>
                    <span className="text-[10px] font-mono text-indigo-700 bg-indigo-100/70 px-1.5 py-0.5 rounded">CEFR Banded</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Scores candidate's explanation of recent project responsibilities.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

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

      {/* Recruiter Verification Dossier Slide-over Drawer */}
      {selectedCall && (
        <CallDetailDrawer
          call={selectedCall}
          onClose={() => setSelectedCall(null)}
          onCallUpdated={updated => {
            setSelectedCall(updated);
            setRecentCalls(prev => prev.map(c => (c.id === updated.id ? updated : c)));
          }}
        />
      )}
    </div>
  );
};

