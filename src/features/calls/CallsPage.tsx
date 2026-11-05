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
} from 'lucide-react';

export const CallsPage: React.FC = () => {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CallStatus | 'all'>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<CallOutcome | 'all'>('all');
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Candidate Screening Calls"
        description="Review AI verification dialogues, applicant fact-checks, and spoken English assessments."
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
              onClick={() => exportCallsToCSV(calls, 'fluid_live_candidate_screenings')}
              disabled={calls.length === 0}
              className="border-slate-200 text-slate-700"
            >
              Export CSV
            </Button>
          </div>
        }
      />

      {/* Filter Bar */}
      <Card noPadding className="overflow-hidden border-slate-200 shadow-xs">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:w-80">
            <Input
              placeholder="Search candidate name, role, phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              leftIcon={<Search className="h-4 w-4 text-slate-400" />}
              className="border-slate-200 bg-white"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
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
          </div>
        </div>

        {loading ? (
          <LoadingState label="Fetching candidate call records..." />
        ) : calls.length === 0 ? (
          <EmptyState
            title="No call records found"
            description="Calls will appear here once candidates are screened or when you click Sync Sarvam Telemetry."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 font-mono">
                <tr>
                  <th className="px-5 py-3.5">Candidate & Role</th>
                  <th className="px-5 py-3.5">Screening Status</th>
                  <th className="px-5 py-3.5">Verified Facts</th>
                  <th className="px-5 py-3.5">English Proficiency</th>
                  <th className="px-5 py-3.5">Duration & Date</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {calls.map(call => {
                  const vars = (call.extractedVariables || {}) as Record<string, any>;
                  const candidateName = call.leadName || vars.user_name || 'Applicant';
                  const roleApplied = vars.role_applied || vars.applied_role || (call as any).campaign?.name || 'Frontend Developer';
                  const notice = vars.confirmed_notice_period || vars.portal_notice_period || '30 Days';
                  const experience = vars.confirmed_experience || vars.portal_experience || '2 Years';
                  const hasDiscrepancy = Boolean(vars.discrepancy_reason && vars.discrepancy_reason !== 'none') || vars.notice_discrepancy;
                  
                  const englishBand = vars.english_proficiency_level === 'fluent_proficient'
                    ? 'C1 Proficient'
                    : vars.english_proficiency_level === 'basic_limited'
                    ? 'A2 Basic'
                    : 'B2 Upper Intermediate';

                  return (
                    <tr key={call.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* 1. Candidate & Role */}
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

                      {/* 2. Screening Status */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          <Badge variant={getOutcomeBadgeVariant(call.outcome)} dot size="sm">
                            {call.outcome ? call.outcome.replace('_', ' ') : 'initiated'}
                          </Badge>
                          {hasDiscrepancy ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full">
                              <AlertTriangle className="h-3 w-3 text-amber-600" /> Discrepancy Noted
                            </span>
                          ) : call.durationSeconds > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Details Verified
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* 3. Verified Facts */}
                      <td className="px-5 py-4">
                        <div className="space-y-0.5 text-xs font-mono">
                          <div className="text-slate-800">
                            <span className="text-slate-400 font-normal">Exp:</span> <strong>{experience}</strong>
                          </div>
                          <div className="text-slate-800">
                            <span className="text-slate-400 font-normal">Notice:</span> <strong>{notice}</strong>
                          </div>
                        </div>
                      </td>

                      {/* 4. English Proficiency */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                          <Languages className="h-3.5 w-3.5 text-indigo-500" />
                          {englishBand}
                        </span>
                      </td>

                      {/* 5. Duration & Date */}
                      <td className="px-5 py-4 text-xs">
                        <span className="font-mono font-medium text-slate-800 block">
                          {formatDuration(call.durationSeconds)}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {formatDate(call.startedAt)}
                        </span>
                      </td>

                      {/* 6. Action */}
                      <td className="px-5 py-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          rightIcon={<ChevronRight className="h-3.5 w-3.5 text-blue-600" />}
                          onClick={() => setSelectedCall(call)}
                          className="rounded-lg text-blue-600 border-blue-200/80 hover:bg-blue-50 text-xs font-semibold"
                        >
                          Review Candidate
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
