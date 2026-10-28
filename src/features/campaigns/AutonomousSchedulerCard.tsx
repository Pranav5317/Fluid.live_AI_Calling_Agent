import React, { useState, useEffect } from 'react';
import {
  CalendarClock,
  RotateCw,
  Zap,
  ShieldCheck,
  Clock,
  PhoneCall,
  CheckCircle2,
  AlertTriangle,
  Play,
  Layers,
  Sparkles,
  Radio,
  Sliders,
} from 'lucide-react';
import { campaignService } from '../../services/campaignService';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { formatPhoneNumber, formatDate } from '../../lib/formatters';

export interface AutonomousSchedulerCardProps {
  onDispatched?: () => void;
}

export const AutonomousSchedulerCard: React.FC<AutonomousSchedulerCardProps> = ({ onDispatched }) => {
  const [schedulerData, setSchedulerData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [ticking, setTicking] = useState(false);
  const [forceBypassWindow, setForceBypassWindow] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'warn' | 'error'; text: string } | null>(null);

  const fetchSchedulerStatus = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await campaignService.getSchedulerStatus();
      setSchedulerData(data);
    } catch (err) {
      console.error('Failed to load scheduler telemetry:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedulerStatus();
    const interval = setInterval(() => {
      fetchSchedulerStatus(true);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleTriggerTick = async () => {
    setTicking(true);
    setFeedback(null);
    try {
      const res = await campaignService.triggerSchedulerTick({
        forceIgnoreWindow: forceBypassWindow,
      });

      if (res.skipped) {
        setFeedback({
          type: 'warn',
          text: `Tick Skipped: ${res.message || res.reason}`,
        });
      } else {
        setFeedback({
          type: 'success',
          text: `✓ ${res.message} (${res.dispatches?.length || 0} calls placed via Fluid Voice Engine)`,
        });
      }

      await fetchSchedulerStatus(true);
      if (onDispatched) onDispatched();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: `Scheduler run error: ${err?.message}`,
      });
    } finally {
      setTicking(false);
    }
  };

  const windowInfo = schedulerData?.windowInfo;
  const upcomingSchedule: any[] = schedulerData?.upcomingSchedule || [];
  const dueCount = schedulerData?.dueNowForDialing || 0;
  const totalInCadence = schedulerData?.totalScheduledInCadence || 0;
  const runningCampaigns = schedulerData?.runningCampaigns || 0;

  return (
    <Card noPadding className="border-slate-200 shadow-sm overflow-hidden">
      {/* Top Header */}
      <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <CalendarClock className="h-5 w-5 animate-pulse" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">
                    Autonomous Telephony Scheduler & Dispatch Engine
                  </h3>
                  <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                    <Radio className="h-2.5 w-2.5 animate-ping text-emerald-400" />
                    Live Engine
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  Automatically plans, paces, and executes outbound calls to consumers using dynamic time-shifting, TRAI legal window guardrails, and anti-fatigue backoffs.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-slate-300 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors select-none">
              <input
                type="checkbox"
                checked={forceBypassWindow}
                onChange={e => setForceBypassWindow(e.target.checked)}
                className="rounded border-slate-600 text-indigo-600 focus:ring-0 cursor-pointer"
              />
              <span className="text-[11px] font-medium">Bypass Calling Window (Dev Test)</span>
            </label>

            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchSchedulerStatus()}
              leftIcon={<RotateCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />}
              className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs"
            >
              Sync
            </Button>

            <Button
              size="sm"
              onClick={handleTriggerTick}
              isLoading={ticking}
              leftIcon={<Zap className="h-3.5 w-3.5" />}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md"
            >
              Trigger Scheduler Tick Now
            </Button>
          </div>
        </div>

        {/* Legal Calling Window Status Bar */}
        <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                windowInfo?.isOpen ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
              }`}
            />
            <span className="font-semibold text-white">
              {windowInfo?.isOpen
                ? `Calling Window Active • ${windowInfo.currentISTTime} (${windowInfo.dayOfWeek})`
                : `Calling Window Paused • ${windowInfo?.currentISTTime || 'Outside Hours'} (${windowInfo?.dayOfWeek})`}
            </span>
            <span className="text-slate-400 font-mono text-[11px]">
              • Rules: {windowInfo?.windowRules || '10:00 AM - 7:30 PM IST'}
            </span>
          </div>

          {!windowInfo?.isOpen && windowInfo?.nextWindowStart && (
            <span className="text-amber-300 text-[11px] font-mono flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Resumes: {formatDate(windowInfo.nextWindowStart)}</span>
            </span>
          )}
        </div>
      </div>

      {/* Real-time Feedback Banner */}
      {feedback && (
        <div
          className={`px-5 py-3 text-xs font-semibold flex items-center justify-between border-b ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-100'
              : feedback.type === 'warn'
              ? 'bg-amber-50 text-amber-900 border-amber-100'
              : 'bg-rose-50 text-rose-900 border-rose-100'
          }`}
        >
          <span>{feedback.text}</span>
          <button type="button" onClick={() => setFeedback(null)} className="opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 border-b border-slate-200 bg-slate-50/60 text-xs">
        <div className="p-4">
          <span className="text-slate-500 block text-[11px] uppercase font-bold tracking-wider">
            Due for Redial Right Now
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold font-mono text-emerald-600">{dueCount}</span>
            <span className="text-[11px] text-slate-500 font-medium">leads ready</span>
          </div>
        </div>

        <div className="p-4">
          <span className="text-slate-500 block text-[11px] uppercase font-bold tracking-wider">
            Total Enrolled in Cadence
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold font-mono text-indigo-700">{totalInCadence}</span>
            <span className="text-[11px] text-slate-500 font-medium">in queue</span>
          </div>
        </div>

        <div className="p-4">
          <span className="text-slate-500 block text-[11px] uppercase font-bold tracking-wider">
            Active Campaigns Covered
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold font-mono text-slate-900">{runningCampaigns}</span>
            <span className="text-[11px] text-slate-500 font-medium">running</span>
          </div>
        </div>

        <div className="p-4">
          <span className="text-slate-500 block text-[11px] uppercase font-bold tracking-wider">
            Dispatch Protection
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xs font-bold font-mono text-slate-800 flex items-center gap-1">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              TRAI + {schedulerData?.cadencePolicy?.maxCallsPer24Hours || 2} Dials/Day Cap
            </span>
          </div>
        </div>
      </div>

      {/* Autonomous Schedule Table */}
      <div className="overflow-x-auto">
        <div className="px-5 py-3 bg-white border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Upcoming Dynamic Dispatches ({upcomingSchedule.length})
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            Auto-evaluated on each schedule tick
          </span>
        </div>

        {loading && upcomingSchedule.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 space-y-2">
            <RotateCw className="h-5 w-5 animate-spin mx-auto text-indigo-600" />
            <p>Evaluating upcoming dynamic telephony schedule...</p>
          </div>
        ) : upcomingSchedule.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400">
            <CheckCircle2 className="h-7 w-7 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="font-semibold text-slate-700">No pending dispatches</p>
            <p className="mt-0.5">All campaign leads are currently touched or waiting for upcoming cadence intervals.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Consumer Contact</th>
                <th className="px-5 py-3">Campaign</th>
                <th className="px-5 py-3">Cadence Strategy</th>
                <th className="px-5 py-3">Scheduled Time (IST Snapped)</th>
                <th className="px-5 py-3 text-right">Autonomous Engine Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {upcomingSchedule.map(item => (
                <tr key={item.campaignLeadId} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-3.5">
                    <span className="font-semibold text-slate-900 block">{item.leadName}</span>
                    <span className="font-mono text-slate-500 text-[11px]">{formatPhoneNumber(item.phone)}</span>
                  </td>

                  <td className="px-5 py-3.5 font-medium text-slate-700">
                    {item.campaignName}
                  </td>

                  <td className="px-5 py-3.5">
                    <span className="font-semibold text-slate-800 block">{item.cadenceTier}</span>
                    <span className="text-[10px] text-slate-400 font-mono">Attempt {item.attemptCount} of {item.maxAttempts}</span>
                  </td>

                  <td className="px-5 py-3.5 font-mono text-[11px]">
                    {item.isDue ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <Clock className="h-3 w-3" />
                        <span>DUE NOW</span>
                      </span>
                    ) : item.nextAttemptAt ? (
                      <span className="text-slate-800">
                        {formatDate(item.nextAttemptAt)}
                      </span>
                    ) : (
                      <span className="text-slate-400">Scheduled on campaign start</span>
                    )}
                  </td>

                  <td className="px-5 py-3.5 text-right">
                    <Badge variant={item.isDue ? 'success' : 'neutral'} size="sm">
                      {item.isDue ? 'Ready to Dial' : 'Waiting for Window'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
};

