import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Phone,
  Mail,
  Calendar,
  Clock,
  Sparkles,
  Bot,
  User,
  Play,
  Pause,
  Download,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ThumbsUp,
  Tag,
  History,
  PhoneCall,
  Volume2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Lead, Call } from '../../types';
import { formatDate, formatDuration, formatPhoneNumber } from '../../lib/formatters';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { leadService } from '../../services/leadService';
import { callService } from '../../services/callService';
import { agentService } from '../../services/agentService';
import { phoneService } from '../../services/phoneService';

export interface LeadDetailDrawerProps {
  leadId: string | null;
  onClose: () => void;
  onCallInitiated?: () => void;
}

export const LeadDetailDrawer: React.FC<LeadDetailDrawerProps> = ({ leadId, onClose, onCallInitiated }) => {
  const [timelineData, setTimelineData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [callMessage, setCallMessage] = useState<string | null>(null);
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);

  // Audio Playback
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingCallId, setPlayingCallId] = useState<string | null>(null);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);

  const fetchTimeline = async (id: string) => {
    setLoading(true);
    try {
      const data = await leadService.getLeadTimeline(id);
      setTimelineData(data);
    } catch (err) {
      console.error('Failed to load lead timeline:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (leadId) {
      fetchTimeline(leadId);
    } else {
      setTimelineData(null);
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingCallId(null);
    };
  }, [leadId]);

  if (!leadId) return null;

  const lead = timelineData?.lead;
  const calls: Call[] = timelineData?.calls || [];
  const campaigns = timelineData?.campaigns || [];
  const summary = timelineData?.summary || {};

  const handleInstantCall = async () => {
    if (!lead || isCalling) return;
    setIsCalling(true);
    setCallMessage(null);

    try {
      const [agentsList, phonesList] = await Promise.all([
        agentService.getAgents(),
        phoneService.getPhoneNumbers(),
      ]);

      const agent = agentsList[0];
      const phone = phonesList[0];

      if (!agent || !phone) {
        throw new Error('No active voice agent or phone number configured.');
      }

      await callService.initiateTestCall({
        agentVersionId: agent.currentVersionId,
        phoneNumberId: phone.id,
        toPhoneNumber: lead.phone,
        leadId: lead.id,
        userName: lead.name,
      });

      setCallMessage('AI Voice Call successfully initiated through Fluid Voice Carrier!');
      if (onCallInitiated) onCallInitiated();

      // Refresh timeline after 2 seconds
      setTimeout(() => {
        fetchTimeline(lead.id);
      }, 2500);
    } catch (err: any) {
      setCallMessage(`Call failed: ${err?.message || 'Telephony timeout'}`);
    } finally {
      setIsCalling(false);
    }
  };

  const togglePlayAudio = (callId: string) => {
    if (playingCallId === callId && audioRef.current) {
      audioRef.current.pause();
      setPlayingCallId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(`/api/calls/${callId}/audio`);
    audioRef.current = audio;

    audio.addEventListener('timeupdate', () => {
      setAudioCurrentTime(audio.currentTime);
    });

    audio.addEventListener('ended', () => {
      setPlayingCallId(null);
      setAudioCurrentTime(0);
    });

    audio.play().then(() => {
      setPlayingCallId(callId);
    }).catch(err => {
      console.warn('Playback error:', err);
      setPlayingCallId(null);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-950/30 backdrop-blur-[2px]" onClick={onClose} />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-2xl bg-white shadow-modal z-10 flex flex-col h-full border-l border-slate-200 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-5 bg-slate-50/70">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">{lead?.name || 'Customer Contact'}</h3>
              <Badge variant={summary.latestOutcome === 'successful_contact' ? 'success' : 'neutral'} dot>
                {summary.latestOutcome ? summary.latestOutcome.replace(/_/g, ' ') : 'Contact'}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 font-mono mt-1">
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3 text-slate-400" />
                {lead ? formatPhoneNumber(lead.phone) : '...'}
              </span>
              {lead?.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3 text-slate-400" />
                  {lead.email}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-16 text-center text-slate-500 space-y-2">
              <RotateCw className="h-6 w-6 animate-spin mx-auto text-indigo-600" />
              <p className="text-xs">Loading Lead 360° Profile & Communication History...</p>
            </div>
          ) : !lead ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Lead information not found.
            </div>
          ) : (
            <>
              {/* Quick Actions & Instant Triggers Bar */}
              <div className="p-4 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 via-white to-purple-50/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Lead Quick Actions
                  </span>
                  {summary.interestLevel === 'interested' && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-mono">
                      High Interest Lead
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    leftIcon={<PhoneCall className={`h-4 w-4 ${isCalling ? 'animate-bounce' : ''}`} />}
                    onClick={handleInstantCall}
                    disabled={isCalling}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                  >
                    {isCalling ? 'Dialing Call...' : 'Trigger AI Voice Call'}
                  </Button>

                  <a
                    href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      `Namaste ${lead.name} ji, thank you for connecting with Fluid.live! Here are the details about our AI voice calling solutions.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>Send WhatsApp</span>
                  </a>
                </div>

                {callMessage && (
                  <p className="text-xs font-medium text-indigo-900 bg-white/90 p-2.5 rounded-lg border border-indigo-100">
                    {callMessage}
                  </p>
                )}
              </div>

              {/* 4 Core Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Calls</span>
                  <span className="text-base font-bold font-mono text-slate-900 mt-0.5 block">{summary.totalCalls || 0}</span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Talk Time</span>
                  <span className="text-base font-bold font-mono text-slate-900 mt-0.5 block">{formatDuration(summary.totalDurationSeconds || 0)}</span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Follow-Up Channel</span>
                  <span className="font-semibold text-slate-800 capitalize mt-0.5 block">{summary.followUpPreference ? summary.followUpPreference.replace(/_/g, ' ') : 'None'}</span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Campaigns</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{campaigns.length} Active</span>
                </div>
              </div>

              {/* Lead Profile Metadata Card */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-700 text-[11px]">
                  <Tag className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Contact Profile & Custom Attributes</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Created On</span>
                    <span className="font-mono text-slate-700">{formatDate(lead.createdAt)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Assigned Campaign</span>
                    <span className="font-medium text-slate-800">
                      {campaigns[0]?.campaignName || 'Direct Outreach'}
                    </span>
                  </div>
                  {Object.entries(lead.metadata || {}).map(([key, val]) => (
                    <div key={key}>
                      <span className="text-slate-400 block uppercase text-[10px] font-bold">{key}</span>
                      <span className="font-semibold text-slate-900">{String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chronological Communication & Call Audio Timeline */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                    <History className="h-4 w-4 text-brand-600" />
                    <span>Communication & Voice History ({calls.length})</span>
                  </div>
                  <span className="text-[11px] text-slate-400">Reverse Chronological</span>
                </div>

                {calls.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 space-y-2">
                    <PhoneCall className="h-8 w-8 mx-auto text-slate-300" />
                    <p className="text-xs font-medium text-slate-600">No calls placed to this lead yet.</p>
                    <p className="text-[11px] text-slate-400">
                      Click "Trigger AI Voice Call" above to launch an instant conversation.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {calls.map((call, idx) => {
                      const intel = call.extractedVariables?.intelligence;
                      const isPlaying = playingCallId === call.id;
                      const isExpanded = expandedCallId === call.id;

                      return (
                        <div
                          key={call.id}
                          className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-2xs space-y-3"
                        >
                          {/* Call Header */}
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">
                                Call #{calls.length - idx}
                              </span>
                              <Badge
                                variant={
                                  call.status === 'completed'
                                    ? 'success'
                                    : call.status === 'failed'
                                    ? 'danger'
                                    : 'neutral'
                                }
                                size="sm"
                              >
                                {call.outcome ? call.outcome.replace(/_/g, ' ') : call.status}
                              </Badge>
                              {intel?.qaScorecard && (
                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-white">
                                  QA: {intel.qaScorecard.overallScore}/100
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[11px] text-slate-400">
                              {formatDate(call.startedAt)}
                            </span>
                          </div>

                          {/* Executive Summary */}
                          {call.extractedVariables?.call_summary && (
                            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                              "{call.extractedVariables.call_summary}"
                            </p>
                          )}

                          {/* Audio Player Strip */}
                          {call.durationSeconds > 0 && (
                            <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-slate-900 text-white text-xs">
                              <div className="flex items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => togglePlayAudio(call.id)}
                                  className="h-7 w-7 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center font-bold transition-all shadow-xs"
                                >
                                  {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
                                </button>
                                <span className="font-mono text-[11px]">
                                  {isPlaying ? formatDuration(Math.floor(audioCurrentTime)) : '0:00'} / {formatDuration(call.durationSeconds)}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                                <Volume2 className="h-3 w-3 text-emerald-400" />
                                <span>R2 Master Audio</span>
                                <a
                                  href={`/api/calls/${call.id}/audio`}
                                  download={`call_${call.id}.wav`}
                                  className="p-1 hover:text-white transition-colors"
                                  title="Download WAV"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </a>
                              </div>
                            </div>
                          )}

                          {/* Expand Transcript Toggle */}
                          {call.transcript && call.transcript.length > 0 && (
                            <div>
                              <button
                                type="button"
                                onClick={() => setExpandedCallId(isExpanded ? null : call.id)}
                                className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                              >
                                <span>{isExpanded ? 'Hide' : 'View'} Transcript ({call.transcript.length} turns)</span>
                                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              </button>

                              {isExpanded && (
                                <div className="mt-2.5 space-y-2 border-t border-slate-100 pt-2 text-xs">
                                  {call.transcript.map(msg => (
                                    <div
                                      key={msg.id}
                                      className={`p-2 rounded-lg ${
                                        msg.speaker === 'agent'
                                          ? 'bg-slate-50 text-slate-900 border border-slate-100'
                                          : 'bg-indigo-50/50 text-indigo-950 border border-indigo-100'
                                      }`}
                                    >
                                      <span className="font-bold uppercase text-[9px] block text-slate-400">
                                        {msg.speaker === 'agent' ? 'AI Agent (Shubh)' : lead.name} • {formatDuration(msg.timestampSeconds)}
                                      </span>
                                      <p className="mt-0.5 leading-snug">{msg.text}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

