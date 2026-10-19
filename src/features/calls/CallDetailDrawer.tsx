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
} from 'lucide-react';
import { Call } from '../../types';
import { formatDate, formatDuration } from '../../lib/formatters';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { callService } from '../../services/callService';

export interface CallDetailDrawerProps {
  call: Call | null;
  onClose: () => void;
}

export const CallDetailDrawer: React.FC<CallDetailDrawerProps> = ({ call, onClose }) => {
  const [activeCall, setActiveCall] = useState<Call | null>(call);
  const [isSyncing, setIsSyncing] = useState(false);

  // Audio Playback State
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.5 | 2>(1);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const currentCall = activeCall || call;

  const handleSyncTranscript = async (callId: string) => {
    setIsSyncing(true);
    try {
      const res = await callService.getCallTranscript(callId);
      if (res && res.call) {
        setActiveCall(res.call);
      }
    } catch (err) {
      console.warn('[CallDetailDrawer] Transcript sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    setActiveCall(call);
    if (call && (!call.transcript || call.transcript.length === 0)) {
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

  if (!currentCall) return null;

  const isConnected = currentCall.durationSeconds > 0 || (Array.isArray(currentCall.transcript) && currentCall.transcript.length > 0);

  // Dynamic Enterprise AI Summary directly from Sarvam
  const getExecutiveSummary = () => {
    const vars = currentCall.extractedVariables || {};
    const interest = vars.interest_level;
    const verification = vars.verification_status;
    const sarvamSummary = vars.call_summary;

    if (!isConnected && (!currentCall.durationSeconds || currentCall.durationSeconds === 0)) {
      return {
        summary:
          sarvamSummary ||
          'Outbound call initiated through Sarvam telephony infrastructure. The line was not answered before dialer timeout window. No customer voice dialogue was exchanged.',
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

      audio.addEventListener('canplay', () => {
        setAudioLoading(false);
      });

      audio.addEventListener('play', () => setIsPlayingAudio(true));
      audio.addEventListener('pause', () => setIsPlayingAudio(false));
      audio.addEventListener('ended', () => {
        setIsPlayingAudio(false);
        setCurrentTime(0);
      });

      audio.addEventListener('error', () => {
        setAudioLoading(false);
        setIsPlayingAudio(false);
        setAudioError('Audio recording unavailable for this call.');
      });

      setAudioLoading(true);
      audio.play().catch(err => {
        console.warn('[CallDetailDrawer] Audio playback blocked or failed:', err);
        setAudioLoading(false);
        setIsPlayingAudio(false);
      });
    } else {
      if (isPlayingAudio) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(err => {
          console.warn('[CallDetailDrawer] Audio resume failed:', err);
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
              <h3 className="text-base font-bold text-slate-900">Call Intelligence & Transcript</h3>
              <Badge variant={currentCall.status === 'completed' ? 'success' : 'neutral'} dot>
                {currentCall.status}
              </Badge>
            </div>
            <span className="text-xs font-mono text-slate-500 mt-0.5 block">
              Internal ID: {currentCall.id} • Sarvam Ref: {currentCall.externalCallId}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs text-slate-700 bg-white hover:bg-slate-50 shadow-sm"
              leftIcon={<RotateCw className={`h-3.5 w-3.5 text-indigo-600 ${isSyncing ? 'animate-spin' : ''}`} />}
              onClick={() => handleSyncTranscript(currentCall.id)}
              disabled={isSyncing}
            >
              {isSyncing ? 'Syncing...' : 'Sync from Sarvam'}
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
          {/* 1. ENTERPRISE AI CONVERSATIONAL INTELLIGENCE BRIEF */}
          <div className="p-4 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 via-white to-purple-50/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    AI Conversational Intelligence Brief
                  </h4>
                  <span className="text-[10px] text-slate-500">Autonomous Synthesis • Sarvam Saaras + Samvaad</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge
                  variant={aiIntelligence.sentiment === 'positive' ? 'success' : aiIntelligence.sentiment === 'negative' ? 'danger' : 'neutral'}
                  size="sm"
                >
                  {aiIntelligence.statusText}
                </Badge>
                {aiIntelligence.intentScore > 0 && (
                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded font-mono">
                    {aiIntelligence.intentScore}% Intent
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed bg-white/80 p-3 rounded-lg border border-indigo-50">
              {aiIntelligence.summary}
            </p>
          </div>

          {/* 2. REAL CALL AUDIO STREAMING & SCRUBBER */}
          <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-emerald-400" />
                <span className="font-bold">Live Audio Stream & Recording</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Sarvam Master Audio (WAV / PCM)
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
                    download={`sarvam_call_${currentCall.id}.wav`}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition-colors"
                    title="Download original WAV recording"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* 3. CALL METADATA GRID */}
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

          {/* 4. STRUCTURED EXTRACTED VARIABLES SECTION */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
              <Database className="h-4 w-4 text-purple-600" />
              <span>Extracted Conversation Variables</span>
            </div>
            {!currentCall.extractedVariables ||
            Object.entries(currentCall.extractedVariables).filter(([k]) => !k.startsWith('_')).length === 0 ? (
              <p className="text-xs text-slate-400 italic">No structured variables extracted from this call session.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(currentCall.extractedVariables)
                  .filter(([key]) => !key.startsWith('_'))
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

          {/* 5. INTERACTIVE SPEAKER-SEGMENTED TRANSCRIPT */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                <FileText className="h-4 w-4 text-brand-600" />
                <span>Call Audio Transcript</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {currentCall.transcript?.length || 0} Messages
              </span>
            </div>

            <div className="space-y-3">
              {(!currentCall.transcript || currentCall.transcript.length === 0) ? (
                <div className="p-6 text-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50">
                  <p className="text-xs text-slate-500">No voice conversation took place on this call attempt.</p>
                </div>
              ) : (
                currentCall.transcript.map(msg => {
                  const isAgent = msg.speaker === 'agent';
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 text-xs ${isAgent ? 'pl-0 pr-8' : 'pl-8 pr-0'}`}
                    >
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-bold text-[10px] ${
                          isAgent ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {isAgent ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                      </div>
                      <div
                        className={`flex-1 rounded-lg p-3 border ${
                          isAgent
                            ? 'bg-slate-50 border-slate-200 text-slate-900'
                            : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1 text-[10px] text-slate-400">
                          <span className="font-bold uppercase">{isAgent ? 'Shubh (Fluid.live AI)' : 'Lead Contact'}</span>
                          <span className="font-mono">{formatDuration(msg.timestampSeconds)}</span>
                        </div>
                        <p className="leading-relaxed">{msg.text}</p>
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
