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
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 sm:px-6 backdrop-blur shadow-subtle">
      {/* Left items: Mobile menu trigger & Search */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMobileSidebarToggle}
          className="md:hidden rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Global Search Bar */}
        <div className="relative hidden sm:block w-64 md:w-80">
          <Search className="pointer-events-none absolute inset-y-0 left-0 my-auto ml-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search campaigns, agents, leads..."
            className="w-full rounded-md border border-slate-200 bg-slate-50/70 py-1.5 pl-9 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-800 transition-all"
          />
        </div>
      </div>

      {/* Right items: Business Switcher, Notifications & Profile */}
      <div className="flex items-center gap-3">
        {/* Business context switcher */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setBizMenuOpen(!bizMenuOpen)}
            className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <Building2 className="h-4 w-4 text-slate-500" />
            <span className="hidden sm:inline max-w-[130px] truncate">
              {business?.name || 'Apex Enterprises Inc.'}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {bizMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-md border border-slate-200 bg-white p-2 shadow-dropdown z-30 text-xs">
              <div className="px-2 py-1.5 border-b border-slate-100 mb-1">
                <span className="block font-bold text-slate-900">{business?.name || 'Apex Enterprises Inc.'}</span>
                <span className="text-[11px] text-slate-500">{business?.plan || 'Enterprise Tier 2'}</span>
              </div>
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => setBizMenuOpen(false)}
                  className="w-full rounded px-2 py-1.5 text-left font-medium text-slate-700 hover:bg-slate-100 flex items-center justify-between"
                >
                  <span>{business?.name || 'Apex Enterprises Inc.'}</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </button>
                <button
                  type="button"
                  onClick={() => setBizMenuOpen(false)}
                  className="w-full rounded px-2 py-1.5 text-left font-medium text-slate-500 hover:bg-slate-100"
                >
                  Apex Health Services
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Notifications button */}
        <button
          type="button"
          onClick={onNotificationToggle}
          className="relative rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          title="System Activity Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
          )}
        </button>

        <div className="h-5 w-px bg-slate-200" />

        {/* User profile menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 rounded-full p-1 hover:ring-2 hover:ring-slate-200 transition-all"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white font-bold text-xs">
              AP
            </div>
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-52 rounded-md border border-slate-200 bg-white p-1.5 shadow-dropdown z-30 text-xs">
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <p className="font-semibold text-slate-900">Alex Parker</p>
                <p className="text-slate-500 truncate text-[11px]">{business?.email || 'ops@apexenterprises.com'}</p>
              </div>
              <button
                type="button"
                onClick={() => setUserMenuOpen(false)}
                className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 font-medium"
              >
                <User className="h-3.5 w-3.5 text-slate-400" />
                <span>My Profile</span>
              </button>
              <button
                type="button"
                onClick={() => setUserMenuOpen(false)}
                className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 font-medium"
              >
                <Shield className="h-3.5 w-3.5 text-slate-400" />
                <span>Security & Roles</span>
              </button>
              <button
                type="button"
                onClick={() => setUserMenuOpen(false)}
                className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 font-medium"
              >
                <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
                <span>Documentation</span>
              </button>
              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                onClick={() => setUserMenuOpen(false)}
                className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 font-medium"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
