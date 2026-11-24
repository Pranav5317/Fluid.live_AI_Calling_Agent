import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  UserCheck,
  Phone,
  PhoneCall,
  FileSpreadsheet,
  Download,
  RotateCw,
  LayoutDashboard,
  Users,
  Megaphone,
  Bot,
  Settings,
  ArrowRight,
  Sparkles,
  Briefcase,
  X,
  Command,
} from 'lucide-react';
import { NavRoute } from '../layout/Sidebar';
import { leadService } from '../../services/leadService';
import { callService } from '../../services/callService';
import { Lead, Call } from '../../types';
import { formatPhoneNumber } from '../../lib/formatters';

export interface CommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (route: NavRoute) => void;
  onOpenTestCall?: () => void;
  onOpenCsvImport?: () => void;
}

export const CommandMenu: React.FC<CommandMenuProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenTestCall,
  onOpenCsvImport,
}) => {
  const [query, setQuery] = useState('');
  const [candidateResults, setCandidateResults] = useState<Lead[]>([]);
  const [callResults, setCallResults] = useState<Call[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement | null>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setCandidateResults([]);
      setCallResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!isOpen || !query.trim()) {
      setCandidateResults([]);
      setCallResults([]);
      setSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const [leadsData, callsData] = await Promise.all([
          leadService.getLeads({ search: query.trim(), pageSize: 4 }),
          callService.getCalls({ search: query.trim() }),
        ]);

        const leads = (leadsData?.items || []).map(i => i.lead);
        setCandidateResults(leads.slice(0, 4));
        setCallResults((callsData || []).slice(0, 3));
      } catch (err) {
        console.error('Command menu search failed:', err);
      } finally {
        setSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const quickNavItems: { label: string; route: NavRoute; icon: React.ReactNode; shortcut: string }[] = [
    { label: 'Dashboard Overview', route: 'dashboard', icon: <LayoutDashboard className="h-4 w-4 text-blue-600" />, shortcut: 'G D' },
    { label: 'Candidates & Verification', route: 'leads', icon: <Users className="h-4 w-4 text-indigo-600" />, shortcut: 'G C' },
    { label: 'Call Recordings & Transcripts', route: 'calls', icon: <Phone className="h-4 w-4 text-emerald-600" />, shortcut: 'G R' },
    { label: 'Outbound Campaigns', route: 'campaigns', icon: <Megaphone className="h-4 w-4 text-amber-600" />, shortcut: 'G P' },
    { label: 'AI Voice Agents', route: 'agents', icon: <Bot className="h-4 w-4 text-purple-600" />, shortcut: 'G A' },
    { label: 'Platform Settings', route: 'settings', icon: <Settings className="h-4 w-4 text-slate-500" />, shortcut: 'G S' },
  ];

  const handleDownloadSample = () => {
    const sampleCsv = `name,phone,email,applied_role,portal_experience,portal_notice_period,portal_work_mode,portal_expected_ctc
Pranav L,+919922935920,pranav@fluid.live,Full Stack Engineer,2 Years,30 Days,Pune Hybrid,8 LPA
Ananya Verma,+919820011223,ananya@example.in,Product Designer,3.5 Years,Immediate,Pune Hybrid,12 LPA
Rohan Kulkarni,+919876543210,rohan@example.in,Backend Engineer,4 Years,60 Days,Pune Hybrid,14 LPA
Pooja Reddy,+919845012345,pooja@example.in,QA Automation Lead,5 Years,15 Days,Pune Hybrid,16 LPA`;

    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'fluid_live_candidate_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
      {/* Click outside backdrop */}
      <div className="fixed inset-0 -z-10" onClick={onClose} />

      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 gap-3 bg-slate-50/50">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type a command, search candidates, or dial phone..."
            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-200/70 text-slate-600 border border-slate-300">
              ESC
            </span>
          )}
        </div>

        {/* Command Body */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-slate-100 text-xs">
          {/* Candidate Search Matches */}
          {candidateResults.length > 0 && (
            <div className="py-2">
              <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
                Matching Candidates ({candidateResults.length})
              </span>
              <div className="space-y-1 mt-1">
                {candidateResults.map(lead => {
                  const meta = (lead.metadata || {}) as Record<string, any>;
                  const role = meta.role || meta.applied_role || 'Applicant';
                  return (
                    <div
                      key={lead.id}
                      onClick={() => {
                        onNavigate('leads');
                        onClose();
                      }}
                      className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100/80 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-[11px] border border-indigo-100">
                          {lead.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors block">
                            {lead.name}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {role} • {formatPhoneNumber(lead.phone)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium text-slate-400 group-hover:text-indigo-600 flex items-center gap-0.5">
                          <span>View Analysis</span>
                          <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="py-2">
            <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
              Quick Actions
            </span>
            <div className="space-y-1 mt-1">
              {onOpenTestCall && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenTestCall();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100/80 cursor-pointer transition-colors text-left group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                      <PhoneCall className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800 group-hover:text-emerald-700">
                        Dispatch Candidate Verification Call
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        Direct outbound test dial to candidate via Sarvam Trunk
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                    +91 79 6586 1007
                  </span>
                </button>
              )}

              {onOpenCsvImport && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCsvImport();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100/80 cursor-pointer transition-colors text-left group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800 group-hover:text-blue-700">
                        Import Candidates via CSV
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        Batch upload with interactive column mapping & phone sanitization
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                    .CSV
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={handleDownloadSample}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100/80 cursor-pointer transition-colors text-left group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                    <Download className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800 group-hover:text-amber-700">
                      Download Candidate CSV Template
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Sample file with Name, Role, Notice Period, and Work Mode
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                  Download
                </span>
              </button>
            </div>
          </div>

          {/* Navigation Section */}
          {!query && (
            <div className="py-2">
              <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
                Platform Navigation
              </span>
              <div className="space-y-0.5 mt-1">
                {quickNavItems.map(item => (
                  <button
                    key={item.route}
                    type="button"
                    onClick={() => {
                      onNavigate(item.route);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100/80 cursor-pointer transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-slate-100">
                        {item.icon}
                      </div>
                      <span className="font-semibold text-slate-800">{item.label}</span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      {item.shortcut}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px]">↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px]">↵</kbd> Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px]">esc</kbd> Dismiss
            </span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">Fluid.live Voice AI</span>
        </div>
      </div>
    </div>
  );
};
