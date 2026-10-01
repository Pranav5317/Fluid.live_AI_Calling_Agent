import React, { useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { NavRoute } from './components/layout/Sidebar';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { LeadsPage } from './features/leads/LeadsPage';
import { CampaignsPage } from './features/campaigns/CampaignsPage';
import { AgentsPage } from './features/agents/AgentsPage';
import { CallsPage } from './features/calls/CallsPage';
import { PhoneNumbersPage } from './features/phoneNumbers/PhoneNumbersPage';
import { KnowledgeBasePage } from './features/knowledgeBase/KnowledgeBasePage';
import { BillingPage } from './features/billing/BillingPage';
import { SettingsPage } from './features/settings/SettingsPage';

export function App() {
  const [activeRoute, setActiveRoute] = useState<NavRoute>('dashboard');

  const handleNavigate = (route: NavRoute) => {
    setActiveRoute(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AppShell activeRoute={activeRoute} onRouteChange={handleNavigate}>
      {activeRoute === 'dashboard' && <DashboardPage onNavigate={handleNavigate} />}
      {activeRoute === 'leads' && <LeadsPage />}
      {activeRoute === 'campaigns' && <CampaignsPage />}
      {activeRoute === 'agents' && <AgentsPage />}
      {activeRoute === 'calls' && <CallsPage />}
      {activeRoute === 'phoneNumbers' && <PhoneNumbersPage />}
      {activeRoute === 'knowledgeBase' && <KnowledgeBasePage />}
      {activeRoute === 'billing' && <BillingPage />}
      {activeRoute === 'settings' && <SettingsPage />}
    </AppShell>
  );
}

export default App;

