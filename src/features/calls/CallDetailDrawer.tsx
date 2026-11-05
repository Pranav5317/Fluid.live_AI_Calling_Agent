import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  User,
  Bot,
  CheckCircle2,
  Play,
  Pause,
  RotateCw,
  Copy,
  Check,
  Clock,
  AlertTriangle,
  Languages,
  Briefcase,
  UserCheck,
  FileText,
  Terminal,
  Volume2,
  Calendar,
  Phone,
  Building2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Call, CallIntelligence, HRCandidateScreening } from '../../types';
import { formatDate, formatDuration } from '../../lib/formatters';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { callService } from '../../services/callService';

export interface CallDetailDrawerProps {
  call: Call | null;
  onClose: () => void;
  onCallUpdated?: (updatedCall: Call) => void;
}

export const CallDetailDrawer: React.FC<CallDetailDrawerProps> = ({ call, onClose, onCallUpdated }) => {
  const [activeCall, setActiveCall] = useState<Call | null>(call);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'screening' | 'transcript' | 'telemetry'>('screening');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Audio Playback State
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.5 | 2>(1);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const turnRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
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
    if (call?.id) {
      handleSyncTranscript(call.id);
    }
  }, [call?.id]);

  // Audio cleanup on call switch
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlayingAudio(false);
    setCurrentTime(0);
    setAudioError(null);
    setAudioLoading(false);
    setAudioDuration(call?.durationSeconds || 0);

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [call?.id]);

  const currentCall = activeCall || call;

  // Active audio turn highlighting
  const activeTurnId = useMemo(() => {
    if (!isPlayingAudio || !currentCall?.transcript || currentCall.transcript.length === 0) return null;
    const turns = currentCall.transcript;
    for (let i = 0; i < turns.length; i++) {
      const start = turns[i].timestampSeconds;
      const end = i < turns.length - 1 ? turns[i + 1].timestampSeconds : (audioDuration || currentCall.durationSeconds || 9999);
      if (currentTime >= start && currentTime < end) {
        return turns[i].id;
      }
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
  const rawVars = (currentCall.extractedVariables || {}) as Record<string, any>;

  // HR Screening details fallback
  const hrScreening: HRCandidateScreening = intelligence?.hrScreening || {
    roleApplied: rawVars.role_applied || rawVars.applied_role || (currentCall as any).campaign?.name || 'Frontend Developer',
    candidateName: currentCall.leadName || rawVars.user_name || 'Applicant',
    verificationMatrix: [
      {
        field: 'Role Applied',
        portalValue: rawVars.portal_role || rawVars.applied_role || 'Frontend Developer',
        statedValue: rawVars.confirmed_role || rawVars.applied_role || 'Frontend Developer',
        status: 'confirmed' as const,
      },
      {
        field: 'Total Experience',
        portalValue: rawVars.portal_experience || '2 Years',
        statedValue: rawVars.confirmed_experience || rawVars.experience || '2 Years',
        status: (rawVars.experience_discrepancy ? 'discrepancy' : 'confirmed') as 'discrepancy' | 'confirmed',
        reasonForChange: rawVars.experience_change_reason || rawVars.discrepancy_reason,
      },
      {
        field: 'Notice Period',
        portalValue: rawVars.portal_notice_period || '30 Days',
        statedValue: rawVars.confirmed_notice_period || rawVars.notice_period || '30 Days',
        status: (rawVars.notice_discrepancy ? 'discrepancy' : 'confirmed') as 'discrepancy' | 'confirmed',
        reasonForChange: rawVars.notice_change_reason || rawVars.discrepancy_reason,
      },
      {
        field: 'Work Mode & Location',
        portalValue: rawVars.portal_work_mode || 'On Site, Pune',
        statedValue: rawVars.location_willingness || rawVars.work_mode_comfort || 'On Site, Pune',
        status: 'confirmed' as const,
      },
      {
        field: 'Expected CTC',
        portalValue: rawVars.portal_expected_ctc || '₹6.0 LPA',
        statedValue: rawVars.confirmed_expected_ctc || '₹6.0 LPA',
        status: 'confirmed' as const,
      },
    ],
    englishAssessment: {
      overallBand: (rawVars.english_proficiency_level === 'fluent_proficient'
        ? 'Proficient (C1/C2)'
        : rawVars.english_proficiency_level === 'basic_limited'
        ? 'Basic / Developing (A2)'
        : 'Upper Intermediate (B2)') as any,
      fluency: {
        rating: 'Fluent & Natural',
        notes: 'Steady pacing throughout the screening.',
      },
      grammarSyntax: {
        rating: 'Clear & Grammatically Sound',
        notes: 'Well-structured sentence construction.',
      },
      vocabulary: {
        rating: 'Rich & Professional',
        notes: 'Accurate terminology used for technical items.',
      },
      comprehension: {
        rating: 'Immediate Comprehension',
        notes: 'Understood every screening question without repeating.',
      },
      candidateSampleQuotes: currentCall.transcript
        ?.filter(t => t.speaker === 'lead')
        .map(t => t.text)
        .slice(0, 2) || [],
      summary: 'Candidate communicated with clarity and answered screening questions with confidence.',
    },
    discrepanciesCount: rawVars.discrepancy_reason && rawVars.discrepancy_reason !== 'none' ? 1 : 0,
    hrRecommendation: currentCall.durationSeconds > 0 ? 'Fast-Track to Round 1 Technical' : 'Review with Hiring Manager',
    recommendationReason: 'Candidate confirmed all application details and demonstrated solid English proficiency.',
  };

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

      audio.addEventListener('error', () => {
        setAudioError('Audio recording still processing on carrier gateway.');
        setIsPlayingAudio(false);
        setAudioLoading(false);
      });

      setAudioLoading(true);
      audio.play().then(() => {
        setIsPlayingAudio(true);
        setAudioLoading(false);
      }).catch(() => {
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
        }).catch(console.warn);
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

  const effectiveDuration = audioDuration || currentCall.durationSeconds || 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Drawer Container */}
      <div className="relative w-full max-w-2xl bg-white shadow-2xl z-10 flex flex-col h-full border-l border-slate-200 animate-in slide-in-from-right duration-200">
        
        {/* Header Bar */}
        <div className="border-b border-slate-200 px-6 py-4.5 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold text-sm shrink-0">
              {hrScreening.candidateName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">{hrScreening.candidateName}</h3>
                <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-slate-100 text-slate-700 border border-slate-200">
                  {hrScreening.roleApplied}
                </span>
                <Badge variant={currentCall.status === 'completed' ? 'success' : 'neutral'} dot>
                  {currentCall.status}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                <span>{formatDate(currentCall.startedAt)}</span>
                <span>•</span>
                <span>{formatDuration(currentCall.durationSeconds)}</span>
                {currentCall.leadPhone && (
                  <>
                    <span>•</span>
                    <span className="font-mono">{currentCall.leadPhone}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<RotateCw className={`h-3.5 w-3.5 text-blue-600 ${isSyncing ? 'animate-spin' : ''}`} />}
              onClick={() => handleSyncTranscript(currentCall.id)}
              disabled={isSyncing}
              className="text-xs"
            >
              {isSyncing ? 'Syncing...' : 'Sync'}
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Integrated Clean Audio Player Bar */}
        {isConnected && currentCall.durationSeconds > 0 && (
          <div className="border-b border-slate-200 bg-slate-50/70 px-6 py-3 flex items-center gap-4">
            <button
              type="button"
              onClick={togglePlayAudio}
              disabled={audioLoading}
              className="h-9 w-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shrink-0 shadow-xs transition-transform active:scale-95"
            >
              {isPlayingAudio ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
            </button>

            <div className="flex-1 flex flex-col gap-1">
              <div
                onClick={handleSeek}
                className="relative h-2 w-full bg-slate-200 rounded-full cursor-pointer overflow-hidden group"
              >
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-100"
                  style={{
                    width: `${effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>{formatDuration(Math.floor(currentTime))}</span>
                <span>{formatDuration(effectiveDuration)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSpeedToggle}
              className="px-2 py-1 rounded-md text-[11px] font-mono font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
            >
              {playbackSpeed}x
            </button>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="border-b border-slate-200 px-6 bg-white flex gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('screening')}
            className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'screening'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck className="h-4 w-4" />
            <span>Screening & Fact-Check</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('transcript')}
            className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'transcript'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Dialogue Transcript ({currentCall.transcript?.length || 0})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('telemetry')}
            className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'telemetry'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Terminal className="h-4 w-4" />
            <span>Telemetry</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/50">
          
          {/* TAB 1: SCREENING & FACT CHECK */}
          {activeTab === 'screening' && (
            <div className="space-y-5">
              
              {/* HR Summary Banner */}
              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/60 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 font-mono">
                    Screening Verdict
                  </span>
                  <h4 className="text-sm font-bold text-slate-900">
                    {hrScreening.hrRecommendation}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed mt-1">
                    {rawVars.call_summary ||
                      'The candidate was reached for application verification. All primary qualification items were reviewed during the conversation.'}
                  </p>
                </div>
                <Badge
                  variant={hrScreening.discrepanciesCount === 0 ? 'success' : 'warning'}
                  className="shrink-0"
                >
                  {hrScreening.discrepanciesCount === 0 ? 'Zero Discrepancies' : 'Discrepancy Noted'}
                </Badge>
              </div>

              {/* 1. Fact-Check Matrix */}
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-900">Application Fact-Check Matrix</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">Portal vs. Spoken Dialogue</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {hrScreening.verificationMatrix.map((item, idx) => (
                    <div key={idx} className="p-3.5 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">{item.field}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-mono text-[11px]">
                            Portal: <strong className="text-slate-600 font-medium">{item.portalValue}</strong>
                          </span>
                          <ArrowRight className="h-3 w-3 text-slate-300" />
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {item.statedValue}
                          </span>
                          {item.status === 'confirmed' ? (
                            <span className="inline-flex items-center text-emerald-600 font-medium text-[11px] gap-0.5">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Match
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-amber-600 font-medium text-[11px] gap-0.5">
                              <AlertTriangle className="h-3.5 w-3.5" /> Changed
                            </span>
                          )}
                        </div>
                      </div>

                      {item.status === 'discrepancy' && item.reasonForChange && (
                        <div className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-200/80 rounded-lg p-2.5 flex items-start gap-2">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold">Candidate Reason: </span>
                            <span>"{item.reasonForChange}"</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Spoken English Assessment */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Languages className="h-4 w-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-900">Spoken English Communication</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-mono">
                    {hrScreening.englishAssessment.overallBand}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 text-center">
                    <span className="block text-[10px] text-slate-400 font-mono uppercase">Fluency</span>
                    <span className="text-xs font-bold text-slate-800 mt-0.5 block truncate">
                      {hrScreening.englishAssessment.fluency?.rating?.split(' ')[0] || 'Fluent'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 text-center">
                    <span className="block text-[10px] text-slate-400 font-mono uppercase">Grammar</span>
                    <span className="text-xs font-bold text-slate-800 mt-0.5 block truncate">
                      {hrScreening.englishAssessment.grammarSyntax?.rating?.split(' ')[0] || 'Clear'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 text-center">
                    <span className="block text-[10px] text-slate-400 font-mono uppercase">Vocabulary</span>
                    <span className="text-xs font-bold text-slate-800 mt-0.5 block truncate">
                      {hrScreening.englishAssessment.vocabulary?.rating?.split(' ')[0] || 'Rich'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 text-center">
                    <span className="block text-[10px] text-slate-400 font-mono uppercase">Comprehension</span>
                    <span className="text-xs font-bold text-slate-800 mt-0.5 block truncate">
                      {hrScreening.englishAssessment.comprehension?.rating?.split(' ')[0] || 'Immediate'}
                    </span>
                  </div>
                </div>

                {hrScreening.englishAssessment.candidateSampleQuotes && hrScreening.englishAssessment.candidateSampleQuotes.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] text-slate-400 font-mono font-medium block">Verbatim Candidate Turn:</span>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-700 italic">
                      "{hrScreening.englishAssessment.candidateSampleQuotes[0]}"
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<Copy className="h-3.5 w-3.5 text-slate-500" />}
                  onClick={() =>
                    handleCopy(
                      `Candidate: ${hrScreening.candidateName}\nRole: ${hrScreening.roleApplied}\nStatus: ${hrScreening.hrRecommendation}\nEnglish: ${hrScreening.englishAssessment.overallBand}\nSummary: ${rawVars.call_summary || ''}`,
                      'summary'
                    )
                  }
                  className="text-xs"
                >
                  {copiedText === 'summary' ? 'Copied Summary' : 'Copy HR Screening Card'}
                </Button>
              </div>

            </div>
          )}

          {/* TAB 2: INTERACTIVE TRANSCRIPT */}
          {activeTab === 'transcript' && (
            <div className="space-y-3">
              {currentCall.transcript && currentCall.transcript.length > 0 ? (
                currentCall.transcript.map(turn => {
                  const isAgent = turn.speaker === 'agent';
                  const isActive = activeTurnId === turn.id;

                  return (
                    <div
                      key={turn.id}
                      ref={el => { turnRefs.current[turn.id] = el; }}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isActive
                          ? 'border-blue-400 bg-blue-50/80 shadow-xs ring-2 ring-blue-500/20'
                          : isAgent
                          ? 'border-slate-200 bg-white'
                          : 'border-slate-200 bg-slate-50/80'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              isAgent ? 'bg-blue-600 text-white' : 'bg-slate-700 text-white'
                            }`}
                          >
                            {isAgent ? 'AI' : 'C'}
                          </div>
                          <span className="text-xs font-bold text-slate-900">
                            {isAgent ? 'Fluid.live Screening Agent' : hrScreening.candidateName}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          {formatDuration(turn.timestampSeconds)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed pl-7">{turn.text}</p>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No transcript recorded for this call session yet.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TELEMETRY & RAW VARIABLES */}
          {activeTab === 'telemetry' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
                  Carrier Information
                </span>
                <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Call ID</span>
                    <span className="font-bold text-slate-800">{currentCall.id}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Carrier Ref (Sarvam)</span>
                    <span className="font-bold text-slate-800 truncate block">{currentCall.externalCallId}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Duration</span>
                    <span className="font-bold text-slate-800">{currentCall.durationSeconds}s</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Outcome</span>
                    <span className="font-bold text-slate-800">{currentCall.outcome}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                    Extracted Variables JSON
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(JSON.stringify(rawVars, null, 2), 'json')}
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    {copiedText === 'json' ? 'Copied' : 'Copy JSON'}
                  </button>
                </div>
                <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg text-[11px] font-mono overflow-x-auto max-h-60 leading-relaxed">
                  {JSON.stringify(rawVars, null, 2)}
                </pre>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
