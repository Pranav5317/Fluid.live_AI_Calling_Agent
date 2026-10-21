import React, { useState, useEffect } from 'react';
import {
  RotateCw,
  PhoneForwarded,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Layers,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Phone,
  Sparkles,
} from 'lucide-react';
import { campaignService } from '../../services/campaignService';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { formatPhoneNumber, formatDate } from '../../lib/formatters';

export interface CampaignRetryQueueCardProps {
  campaignId?: string;
  onRetryExecuted?: () => void;
}

export const CampaignRetryQueueCard: React.FC<CampaignRetryQueueCardProps> = ({
  campaignId,
  onRetryExecuted,
}) => {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [processingDue, setProcessingDue] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const data = await campaignService.getRetryQueue(campaignId);
      setQueue(data);
    } catch (err) {
      console.error('Failed to load retry queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [campaignId]);

  const handleExecuteRetry = async (campaignLeadId: string, leadName: string) => {
    setExecutingId(campaignLeadId);
    setFeedbackMessage(null);
    try {
      const res = await campaignService.executeRetryNow(campaignLeadId);
      setFeedbackMessage(`✓ Outbound retry successfully launched for ${leadName} (Attempt #${res.attemptNumber}) via Sarvam AI!`);
      await fetchQueue();
      if (onRetryExecuted) onRetryExecuted();
    } catch (err: any) {
      setFeedbackMessage(`✕ Retry failed for ${leadName}: ${err?.message}`);
    } finally {
      setExecutingId(null);
    }
  };

  const handleProcessDue = async () => {
    setProcessingDue(true);
    setFeedbackMessage(null);
    try {
      const res = await campaignService.processDueRetries(campaignId);
      setFeedbackMessage(`✓ Cadence engine executed ${res.processedCount} due retry call(s) immediately.`);
      await fetchQueue();
      if (onRetryExecuted) onRetryExecuted();
    } catch (err: any) {
      setFeedbackMessage(`✕ Cadence batch process failed: ${err?.message}`);
    } finally {
      setProcessingDue(false);
    }
  };

  const dueItems = queue.filter(item => item.isDue);
  const tier2Count = queue.filter(item => item.attemptCount === 1).length;
  const tier3Count = queue.filter(item => item.attemptCount === 2).length;

  return (
    <Card noPadding className="border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                <Layers className="h-4 w-4" />
              </span>
              <h3 className="text-base font-bold text-white">
                Automated Retry Waterfall & Cadence Engine
              </h3>
              <span className="text-[10px] font-mono font-bold bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded uppercase">
                In-House Telephony Logic
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Automates intelligent callback scheduling for busy, unanswered, or dropped calls. Employs progressive spaced intervals before lead exhaustion.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={fetchQueue}
              leftIcon={<RotateCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />}
              className="border-slate-600 text-slate-200 hover:text-white hover:bg-slate-700 text-xs"
            >
              Sync
            </Button>
            <Button
              size="sm"
              onClick={handleProcessDue}
              disabled={dueItems.length === 0}
              isLoading={processingDue}
              leftIcon={<PhoneForwarded className="h-3.5 w-3.5" />}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
            >
              Process Due Retries ({dueItems.length})
            </Button>
          </div>
        </div>

        {/* Cadence Waterfall Visual Architecture */}
        <div className="mt-4 pt-4 border-t border-slate-700/60 grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-indigo-300 uppercase block font-mono">Attempt 1</span>
              <span className="font-semibold text-white">Immediate Dispatch</span>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
          </div>

          <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-amber-300 uppercase block font-mono">Tier 2 Backoff</span>
              <span className="font-semibold text-white">+4 Hours Window</span>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
          </div>

          <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-purple-300 uppercase block font-mono">Tier 3 Window</span>
              <span className="font-semibold text-white">+24 Hours Final</span>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
          </div>

          <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
            <span className="text-[10px] font-bold text-slate-400 uppercase block font-mono">Attempt Limit</span>
            <span className="font-semibold text-white">Lead Exhausted (3/3)</span>
          </div>
        </div>
      </div>

      {/* Real-time Feedback Alert */}
      {feedbackMessage && (
        <div className="px-5 py-3 text-xs font-semibold bg-indigo-50 text-indigo-900 border-b border-indigo-100 flex items-center justify-between">
          <span>{feedbackMessage}</span>
          <button type="button" onClick={() => setFeedbackMessage(null)} className="text-indigo-400 hover:text-indigo-700">✕</button>
        </div>
      )}

      {/* Summary Chips */}
      <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-700">Active Cadence Queue:</span>
          <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 font-semibold text-slate-900">
            {queue.length} Total Candidates
          </span>
          <span className="font-mono bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 font-bold text-emerald-800">
            {dueItems.length} Due Now
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
          <span>Tier 2 (4h): {tier2Count}</span>
          <span>•</span>
          <span>Tier 3 (24h): {tier3Count}</span>
        </div>
      </div>

      {/* Queue Table */}
      {loading && queue.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-500 space-y-2">
          <RotateCw className="h-5 w-5 animate-spin mx-auto text-indigo-600" />
          <p>Evaluating cadence waterfall and retry candidates...</p>
        </div>
      ) : queue.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400 space-y-1">
          <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
          <p className="font-semibold text-slate-700">Cadence Queue Clean</p>
          <p>No unanswered or busy leads are currently waiting in the retry waterfall.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Lead Contact</th>
                <th className="px-5 py-3">Campaign</th>
                <th className="px-5 py-3">Cadence Tier</th>
                <th className="px-5 py-3">Next Scheduled Attempt</th>
                <th className="px-5 py-3">Prior Outcome</th>
                <th className="px-5 py-3 text-right">Cadence Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {queue.map(item => (
                <tr key={item.campaignLeadId} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-slate-900">{item.leadName}</div>
                    <div className="flex items-center gap-1 font-mono text-[11px] text-slate-500 mt-0.5">
                      <Phone className="h-3 w-3 text-slate-400" />
                      <span>{formatPhoneNumber(item.phone)}</span>
                    </div>
                  </td>

                  <td className="px-5 py-3.5 font-medium text-slate-700">
                    {item.campaignName}
                  </td>

                  <td className="px-5 py-3.5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-800">
                          Attempt {item.attemptCount} of {item.maxAttempts}
                        </span>
                      </div>
                      <span className="text-[10px] block text-indigo-600 font-medium">
                        {item.cadenceTier}
                      </span>
                    </div>
                  </td>

                  <td className="px-5 py-3.5 font-mono text-[11px]">
                    {item.isDue ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <Clock className="h-3 w-3" />
                        <span>DUE NOW</span>
                      </span>
                    ) : item.nextAttemptAt ? (
                      <span className="text-slate-700">
                        {formatDate(item.nextAttemptAt)}
                      </span>
                    ) : (
                      <span className="text-slate-400">Scheduled on campaign run</span>
                    )}
                  </td>

                  <td className="px-5 py-3.5">
                    <Badge variant={item.lastOutcome === 'successful_contact' ? 'success' : 'neutral'} size="sm">
                      {item.lastOutcome.replace(/_/g, ' ')}
                    </Badge>
                  </td>

                  <td className="px-5 py-3.5 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      isLoading={executingId === item.campaignLeadId}
                      leftIcon={<PhoneForwarded className="h-3.5 w-3.5 text-indigo-600" />}
                      onClick={() => handleExecuteRetry(item.campaignLeadId, item.leadName)}
                    >
                      Dial Retry Now
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};