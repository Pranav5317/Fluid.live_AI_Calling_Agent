import React from 'react';
import { X, Phone, Clock, User, Bot, CheckCircle2, Play, AlertCircle, FileText, Database } from 'lucide-react';
import { Call } from '../../types';
import { formatDate, formatDuration } from '../../lib/formatters';
import { Badge } from '../../components/common/Badge';

export interface CallDetailDrawerProps {
  call: Call | null;
  onClose: () => void;
}

export const CallDetailDrawer: React.FC<CallDetailDrawerProps> = ({ call, onClose }) => {
  if (!call) return null;

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
              <h3 className="text-base font-bold text-slate-900">Call Record Detail</h3>
              <Badge variant={call.status === 'completed' ? 'success' : 'danger'} dot>
                {call.status}
              </Badge>
            </div>
            <span className="text-xs font-mono text-slate-500 mt-0.5 block">
              Internal ID: {call.id} • Sarvam Ref: {call.externalCallId}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Outcome</span>
              <span className="font-semibold text-slate-800">{call.outcome.replace('_', ' ')}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Call Duration</span>
              <span className="font-semibold text-slate-800 font-mono">{formatDuration(call.durationSeconds)}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Started At</span>
              <span className="font-semibold text-slate-800 font-mono">{formatDate(call.startedAt)}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Campaign ID</span>
              <span className="font-semibold text-slate-800 font-mono">{call.campaignId}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Agent Version</span>
              <span className="font-semibold text-slate-800 font-mono">{call.agentVersionId}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Lead Ref</span>
              <span className="font-semibold text-slate-800 font-mono">{call.leadId}</span>
            </div>
          </div>

          {/* Arbitrary Extracted Variables Section (Requirement #7) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
              <Database className="h-4 w-4 text-purple-600" />
              <span>Extracted Conversation Variables</span>
            </div>
            {Object.keys(call.extractedVariables || {}).length === 0 ? (
              <p className="text-xs text-slate-400 italic">No structured variables extracted from this call session.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(call.extractedVariables).map(([key, value]) => (
                  <div key={key} className="p-2.5 rounded border border-slate-200 bg-white">
                    <span className="text-[10px] uppercase font-mono font-bold text-slate-500 block">{key}</span>
                    <span className="text-xs font-semibold text-slate-900 mt-0.5 block">{String(value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Interactive Speaker-Segmented Transcript */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                <FileText className="h-4 w-4 text-brand-600" />
                <span>Call Audio Transcript</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {call.transcript.length} Messages
              </span>
            </div>

            <div className="space-y-3">
              {call.transcript.map(msg => {
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
                        <span className="font-bold uppercase">{isAgent ? 'Sarvam AI Agent' : 'Consumer Lead'}</span>
                        <span className="font-mono">{formatDuration(msg.timestampSeconds)}</span>
                      </div>
                      <p className="leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

