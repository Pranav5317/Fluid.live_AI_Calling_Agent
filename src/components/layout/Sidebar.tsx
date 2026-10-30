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
    <div className="flex h-full flex-col bg-[#EFE4D3] text-slate-700 border-r border-[#DFCDB6]">
      {/* Brand logo & header */}
      <div className="flex h-16 items-center justify-between border-b border-[#DFCDB6] px-5">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1D4ED8] text-white font-black text-xs tracking-tight shadow-md shadow-blue-500/25 shrink-0">
            fl
          </div>
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="font-bold text-slate-950 tracking-tight text-base leading-tight flex items-center gap-1.5 font-sans">
                fluid<span className="text-[#1D4ED8]">.</span>live
              </span>
              <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">Voice AI Suite</span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden md:flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-white/60 hover:text-slate-950 transition-colors"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Main Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
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
                'flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-xs font-medium transition-all select-none',
                isActive
                  ? 'bg-white text-[#1D4ED8] shadow-[0_4px_16px_rgba(40,25,10,0.06)] border border-[#DACBB5] font-bold'
                  : 'text-slate-700 hover:bg-white/60 hover:text-slate-950'
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <span className={isActive ? 'text-[#1D4ED8]' : 'text-slate-500'}>{item.icon}</span>
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}

        {/* System Boundary */}
        <div className="pt-6">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
            {!isCollapsed && 'System'}
          </div>
          <button
            onClick={() => handleNavClick('settings')}
            className={cn(
              'flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-xs font-medium transition-all select-none',
              activeRoute === 'settings'
                ? 'bg-white text-[#1D4ED8] shadow-[0_4px_16px_rgba(40,25,10,0.06)] border border-[#DACBB5] font-bold'
                : 'text-slate-700 hover:bg-white/60 hover:text-slate-950'
            )}
            title={isCollapsed ? 'Settings' : undefined}
          >
            <Settings className={activeRoute === 'settings' ? 'h-4 w-4 text-[#1D4ED8]' : 'h-4 w-4 text-slate-500'} />
            {!isCollapsed && (
              <span className="truncate">Settings</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden md:block fixed inset-y-0 left-0 z-30 transition-all duration-200 border-r border-[#DFCDB6]',
          isCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onMobileClose} />
          <div className="relative w-64 max-w-xs z-50 flex-1">{sidebarContent}</div>
        </div>
      )}
    </>
  );
};
