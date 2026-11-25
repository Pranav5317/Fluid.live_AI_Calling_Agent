import React, { useState, useEffect } from 'react';
import { Sidebar, NavRoute } from './Sidebar';
import { Header } from './Header';
import { NotificationDrawer } from './NotificationDrawer';
import { CommandMenu } from '../common/CommandMenu';
import { campaignService } from '../../services/campaignService';
import { cn } from '../../lib/utils';

export interface AppShellProps {
  activeRoute: NavRoute;
  onRouteChange: (route: NavRoute) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  activeRoute,
  onRouteChange,
  children,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);

  // Global Keyboard Shortcut: ⌘K or Ctrl+K to toggle Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandMenuOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Global Autonomous Scheduler Heartbeat (runs every 60s while dashboard is open)
  useEffect(() => {
    const runBackgroundTick = async () => {
      try {
        const status = await campaignService.getSchedulerStatus();
        if (status?.windowInfo?.isOpen && (status?.dueNowForDialing > 0 || status?.runningCampaigns > 0)) {
          await campaignService.triggerSchedulerTick({ dryRun: false });
        }
      } catch {
        // Silent background check
      }
    };

    const interval = setInterval(runBackgroundTick, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        activeRoute={activeRoute}
        onRouteChange={onRouteChange}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div
        className={cn(
          'flex-1 flex flex-col transition-all duration-200',
          sidebarCollapsed ? 'md:pl-16' : 'md:pl-64'
        )}
      >
        {/* Persistent Header */}
        <Header
          onMobileSidebarToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          onNotificationToggle={() => setNotificationOpen(!notificationOpen)}
          onRouteChange={onRouteChange}
          onOpenCommandMenu={() => setCommandMenuOpen(true)}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Global Command Menu (⌘K / Ctrl+K) */}
      <CommandMenu
        isOpen={commandMenuOpen}
        onClose={() => setCommandMenuOpen(false)}
        onNavigate={onRouteChange}
      />

      {/* Slide-over Notifications */}
      <NotificationDrawer
        isOpen={notificationOpen}
        onClose={() => setNotificationOpen(false)}
      />
    </div>
  );
};

