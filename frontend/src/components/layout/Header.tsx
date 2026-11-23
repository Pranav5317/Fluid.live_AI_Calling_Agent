import React, { useEffect, useState } from 'react';
import {
  Menu,
  Bell,
  Search,
  Building2,
  ChevronDown,
  User,
  LogOut,
  Shield,
  HelpCircle,
  Zap,
} from 'lucide-react';
import { businessService } from '../../services/businessService';
import { callService } from '../../services/callService';
import { Business, Call } from '../../types';
import { formatDuration } from '../../lib/formatters';
import { NavRoute } from './Sidebar';
import { WorkspaceSecurityModal } from './WorkspaceSecurityModal';
import { DocumentationModal } from './DocumentationModal';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

export interface HeaderProps {
  onMobileSidebarToggle: () => void;
  onNotificationToggle: () => void;
  onRouteChange?: (route: NavRoute) => void;
  unreadCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onMobileSidebarToggle,
  onNotificationToggle,
  onRouteChange,
  unreadCount = 2,
}) => {
  const [business, setBusiness] = useState<Business | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [bizMenuOpen, setBizMenuOpen] = useState(false);

  // Modals state
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);

  // Live Calling Monitor state
  const [activeLiveCall, setActiveLiveCall] = useState<Call | null>(null);
  const [elapsedCallSeconds, setElapsedCallSeconds] = useState(0);

  useEffect(() => {
    businessService.getBusinessProfile().then(setBusiness);
  }, []);

  useEffect(() => {
    const checkActiveCalls = async () => {
      try {
        const calls = await callService.getCalls();
        const active = calls.find(c => c.status === 'in-progress' || c.status === 'initiated');
        if (active) {
          setActiveLiveCall(active);
          const start = new Date(active.startedAt).getTime();
          const now = Date.now();
          const elapsed = Math.max(0, Math.floor((now - start) / 1000));
          setElapsedCallSeconds(elapsed);
        } else {
          setActiveLiveCall(null);
        }
      } catch (e) {
        // silent
      }
    };

    checkActiveCalls();
    const interval = setInterval(checkActiveCalls, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!activeLiveCall) return;
    const timer = setInterval(() => {
      setElapsedCallSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [activeLiveCall]);

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 sm:px-6 backdrop-blur-md shadow-xs text-slate-800">
      {/* Left items: Mobile menu trigger & Search */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMobileSidebarToggle}
          className="md:hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Global Search Bar */}
        <div className="relative hidden sm:block w-72 md:w-96">
          <Search className="pointer-events-none absolute inset-y-0 left-0 my-auto ml-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search candidates, applications, calls... (⌘K)"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-10 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs transition-all"
          />
        </div>
      </div>

      {/* Right items: Telephony Live Pill, Active Call Pill, Business Switcher, Notifications & Profile */}
      <div className="flex items-center gap-3">
        {/* Active Call Live Presence Pill */}
        {activeLiveCall && (
          <button
            type="button"
            onClick={() => onRouteChange?.('calls')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-blue-300 bg-blue-50/90 text-xs font-semibold text-blue-900 shadow-xs hover:bg-blue-100 transition-all cursor-pointer animate-pulse"
            title="Click to view live call"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
            </span>
            <span className="font-bold">In Call:</span>
            <span className="max-w-[110px] truncate">{activeLiveCall.leadName || activeLiveCall.leadPhone || 'Candidate'}</span>
            <span className="font-mono text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded text-[10px]">
              {formatDuration(elapsedCallSeconds)}
            </span>
          </button>
        )}

        {/* Active Telephony Line Badge */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200/80 bg-slate-50/70 text-xs font-medium text-slate-700 shadow-2xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
          </span>
          <span className="text-[11px] text-slate-500 font-semibold">Caller ID:</span>
          <span className="font-mono font-bold text-slate-900">+91 79 6586 1007</span>
        </div>

        {/* Business context switcher */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setBizMenuOpen(!bizMenuOpen)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition-all shadow-2xs"
          >
            <Building2 className="h-4 w-4 text-blue-600" />
            <span className="hidden sm:inline max-w-[130px] truncate">
              {business?.name || 'Fluid.live Technologies'}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {bizMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-30 text-xs animate-in fade-in-50 zoom-in-95 duration-100 text-slate-800">
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <span className="block font-bold text-slate-900">{business?.name || 'Fluid.live Technologies'}</span>
                <span className="text-[11px] text-slate-400 capitalize">{business?.plan || 'Enterprise Tier'}</span>
              </div>
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setBizMenuOpen(false);
                    setIsSecurityModalOpen(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <Shield className="h-3.5 w-3.5 text-blue-600" />
                  <span className="font-medium">Workspace Security</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBizMenuOpen(false);
                    setIsDocsModalOpen(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
                  <span>Documentation</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Notifications Icon Button */}
        <button
          type="button"
          onClick={onNotificationToggle}
          className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors border border-slate-200/80 bg-white shadow-2xs"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
            </span>
          )}
        </button>

        {/* Profile Avatar Pill */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1 pr-2.5 hover:bg-slate-50 transition-all shadow-2xs"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs shadow-xs">
              HR
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-30 text-xs animate-in fade-in-50 zoom-in-95 duration-100 text-slate-800">
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <span className="block font-bold text-slate-900">Fluid.live HR</span>
                <span className="text-[11px] text-slate-400">recruitment@fluid.live</span>
              </div>
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    if (onRouteChange) onRouteChange('settings');
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  <span>Profile Settings</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    setIsSignOutModalOpen(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Workspace Security Modal */}
      <WorkspaceSecurityModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
      />

      {/* Documentation Modal */}
      <DocumentationModal
        isOpen={isDocsModalOpen}
        onClose={() => setIsDocsModalOpen(false)}
      />

      {/* Sign Out Confirmation Modal */}
      <Modal
        isOpen={isSignOutModalOpen}
        onClose={() => setIsSignOutModalOpen(false)}
        title="Sign Out of Fluid.live"
        size="sm"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" size="sm" onClick={() => setIsSignOutModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setIsSignOutModalOpen(false);
                window.location.reload();
              }}
            >
              Confirm Sign Out
            </Button>
          </div>
        }
      >
        <p className="text-xs text-slate-600 leading-relaxed">
          Are you sure you want to sign out of your workspace? Any unsaved calling campaign drafts will be discarded.
        </p>
      </Modal>
    </header>
  );
};
