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
import { Business } from '../../types';

export interface HeaderProps {
  onMobileSidebarToggle: () => void;
  onNotificationToggle: () => void;
  unreadCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onMobileSidebarToggle,
  onNotificationToggle,
  unreadCount = 2,
}) => {
  const [business, setBusiness] = useState<Business | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [bizMenuOpen, setBizMenuOpen] = useState(false);

  useEffect(() => {
    businessService.getBusinessProfile().then(setBusiness);
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-white/[0.08] bg-[#060814]/80 px-4 sm:px-6 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      {/* Left items: Mobile menu trigger & Search */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMobileSidebarToggle}
          className="md:hidden rounded-full p-2 text-slate-300 hover:bg-white/[0.08] hover:text-white transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Global Search Bar */}
        <div className="relative hidden sm:block w-72 md:w-96">
          <Search className="pointer-events-none absolute inset-y-0 left-0 my-auto ml-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search campaigns, agents, leads... (⌘K)"
            className="w-full rounded-full border border-white/[0.12] bg-white/[0.04] py-2 pl-10 pr-4 text-xs text-white placeholder:text-slate-500 focus:border-indigo-400 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-indigo-500/25 shadow-inner transition-all"
          />
        </div>
      </div>

      {/* Right items: Business Switcher, Notifications & Profile */}
      <div className="flex items-center gap-3">
        {/* Telephony Network Status Pill */}
        <div className="hidden sm:flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-1 text-xs font-semibold text-emerald-300 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Carrier Bridge: Active</span>
        </div>

        {/* Business context switcher */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setBizMenuOpen(!bizMenuOpen)}
            className="flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.05] hover:bg-white/[0.1] px-3.5 py-1.5 text-xs font-semibold text-slate-200 transition-all shadow-sm"
          >
            <Building2 className="h-4 w-4 text-indigo-400" />
            <span className="hidden sm:inline max-w-[130px] truncate">
              {business?.name || 'Fluid.live Technologies'}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {bizMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-white/[0.12] bg-[#0A0E24] p-2 shadow-2xl z-30 text-xs animate-in fade-in-50 zoom-in-95 duration-100 text-slate-200">
              <div className="px-3 py-2 border-b border-white/[0.08] mb-1">
                <span className="block font-bold text-white">{business?.name || 'Fluid.live Technologies'}</span>
                <span className="text-[11px] text-slate-400 capitalize">{business?.plan || 'Enterprise Tier'}</span>
              </div>
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => setBizMenuOpen(false)}
                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/[0.08] hover:text-white transition-colors"
                >
                  <Shield className="h-3.5 w-3.5 text-slate-400" />
                  <span>Workspace Security</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBizMenuOpen(false)}
                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/[0.08] hover:text-white transition-colors"
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
          className="relative rounded-full p-2 text-slate-300 hover:bg-white/[0.08] hover:text-white transition-colors"
          title="Notifications"
        >
          <Bell className="h-4.5 w-4.5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
          )}
        </button>

        {/* Profile Avatar Pill */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.05] p-1 pr-2 hover:bg-white/[0.1] transition-all"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-sky-400 text-white font-bold text-xs shadow-sm">
              PL
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-white/[0.12] bg-[#0A0E24] p-2 shadow-2xl z-30 text-xs animate-in fade-in-50 zoom-in-95 duration-100 text-slate-200">
              <div className="px-3 py-2 border-b border-white/[0.08] mb-1">
                <span className="block font-bold text-white">Pranav L</span>
                <span className="text-[11px] text-slate-400">pranav@fluid.live</span>
              </div>
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/[0.08] hover:text-white transition-colors"
                >
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  <span>Profile Settings</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
