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
    <Card noPadding className="border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.45)] overflow-hidden rounded-[22px]">
      {/* Header */}
      <div className="p-6 border-b border-white/[0.08] bg-gradient-to-r from-[#0B0F28] via-[#0E1538] to-[#0B0F28] text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                <Layers className="h-6 w-6 text-indigo-400" />
              </span>
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    Automated Retry Waterfall & Cadence Engine
                  </h3>
                  <span className="text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2.5 py-0.5 rounded-full uppercase">
                    Customizable Logic
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  Automates intelligent callback scheduling for busy, unanswered, or dropped calls. Customize spaced delays, dial attempts, and fatigue caps.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsStudioOpen(!isStudioOpen)}
              leftIcon={<SlidersHorizontal className="h-3.5 w-3.5 text-indigo-300" />}
              className="border-indigo-400/30 bg-white/10 text-indigo-200 hover:text-white hover:bg-white/20 text-xs font-semibold rounded-full"
            >
              {isStudioOpen ? 'Hide Cadence Studio' : 'Customize Timings'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={fetchQueue}
              leftIcon={<RotateCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />}
              className="border-white/10 bg-white/5 text-slate-200 hover:text-white hover:bg-white/10 text-xs font-semibold rounded-full"
            >
              Sync
            </Button>
            <Button
              size="sm"
              onClick={handleProcessDue}
              disabled={dueItems.length === 0}
              isLoading={processingDue}
              leftIcon={<PhoneForwarded className="h-3.5 w-3.5" />}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md border border-emerald-400/30 rounded-full"
            >
              Process Due Retries ({dueItems.length})
            </Button>
          </div>
        </div>

        {/* Dynamic Cadence Waterfall Visual Architecture */}
        <div className="mt-5 pt-4 border-t border-white/[0.08] grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] transition-all flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-indigo-300 uppercase block font-mono">Attempt 1</span>
              <span className="font-semibold text-white">Immediate Dispatch</span>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] transition-all flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-amber-300 uppercase block font-mono">Tier 2 Backoff</span>
              <span className="font-semibold text-white">+{currentTier2Hours}h Window</span>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] transition-all flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-purple-300 uppercase block font-mono">Tier 3 Window</span>
              <span className="font-semibold text-white">+{currentTier3Hours}h Spaced</span>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] transition-all">
            <span className="text-[10px] font-bold text-slate-400 uppercase block font-mono">Attempt Limit</span>
            <span className="font-semibold text-white">Lead Exhausted ({currentMaxAttempts}/{currentMaxAttempts})</span>
          </div>
        </div>
      </div>

      {/* Cadence Policy Studio Drawer / Expandable Panel */}
      {isStudioOpen && policy && (
        <div className="bg-[#070B1E]/95 backdrop-blur-xl border-b border-white/[0.08] p-6 text-white animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 mb-5 border-b border-white/[0.08] gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-indigo-400" />
                <h4 className="text-sm font-bold text-white tracking-tight">Cadence Policy Studio</h4>
                <Badge variant="neutral" size="sm" className="bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-mono rounded-full">
                  Active: {policy.presetName.toUpperCase()}
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
                className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  policy.presetName === 'aggressive'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-bold ring-2 ring-amber-400/50'
                    : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.1] border border-white/[0.08]'
                }`}
              >
                <Zap className="h-3.5 w-3.5" />
                <span>⚡ High-Velocity (1h/6h)</span>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset('standard')}
                className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  policy.presetName === 'standard'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.5)] font-bold ring-2 ring-indigo-400/50'
                    : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.1] border border-white/[0.08]'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>⚖️ Standard (4h/24h)</span>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset('gentle')}
                className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  policy.presetName === 'gentle'
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-bold ring-2 ring-emerald-400/50'
                    : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.1] border border-white/[0.08]'
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
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between text-slate-200">
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
                    className={`flex-1 py-1.5 rounded-full text-[11px] font-mono font-semibold transition-all ${
                      policy.tier2DelayHours === h
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                        : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.1] border border-white/[0.06]'
                    }`}
                  >
                    {h}h
                  </button>
                ))}
              </div>
            </div>

            {/* Tier 3 Delay */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between text-slate-200">
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
                    className={`flex-1 py-1.5 rounded-full text-[11px] font-mono font-semibold transition-all ${
                      policy.tier3DelayHours === h
                        ? 'bg-purple-500 text-white font-bold shadow-sm'
                        : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.1] border border-white/[0.06]'
                    }`}
                  >
                    {h}h
                  </button>
                ))}
              </div>
            </div>

            {/* Max Dial Attempts */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between text-slate-200">
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
                    className={`flex-1 py-1.5 rounded-full text-[11px] font-mono font-semibold transition-all ${
                      policy.maxAttempts === a
                        ? 'bg-indigo-500 text-white font-bold shadow-sm'
                        : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.1] border border-white/[0.06]'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Anti-Fatigue 24h Cap */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between text-slate-200">
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
                    className={`flex-1 py-1.5 rounded-full text-[11px] font-mono font-semibold transition-all ${
                      policy.maxCallsPer24Hours === c
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                        : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.1] border border-white/[0.06]'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Secondary Controls Bar */}
          <div className="mt-5 pt-4 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-4 text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={policy.enableJitter}
                  onChange={e => setPolicy({ ...policy, enableJitter: e.target.checked, presetName: 'custom' })}
                  className="rounded border-white/20 bg-white/10 text-indigo-500 focus:ring-0"
                />
                <span>Smart Anti-Spam Jitter (0 - {policy.maxJitterMinutes}m offset)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={policy.blockSundays}
                  onChange={e => setPolicy({ ...policy, blockSundays: e.target.checked, presetName: 'custom' })}
                  className="rounded border-white/20 bg-white/10 text-indigo-500 focus:ring-0"
                />
                <span>Block Sunday Outreach (TRAI Compliant)</span>
              </label>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsStudioOpen(false)}
                className="border-white/10 text-slate-300 hover:text-white hover:bg-white/10 text-xs rounded-full"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSavePolicy}
                isLoading={policySaving}
                leftIcon={<Check className="h-3.5 w-3.5" />}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md rounded-full"
              >
                Save & Apply Cadence Policy
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Feedback Alert */}
      {feedbackMessage && (
        <div className="px-6 py-3 text-xs font-semibold bg-indigo-500/15 text-indigo-200 border-b border-indigo-500/25 flex items-center justify-between backdrop-blur-sm">
          <span>{feedbackMessage}</span>
          <button type="button" onClick={() => setFeedbackMessage(null)} className="text-indigo-400 hover:text-indigo-200 font-bold">✕</button>
        </div>
      )}

      {/* Summary Chips */}
      <div className="px-6 py-3.5 border-b border-white/[0.08] bg-white/[0.02] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-200 font-mono">Active Cadence Queue:</span>
          <span className="font-mono bg-white/[0.05] px-3 py-1 rounded-full border border-white/[0.1] font-bold text-white shadow-sm">
            {queue.length} Total Candidates
          </span>
          <span className="font-mono bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/30 font-bold text-emerald-300 shadow-sm">
            {dueItems.length} Due Now
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
          <span>Tier 2 ({currentTier2Hours}h): {tier2Count}</span>
          <span>•</span>
          <span>Tier 3 ({currentTier3Hours}h): {tier3Count}</span>
        </div>
      </div>

      {/* Queue Table */}
      {loading && queue.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400 space-y-2">
          <RotateCw className="h-5 w-5 animate-spin mx-auto text-indigo-400" />
          <p>Evaluating cadence waterfall and retry candidates...</p>
        </div>
      ) : queue.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400 space-y-1">
          <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2 opacity-80" />
          <p className="font-bold text-white text-sm">Cadence Queue Clean</p>
          <p className="text-slate-400">No unanswered or busy leads are currently waiting in the retry waterfall.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-white/[0.02] text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/[0.08] font-mono">
              <tr>
                <th className="px-6 py-3.5">Lead Contact</th>
                <th className="px-6 py-3.5">Campaign</th>
                <th className="px-6 py-3.5">Cadence Tier</th>
                <th className="px-6 py-3.5">Next Scheduled Attempt</th>
                <th className="px-6 py-3.5">Prior Outcome</th>
                <th className="px-6 py-3.5 text-right">Cadence Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] bg-transparent">
              {queue.map(item => (
                <tr key={item.campaignLeadId} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-white text-sm">{item.leadName}</div>
                    <div className="flex items-center gap-1 font-mono text-[11px] text-slate-400 mt-0.5">
                      <Phone className="h-3 w-3 text-slate-500" />
                      <span>{formatPhoneNumber(item.phone)}</span>
                    </div>
                  </td>

                  <td className="px-6 py-4 font-semibold text-slate-200">
                    {item.campaignName}
                  </td>

                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-white">
                          Attempt {item.attemptCount} of {item.maxAttempts}
                        </span>
                      </div>
                      <span className="text-[10px] block text-indigo-400 font-semibold">
                        {item.cadenceTier}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4 font-mono text-[11px]">
                    {item.isDue ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        <Clock className="h-3 w-3" />
                        <span>DUE NOW</span>
                      </span>
                    ) : item.nextAttemptAt ? (
                      <span className="text-slate-200 font-medium">
                        {formatDate(item.nextAttemptAt)}
                      </span>
                    ) : (
                      <span className="text-slate-500">Scheduled on campaign run</span>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <Badge variant={item.lastOutcome === 'successful_contact' ? 'success' : 'neutral'} size="sm" dot>
                      {item.lastOutcome.replace(/_/g, ' ')}
                    </Badge>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<Calendar className="h-3.5 w-3.5 text-slate-400" />}
                        onClick={() => handleOpenReschedule(item)}
                        className="text-slate-200 border-white/10 hover:bg-white/10 text-xs font-semibold rounded-full"
                      >
                        Reschedule
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        isLoading={executingId === item.campaignLeadId}
                        leftIcon={<PhoneForwarded className="h-3.5 w-3.5 text-indigo-400" />}
                        onClick={() => handleExecuteRetry(item.campaignLeadId, item.leadName)}
                        className="text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/10 text-xs font-bold rounded-full"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-[#0B0F24] rounded-[24px] shadow-2xl border border-white/[0.12] max-w-md w-full overflow-hidden text-white">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/[0.08] bg-[#0E1430] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  <Calendar className="h-4 w-4" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-white">Custom Lead Reschedule</h4>
                  <p className="text-xs text-slate-400">
                    {reschedulingLead.leadName} ({formatPhoneNumber(reschedulingLead.phone)})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReschedulingLead(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2 font-mono">
                  Quick Spaced Shortcuts
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setRescheduleTargetTime(new Date(Date.now() + 1 * 3600000).toISOString())}
                    className="p-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] text-left hover:border-indigo-400/50 hover:bg-white/[0.06] transition-all font-medium text-slate-200"
                  >
                    <span className="font-bold block text-indigo-400">+1 Hour</span>
                    <span className="text-[11px] text-slate-400">Quick backoff</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRescheduleTargetTime(new Date(Date.now() + 4 * 3600000).toISOString())}
                    className="p-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] text-left hover:border-indigo-400/50 hover:bg-white/[0.06] transition-all font-medium text-slate-200"
                  >
                    <span className="font-bold block text-indigo-400">+4 Hours</span>
                    <span className="text-[11px] text-slate-400">Standard Tier 2</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRescheduleTargetTime(getTomorrowISTIso(10, 30))}
                    className="p-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] text-left hover:border-indigo-400/50 hover:bg-white/[0.06] transition-all font-medium text-slate-200"
                  >
                    <span className="font-bold block text-indigo-400">Tomorrow 10:30 AM</span>
                    <span className="text-[11px] text-slate-400">Opening business hour</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRescheduleTargetTime(getTomorrowISTIso(15, 0))}
                    className="p-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] text-left hover:border-indigo-400/50 hover:bg-white/[0.06] transition-all font-medium text-slate-200"
                  >
                    <span className="font-bold block text-indigo-400">Tomorrow 3:00 PM</span>
                    <span className="text-[11px] text-slate-400">Afternoon window</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5 font-mono">
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
                  className="w-full px-4 py-2.5 text-xs bg-white/[0.05] border border-white/[0.12] rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-white placeholder-slate-400"
                />
              </div>

              <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/25 text-[11px] text-amber-200 flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <p>
                  <strong className="text-white">Safe Window Snapping:</strong> Fluid Voice Engine automatically snaps selected timestamps into TRAI compliant calling hours (10:00 AM - 7:30 PM IST, Monday - Saturday).
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-white/[0.08] bg-[#0E1430]/60 flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReschedulingLead(null)}
                className="text-xs border-white/10 text-slate-300 hover:text-white hover:bg-white/10 rounded-full"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmReschedule}
                isLoading={isRescheduling}
                leftIcon={<Calendar className="h-3.5 w-3.5" />}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md rounded-full"
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
