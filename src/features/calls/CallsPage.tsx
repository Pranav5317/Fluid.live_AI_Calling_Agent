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
import { Search, PhoneCall, FileText, ChevronRight, Filter } from 'lucide-react';

export const CallsPage: React.FC = () => {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);

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
        description="Historical execution records, transcript playback, call outcomes and extracted variables."
      />

      {/* Filter Bar */}
      <Card noPadding>
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
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
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Call ID / External Ref</th>
                  <th className="px-5 py-3">Campaign / Agent</th>
                  <th className="px-5 py-3">Duration</th>
                  <th className="px-5 py-3">Call Outcome</th>
                  <th className="px-5 py-3">Extracted Variables</th>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {calls.map(call => (
                  <tr key={call.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <div>
                        <span className="font-mono font-bold text-slate-900 block">{call.id}</span>
                        <span className="font-mono text-[10px] text-slate-400">{call.externalCallId}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-slate-800 block">{call.campaignId}</span>
                        <span className="text-[11px] text-slate-500">Agent: {call.agentId}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono font-medium">
                      {formatDuration(call.durationSeconds)}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={getOutcomeBadgeVariant(call.outcome)} dot>
                        {call.outcome.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(call.extractedVariables || {}).map(([k, v]) => (
                          <span
                            key={k}
                            className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700 font-mono"
                          >
                            {k}: {String(v)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">
                      {formatDate(call.startedAt)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<FileText className="h-3.5 w-3.5" />}
                        onClick={() => setSelectedCall(call)}
                      >
                        View Transcript
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
      <CallDetailDrawer call={selectedCall} onClose={() => setSelectedCall(null)} />
    </div>
  );
};

