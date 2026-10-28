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
  Sliders,
  Settings2,
  ChevronDown,
  ChevronUp,
  Zap,
  Shield,
  SlidersHorizontal,
  X,
  Check,
} from 'lucide-react';
import { campaignService } from '../../services/campaignService';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { formatPhoneNumber, formatDate } from '../../lib/formatters';
import { RetryPolicyConfig, CadencePresetName } from '../../types';

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

  // Cadence Policy Studio State
  const [policy, setPolicy] = useState<RetryPolicyConfig | null>(null);
  const [presets, setPresets] = useState<Record<string, RetryPolicyConfig>>({});
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [policySaving, setPolicySaving] = useState(false);

  // Rescheduling Modal State
  const [reschedulingLead, setReschedulingLead] = useState<any | null>(null);
  const [rescheduleTargetTime, setRescheduleTargetTime] = useState<string>('');
  const [isRescheduling, setIsRescheduling] = useState(false);

  const fetchPolicy = async () => {
    try {
      const data = await campaignService.getCadencePolicy();
      setPolicy(data.policy);
      setPresets(data.presets || {});
    } catch (err) {
      console.error('Failed to load cadence policy:', err);
    }
  };

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
    fetchPolicy();
  }, [campaignId]);

  const handleApplyPreset = (presetKey: string) => {
    if (presets[presetKey]) {
      setPolicy({
        ...presets[presetKey],
        presetName: presetKey as CadencePresetName,
      });
    }
  };

  const handleSavePolicy = async () => {
    if (!policy) return;
    setPolicySaving(true);
    try {
      const res = await campaignService.updateCadencePolicy(policy);
      setPolicy(res.policy);
      setFeedbackMessage(`✓ Cadence retry policy updated successfully! New timings will govern subsequent outreach attempts.`);
      await fetchQueue();
    } catch (err: any) {
      setFeedbackMessage(`✕ Failed to save cadence policy: ${err?.message}`);
    } finally {
      setPolicySaving(false);
    }
  };

  const handleExecuteRetry = async (campaignLeadId: string, leadName: string) => {
    setExecutingId(campaignLeadId);
    setFeedbackMessage(null);
    try {
      const res = await campaignService.executeRetryNow(campaignLeadId);
      setFeedbackMessage(`✓ Outbound retry successfully launched for ${leadName} (Attempt #${res.attemptNumber}) via Fluid Voice Engine!`);
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

  // Helper to generate IST tomorrow shortcuts
  const getTomorrowISTIso = (targetHour = 10, targetMinute = 30): string => {
    const istOffsetMs = 5.5 * 3600000;
    const nowIST = new Date(Date.now() + istOffsetMs);
    nowIST.setUTCDate(nowIST.getUTCDate() + 1);
    nowIST.setUTCHours(targetHour, targetMinute, 0, 0);
    return new Date(nowIST.getTime() - istOffsetMs).toISOString();
  };

  const handleOpenReschedule = (item: any) => {
    setReschedulingLead(item);
    // Default to +4 hours or next morning 10:30 AM
    setRescheduleTargetTime(getTomorrowISTIso(10, 30));
  };

  const handleConfirmReschedule = async () => {
    if (!reschedulingLead || !rescheduleTargetTime) return;
    setIsRescheduling(true);
    try {
      const res = await campaignService.rescheduleLead(reschedulingLead.campaignLeadId, rescheduleTargetTime);
      setFeedbackMessage(`✓ Rescheduled ${res.leadName} to ${formatDate(res.newNextAttemptAt)} (snapped to compliant calling hours).`);
      setReschedulingLead(null);
      await fetchQueue();
    } catch (err: any) {
      setFeedbackMessage(`✕ Failed to reschedule: ${err?.message}`);
    } finally {
      setIsRescheduling(false);
    }
  };

  const dueItems = queue.filter(item => item.isDue);
  const tier2Count = queue.filter(item => item.attemptCount === 1).length;
  const tier3Count = queue.filter(item => item.attemptCount === 2).length;

  const currentTier2Hours = policy?.tier2DelayHours ?? 4;
  const currentTier3Hours = policy?.tier3DelayHours ?? 24;
  const currentMaxAttempts = policy?.maxAttempts ?? 3;

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
                Customizable Logic
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Automates intelligent callback scheduling for busy, unanswered, or dropped calls. Customize spaced delays, dial attempts, and fatigue caps.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsStudioOpen(!isStudioOpen)}
              leftIcon={<SlidersHorizontal className="h-3.5 w-3.5 text-indigo-300" />}
              className="border-indigo-400/40 text-indigo-200 hover:text-white hover:bg-indigo-900/50 text-xs font-semibold"
            >
              {isStudioOpen ? 'Hide Cadence Studio' : 'Customize Timings'}
            </Button>
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

        {/* Dynamic Cadence Waterfall Visual Architecture */}
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
              <span className="font-semibold text-white">+{currentTier2Hours}h Window</span>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
          </div>

          <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-purple-300 uppercase block font-mono">Tier 3 Window</span>
              <span className="font-semibold text-white">+{currentTier3Hours}h Spaced</span>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
          </div>

          <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
            <span className="text-[10px] font-bold text-slate-400 uppercase block font-mono">Attempt Limit</span>
            <span className="font-semibold text-white">Lead Exhausted ({currentMaxAttempts}/{currentMaxAttempts})</span>
          </div>
        </div>
      </div>

      {/* Cadence Policy Studio Drawer / Expandable Panel */}
      {isStudioOpen && policy && (
        <div className="bg-slate-900 border-b border-indigo-950 p-5 text-white animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 mb-4 border-b border-slate-800 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-indigo-400" />
                <h4 className="text-sm font-bold text-white">Cadence Policy Studio</h4>
                <Badge variant="neutral" size="sm" className="bg-indigo-900/60 text-indigo-200 border-indigo-700">
                  Active Preset: {policy.presetName.toUpperCase()}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Select an enterprise preset or fine-tune retry intervals, max attempts, anti-fatigue caps, and jitter below.
              </p>
            </div>

            {/* Presets Quick Picker */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleApplyPreset('aggressive')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  policy.presetName === 'aggressive'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                <Zap className="h-3.5 w-3.5" />
                <span>⚡ High-Velocity (1h/6h)</span>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset('standard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  policy.presetName === 'standard'
                    ? 'bg-indigo-500 text-white shadow-md font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>⚖️ Standard (4h/24h)</span>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset('gentle')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  policy.presetName === 'gentle'
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                <Shield className="h-3.5 w-3.5" />
                <span>🛡️ Gentle Nudge (24h/48h)</span>
              </button>
            </div>
          </div>

          {/* Granular Timing Adjusters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Tier 2 Delay */}
            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-semibold">Tier 2 Delay</span>
                <span className="font-mono text-amber-400 font-bold">{policy.tier2DelayHours} Hours</span>
              </div>
              <p className="text-[11px] text-slate-400">Delay after 1st failed/unanswered attempt</p>
              <div className="flex items-center gap-1.5 pt-1">
                {[1, 2, 4, 8, 12, 24].map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setPolicy({ ...policy, tier2DelayHours: h, presetName: 'custom' })}
                    className={`flex-1 py-1 rounded text-[11px] font-mono font-semibold transition-all ${
                      policy.tier2DelayHours === h
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {h}h
                  </button>
                ))}
              </div>
            </div>

            {/* Tier 3 Delay */}
            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-semibold">Tier 3 Delay</span>
                <span className="font-mono text-purple-400 font-bold">{policy.tier3DelayHours} Hours</span>
              </div>
              <p className="text-[11px] text-slate-400">Spaced interval after 2nd attempt</p>
              <div className="flex items-center gap-1.5 pt-1">
                {[6, 12, 24, 48, 72].map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setPolicy({ ...policy, tier3DelayHours: h, presetName: 'custom' })}
                    className={`flex-1 py-1 rounded text-[11px] font-mono font-semibold transition-all ${
                      policy.tier3DelayHours === h
                        ? 'bg-purple-500 text-white font-bold'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {h}h
                  </button>
                ))}
              </div>
            </div>

            {/* Max Dial Attempts */}
            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-semibold">Max Dial Attempts</span>
                <span className="font-mono text-indigo-400 font-bold">{policy.maxAttempts} Dials</span>
              </div>
              <p className="text-[11px] text-slate-400">Exhausts lead once attempt cap is reached</p>
              <div className="flex items-center gap-1.5 pt-1">
                {[1, 2, 3, 4, 5].map(a => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setPolicy({ ...policy, maxAttempts: a, presetName: 'custom' })}
                    className={`flex-1 py-1 rounded text-[11px] font-mono font-semibold transition-all ${
                      policy.maxAttempts === a
                        ? 'bg-indigo-500 text-white font-bold'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Anti-Fatigue 24h Cap */}
            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-semibold">Anti-Fatigue Cap</span>
                <span className="font-mono text-emerald-400 font-bold">{policy.maxCallsPer24Hours} / 24h</span>
              </div>
              <p className="text-[11px] text-slate-400">Max permissible calls to one lead per day</p>
              <div className="flex items-center gap-1.5 pt-1">
                {[1, 2, 3, 4].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setPolicy({ ...policy, maxCallsPer24Hours: c, presetName: 'custom' })}
                    className={`flex-1 py-1 rounded text-[11px] font-mono font-semibold transition-all ${
                      policy.maxCallsPer24Hours === c
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Secondary Controls Bar */}
          <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-4 text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={policy.enableJitter}
                  onChange={e => setPolicy({ ...policy, enableJitter: e.target.checked, presetName: 'custom' })}
                  className="rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-400"
                />
                <span>Smart Anti-Spam Jitter (0 - {policy.maxJitterMinutes}m offset)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={policy.blockSundays}
                  onChange={e => setPolicy({ ...policy, blockSundays: e.target.checked, presetName: 'custom' })}
                  className="rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-400"
                />
                <span>Block Sunday Outreach (TRAI Compliant)</span>
              </label>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsStudioOpen(false)}
                className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSavePolicy}
                isLoading={policySaving}
                leftIcon={<Check className="h-3.5 w-3.5" />}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
              >
                Save & Apply Cadence Policy
              </Button>
            </div>
          </div>
        </div>
      )}

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
          <span>Tier 2 ({currentTier2Hours}h): {tier2Count}</span>
          <span>•</span>
          <span>Tier 3 ({currentTier3Hours}h): {tier3Count}</span>
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
                <th className="px-5 py-3 text-right">Cadence Actions</th>
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
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<Calendar className="h-3.5 w-3.5 text-slate-500" />}
                        onClick={() => handleOpenReschedule(item)}
                        className="text-slate-700 border-slate-300 hover:bg-slate-100 text-xs"
                      >
                        Reschedule
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        isLoading={executingId === item.campaignLeadId}
                        leftIcon={<PhoneForwarded className="h-3.5 w-3.5 text-indigo-600" />}
                        onClick={() => handleExecuteRetry(item.campaignLeadId, item.leadName)}
                        className="text-indigo-700 border-indigo-200 hover:bg-indigo-50 text-xs font-semibold"
                      >
                        Dial Now
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reschedule Modal */}
      {reschedulingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <Calendar className="h-4 w-4" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Custom Lead Reschedule</h4>
                  <p className="text-xs text-slate-500">
                    {reschedulingLead.leadName} ({formatPhoneNumber(reschedulingLead.phone)})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReschedulingLead(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2 font-mono">
                  Quick Spaced Shortcuts
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setRescheduleTargetTime(new Date(Date.now() + 1 * 3600000).toISOString())}
                    className="p-2.5 rounded-xl border border-slate-200 text-left hover:border-indigo-500 hover:bg-indigo-50/50 transition-all font-medium text-slate-800"
                  >
                    <span className="font-bold block text-indigo-600">+1 Hour</span>
                    <span className="text-[11px] text-slate-500">Quick backoff</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRescheduleTargetTime(new Date(Date.now() + 4 * 3600000).toISOString())}
                    className="p-2.5 rounded-xl border border-slate-200 text-left hover:border-indigo-500 hover:bg-indigo-50/50 transition-all font-medium text-slate-800"
                  >
                    <span className="font-bold block text-indigo-600">+4 Hours</span>
                    <span className="text-[11px] text-slate-500">Standard Tier 2</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRescheduleTargetTime(getTomorrowISTIso(10, 30))}
                    className="p-2.5 rounded-xl border border-slate-200 text-left hover:border-indigo-500 hover:bg-indigo-50/50 transition-all font-medium text-slate-800"
                  >
                    <span className="font-bold block text-indigo-600">Tomorrow 10:30 AM</span>
                    <span className="text-[11px] text-slate-500">Opening business hour</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRescheduleTargetTime(getTomorrowISTIso(15, 0))}
                    className="p-2.5 rounded-xl border border-slate-200 text-left hover:border-indigo-500 hover:bg-indigo-50/50 transition-all font-medium text-slate-800"
                  >
                    <span className="font-bold block text-indigo-600">Tomorrow 3:00 PM</span>
                    <span className="text-[11px] text-slate-500">Afternoon window</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1 font-mono">
                  Or Specific Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={rescheduleTargetTime ? new Date(new Date(rescheduleTargetTime).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                  onChange={e => {
                    if (e.target.value) {
                      setRescheduleTargetTime(new Date(e.target.value).toISOString());
                    }
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Safe Window Snapping:</strong> Fluid Voice Engine automatically snaps selected timestamps into TRAI compliant calling hours (10:00 AM - 7:30 PM IST, Monday - Saturday).
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReschedulingLead(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmReschedule}
                isLoading={isRescheduling}
                leftIcon={<Calendar className="h-3.5 w-3.5" />}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
              >
                Confirm Reschedule
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
