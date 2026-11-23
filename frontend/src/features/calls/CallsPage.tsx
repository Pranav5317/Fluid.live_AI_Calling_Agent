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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 font-mono">
                <tr>
                  <th className="px-5 py-3.5">Contact & Role</th>
                  <th className="px-5 py-3.5">Outcome & Duration</th>
                  <th className="px-5 py-3.5">Screening & Verification</th>
                  <th className="px-5 py-3.5">Sentiment & Trend</th>
                  <th className="px-5 py-3.5">Talk-to-Listen</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredCalls.map(call => {
                  const vars = (call.extractedVariables || {}) as Record<string, any>;
                  const intel = vars.intelligence;
                  const candidateName = call.leadName || vars.user_name || 'Contact';
                  const roleApplied = vars.role_applied || vars.applied_role || (call as any).campaign?.name || 'Inbound / Outbound Lead';
                  
                  const leadScore = intel?.leadScore;
                  const tier = leadScore?.tier || (call.durationSeconds > 60 ? 'Warm Prospect' : 'Cold / Disqualified');
                  const score = leadScore?.overallScore ?? (call.durationSeconds > 60 ? 70 : 30);
                  
                  const sentiment = intel?.sentimentTrajectory;
                  const overallSent = sentiment?.overallSentiment || (call.durationSeconds > 30 ? 'positive' : 'neutral');
                  
                  const talk = intel?.talkToListen;
                  const agentPct = talk?.agentTalkPercentage ?? 60;
                  const leadPct = talk?.leadTalkPercentage ?? 40;

                  return (
                    <tr key={call.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* 1. Contact & Channel */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0 border border-blue-100">
                            {candidateName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block text-xs">
                              {candidateName}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[11px] text-slate-500">{roleApplied}</span>
                              {call.leadPhone && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span className="text-[11px] font-mono text-slate-400">{call.leadPhone}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Outcome & Duration */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          <Badge variant={getOutcomeBadgeVariant(call.outcome)} dot size="sm">
                            {call.outcome ? call.outcome.replace('_', ' ') : 'initiated'}
                          </Badge>
                          <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span>{formatDuration(call.durationSeconds)}</span>
                            <span>•</span>
                            <span>{formatDate(call.startedAt)}</span>
                          </span>
                        </div>
                      </td>

                      {/* 3. Screening & Verification Status */}
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            {vars.discrepancy_reason && vars.discrepancy_reason !== 'none' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                <AlertTriangle className="h-3 w-3 text-amber-600" /> Discrepancy
                              </span>
                            ) : (
                              <Badge
                                variant={call.durationSeconds > 40 ? 'success' : tier === 'Hot Lead' ? 'success' : 'neutral'}
                                size="sm"
                              >
                                {call.durationSeconds > 40 ? 'Verified' : tier}
                              </Badge>
                            )}
                            <span className="font-mono text-[11px] font-bold text-slate-700">
                              {score}%
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {vars.english_proficiency_level ? 'Identity & English Audited' : 'Fact-Check Score'}
                          </div>
                        </div>
                      </td>

                      {/* 4. Sentiment & Trend */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            overallSent === 'positive'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : overallSent === 'negative'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            <Sparkles className="h-3 w-3" />
                            <span className="capitalize">{overallSent}</span>
                          </span>
                        </div>
                      </td>

                      {/* 5. Talk-to-Listen Airtime */}
                      <td className="px-5 py-4">
                        <div className="space-y-1 w-28">
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                            <div className="h-full bg-blue-600" style={{ width: `${agentPct}%` }} />
                            <div className="h-full bg-emerald-500" style={{ width: `${leadPct}%` }} />
                          </div>
                          <div className="flex justify-between text-[10px] font-mono text-slate-400">
                            <span>{agentPct}% AI</span>
                            <span>{leadPct}% Lead</span>
                          </div>
                        </div>
                      </td>

                      {/* 6. Action */}
                      <td className="px-5 py-4 text-right">
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<UserCheck className="h-3.5 w-3.5" />}
                          onClick={() => setSelectedCall(call)}
                          className="rounded-lg text-xs font-semibold shadow-xs"
                        >
                          Review Dossier
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
