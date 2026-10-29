import React from 'react';
import { cn } from '../../lib/utils';
import {
  LayoutDashboard,
  Users,
  Megaphone,
  Bot,
  PhoneCall,
  Hash,
  CreditCard,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  BarChart3,
} from 'lucide-react';

export type NavRoute =
  | 'dashboard'
  | 'leads'
  | 'campaigns'
  | 'agents'
  | 'calls'
  | 'phoneNumbers'
  | 'billing'
  | 'settings';

export interface SidebarProps {
  activeRoute: NavRoute;
  onRouteChange: (route: NavRoute) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeRoute,
  onRouteChange,
  isCollapsed,
  onToggleCollapse,
  mobileOpen,
  onMobileClose,
}) => {
  const navItems: { route: NavRoute; label: string; icon: React.ReactNode; badge?: string }[] = [
    { route: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { route: 'leads', label: 'Leads', icon: <Users className="h-4 w-4" /> },
    { route: 'campaigns', label: 'Campaigns', icon: <Megaphone className="h-4 w-4" /> },
    { route: 'agents', label: 'Call Agents', icon: <Bot className="h-4 w-4" /> },
    { route: 'calls', label: 'Calls', icon: <PhoneCall className="h-4 w-4" /> },
    { route: 'phoneNumbers', label: 'Phone Numbers', icon: <Hash className="h-4 w-4" /> },
    { route: 'billing', label: 'Usage & Costs', icon: <BarChart3 className="h-4 w-4" /> },
  ];

  const handleNavClick = (route: NavRoute) => {
    onRouteChange(route);
    onMobileClose();
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#0A0D14] text-slate-300 border-r border-slate-800/80">
      {/* Brand logo & header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-800/80 px-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 text-white font-extrabold text-sm tracking-tight shadow-md shadow-indigo-500/20 shrink-0">
            F.L
          </div>
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="font-bold text-white tracking-tight text-sm leading-tight flex items-center gap-1.5">
                Fluid.Live
                <span className="rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 text-[9px] font-mono font-bold uppercase">
                  Voice AI
                </span>
              </span>
              <span className="text-[11px] text-slate-400 font-medium truncate">Calling Platform</span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden md:flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Main Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
          {!isCollapsed && 'Platform Core'}
        </div>
        {navItems.map(item => {
          const isActive = activeRoute === item.route;
          return (
            <button
              key={item.route}
              onClick={() => handleNavClick(item.route)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all select-none',
                isActive
                  ? 'bg-gradient-to-r from-indigo-500/20 via-indigo-500/10 to-transparent text-white shadow-sm border border-indigo-500/30 font-bold'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <span className={isActive ? 'text-indigo-400' : 'text-slate-400'}>{item.icon}</span>
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}

        {/* Settings Reserved Boundary (Architectural Principle #19) */}
        <div className="pt-6">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
            {!isCollapsed && 'System'}
          </div>
          <button
            onClick={() => handleNavClick('settings')}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all select-none',
              activeRoute === 'settings'
                ? 'bg-gradient-to-r from-indigo-500/20 via-indigo-500/10 to-transparent text-white shadow-sm border border-indigo-500/30 font-bold'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
            )}
            title={isCollapsed ? 'Settings' : undefined}
          >
            <Settings className={activeRoute === 'settings' ? 'h-4 w-4 text-indigo-400' : 'h-4 w-4 text-slate-400'} />
            {!isCollapsed && (
              <span className="truncate">Settings</span>
            )}
          </button>
        </div>
      </div>

      {/* Infrastructure Status Footprint */}
      {!isCollapsed && (
        <div className="border-t border-slate-800/80 p-3.5 m-3 rounded-xl bg-slate-950/70 border border-slate-800/50 text-xs">
          <div className="flex items-center gap-2 text-slate-200 font-semibold mb-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Voice Telephony Cloud</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            SIP carrier bridge active. Real-time audio stream ready.
          </p>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden md:block fixed inset-y-0 left-0 z-30 transition-all duration-200 border-r border-slate-800',
          isCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onMobileClose} />
          <div className="relative w-64 max-w-xs z-50 flex-1">{sidebarContent}</div>
        </div>
      )}
    </>
  );
};

