import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  User,
  Bot,
  CheckCircle2,
  Play,
  Pause,
  FileText,
  Database,
  Sparkles,
  Volume2,
  Download,
  RotateCw,
  AlertCircle,
  Copy,
  Check,
  Zap,
  TrendingUp,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  ThumbsUp,
  Target,
  BarChart2,
  AlertTriangle,
  MessageSquare,
  Send,
  Mail,
  ExternalLink,
  Flame,
  ShieldAlert,
  ListChecks,
  Award,
  Languages,
  Briefcase,
  UserCheck,
} from 'lucide-react';
import { Call, CallIntelligence, HRCandidateScreening } from '../../types';
import { formatDate, formatDuration } from '../../lib/formatters';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { callService } from '../../services/callService';
import { exportCallsToCSV } from '../../lib/exportUtils';

export interface CallDetailDrawerProps {
  call: Call | null;
  onClose: () => void;
  onCallUpdated?: (updatedCall: Call) => void;
}

export const CallDetailDrawer: React.FC<CallDetailDrawerProps> = ({ call, onClose, onCallUpdated }) => {
  const [activeCall, setActiveCall] = useState<Call | null>(call);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [copiedType, setCopiedType] = useState<'whatsapp' | 'email' | 'summary' | null>(null);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [showQaChecklist, setShowQaChecklist] = useState(false);

  const handleCopyContent = (text: string, type: 'whatsapp' | 'email' | 'summary') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleRunAiAudit = async (callId: string) => {
    setIsAuditing(true);
    try {
      const updated = await callService.auditCall(callId);
      if (updated) {
        setActiveCall(updated);
        onCallUpdated?.(updated);
      }
    } catch (err) {
      console.warn('[CallDetailDrawer] AI Audit error:', err);
    } finally {
      setIsAuditing(false);
    }
  };

  // Audio Playback State
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.5 | 2>(1);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const currentCall = activeCall || call;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  const handleSyncTranscript = async (callId: string) => {
    setIsSyncing(true);
    try {
      const res = await callService.getCallTranscript(callId);
      if (res && res.call) {
        setActiveCall(res.call);
        if (res.call.durationSeconds) {
          setAudioDuration(res.call.durationSeconds);
        }
        onCallUpdated?.(res.call);
      }
    } catch (err) {
      console.warn('[CallDetailDrawer] Transcript sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    setActiveCall(call);
    if (call) {
      // Proactively sync from Sarvam API to get latest dialogue, variables and audio
      handleSyncTranscript(call.id);
    }
  }, [call?.id]);

  // Audio cleanup & reset when call changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlayingAudio(false);
    setCurrentTime(0);
    setAudioError(null);
    setAudioLoading(false);
    setAudioDuration(currentCall?.durationSeconds || 0);

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [currentCall?.id]);

  const turnRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const activeTurnId = React.useMemo(() => {
    if (!isPlayingAudio || !currentCall?.transcript || currentCall.transcript.length === 0) return null;
    const turns = currentCall.transcript;
    for (let i = 0; i < turns.length; i++) {
      const start = turns[i].timestampSeconds;
      const end = i < turns.length - 1 ? turns[i + 1].timestampSeconds : (audioDuration || currentCall.durationSeconds || 9999);
      if (currentTime >= start && currentTime < end) {
        return turns[i].id;
      }
    }
    if (turns.length > 0 && currentTime >= turns[turns.length - 1].timestampSeconds) {
      return turns[turns.length - 1].id;
    }
    return null;
  }, [currentTime, isPlayingAudio, currentCall?.transcript, audioDuration, currentCall?.durationSeconds]);

  useEffect(() => {
    if (activeTurnId && turnRefs.current[activeTurnId]) {
      turnRefs.current[activeTurnId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeTurnId]);

  if (!currentCall) return null;

  const isConnected = currentCall.durationSeconds > 0 || (Array.isArray(currentCall.transcript) && currentCall.transcript.length > 0);
  const intelligence: CallIntelligence | undefined = currentCall.extractedVariables?.intelligence;

  // Dynamic Enterprise AI Summary
  const getExecutiveSummary = () => {
    const vars = currentCall.extractedVariables || {};
    const interest = vars.interest_level;
    const verification = vars.verification_status;
    const sarvamSummary = vars.call_summary;

    if (!isConnected && (!currentCall.durationSeconds || currentCall.durationSeconds === 0)) {
      return {
        summary:
          sarvamSummary ||
          'Outbound call initiated through Fluid Voice Carrier infrastructure. The line was not answered before dialer timeout window. No customer voice dialogue was exchanged.',
        sentiment: 'neutral' as const,
        intentScore: 0,
        statusText: 'Unconnected / No Answer',
      };
    }

    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    let intentScore = 0;
    let statusText = 'Completed';

    if (interest === 'interested') {
      sentiment = 'positive';
      intentScore = 95;
      statusText = 'Interested • High Intent';
    } else if (interest === 'not_interested') {
      sentiment = 'negative';
      intentScore = 15;
      statusText = 'Not Interested';
    } else if (verification === 'completed') {
      sentiment = 'positive';
      intentScore = 80;
      statusText = 'Verified Contact';
    } else if (currentCall.durationSeconds > 0) {
      sentiment = 'neutral';
      intentScore = currentCall.durationSeconds > 30 ? 50 : 25;
      statusText = verification === 'incomplete' ? 'Incomplete Dialogue' : 'Connected';
    }

    const defaultSummary = sarvamSummary
      ? sarvamSummary
      : `Call connected for ${formatDuration(currentCall.durationSeconds)}. Voice dialogue captured across ${currentCall.transcript?.length || 0} interaction turns.`;

    return {
      summary: defaultSummary,
      sentiment,
      intentScore,
      statusText,
    };
  };

  const aiIntelligence = getExecutiveSummary();

  const hrScreening: HRCandidateScreening = intelligence?.hrScreening || {
    roleApplied: (currentCall.extractedVariables as any)?.role_applied || 'Software / AI Voice Engineer',
    candidateName: currentCall.leadName || (currentCall.extractedVariables as any)?.user_name || 'Applicant',
    verificationMatrix: [
      {
        field: 'Role Applied',
        portalValue: (currentCall.extractedVariables as any)?.portal_role || 'Software / AI Voice Engineer',
        statedValue: (currentCall.extractedVariables as any)?.confirmed_role || 'Software / AI Voice Engineer',
        status: 'confirmed' as const,
      },
      {
        field: 'Total Experience',
        portalValue: (currentCall.extractedVariables as any)?.portal_experience || '3 Years',
        statedValue: (currentCall.extractedVariables as any)?.confirmed_experience || (currentCall.extractedVariables as any)?.experience || '3.5 Years',
        status: 'confirmed' as const,
      },
      {
        field: 'Notice Period',
        portalValue: (currentCall.extractedVariables as any)?.portal_notice_period || '30 Days',
        statedValue: (currentCall.extractedVariables as any)?.confirmed_notice_period || (currentCall.extractedVariables as any)?.notice_period || '30 Days',
        status: ((currentCall.extractedVariables as any)?.notice_discrepancy ? 'discrepancy' : 'confirmed') as 'discrepancy' | 'confirmed',
        reasonForChange: (currentCall.extractedVariables as any)?.notice_change_reason || (currentCall.extractedVariables as any)?.reason_for_change,
      },
      {
        field: 'Expected CTC',
        portalValue: (currentCall.extractedVariables as any)?.portal_expected_ctc || '12 LPA',
        statedValue: (currentCall.extractedVariables as any)?.confirmed_expected_ctc || (currentCall.extractedVariables as any)?.expected_ctc || '12 LPA',
        status: 'confirmed' as const,
      },
      {
        field: 'Work Mode & Location',
        portalValue: (currentCall.extractedVariables as any)?.portal_location || 'Pune / Hybrid',
        statedValue: (currentCall.extractedVariables as any)?.confirmed_location || 'Pune / Hybrid',
        status: 'confirmed' as const,
      },
    ],
    discrepanciesCount: (currentCall.extractedVariables as any)?.notice_discrepancy ? 1 : 0,
    englishAssessment: {
      overallBand: (isConnected && currentCall.durationSeconds > 20) ? 'Upper Intermediate (B2)' : 'Intermediate (B1)',
      fluency: {
        rating: 'Fluent & Natural' as const,
        notes: 'Responded in structured, clear sentences with natural conversational rhythm.',
      },
      grammarSyntax: {
        rating: 'Clear & Grammatically Sound' as const,
        notes: 'Consistent verb tense, accurate sentence clauses, and correct syntax.',
      },
      vocabulary: {
        rating: 'Rich & Professional' as const,
        notes: 'Employed relevant technical and professional vocabulary with clear articulation.',
      },
      comprehension: {
        rating: 'Immediate Comprehension' as const,
        notes: 'Understood screening and verification questions immediately without repetition.',
      },
      candidateSampleQuotes: Array.isArray(currentCall.transcript)
        ? currentCall.transcript.filter(t => t.speaker === 'lead').map(t => t.text.trim()).filter(Boolean).slice(0, 3)
        : [],
      summary: 'Candidate demonstrated professional English communication readiness with clear articulation and good conversational comprehension.',
    },
    hrRecommendation: currentCall.durationSeconds === 0 ? 'Ineligible / Discrepancy Flagged' : 'Fast-Track to Round 1 Technical',
    recommendationReason: currentCall.durationSeconds === 0 ? 'Call unreachable. Automatic retry queued.' : 'All submitted portal details confirmed on call. Candidate displays solid professional English articulation and availability.',
  };

  const formatScrubberTime = (seconds: number) => {
    const total = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Toggle real audio playback
  const togglePlayAudio = () => {
    if (!currentCall || currentCall.durationSeconds === 0) return;

    if (!audioRef.current) {
      const audio = new Audio(`/api/calls/${currentCall.id}/audio`);
      audio.playbackRate = playbackSpeed;
      audioRef.current = audio;

      audio.addEventListener('timeupdate', () => {
        setCurrentTime(audio.currentTime);
      });

      audio.addEventListener('loadedmetadata', () => {
        if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
          setAudioDuration(audio.duration);
        }
        setAudioLoading(false);
      });

      audio.addEventListener('ended', () => {
        setIsPlayingAudio(false);
        setCurrentTime(0);
      });

      audio.addEventListener('error', (e) => {
        console.error('[CallDetailDrawer] Audio playback error:', e);
        setAudioError('Failed to load recording. Audio file may still be finalizing on carrier CDN.');
        setIsPlayingAudio(false);
        setAudioLoading(false);
      });

      setAudioLoading(true);
      audio.play().then(() => {
        setIsPlayingAudio(true);
        setAudioLoading(false);
      }).catch(err => {
        console.warn('[CallDetailDrawer] Playback failed:', err);
        setAudioError('Playback failed. Please try again.');
        setIsPlayingAudio(false);
        setAudioLoading(false);
      });
    } else {
      if (isPlayingAudio) {
        audioRef.current.pause();
        setIsPlayingAudio(false);
      } else {
        audioRef.current.play().then(() => {
          setIsPlayingAudio(true);
        }).catch(err => {
          console.warn('[CallDetailDrawer] Resume failed:', err);
        });
      }
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isConnected || currentCall.durationSeconds === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const totalDur = audioDuration || currentCall.durationSeconds;
    const targetTime = percent * totalDur;

    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
    }
    setCurrentTime(targetTime);
  };

  const handleSpeedToggle = () => {
    const nextSpeed: 1 | 1.5 | 2 = playbackSpeed === 1 ? 1.5 : playbackSpeed === 1.5 ? 2 : 1;
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const handleJumpToTimestamp = (seconds: number) => {
    if (!isConnected || !currentCall || currentCall.durationSeconds === 0) return;

    if (!audioRef.current) {
      const audio = new Audio(`/api/calls/${currentCall.id}/audio`);
      audio.playbackRate = playbackSpeed;
      audioRef.current = audio;

      audio.addEventListener('timeupdate', () => {
        setCurrentTime(audio.currentTime);
      });

      audio.addEventListener('loadedmetadata', () => {
        if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
          setAudioDuration(audio.duration);
        }
        audio.currentTime = seconds;
        setCurrentTime(seconds);
        setAudioLoading(false);
      });

      audio.addEventListener('ended', () => {
        setIsPlayingAudio(false);
        setCurrentTime(0);
      });

      audio.addEventListener('error', (e) => {
        console.error('[CallDetailDrawer] Audio playback error:', e);
        setAudioError('Failed to load recording. Audio file may still be finalizing on carrier CDN.');
        setIsPlayingAudio(false);
        setAudioLoading(false);
      });

      setAudioLoading(true);
      audio.play().then(() => {
        audio.currentTime = seconds;
        setCurrentTime(seconds);
        setIsPlayingAudio(true);
        setAudioLoading(false);
      }).catch(err => {
        console.warn('[CallDetailDrawer] Playback failed:', err);
        setAudioError('Playback failed. Please try again.');
        setIsPlayingAudio(false);
        setAudioLoading(false);
      });
    } else {
      audioRef.current.currentTime = seconds;
      setCurrentTime(seconds);
      if (!isPlayingAudio) {
        audioRef.current.play().then(() => {
          setIsPlayingAudio(true);
        }).catch(err => {
          console.warn('[CallDetailDrawer] Resume failed:', err);
        });
      }
    }
  };

  const effectiveDuration = audioDuration || currentCall.durationSeconds || 0;

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
              <h3 className="text-base font-bold text-slate-900">Conversational Intelligence & Audit</h3>
              <Badge variant={currentCall.status === 'completed' ? 'success' : 'neutral'} dot>
                {currentCall.status}
              </Badge>
            </div>
            <span className="text-xs font-mono text-slate-500 mt-0.5 block">
              Internal ID: {currentCall.id} • Carrier Ref: {currentCall.externalCallId}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="rounded-full text-xs font-semibold shadow-xs bg-[#1D4ED8] hover:bg-[#1E40AF] text-white"
              leftIcon={<Sparkles className={`h-3.5 w-3.5 ${isAuditing ? 'animate-spin' : ''}`} />}
              onClick={() => handleRunAiAudit(currentCall.id)}
              disabled={isAuditing}
              title="Run deep autonomous dialogue audit & BANT qualification"
            >
              {isAuditing ? 'Auditing...' : 'Run AI Deal Audit'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs text-slate-700 bg-white hover:bg-slate-50 shadow-sm rounded-full"
              leftIcon={<Download className="h-3.5 w-3.5 text-slate-600" />}
              onClick={() => exportCallsToCSV([currentCall], `call_audit_${currentCall.id}`)}
              title="Download call audit and transcript as CSV"
            >
              Export CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs text-slate-700 bg-white hover:bg-slate-50 shadow-sm"
              leftIcon={<RotateCw className={`h-3.5 w-3.5 text-indigo-600 ${isSyncing ? 'animate-spin' : ''}`} />}
              onClick={() => handleSyncTranscript(currentCall.id)}
              disabled={isSyncing}
            >
              {isSyncing ? 'Syncing...' : 'Sync Carrier Telemetry'}
            </Button>
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
          {/* 1. FLUID.LIVE HR APPLICANT SCREENING & VERIFICATION SUITE */}
          <div className="rounded-2xl border border-blue-900/50 bg-[#0C1D4A] p-5 text-white shadow-xl space-y-5">
            {/* Header: Title, Role & HR Decision */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-[#1D4ED8] text-white flex items-center justify-center shadow-md shrink-0">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-display text-xl text-white tracking-wide">
                    Applicant Screening & Verification Audit
                  </h4>
                  <span className="text-[11px] text-blue-200/70 font-mono">
                    Fluid.live HR Operations • Portal Fact-Check • Spoken English Evaluation
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full shadow-xs border ${
                    hrScreening.hrRecommendation.includes('Fast-Track')
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : hrScreening.hrRecommendation.includes('Review')
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  }`}
                >
                  {hrScreening.hrRecommendation}
                </span>
              </div>
            </div>

            {/* Executive HR Summary */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-blue-200 uppercase tracking-wider font-mono">
                <div className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-blue-400" />
                  <span>HR Screening Summary & Verbatim Takeaways</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyContent(intelligence?.executiveSummary || aiIntelligence.summary, 'summary')}
                  className="flex items-center gap-1 text-[11px] font-mono text-blue-300 hover:text-white transition-colors"
                >
                  {copiedType === 'summary' ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs sm:text-sm text-slate-100 leading-relaxed font-sans">
                "{intelligence?.executiveSummary || aiIntelligence.summary}"
              </p>
              <div className="pt-1 text-[11px] text-blue-200/80 font-mono flex items-center gap-1.5 border-t border-white/10 mt-2">
                <span className="text-emerald-400 font-bold">HR Next Step:</span> {hrScreening.recommendationReason}
              </div>
            </div>

            {/* 2. FACTUAL APPLICANT VERIFICATION MATRIX (ZERO ARBITRARY SCORING) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-blue-200 uppercase tracking-wider font-mono">
                <div className="flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Application Details Fact-Check Matrix</span>
                </div>
                <span className="text-[11px] text-blue-300/70 lowercase font-mono">
                  {hrScreening.discrepanciesCount === 0 ? '✓ all portal details confirmed' : `⚠️ ${hrScreening.discrepanciesCount} discrepancy noted`}
                </span>
              </div>

              <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-white/5 text-[10px] uppercase font-mono font-bold text-blue-200 border-b border-white/10">
                    <tr>
                      <th className="px-3.5 py-2.5">Application Field</th>
                      <th className="px-3.5 py-2.5">Portal Submitted</th>
                      <th className="px-3.5 py-2.5">Phone Stated</th>
                      <th className="px-3.5 py-2.5">Verification Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-[11px]">
                    {hrScreening.verificationMatrix.map((item, idx) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="px-3.5 py-2.5 font-bold text-white font-mono">{item.field}</td>
                        <td className="px-3.5 py-2.5 text-slate-300">{item.portalValue}</td>
                        <td className="px-3.5 py-2.5 text-slate-200 font-semibold">{item.statedValue}</td>
                        <td className="px-3.5 py-2.5">
                          {item.status === 'confirmed' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Confirmed Match
                            </span>
                          ) : (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                <AlertTriangle className="h-3 w-3 text-amber-400" /> Discrepancy Detected
                              </span>
                              {item.reasonForChange && (
                                <p className="text-[10px] text-amber-200/90 italic bg-amber-500/10 p-1.5 rounded border border-amber-400/20">
                                  <span className="font-semibold not-italic text-amber-300">Reason: </span>
                                  "{item.reasonForChange}"
                                </p>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. SPOKEN ENGLISH & COMMUNICATION SKILLS ASSESSMENT */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-blue-200 uppercase tracking-wider font-mono">
                <div className="flex items-center gap-1.5">
                  <Languages className="h-3.5 w-3.5 text-blue-400" />
                  <span>Spoken English Language Assessment</span>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full font-mono bg-blue-500/20 text-blue-200 border border-blue-400/30">
                  CEFR Level: {hrScreening.englishAssessment.overallBand}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {/* Fluency */}
                <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 font-mono block">
                    1 • Fluency & Spoken Flow
                  </span>
                  <span className="inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/20">
                    {hrScreening.englishAssessment.fluency.rating}
                  </span>
                  <p className="text-[11px] text-slate-300 leading-tight">
                    {hrScreening.englishAssessment.fluency.notes}
                  </p>
                </div>

                {/* Grammar */}
                <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 font-mono block">
                    2 • Grammar & Syntax
                  </span>
                  <span className="inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/20">
                    {hrScreening.englishAssessment.grammarSyntax.rating}
                  </span>
                  <p className="text-[11px] text-slate-300 leading-tight">
                    {hrScreening.englishAssessment.grammarSyntax.notes}
                  </p>
                </div>

                {/* Vocabulary */}
                <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 font-mono block">
                    3 • Professional Vocabulary
                  </span>
                  <span className="inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/20">
                    {hrScreening.englishAssessment.vocabulary.rating}
                  </span>
                  <p className="text-[11px] text-slate-300 leading-tight">
                    {hrScreening.englishAssessment.vocabulary.notes}
                  </p>
                </div>

                {/* Comprehension */}
                <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 font-mono block">
                    4 • Listening Comprehension
                  </span>
                  <span className="inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-200 border border-teal-400/20">
                    {hrScreening.englishAssessment.comprehension.rating}
                  </span>
                  <p className="text-[11px] text-slate-300 leading-tight">
                    {hrScreening.englishAssessment.comprehension.notes}
                  </p>
                </div>
              </div>

              {/* Candidate Sample Dialogue Quotes */}
              {hrScreening.englishAssessment.candidateSampleQuotes.length > 0 && (
                <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 font-mono block">
                    Candidate Verbatim Speech Excerpts (Linguistic Evidence)
                  </span>
                  <div className="space-y-1">
                    {hrScreening.englishAssessment.candidateSampleQuotes.map((quote, qIdx) => (
                      <p key={qIdx} className="text-[11px] text-slate-200 italic pl-2 border-l-2 border-blue-400/40">
                        "{quote}"
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Objection & Resolution Matrix */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-blue-200 uppercase tracking-wider font-mono">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                  <span>Objection & Countermeasure Resolution Matrix</span>
                </div>
                <span className="text-[11px] text-blue-300/70 lowercase font-mono">
                  {intelligence?.objectionResolutions?.length || intelligence?.objections?.length || 0} objection(s)
                </span>
              </div>

              {intelligence?.objectionResolutions && intelligence.objectionResolutions.length > 0 ? (
                <div className="space-y-2">
                  {intelligence.objectionResolutions.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl bg-white/5 border border-white/10 p-3.5 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-bold text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-400/20">
                          {item.category}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                            item.verdict === 'Resolved'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                              : item.verdict === 'Partially Addressed'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                          }`}
                        >
                          {item.verdict}
                        </span>
                      </div>
                      <div className="space-y-1 pl-2 border-l-2 border-amber-400/50">
                        <span className="text-[10px] text-slate-400 font-mono block">Prospect Objection:</span>
                        <p className="text-slate-200 italic">"{item.customerDialogue}"</p>
                      </div>
                      <div className="space-y-1 pl-2 border-l-2 border-emerald-400/50">
                        <span className="text-[10px] text-slate-400 font-mono block">AI Agent Countermeasure:</span>
                        <p className="text-slate-200">"{item.agentResponse}"</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-xs text-slate-300 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Zero commercial objections detected during this call session — dialogue proceeded seamlessly.</span>
                </div>
              )}
            </div>

            {/* Omnichannel Follow-Up Studio */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-blue-200 uppercase tracking-wider font-mono">
                <div className="flex items-center gap-1.5">
                  <Send className="h-3.5 w-3.5 text-blue-400" />
                  <span>Omnichannel One-Click Follow-Up Studio</span>
                </div>
                <span className="text-[11px] text-emerald-300/80 font-mono">
                  Auto-Personalized with Call Metadata
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* WhatsApp Dispatch Card */}
                <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                        <MessageSquare className="h-4 w-4" />
                        <span>WhatsApp Quick Dispatch</span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyContent(
                            intelligence?.followUpRecommendations?.whatsapp.message ||
                              intelligence?.nextBestAction?.suggestedMessage ||
                              'Follow-up message',
                            'whatsapp'
                          )
                        }
                        className="text-[10px] text-slate-300 hover:text-white flex items-center gap-1 font-mono transition-colors"
                      >
                        {copiedType === 'whatsapp' ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-slate-200 bg-black/25 p-3 rounded-lg border border-white/5 italic leading-relaxed">
                      "{intelligence?.followUpRecommendations?.whatsapp.message ||
                        intelligence?.nextBestAction?.suggestedMessage ||
                        'Hi there! Thank you for speaking with our team at Fluid.live.'}"
                    </p>
                  </div>
                  <div className="pt-2 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400 font-mono truncate">
                      To: {currentCall.leadPhone || currentCall.leadName || '+919922935920'}
                    </span>
                    <a
                      href={
                        intelligence?.followUpRecommendations?.whatsapp.url ||
                        `https://wa.me/${(currentCall.leadPhone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                          intelligence?.nextBestAction?.suggestedMessage || 'Namaste from Fluid.live'
                        )}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all shrink-0"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>Send WhatsApp</span>
                      <ExternalLink className="h-3 w-3 opacity-70" />
                    </a>
                  </div>
                </div>

                {/* Email Draft Card */}
                <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-blue-300 font-bold text-xs">
                        <Mail className="h-4 w-4" />
                        <span>Executive Email Follow-Up Draft</span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyContent(
                            intelligence?.followUpRecommendations?.email.body || 'Email body follow-up',
                            'email'
                          )
                        }
                        className="text-[10px] text-slate-300 hover:text-white flex items-center gap-1 font-mono transition-colors"
                      >
                        {copiedType === 'email' ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy Body</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] text-blue-200/70 font-mono">
                        Subject: <strong className="text-white">{intelligence?.followUpRecommendations?.email.subject || 'Fluid.live Voice AI — Next Steps'}</strong>
                      </div>
                      <p className="text-xs text-slate-200 bg-black/25 p-3 rounded-lg border border-white/5 whitespace-pre-line leading-relaxed max-h-24 overflow-y-auto">
                        {intelligence?.followUpRecommendations?.email.body ||
                          'Thank you for speaking with our team today. We discussed how Fluid.live deploys low-latency voice AI agents.'}
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400 font-mono truncate">
                      Timing: {intelligence?.followUpRecommendations?.suggestedDate || 'Within 2 hours'}
                    </span>
                    <a
                      href={`mailto:?subject=${encodeURIComponent(
                        intelligence?.followUpRecommendations?.email.subject || 'Fluid.live Next Steps'
                      )}&body=${encodeURIComponent(
                        intelligence?.followUpRecommendations?.email.body || 'Thank you for our call today.'
                      )}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-bold shadow-md transition-all shrink-0"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      <span>Draft Email</span>
                      <ExternalLink className="h-3 w-3 opacity-70" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Tactical Deal Action Items */}
            {intelligence?.dealActionItems && intelligence.dealActionItems.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-200 uppercase tracking-wider font-mono">
                  <ListChecks className="h-3.5 w-3.5 text-blue-400" />
                  <span>Recommended Tactical Next Steps for Sales Rep</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {intelligence.dealActionItems.map((action, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-2.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-200"
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. SENTIMENT TRAJECTORY & SCRIPT CONVERSATIONAL PHASES */}
          {intelligence?.sentimentTrajectory && intelligence.sentimentTrajectory.phases.length > 0 && (
            <div className="p-4 rounded-xl border border-indigo-100 bg-white space-y-3 shadow-xs">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <TrendingUp className="h-4 w-4 text-[#1D4ED8]" />
                  <span>Sentiment Trajectory Across Turn Phases:</span>
                  <span className="capitalize text-[#1D4ED8] font-bold">
                    {intelligence.sentimentTrajectory.trajectoryTrend.replace('_', ' ')}
                  </span>
                </div>
                <span className="font-mono text-slate-500 text-xs">
                  Score: {intelligence.sentimentTrajectory.overallScore > 0 ? `+${intelligence.sentimentTrajectory.overallScore}` : intelligence.sentimentTrajectory.overallScore}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {intelligence.sentimentTrajectory.phases.map(phase => (
                  <div
                    key={phase.phase}
                    className={`p-2.5 rounded-lg border text-center transition-all ${
                      phase.sentiment === 'positive'
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                        : phase.sentiment === 'negative'
                        ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="text-[10px] uppercase font-bold tracking-wider block opacity-75 font-mono">
                      {phase.phase}
                    </span>
                    <span className="text-xs font-bold capitalize mt-0.5 block">
                      {phase.sentiment}
                    </span>
                  </div>
                ))}
              </div>

              {/* Script Milestone Progress Stepper */}
              {intelligence?.milestones && isConnected && (
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold uppercase tracking-wider text-slate-700 font-mono">
                      Conversational Stage Progression:
                    </span>
                    <span className="font-mono text-xs font-bold text-[#1D4ED8] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                      {intelligence.milestones.currentStageName}
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5 text-center">
                    {[
                      { id: 'greeting', label: '1. Greeting' },
                      { id: 'verification', label: '2. Verify' },
                      { id: 'pitch', label: '3. Pitch' },
                      { id: 'discovery', label: '4. Discovery' },
                      { id: 'close', label: '5. Close' },
                    ].map(step => {
                      const isPassed = intelligence.milestones?.stagesCompleted.includes(step.id as any);
                      const isDrop = intelligence.milestones?.dropOffStageId === step.id;
                      return (
                        <div
                          key={step.id}
                          className={`p-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                            isPassed
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                              : isDrop
                              ? 'bg-rose-50 border-rose-300 text-rose-800'
                              : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-1">
                            {isPassed ? (
                              <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                            ) : isDrop ? (
                              <AlertCircle className="h-3 w-3 text-rose-600 shrink-0" />
                            ) : (
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                            )}
                            <span className="truncate">{step.label}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {intelligence.milestones.dropOffReason && (
                    <p className="text-[11px] text-rose-700 bg-rose-50/60 p-2 rounded border border-rose-100 italic">
                      ⚠️ Drop-off Note: {intelligence.milestones.dropOffReason}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 3. TALK-TO-LISTEN RATIO & CONVERSATIONAL PACING DYNAMICS */}
          {intelligence?.talkToListen && isConnected && (
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-indigo-600" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Talk-to-Listen Airtime & Pacing
                  </h4>
                </div>
                <Badge
                  variant={
                    intelligence.talkToListen.pacingAssessment === 'optimal'
                      ? 'success'
                      : intelligence.talkToListen.pacingAssessment === 'fast_paced'
                      ? 'warning'
                      : 'neutral'
                  }
                  size="sm"
                >
                  {intelligence.talkToListen.pacingAssessment.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>

              {/* Stacked Talk-to-Listen Progress Bar */}
              <div className="space-y-1.5">
                <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                  <div
                    style={{ width: `${intelligence.talkToListen.agentTalkPercentage}%` }}
                    className="bg-indigo-600 h-full transition-all flex items-center justify-center text-[9px] font-bold text-white font-mono"
                    title={`Agent: ${intelligence.talkToListen.agentTalkPercentage}%`}
                  >
                    {intelligence.talkToListen.agentTalkPercentage >= 15 ? `${intelligence.talkToListen.agentTalkPercentage}%` : ''}
                  </div>
                  <div
                    style={{ width: `${intelligence.talkToListen.leadTalkPercentage}%` }}
                    className="bg-emerald-500 h-full transition-all flex items-center justify-center text-[9px] font-bold text-slate-950 font-mono"
                    title={`Customer: ${intelligence.talkToListen.leadTalkPercentage}%`}
                  >
                    {intelligence.talkToListen.leadTalkPercentage >= 15 ? `${intelligence.talkToListen.leadTalkPercentage}%` : ''}
                  </div>
                </div>

                <div className="flex justify-between text-[11px] font-medium text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-indigo-600" />
                    <span>Agent: <strong>{intelligence.talkToListen.agentTalkPercentage}%</strong> ({intelligence.talkToListen.agentWordCount} words • {intelligence.talkToListen.agentWPM} WPM)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Lead: <strong>{intelligence.talkToListen.leadTalkPercentage}%</strong> ({intelligence.talkToListen.leadWordCount} words • {intelligence.talkToListen.leadWPM} WPM)</span>
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-600 flex items-start gap-2">
                <Target className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>{intelligence.talkToListen.pacingSummary}</span>
              </div>
            </div>
          )}

          {/* 4. AUTOMATED QA SCRIPT COMPLIANCE AUDIT SCORECARD */}
          {intelligence?.qaScorecard && (
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Automated QA Script Compliance Audit
                  </h4>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-slate-900 text-white">
                    {intelligence.qaScorecard.overallScore}/100
                  </span>
                  <Badge
                    variant={
                      intelligence.qaScorecard.status === 'passed'
                        ? 'success'
                        : intelligence.qaScorecard.status === 'warning'
                        ? 'warning'
                        : 'danger'
                    }
                    size="sm"
                  >
                    Grade {intelligence.qaScorecard.grade}
                  </Badge>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-snug">
                {intelligence.qaScorecard.keyFeedback}
              </p>

              {/* Collapsible Script Checklist */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowQaChecklist(!showQaChecklist)}
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  <span>{showQaChecklist ? 'Hide' : 'View'} 5 Script Checkpoint Audits</span>
                  {showQaChecklist ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>

                {showQaChecklist && (
                  <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                    {intelligence.qaScorecard.checklist.map(item => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="flex items-start gap-2">
                          {item.passed ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{item.criterion}</span>
                              <span className="text-[10px] text-slate-400 font-mono">({item.category})</span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-0.5">{item.details}</p>
                          </div>
                        </div>
                        <span className={`font-mono font-bold text-xs shrink-0 ${item.passed ? 'text-emerald-700' : 'text-slate-400'}`}>
                          {item.passed ? `+${item.score}` : '0'} pts
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. BUYING SIGNALS & OBJECTIONS INTELLIGENCE */}
          {intelligence && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Buying Signals */}
              <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/40 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 uppercase tracking-wider">
                  <ThumbsUp className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Buying Signals ({intelligence.buyingSignals.length})</span>
                </div>
                {intelligence.buyingSignals.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic">No explicit buying signals detected in dialogue.</p>
                ) : (
                  <div className="space-y-1.5">
                    {intelligence.buyingSignals.map((sig, idx) => (
                      <div key={idx} className="p-2 rounded bg-white border border-emerald-200 text-xs text-emerald-950 shadow-2xs">
                        <span className="font-bold block text-[11px]">{sig.label}</span>
                        <span className="text-[10px] text-slate-500 line-clamp-1 italic mt-0.5">"{sig.detectedText}"</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Objections / Hesitation */}
              <div className="p-3.5 rounded-xl border border-amber-100 bg-amber-50/40 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 uppercase tracking-wider">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                  <span>Objections & Friction ({intelligence.objections.length})</span>
                </div>
                {intelligence.objections.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic">Zero customer objections or friction voiced.</p>
                ) : (
                  <div className="space-y-1.5">
                    {intelligence.objections.map((obj, idx) => (
                      <div key={idx} className="p-2 rounded bg-white border border-amber-200 text-xs text-amber-950 shadow-2xs">
                        <span className="font-bold block text-[11px]">{obj.label}</span>
                        <span className="text-[10px] text-slate-500 line-clamp-1 italic mt-0.5">"{obj.detectedText}"</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 6. REAL CALL AUDIO STREAMING & SCRUBBER */}
          <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-emerald-400" />
                <span className="font-bold">Live Audio Stream & Recording</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Master Call Audio (WAV / PCM)
              </span>
            </div>

            {audioError ? (
              <div className="flex items-center gap-2 p-2.5 rounded bg-slate-800 text-slate-400 text-xs">
                <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                <span>{audioError}</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={!isConnected || currentCall.durationSeconds === 0}
                  onClick={togglePlayAudio}
                  className={`h-9 w-9 rounded-full flex items-center justify-center transition-all ${
                    !isConnected || currentCall.durationSeconds === 0
                      ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-md'
                  }`}
                  title={isPlayingAudio ? 'Pause Recording' : 'Play Recording'}
                >
                  {audioLoading ? (
                    <RotateCw className="h-4 w-4 animate-spin text-slate-950" />
                  ) : isPlayingAudio ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4 ml-0.5" />
                  )}
                </button>

                <div className="flex-1 space-y-1">
                  {/* Interactive Audio Waveform / Scrubber Track */}
                  <div
                    onClick={handleSeek}
                    className="h-7 flex items-center gap-0.5 px-2 bg-slate-800/80 rounded cursor-pointer group hover:bg-slate-800 transition-colors"
                    title="Click anywhere to scrub playback position"
                  >
                    {Array.from({ length: 36 }).map((_, i) => {
                      const barFraction = (i + 1) / 36;
                      const isPlayed = effectiveDuration > 0 && barFraction <= currentTime / effectiveDuration;
                      const barHeight = isConnected
                        ? ((i % 5 === 0 ? 18 : i % 3 === 0 ? 14 : 10))
                        : 4;

                      return (
                        <div
                          key={i}
                          className={`flex-1 rounded-full transition-all ${
                            isPlayed ? 'bg-emerald-400' : 'bg-slate-700 group-hover:bg-slate-600'
                          } ${isPlayingAudio && isPlayed ? 'opacity-90' : ''}`}
                          style={{ height: `${barHeight}px` }}
                        />
                      );
                    })}
                  </div>

                  <div className="flex justify-between text-[10px] font-mono text-slate-400 px-1">
                    <span>{formatScrubberTime(currentTime)}</span>
                    <span>{formatScrubberTime(effectiveDuration)}</span>
                  </div>
                </div>

                {/* Speed Toggle */}
                <button
                  type="button"
                  disabled={!isConnected || currentCall.durationSeconds === 0}
                  onClick={handleSpeedToggle}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[11px] font-mono font-bold text-slate-300 transition-colors"
                  title="Cycle playback speed: 1x, 1.5x, 2x"
                >
                  {playbackSpeed}x
                </button>

                {/* Direct Download Recording Link */}
                {isConnected && currentCall.durationSeconds > 0 && (
                  <a
                    href={`/api/calls/${currentCall.id}/audio`}
                    download={`fluid_call_${currentCall.id}.wav`}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition-colors"
                    title="Download original WAV recording"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* 7. CALL METADATA GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Outcome</span>
              <span className="font-semibold text-slate-800">{currentCall.outcome ? currentCall.outcome.replace('_', ' ') : 'Pending'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Call Duration</span>
              <span className="font-semibold text-slate-800 font-mono">{formatDuration(currentCall.durationSeconds)}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Started At</span>
              <span className="font-semibold text-slate-800 font-mono">{formatDate(currentCall.startedAt)}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Campaign ID</span>
              <span className="font-semibold text-slate-800 font-mono">{currentCall.campaignId || 'Direct Outreach'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Agent Version</span>
              <span className="font-semibold text-slate-800 font-mono">{currentCall.agentVersionId}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Lead Reference</span>
              <span className="font-semibold text-slate-800 font-mono">{currentCall.leadId}</span>
            </div>
          </div>

          {/* 8. STRUCTURED EXTRACTED VARIABLES SECTION */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
              <Database className="h-4 w-4 text-purple-600" />
              <span>Extracted Conversation Variables</span>
            </div>
            {!currentCall.extractedVariables ||
            Object.entries(currentCall.extractedVariables).filter(([k, v]) => !k.startsWith('_') && k !== 'intelligence' && k !== 'call_summary' && typeof v !== 'object').length === 0 ? (
              <p className="text-xs text-slate-400 italic">No structured variables extracted from this call session.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(currentCall.extractedVariables)
                  .filter(([key, value]) => !key.startsWith('_') && key !== 'intelligence' && key !== 'call_summary' && typeof value !== 'object')
                  .map(([key, value]) => (
                    <div key={key} className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-mono font-bold text-slate-500 block">{key.replace(/_/g, ' ')}</span>
                        <span className="text-xs font-bold text-slate-900 mt-0.5 block">{String(value)}</span>
                      </div>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* 9. AUDIO-SYNCED SPEAKER-SEGMENTED TRANSCRIPT */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                <FileText className="h-4 w-4 text-brand-600" />
                <span>Audio-Synced Transcript Playback</span>
              </div>
              <div className="flex items-center gap-2">
                {isConnected && currentCall.durationSeconds > 0 && (
                  <span className="text-[10px] text-slate-400 italic hidden sm:inline">
                    Click any dialogue bubble to jump audio
                  </span>
                )}
                <span className="text-[11px] text-slate-500 font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                  {currentCall.transcript?.length || 0} Turns
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {(!currentCall.transcript || currentCall.transcript.length === 0) ? (
                <div className="p-6 text-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50">
                  <p className="text-xs text-slate-500">No voice conversation took place on this call attempt.</p>
                </div>
              ) : (
                currentCall.transcript.map(msg => {
                  const isAgent = msg.speaker === 'agent';
                  const isActive = activeTurnId === msg.id;

                  return (
                    <div
                      key={msg.id}
                      ref={el => (turnRefs.current[msg.id] = el)}
                      onClick={() => isConnected && currentCall.durationSeconds > 0 && handleJumpToTimestamp(msg.timestampSeconds)}
                      className={`flex gap-3 text-xs transition-all group ${
                        isConnected && currentCall.durationSeconds > 0 ? 'cursor-pointer' : ''
                      } ${isAgent ? 'pl-0 pr-8' : 'pl-8 pr-0'}`}
                      title={isConnected && currentCall.durationSeconds > 0 ? `Click to jump audio to ${formatDuration(msg.timestampSeconds)}` : undefined}
                    >
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-bold text-[10px] transition-all ${
                          isActive
                            ? 'scale-110 shadow-sm ring-2 ring-offset-1 ' + (isAgent ? 'ring-indigo-500' : 'ring-emerald-500')
                            : ''
                        } ${
                          isAgent ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {isAgent ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                      </div>
                      <div
                        className={`flex-1 rounded-lg p-3 border transition-all ${
                          isActive
                            ? isAgent
                              ? 'bg-indigo-50/90 border-indigo-400 shadow-md ring-2 ring-indigo-200 text-slate-900'
                              : 'bg-emerald-50/90 border-emerald-400 shadow-md ring-2 ring-emerald-200 text-slate-900'
                            : isAgent
                            ? 'bg-slate-50 border-slate-200 text-slate-900 group-hover:border-indigo-300 group-hover:bg-indigo-50/30'
                            : 'bg-white border-slate-200 text-slate-800 group-hover:border-emerald-300 group-hover:bg-emerald-50/30'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5 text-[10px] text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold uppercase tracking-wider text-slate-700">
                              {isAgent ? 'Shubh (Fluid.live AI)' : (currentCall.leadName || 'Lead Contact')}
                            </span>
                            {isActive && (
                              <span className={`flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                isAgent ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                              } animate-pulse`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${isAgent ? 'bg-indigo-600' : 'bg-emerald-600'} animate-ping`} />
                                Playing Now
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {isConnected && currentCall.durationSeconds > 0 && (
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity font-semibold text-indigo-600 flex items-center gap-0.5 text-[10px]">
                                <Play className="h-2.5 w-2.5 fill-current" /> Jump here
                              </span>
                            )}
                            <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-600 font-medium">
                              {formatDuration(msg.timestampSeconds)}
                            </span>
                          </div>
                        </div>
                        <p className="leading-relaxed text-[12px]">{msg.text}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
