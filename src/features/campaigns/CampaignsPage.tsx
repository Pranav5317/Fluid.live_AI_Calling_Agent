import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingState } from '../../components/common/LoadingState';
import { campaignService } from '../../services/campaignService';
import { agentService } from '../../services/agentService';
import { phoneService } from '../../services/phoneService';
import { leadService } from '../../services/leadService';
import { Campaign, CampaignStatus, Agent, AgentVersion, PhoneNumber, Lead } from '../../types';
import { formatDate } from '../../lib/formatters';
import {
  Megaphone,
  Plus,
  Play,
  Pause,
  Square,
  Bot,
  Hash,
  Search,
  CheckCircle,
  History,
  Users,
} from 'lucide-react';

export const CampaignsPage: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [availableLeads, setAvailableLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all');

  // Wizard state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [agentVersions, setAgentVersions] = useState<AgentVersion[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    agentId: '',
    agentVersionId: '',
    phoneNumberId: '',
    totalLeads: 100,
    selectedLeadIds: [] as string[],
    scheduleDate: '',
  });

  // Action dialog state
  const [targetCampaign, setTargetCampaign] = useState<Campaign | null>(null);
  const [actionType, setActionType] = useState<'start' | 'pause' | 'stop' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const list = await campaignService.getCampaigns({ search, status: statusFilter });
      setCampaigns(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([
      agentService.getAgents(),
      phoneService.getPhoneNumbers(),
      leadService.getAllLeadsRaw(),
    ]).then(([agList, numList, leadList]) => {
      setAgents(agList);
      setPhoneNumbers(numList);
      setAvailableLeads(leadList);
    });
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [search, statusFilter]);

  const handleAgentSelect = async (agentId: string) => {
    const details = await agentService.getAgentById(agentId);
    if (details) {
      setAgentVersions(details.allVersions);
      setFormData(prev => ({
        ...prev,
        agentId,
        agentVersionId: details.currentVersion.id,
      }));
    }
  };

  const handleWizardSubmit = async () => {
    if (!formData.name || !formData.agentId || !formData.phoneNumberId) return;

    await campaignService.createCampaign({
      name: formData.name,
      agentId: formData.agentId,
      agentVersionId: formData.agentVersionId, // Locked AgentVersion
      phoneNumberId: formData.phoneNumberId,
      totalLeads: formData.totalLeads,
      selectedLeadIds: formData.selectedLeadIds.length > 0 ? formData.selectedLeadIds : undefined,
      scheduledAt: formData.scheduleDate || undefined,
    });

    setIsWizardOpen(false);
    setWizardStep(1);
    setFormData({
      name: '',
      agentId: '',
      agentVersionId: '',
      phoneNumberId: '',
      totalLeads: 100,
      selectedLeadIds: [],
      scheduleDate: '',
    });
    fetchCampaigns();
  };

  const handleExecuteAction = async () => {
    if (!targetCampaign || !actionType) return;
    setActionLoading(true);
    try {
      if (actionType === 'start') await campaignService.startCampaign(targetCampaign.id);
      else if (actionType === 'pause') await campaignService.pauseCampaign(targetCampaign.id);
      else if (actionType === 'stop') await campaignService.stopCampaign(targetCampaign.id);

      fetchCampaigns();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
      setTargetCampaign(null);
      setActionType(null);
    }
  };

  const getStatusBadgeVariant = (status: CampaignStatus) => {
    switch (status) {
      case 'running':
        return 'success';
      case 'paused':
        return 'warning';
      case 'scheduled':
        return 'info';
      case 'completed':
        return 'neutral';
      case 'draft':
        return 'neutral';
      case 'failed':
      case 'cancelled':
        return 'danger';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaigns Workspace"
        description="Build, schedule, launch and manage automated AI voice calling campaigns."
        actions={
          <Button
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => {
              if (agents.length > 0) handleAgentSelect(agents[0].id);
              if (phoneNumbers.length > 0)
                setFormData(prev => ({ ...prev, phoneNumberId: phoneNumbers[0].id }));
              setIsWizardOpen(true);
            }}
          >
            Create Campaign
          </Button>
        }
      />

      {/* Search & Status Filter Strip */}
      <Card noPadding>
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:w-80">
            <Input
              placeholder="Search campaigns..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>
          <div className="w-full sm:w-60">
            <Select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              options={[
                { value: 'all', label: 'All Campaign States' },
                { value: 'draft', label: 'Draft' },
                { value: 'scheduled', label: 'Scheduled' },
                { value: 'running', label: 'Running' },
                { value: 'paused', label: 'Paused' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
            />
          </div>
        </div>

        {/* Campaign List Table */}
        {loading ? (
          <LoadingState label="Fetching campaigns..." />
        ) : campaigns.length === 0 ? (
          <EmptyState
            title="No campaigns found"
            description="Create your first calling campaign to connect your AI agent with leads."
            actionLabel="Create Campaign"
            onAction={() => setIsWizardOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Campaign Name</th>
                  <th className="px-5 py-3">Agent & Locked Version</th>
                  <th className="px-5 py-3">Phone Number</th>
                  <th className="px-5 py-3">Progress</th>
                  <th className="px-5 py-3">Minutes Used</th>
                  <th className="px-5 py-3">Lifecycle State</th>
                  <th className="px-5 py-3 text-right">Execution Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {campaigns.map(cmp => {
                  const agentObj = agents.find(a => a.id === cmp.agentId);
                  const phoneObj = phoneNumbers.find(p => p.id === cmp.phoneNumberId);
                  const progressPct = Math.round((cmp.completedCalls / (cmp.totalLeads || 1)) * 100);

                  return (
                    <tr key={cmp.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-4">
                        <div>
                          <span className="font-semibold text-slate-900 block text-sm">{cmp.name}</span>
                          <span className="text-[11px] text-slate-400">Created {formatDate(cmp.createdAt)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                            <Bot className="h-3.5 w-3.5 text-slate-400" />
                            <span>{agentObj ? agentObj.name : cmp.agentId}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                            <History className="h-3 w-3 text-slate-400" />
                            <span>Locked Version: <strong className="text-slate-700">{cmp.agentVersionId}</strong></span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1 text-slate-700 font-mono">
                          <Hash className="h-3 w-3 text-slate-400" />
                          <span>{phoneObj ? phoneObj.phoneNumber : cmp.phoneNumberId}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 w-44">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] text-slate-600 font-mono">
                            <span>{cmp.completedCalls} / {cmp.totalLeads} leads</span>
                            <span className="font-bold">{progressPct}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-slate-900 h-1.5 rounded-full"
                              style={{ width: `${Math.min(progressPct, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono font-medium">{cmp.minutesUsed.toFixed(1)}m</td>
                      <td className="px-5 py-4">
                        <Badge variant={getStatusBadgeVariant(cmp.status)} dot>
                          {cmp.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {cmp.status === 'draft' || cmp.status === 'scheduled' || cmp.status === 'paused' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              leftIcon={<Play className="h-3.5 w-3.5 text-emerald-600" />}
                              onClick={() => {
                                setTargetCampaign(cmp);
                                setActionType('start');
                              }}
                            >
                              {cmp.status === 'paused' ? 'Resume' : 'Start'}
                            </Button>
                          ) : null}

                          {cmp.status === 'running' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              leftIcon={<Pause className="h-3.5 w-3.5 text-amber-600" />}
                              onClick={() => {
                                setTargetCampaign(cmp);
                                setActionType('pause');
                              }}
                            >
                              Pause
                            </Button>
                          ) : null}

                          {cmp.status === 'running' || cmp.status === 'paused' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-rose-600 hover:bg-rose-50"
                              leftIcon={<Square className="h-3.5 w-3.5" />}
                              onClick={() => {
                                setTargetCampaign(cmp);
                                setActionType('stop');
                              }}
                            >
                              Stop
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Step-by-Step Create Campaign Wizard Modal */}
      <Modal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        title={`Create New Campaign (Step ${wizardStep} of 3)`}
        size="lg"
        footer={
          <div className="flex justify-between w-full">
            {wizardStep > 1 ? (
              <Button variant="outline" size="sm" onClick={() => setWizardStep((wizardStep - 1) as any)}>
                Back
              </Button>
            ) : <div />}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsWizardOpen(false)}>
                Cancel
              </Button>
              {wizardStep < 3 ? (
                <Button size="sm" onClick={() => setWizardStep((wizardStep + 1) as any)}>
                  Next Step
                </Button>
              ) : (
                <Button size="sm" onClick={handleWizardSubmit} leftIcon={<CheckCircle className="h-4 w-4" />}>
                  Launch Campaign
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Step 1: Basics & Explicit AgentVersion Selection */}
          {wizardStep === 1 && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                1. Campaign Details & Agent Version Selection
              </h4>
              <Input
                label="Campaign Name *"
                placeholder="e.g. Q4 Renewal Outreach"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <Select
                label="Select Calling Agent *"
                value={formData.agentId}
                options={agents.map(a => ({ value: a.id, label: `${a.name} (${a.useCase})` }))}
                onChange={e => handleAgentSelect(e.target.value)}
              />
              {agentVersions.length > 0 && (
                <Select
                  label="Select Explicit Agent Version (Locked to Campaign) *"
                  value={formData.agentVersionId}
                  options={agentVersions.map(v => ({
                    value: v.id,
                    label: `Version ${v.versionNumber} (${v.id}) - ${v.notes || 'Configured'}`,
                  }))}
                  onChange={e => setFormData({ ...formData, agentVersionId: e.target.value })}
                  helperText="This exact prompt version will remain locked to this campaign even if the agent is updated later."
                />
              )}
            </div>
          )}

          {/* Step 2: Telephony & Lead Audience Assignment */}
          {wizardStep === 2 && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                2. Phone Number & Lead Audience Assignment
              </h4>
              <Select
                label="Sarvam Outbound Phone Number *"
                value={formData.phoneNumberId}
                options={phoneNumbers.map(p => ({
                  value: p.id,
                  label: `${p.phoneNumber} (${p.status})`,
                }))}
                onChange={e => setFormData({ ...formData, phoneNumberId: e.target.value })}
              />
              <Input
                label="Target Lead Audience Size (Auto-enroll from pool)"
                type="number"
                value={formData.totalLeads}
                onChange={e => setFormData({ ...formData, totalLeads: Number(e.target.value) })}
                helperText={`Pool contains ${availableLeads.length} total consumer contacts available for campaign enrollment.`}
              />
            </div>
          )}

          {/* Step 3: Schedule & Execution Confirmation */}
          {wizardStep === 3 && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                3. Schedule & Execution Confirmation
              </h4>
              <Input
                label="Schedule Start Date & Time (Optional)"
                type="datetime-local"
                value={formData.scheduleDate}
                onChange={e => setFormData({ ...formData, scheduleDate: e.target.value })}
                helperText="Leave empty to launch immediately."
              />
              <div className="rounded-md bg-slate-50 border border-slate-200 p-4 text-xs space-y-2">
                <span className="font-bold text-slate-900 block">Campaign Execution Summary:</span>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div>Name: <strong className="text-slate-800">{formData.name}</strong></div>
                  <div>Audience Size: <strong className="text-slate-800">{formData.totalLeads} leads</strong></div>
                  <div>Agent ID: <strong className="text-slate-800">{formData.agentId}</strong></div>
                  <div>Locked AgentVersion: <strong className="text-slate-800 font-mono">{formData.agentVersionId}</strong></div>
                  <div>Phone ID: <strong className="text-slate-800">{formData.phoneNumberId}</strong></div>
                  <div>Status: <strong className="text-slate-800">{formData.scheduleDate ? 'Scheduled' : 'Draft / Ready'}</strong></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Confirmation Dialog for Execution Actions */}
      <ConfirmDialog
        isOpen={!!actionType}
        onClose={() => {
          setTargetCampaign(null);
          setActionType(null);
        }}
        onConfirm={handleExecuteAction}
        isLoading={actionLoading}
        title={`${actionType === 'start' ? 'Start' : actionType === 'pause' ? 'Pause' : 'Stop'} Campaign`}
        message={`Are you sure you want to ${actionType} "${targetCampaign?.name}" using locked agent version ${targetCampaign?.agentVersionId}? This will trigger calls through Sarvam's voice provider bridge.`}
        isDanger={actionType === 'stop'}
      />
    </div>
  );
};
