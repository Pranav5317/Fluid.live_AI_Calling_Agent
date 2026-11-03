import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { callService } from '../../services/callService';
import { Call, CallStatus, CallOutcome } from '../../types';
import { formatDate, formatDuration } from '../../lib/formatters';
import { CallDetailDrawer } from './CallDetailDrawer';
import { Search, PhoneCall, FileText, ChevronRight, Filter, Download, RotateCw } from 'lucide-react';
import { exportCallsToCSV } from '../../lib/exportUtils';

export const CallsPage: React.FC = () => {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CallStatus | 'all'>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<CallOutcome | 'all'>('all');

  const fetchCalls = async () => {
    setLoading(true);
    try {
      const list = await callService.getCalls({
        search,
        status: statusFilter,
        outcome: outcomeFilter,
      });
      setCalls(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    try {
      const res = await callService.syncAllCalls();
      if (res && Array.isArray(res.calls)) {
        setCalls(res.calls);
      } else {
        await fetchCalls();
      }
    } catch (err) {
      console.warn('[CallsPage] Sync all error:', err);
      await fetchCalls();
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Call Logs & Transcripts"
        description="Historical execution records, transcript playback, call outcomes and conversational QA audits."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RotateCw className={`h-4 w-4 text-brand-600 ${syncingAll ? 'animate-spin' : ''}`} />}
              onClick={handleSyncAll}
              disabled={syncingAll || loading}
              className="border-[#DACBB5] hover:bg-white/80 text-slate-800 font-semibold"
            >
              {syncingAll ? 'Syncing Sarvam...' : 'Sync Sarvam Telemetry'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="h-4 w-4 text-slate-600" />}
              onClick={() => exportCallsToCSV(calls, 'fluid_live_call_audit')}
              disabled={calls.length === 0}
            >
              Export Audit CSV ({calls.length})
            </Button>
          </div>
        }
      />

      {/* Filter Bar */}
      <Card noPadding className="overflow-hidden">
        <div className="p-4 border-b border-[#EADCBD] bg-[#FAF4EB]/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:w-80">
            <Input
              placeholder="Search call ID, lead, variables..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              options={[
                { value: 'all', label: 'All Call Statuses' },
                { value: 'completed', label: 'Completed' },
                { value: 'failed', label: 'Failed' },
                { value: 'in-progress', label: 'In Progress' },
                { value: 'queued', label: 'Queued' },
              ]}
            />
            <Select
              value={outcomeFilter}
              onChange={e => setOutcomeFilter(e.target.value as any)}
              options={[
                { value: 'all', label: 'All Outcomes' },
                { value: 'successful_contact', label: 'Successful Contact' },
                { value: 'callback_requested', label: 'Callback Requested' },
                { value: 'not_interested', label: 'Not Interested' },
                { value: 'unreachable', label: 'Unreachable' },
                { value: 'voicemail_left', label: 'Voicemail Left' },
              ]}
            />
          </div>
        </div>

        {loading ? (
          <LoadingState label="Fetching call logs..." />
        ) : calls.length === 0 ? (
          <EmptyState
            title="No call records found"
            description="Call attempts will appear here once campaigns begin executing."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-[#F2E7D7]/70 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-[#EADCBD] font-mono">
                <tr>
                  <th className="px-5 py-3.5">Call ID / External Ref</th>
                  <th className="px-5 py-3.5">Campaign / Agent</th>
                  <th className="px-5 py-3.5">Duration</th>
                  <th className="px-5 py-3.5">Call Outcome</th>
                  <th className="px-5 py-3.5">AI Lead Score & Tier</th>
                  <th className="px-5 py-3.5">AI Summary & Variables</th>
                  <th className="px-5 py-3.5">Timestamp</th>
                  <th className="px-5 py-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EADCBD]/60 bg-transparent">
                {calls.map(call => (
                  <tr key={call.id} className="hover:bg-white/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div>
                        <span className="font-mono font-bold text-slate-950 block">{call.id}</span>
                        <span className="font-mono text-[10px] text-slate-500">{call.externalCallId}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-slate-800 block">{call.campaignId || 'Direct Outreach'}</span>
                        <span className="text-[11px] text-slate-500">Agent: Shubh (Fluid Voice)</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono font-medium text-slate-800">
                      {formatDuration(call.durationSeconds)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col gap-1 items-start">
                        <Badge variant={getOutcomeBadgeVariant(call.outcome)} dot>
                          {call.outcome ? call.outcome.replace('_', ' ') : 'initiated'}
                        </Badge>
                        {(() => {
                          const vars = (call.extractedVariables || {}) as Record<string, any>;
                          if (vars.interest_level === 'interested') {
                            return (
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
                                Interested
                              </span>
                            );
                          }
                          if (vars.interest_level === 'not_interested') {
                            return (
                              <span className="text-[10px] font-bold text-red-800 bg-red-500/15 border border-red-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
                                Not Interested
                              </span>
                            );
                          }
                          if (vars.verification_status === 'completed') {
                            return (
                              <span className="text-[10px] font-bold text-blue-800 bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
                                Verified
                              </span>
                            );
                          }
                          if (call.durationSeconds > 0) {
                            return (
                              <span className="text-[10px] font-medium text-slate-700 bg-white/80 border border-[#DACBB5] px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
                                Connected
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {(() => {
                        const intel = call.extractedVariables?.intelligence;
                        const leadScore = intel?.leadScore;
                        const score = leadScore?.overallScore ?? (call.durationSeconds > 0 ? 75 : 0);
                        const tier = leadScore?.tier || (score >= 75 ? 'Hot Lead' : score >= 45 ? 'Warm Prospect' : 'Cold / Disqualified');
                        const badgeText = leadScore?.summaryBadge || (tier === 'Hot Lead' ? '🔥 Hot Lead' : tier === 'Warm Prospect' ? '⚡ Warm' : '❄️ Cold');
                        return (
                          <div className="flex flex-col gap-1 items-start">
                            <span className="font-mono font-bold text-slate-900 text-xs">
                              {score}/100
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                tier === 'Hot Lead'
                                  ? 'bg-emerald-500/15 text-emerald-800 border-emerald-500/30'
                                  : tier === 'Warm Prospect'
                                  ? 'bg-amber-500/15 text-amber-800 border-amber-500/30'
                                  : 'bg-slate-500/15 text-slate-700 border-slate-500/30'
                              }`}
                            >
                              {badgeText}
                            </span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-3.5 min-w-[260px] max-w-sm">
                      {(() => {
                        const allVars = (call.extractedVariables || {}) as Record<string, any>;
                        const summaryText =
                          typeof allVars.call_summary === 'string' && allVars.call_summary.trim().length > 0
                            ? allVars.call_summary.trim()
                            : null;

                        const tagEntries = Object.entries(allVars).filter(
                          ([k, v]) =>
                            !k.startsWith('_') &&
                            k !== 'intelligence' &&
                            k !== 'call_summary' &&
                            typeof v !== 'object'
                        );

                        if (tagEntries.length === 0 && !summaryText) {
                          return <span className="text-[11px] text-slate-400 italic">None</span>;
                        }

                        return (
                          <div className="space-y-1.5">
                            {tagEntries.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {tagEntries.map(([k, v]) => (
                                  <span
                                    key={k}
                                    title={`${k}: ${String(v)}`}
                                    className="rounded-md bg-white/90 border border-[#DACBB5] px-2 py-0.5 text-[10px] font-mono text-slate-700 max-w-[180px] truncate inline-block shadow-2xs"
                                  >
                                    <span className="text-slate-500 font-semibold">{k}:</span> {String(v)}
                                  </span>
                                ))}
                              </div>
                            )}
                            {summaryText && (
                              <div className="bg-white/75 border border-[#DACBB5] rounded-lg p-2 shadow-2xs">
                                <div className="text-[9px] uppercase tracking-wider font-mono font-bold text-slate-400 mb-0.5">
                                  AI Summary
                                </div>
                                <p className="text-[11px] text-slate-700 leading-relaxed italic">
                                  "{summaryText}"
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">
                      {formatDate(call.startedAt)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<FileText className="h-3.5 w-3.5 text-[#1D4ED8]" />}
                        onClick={() => setSelectedCall(call)}
                        className="rounded-full text-[#1D4ED8] border-[#1D4ED8]/30 hover:bg-[#1D4ED8]/10 text-xs font-semibold"
                      >
                        Analyze Call
                      </Button>
                    </td>
                  </tr>
                ))}
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

