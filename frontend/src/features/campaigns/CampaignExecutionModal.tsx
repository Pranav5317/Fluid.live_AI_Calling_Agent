import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  Square,
  RotateCw,
  PhoneCall,
  CheckCircle2,
  AlertCircle,
  Clock,
  Terminal,
  Activity,
  PhoneForwarded,
  Volume2,
  Users,
} from 'lucide-react';
import { campaignService } from '../../services/campaignService';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { formatPhoneNumber, formatDuration, formatDate } from '../../lib/formatters';

export interface CampaignExecutionModalProps {
  campaignId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onCampaignUpdated?: () => void;
}

export const CampaignExecutionModal: React.FC<CampaignExecutionModalProps> = ({
  campaignId,
  isOpen,
  onClose,
  onCampaignUpdated,
}) => {
  const [monitorData, setMonitorData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [dialingBatch, setDialingBatch] = useState(false);
  const [logs, setLogs] = useState<Array<{ id: string; time: string; text: string; type: 'info' | 'success' | 'warn' | 'error' }>>([]);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  const addLog = (text: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev.slice(-30), { id: Math.random().toString(), time, text, type }]);
  };

  const fetchMonitor = async (id: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await campaignService.getExecutionMonitor(id);
      setMonitorData(data);
    } catch (err: any) {
      console.error('Failed to fetch campaign monitor:', err);
      addLog(`Failed to sync monitor: ${err?.message}`, 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && campaignId) {
      fetchMonitor(campaignId);
      addLog(`Connected to Live Campaign Execution Monitor [Campaign ID: ${campaignId}]`, 'info');

      // Poll execution status every 4 seconds
      const timer = setInterval(() => {
        fetchMonitor(campaignId, true);
      }, 4000);

      return () => clearInterval(timer);
    } else {
      setMonitorData(null);
      setLogs([]);
    }
  }, [isOpen, campaignId]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (!isOpen || !campaignId) return null;

  const campaign = monitorData?.campaign;
  const breakdown = monitorData?.breakdown || {
    untouched: 0,
    calling: 0,
    completed: 0,
    retry_scheduled: 0,
    failed: 0,
  };
  const totalLeads = monitorData?.totalLeads || 0;
  const recentCalls = monitorData?.recentCalls || [];
  const enrolledLeads = monitorData?.leads || [];

  const handleDialBatch = async () => {
    if (!campaignId || dialingBatch) return;
    setDialingBatch(true);
    addLog(`Initiating outbound batch dialer (up to 5 leads) via Voice Telephony Gateway...`, 'info');

    try {
      const res = await campaignService.dialBatch(campaignId, { maxBatch: 5 });
      addLog(
        `Batch dispatched: ${res.successfulDispatches} started, ${res.failedDispatches} failed out of ${res.totalTargeted} targeted.`,
        res.successfulDispatches > 0 ? 'success' : 'warn'
      );

      res.results.forEach((r: any) => {
        if (r.status === 'initiated') {
          addLog(`✓ Handshake connected for ${r.leadName} (${r.phone}) -> Call ID: ${r.externalCallId || r.callId}`, 'success');
        } else {
          addLog(`✕ Failed to dial ${r.leadName} (${r.phone}): ${r.error}`, 'error');
        }
      });

      fetchMonitor(campaignId, true);
      if (onCampaignUpdated) onCampaignUpdated();
    } catch (err: any) {
      addLog(`Batch dialing execution error: ${err?.message}`, 'error');
    } finally {
      setDialingBatch(false);
    }
  };

  const handlePause = async () => {
    if (!campaignId) return;
    try {
      await campaignService.pauseCampaign(campaignId);
      addLog(`Campaign execution paused successfully.`, 'warn');
      fetchMonitor(campaignId, true);
      if (onCampaignUpdated) onCampaignUpdated();
    } catch (err: any) {
      addLog(`Failed to pause campaign: ${err?.message}`, 'error');
    }
  };

  const handleResume = async () => {
    if (!campaignId) return;
    try {
      await campaignService.resumeCampaign(campaignId);
      addLog(`Campaign execution resumed. Outbound dialer active.`, 'success');
      fetchMonitor(campaignId, true);
      if (onCampaignUpdated) onCampaignUpdated();
    } catch (err: any) {
      addLog(`Failed to resume campaign: ${err?.message}`, 'error');
    }
  };

  const handleStop = async () => {
    if (!campaignId) return;
    try {
      await campaignService.stopCampaign(campaignId);
      addLog(`Campaign terminated and marked as cancelled.`, 'error');
      fetchMonitor(campaignId, true);
      if (onCampaignUpdated) onCampaignUpdated();
    } catch (err: any) {
      addLog(`Failed to stop campaign: ${err?.message}`, 'error');
    }
  };

  const completedPct = totalLeads > 0 ? Math.round(((breakdown.completed + breakdown.failed) / totalLeads) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 backdrop-blur-[2px] animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Activity className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">
                  {campaign?.name || 'Campaign Execution Monitor'}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-white/10 text-emerald-300 font-bold uppercase">
                  {campaign?.status || 'Active'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Fluid Voice Cloud Bridge • Locked Version: {campaign?.agentVersionId || 'default'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchMonitor(campaignId)}
              leftIcon={<RotateCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />}
              className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
            >
              Sync
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Progress & Live Pipeline Banner */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-slate-700">
                Live Batch Execution Progress
              </span>
              <span className="font-mono font-bold text-slate-900">
                {breakdown.completed + breakdown.failed} / {totalLeads} Leads Processed ({completedPct}%)
              </span>
            </div>

            {/* Segmented Progress Bar */}
            <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden flex">
              <div
                style={{ width: `${totalLeads ? (breakdown.completed / totalLeads) * 100 : 0}%` }}
                className="bg-emerald-500 h-full"
                title={`Completed: ${breakdown.completed}`}
              />
              <div
                style={{ width: `${totalLeads ? (breakdown.calling / totalLeads) * 100 : 0}%` }}
                className="bg-indigo-500 h-full animate-pulse"
                title={`Calling: ${breakdown.calling}`}
              />
              <div
                style={{ width: `${totalLeads ? (breakdown.retry_scheduled / totalLeads) * 100 : 0}%` }}
                className="bg-amber-400 h-full"
                title={`Retries Queued: ${breakdown.retry_scheduled}`}
              />
              <div
                style={{ width: `${totalLeads ? (breakdown.failed / totalLeads) * 100 : 0}%` }}
                className="bg-rose-500 h-full"
                title={`Failed/Exhausted: ${breakdown.failed}`}
              />
            </div>

            {/* Metric Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-xs font-mono">
              <div className="p-2 rounded bg-white border border-slate-200 text-center">
                <span className="text-[10px] text-slate-400 block uppercase">Untouched</span>
                <span className="font-bold text-slate-800 text-sm">{breakdown.untouched}</span>
              </div>
              <div className="p-2 rounded bg-indigo-50 border border-indigo-200 text-center">
                <span className="text-[10px] text-indigo-500 block uppercase font-bold">Calling Now</span>
                <span className="font-bold text-indigo-700 text-sm">{breakdown.calling}</span>
              </div>
              <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-center">
                <span className="text-[10px] text-emerald-600 block uppercase font-bold">Completed</span>
                <span className="font-bold text-emerald-700 text-sm">{breakdown.completed}</span>
              </div>
              <div className="p-2 rounded bg-amber-50 border border-amber-200 text-center">
                <span className="text-[10px] text-amber-600 block uppercase font-bold">In Cadence</span>
                <span className="font-bold text-amber-700 text-sm">{breakdown.retry_scheduled}</span>
              </div>
              <div className="p-2 rounded bg-rose-50 border border-rose-200 text-center">
                <span className="text-[10px] text-rose-500 block uppercase font-bold">Exhausted</span>
                <span className="font-bold text-rose-700 text-sm">{breakdown.failed}</span>
              </div>
            </div>
          </div>

          {/* Telephony 4-Stage Protocol Ticker */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-3 rounded-lg border border-slate-200 bg-white flex items-center gap-2.5">
              <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[11px]">1</div>
              <div>
                <p className="font-bold text-slate-900 leading-tight">Carrier Trunk</p>
                <p className="text-[10px] text-slate-400">REST Handshake</p>
              </div>
            </div>
            <div className="p-3 rounded-lg border border-slate-200 bg-white flex items-center gap-2.5">
              <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[11px]">2</div>
              <div>
                <p className="font-bold text-slate-900 leading-tight">Consumer Ring</p>
                <p className="text-[10px] text-slate-400">PSTN Carrier</p>
              </div>
            </div>
            <div className="p-3 rounded-lg border border-slate-200 bg-white flex items-center gap-2.5">
              <div className="h-6 w-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-[11px]">3</div>
              <div>
                <p className="font-bold text-slate-900 leading-tight">AI Voice Live</p>
                <p className="text-[10px] text-slate-400">Conversational Turn</p>
              </div>
            </div>
            <div className="p-3 rounded-lg border border-slate-200 bg-white flex items-center gap-2.5">
              <div className="h-6 w-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[11px]">4</div>
              <div>
                <p className="font-bold text-slate-900 leading-tight">R2 Audio & QA</p>
                <p className="text-[10px] text-slate-400">Post-Call Evaluation</p>
              </div>
            </div>
          </div>

          {/* Live Telemetry Log Feed */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700">
              <div className="flex items-center gap-1.5">
                <Terminal className="h-4 w-4 text-emerald-600" />
                <span>Live Telephony Execution Stream</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 font-normal">Real-time carrier events</span>
            </div>

            <div className="h-36 overflow-y-auto bg-slate-950 rounded-xl p-3 font-mono text-xs text-slate-200 space-y-1 border border-slate-800 shadow-inner">
              {logs.length === 0 ? (
                <p className="text-slate-500 italic text-[11px]">Waiting for dialer trigger event...</p>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="flex items-start gap-2 text-[11px] leading-relaxed">
                    <span className="text-slate-500 select-none">[{log.time}]</span>
                    <span
                      className={
                        log.type === 'success'
                          ? 'text-emerald-400'
                          : log.type === 'error'
                          ? 'text-rose-400'
                          : log.type === 'warn'
                          ? 'text-amber-300'
                          : 'text-slate-300'
                      }
                    >
                      {log.text}
                    </span>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>

          {/* Enrolled Leads in Batch */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700">
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-indigo-600" />
                <span>Enrolled Lead Registry ({enrolledLeads.length})</span>
              </div>
              <span className="text-[11px] text-slate-400 font-normal">Lifecycle status & attempts</span>
            </div>

            <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
              {enrolledLeads.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">No leads enrolled in this campaign yet.</div>
              ) : (
                enrolledLeads.slice(0, 15).map((lead: any) => (
                  <div key={lead.id} className="p-3 flex items-center justify-between hover:bg-slate-50/60 transition-colors text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{lead.name}</span>
                        <span className="font-mono text-slate-500 text-[11px]">{formatPhoneNumber(lead.phone)}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Attempt {lead.attemptCount} of 3 • {lead.lastAttemptAt ? `Last attempt ${formatDate(lead.lastAttemptAt)}` : 'Untouched'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          lead.status === 'completed' || lead.status === 'contacted'
                            ? 'success'
                            : lead.status === 'calling'
                            ? 'info'
                            : lead.status === 'retry_scheduled'
                            ? 'warning'
                            : lead.status === 'failed' || lead.status === 'exhausted'
                            ? 'danger'
                            : 'neutral'
                        }
                        size="sm"
                        dot
                      >
                        {lead.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleDialBatch}
              isLoading={dialingBatch}
              leftIcon={<PhoneForwarded className="h-4 w-4" />}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              {dialingBatch ? 'Dialing Target Batch...' : 'Dial Next Batch (5 Leads)'}
            </Button>

            {campaign?.status === 'running' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePause}
                leftIcon={<Pause className="h-3.5 w-3.5 text-amber-600" />}
              >
                Pause
              </Button>
            ) : campaign?.status === 'paused' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResume}
                leftIcon={<Play className="h-3.5 w-3.5 text-emerald-600" />}
              >
                Resume
              </Button>
            ) : null}

            {campaign?.status !== 'cancelled' && campaign?.status !== 'completed' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleStop}
                leftIcon={<Square className="h-3.5 w-3.5" />}
                className="text-rose-600 hover:bg-rose-50"
              >
                Stop Campaign
              </Button>
            )}
          </div>

          <Button variant="outline" size="sm" onClick={onClose}>
            Close Monitor
          </Button>
        </div>
      </div>
    </div>
  );
};