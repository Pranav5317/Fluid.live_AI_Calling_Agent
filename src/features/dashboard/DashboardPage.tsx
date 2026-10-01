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

      {/* Main Overview Grid: Call Activity Chart & Recent System Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Call Activity Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-brand-600" />
                Call Activity & Completion
              </CardTitle>
              <CardDescription>Daily call attempts vs successful completed connections over time</CardDescription>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
                <span>Attempts</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span>Completed</span>
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
                        className="w-1/2 max-w-[16px] bg-slate-800 rounded-t transition-all group-hover:bg-slate-700"
                        title={`Attempts: ${pt.attempts}`}
                      />
                      {/* Bar 2: Completed */}
                      <div
                        style={{ height: `${completedHeight}%` }}
                        className="w-1/2 max-w-[16px] bg-emerald-500 rounded-t transition-all group-hover:bg-emerald-600"
                        title={`Completed: ${pt.completed}`}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-slate-500">{pt.date}</span>
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
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 mt-0.5">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 leading-snug">{act.title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{act.description}</p>
                  <span className="text-[10px] font-medium text-slate-400 mt-1 block">
                    {formatDate(act.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Campaign Overview Data Table */}
      <Card noPadding>
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Active Campaign Performance</h3>
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
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Campaign Name</th>
                <th className="px-5 py-3">Agent</th>
                <th className="px-5 py-3">Leads</th>
                <th className="px-5 py-3">Calls Attempted</th>
                <th className="px-5 py-3">Progress</th>
                <th className="px-5 py-3">Minutes Used</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {campaigns.map(cmp => {
                const progressPct = Math.round((cmp.completedCalls / (cmp.totalLeads || 1)) * 100);
                return (
                  <tr key={cmp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-slate-900">{cmp.name}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        <Bot className="h-3.5 w-3.5 text-slate-400" />
                        <span>{cmp.agentId}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono">{cmp.totalLeads}</td>
                    <td className="px-5 py-3.5 font-mono">{cmp.callsAttempted}</td>
                    <td className="px-5 py-3.5 w-40">
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-slate-900 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(progressPct, 100)}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-mono font-bold text-slate-700">{progressPct}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono">{cmp.minutesUsed.toFixed(1)}m</td>
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

