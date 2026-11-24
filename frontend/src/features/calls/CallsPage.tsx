import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { CallDetailDrawer } from './CallDetailDrawer';
import { callService } from '../../services/callService';
import { sarvamService } from '../../services/sarvamService';
import { Call, CallStatus, CallOutcome } from '../../types';
import { formatDuration, formatDate } from '../../lib/formatters';
import { exportCallsToCSV } from '../../lib/exportUtils';
import {
  Search,
  Download,
  RotateCw,
  Phone,
  UserCheck,
  Languages,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Clock,
  Sparkles,
  TrendingUp,
  BarChart2,
  Target,
  Flame,
  User,
  Bot,
} from 'lucide-react';

export const CallsPage: React.FC = () => {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CallStatus | 'all'>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<CallOutcome | 'all'>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [sentimentFilter, setSentimentFilter] = useState<string>('all');
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);

  const fetchCalls = async () => {
    setLoading(true);
    try {
      const data = await callService.getCalls({
        search: search || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        outcome: outcomeFilter === 'all' ? undefined : outcomeFilter,
      });
      setCalls(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    try {
      await callService.syncAllCalls();
      await fetchCalls();
    } catch (err: any) {
      console.error('Failed to sync calls:', err);
    } finally {
      setSyncingAll(false);
    }
  };

  const handleCallUpdated = (updatedCall: Call) => {
    setSelectedCall(updatedCall);
    setCalls(prev => prev.map(c => (c.id === updatedCall.id ? updatedCall : c)));
  };

  useEffect(() => {
    fetchCalls();
  }, [search, statusFilter, outcomeFilter]);

  const getOutcomeBadgeVariant = (outcome: CallOutcome) => {
    switch (outcome) {
      case 'successful_contact':
        return 'success';
      case 'callback_requested':
        return 'brand';
      case 'not_interested':
        return 'warning';
      case 'unreachable':
      case 'technical_failure':
        return 'danger';
      case 'voicemail_left':
        return 'purple';
      default:
        return 'neutral';
    }
  };

  // Compute filtered calls
  const filteredCalls = calls.filter(call => {
    const intel = call.extractedVariables?.intelligence;
    if (tierFilter !== 'all') {
      const tier = intel?.leadScore?.tier;
      if (tier !== tierFilter) return false;
    }
    if (sentimentFilter !== 'all') {
      const sent = intel?.sentimentTrajectory?.overallSentiment;
      if (sent !== sentimentFilter) return false;
    }
    return true;
  });

  // KPI Metrics Calculation
  const totalCalls = calls.length;
  const qualifiedCalls = calls.filter(c => {
    const tier = c.extractedVariables?.intelligence?.leadScore?.tier;
    return tier === 'Hot Lead' || tier === 'Warm Prospect';
  }).length;
  const qualifiedRate = totalCalls > 0 ? Math.round((qualifiedCalls / totalCalls) * 100) : 0;
  const positiveSentimentCount = calls.filter(c => {
    const sent = c.extractedVariables?.intelligence?.sentimentTrajectory?.overallSentiment;
    return sent === 'positive';
  }).length;
  const positiveRate = totalCalls > 0 ? Math.round((positiveSentimentCount / totalCalls) * 100) : 0;
  const totalDuration = calls.reduce((acc, c) => acc + (c.durationSeconds || 0), 0);
  const avgDuration = totalCalls > 0 ? formatDuration(Math.round(totalDuration / totalCalls)) : '0s';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Voice Calling Sessions & AI Intelligence"
        description="Review real-time conversational analysis, BANT lead qualification, sentiment trajectories, and audio recordings."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RotateCw className={`h-4 w-4 text-blue-600 ${syncingAll ? 'animate-spin' : ''}`} />}
              onClick={handleSyncAll}
              disabled={syncingAll || loading}
              className="border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
            >
              {syncingAll ? 'Syncing...' : 'Sync Sarvam Telemetry'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="h-4 w-4 text-slate-500" />}
              onClick={() => exportCallsToCSV(calls, 'fluid_live_call_intelligence')}
              disabled={calls.length === 0}
              className="border-slate-200 text-slate-700"
            >
              Export CSV
            </Button>
          </div>
        }
      />

      {/* KPI Performance Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Total Dialogues</span>
            <Phone className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-sans">{totalCalls}</div>
          <span className="text-[11px] text-slate-500">Recorded call sessions</span>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Qualified Leads</span>
            <Target className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-sans">{qualifiedRate}%</div>
          <span className="text-[11px] text-emerald-600 font-medium">{qualifiedCalls} Hot & Warm prospects</span>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Positive Sentiment</span>
            <TrendingUp className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-sans">{positiveRate}%</div>
          <span className="text-[11px] text-indigo-600 font-medium">Receptive conversations</span>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Avg Call Airtime</span>
            <Clock className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-sans font-mono">{avgDuration}</div>
          <span className="text-[11px] text-slate-500">Per connected session</span>
        </div>
      </div>

      {/* Filter Bar */}
      <Card noPadding className="overflow-hidden border-slate-200 shadow-xs">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="w-full md:w-72">
            <Input
              placeholder="Search by contact, phone, or topic..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              leftIcon={<Search className="h-4 w-4 text-slate-400" />}
              className="border-slate-200 bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <Select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'completed', label: 'Completed' },
                { value: 'failed', label: 'Failed' },
                { value: 'in-progress', label: 'In Progress' },
              ]}
              className="border-slate-200 text-xs"
            />
            <Select
              value={outcomeFilter}
              onChange={e => setOutcomeFilter(e.target.value as any)}
              options={[
                { value: 'all', label: 'All Outcomes' },
                { value: 'successful_contact', label: 'Verified Contact' },
                { value: 'callback_requested', label: 'Callback Requested' },
                { value: 'not_interested', label: 'Not Interested' },
                { value: 'unreachable', label: 'Unreachable' },
              ]}
              className="border-slate-200 text-xs"
            />
            <Select
              value={tierFilter}
              onChange={e => setTierFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Lead Tiers' },
                { value: 'Hot Lead', label: 'Hot Lead' },
                { value: 'Warm Prospect', label: 'Warm Prospect' },
                { value: 'Cold / Disqualified', label: 'Disqualified' },
              ]}
              className="border-slate-200 text-xs"
            />
            <Select
              value={sentimentFilter}
              onChange={e => setSentimentFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Sentiments' },
                { value: 'positive', label: 'Positive' },
                { value: 'neutral', label: 'Neutral' },
                { value: 'negative', label: 'Negative' },
              ]}
              className="border-slate-200 text-xs"
            />
          </div>
        </div>

        {loading ? (
          <LoadingState label="Fetching call intelligence records..." />
        ) : filteredCalls.length === 0 ? (
          <EmptyState
            title="No call records found"
            description="Calls will appear here once conversations are dispatched or when you click Sync Sarvam Telemetry."
          />
        ) : (
          <div className="divide-y divide-slate-100 bg-white">
            {filteredCalls.map(call => {
              const vars = (call.extractedVariables || {}) as Record<string, any>;
              const intel = vars.intelligence;
              const candidateName = call.leadName || vars.user_name || 'Contact';
              const roleApplied = vars.role_applied || vars.applied_role || (call as any).campaign?.name || 'Applicant';
              
              const leadScore = intel?.leadScore;
              const tier = leadScore?.tier || (call.durationSeconds > 60 ? 'Warm Prospect' : 'Cold / Disqualified');
              const score = leadScore?.overallScore ?? (call.durationSeconds > 60 ? 70 : 30);
              
              const sentiment = intel?.sentimentTrajectory;
              const overallSent = sentiment?.overallSentiment || (call.durationSeconds > 30 ? 'positive' : 'neutral');
              
              const talk = intel?.talkToListen;
              const agentPct = talk?.agentTalkPercentage ?? 60;
              const leadPct = talk?.leadTalkPercentage ?? 40;

              return (
                <div
                  key={call.id}
                  onClick={() => setSelectedCall(call)}
                  className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 transition-all cursor-pointer group select-none"
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedCall(call);
                    }
                  }}
                >
                  {/* 1. Contact & Role */}
                  <div className="flex items-center gap-3.5 min-w-0 md:w-1/3">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0 border border-blue-100 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-colors">
                      {candidateName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm truncate group-hover:text-blue-600 transition-colors">
                          {candidateName}
                        </span>
                        {vars.discrepancy_reason && vars.discrepancy_reason !== 'none' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="h-3 w-3 text-amber-600" /> Discrepancy
                          </span>
                        ) : (
                          <Badge
                            variant={call.durationSeconds > 40 ? 'success' : 'neutral'}
                            size="sm"
                          >
                            {call.durationSeconds > 40 ? 'Verified' : 'Screened'}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                        <span className="truncate">{roleApplied}</span>
                        {call.leadPhone && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="font-mono text-[11px] text-slate-400">{call.leadPhone}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 2. Timing, Outcome & Key Indicators */}
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>{formatDuration(call.durationSeconds)}</span>
                      <span>•</span>
                      <span>{formatDate(call.startedAt)}</span>
                    </div>

                    <Badge variant={getOutcomeBadgeVariant(call.outcome)} dot size="sm">
                      {call.outcome ? call.outcome.replace('_', ' ') : 'initiated'}
                    </Badge>

                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      overallSent === 'positive'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : overallSent === 'negative'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      <Sparkles className="h-3 w-3" />
                      <span className="capitalize">{overallSent}</span>
                    </span>

                    <div className="hidden lg:flex items-center gap-2">
                      <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden flex">
                        <div className="h-full bg-blue-600" style={{ width: `${agentPct}%` }} />
                        <div className="h-full bg-emerald-500" style={{ width: `${leadPct}%` }} />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{agentPct}/{leadPct}</span>
                    </div>
                  </div>

                  {/* 3. Friendly Call to Action indicator */}
                  <div className="flex items-center gap-1.5 shrink-0 text-blue-600 font-semibold text-xs group-hover:text-blue-700">
                    <span>View Analysis</span>
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1 text-slate-400 group-hover:text-blue-600" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Slide-over Call Detail Drawer */}
      {selectedCall && (
        <CallDetailDrawer
          call={selectedCall}
          onCallUpdated={handleCallUpdated}
          onClose={() => {
            setSelectedCall(null);
            fetchCalls();
          }}
        />
      )}
    </div>
  );
};
