import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Pagination } from '../../components/common/Pagination';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingState } from '../../components/common/LoadingState';
import { leadService, LeadPaginatedResult, LeadWithCampaignState } from '../../services/leadService';
import { campaignService } from '../../services/campaignService';
import { Campaign, CampaignLeadStatus, Lead } from '../../types';
import { formatDate, formatPhoneNumber } from '../../lib/formatters';
import {
  Users,
  Search,
  Plus,
  Upload,
  Phone,
  Mail,
  Calendar,
  Filter,
  Eye,
  Edit3,
  CalendarClock,
  Sparkles,
  Briefcase,
  Clock,
} from 'lucide-react';
import { LeadDetailDrawer } from './LeadDetailDrawer';
import { LeadCsvImportModal } from './LeadCsvImportModal';
import { LeadEditModal } from './LeadEditModal';

import { callService } from '../../services/callService';
import { agentService } from '../../services/agentService';
import { phoneService } from '../../services/phoneService';

export const LeadsPage: React.FC = () => {
  const [data, setData] = useState<LeadPaginatedResult | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [callingLeadId, setCallingLeadId] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  // Edit & Schedule Modal state
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Filters state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CampaignLeadStatus | 'all'>('all');
  const [campaignFilter, setCampaignFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [newLead, setNewLead] = useState({ name: '', phone: '', email: '', region: 'IN-MH' });
  const [selectedCampaignForAdd, setSelectedCampaignForAdd] = useState<string>('');

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const result = await leadService.getLeads({
        search,
        status: statusFilter,
        campaignId: campaignFilter,
        page,
        pageSize: 8,
      });
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCallLead = async (leadId: string, phone: string, name?: string) => {
    setCallingLeadId(leadId);
    try {
      const [agList, numList] = await Promise.all([
        agentService.getAgents(),
        phoneService.getPhoneNumbers(),
      ]);
      const agVerId = agList[0]?.currentVersionId || 'agv_sarvam_prod_v1';
      const phoneId = numList[0]?.id || 'phone_sarvam_prod_01';

      await callService.initiateTestCall({
        agentVersionId: agVerId,
        phoneNumberId: phoneId,
        toPhoneNumber: phone,
        leadId,
        userName: name,
      });
      alert(`Outbound AI Call successfully initiated to ${phone} via Sarvam Voice Gateway!`);
      fetchLeads();
    } catch (err: any) {
      alert(`Call Initiation Failed: ${err?.message}`);
    } finally {
      setCallingLeadId(null);
    }
  };

  useEffect(() => {
    campaignService.getCampaigns().then(setCampaigns);
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [search, statusFilter, campaignFilter, page]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.name || !newLead.phone) return;
    await leadService.addLead(
      {
        name: newLead.name,
        phone: newLead.phone,
        email: newLead.email,
        metadata: { region: newLead.region, addedSource: 'Manual UI' },
      },
      selectedCampaignForAdd || undefined
    );
    setIsAddModalOpen(false);
    setNewLead({ name: '', phone: '', email: '', region: 'IN-MH' });
    fetchLeads();
  };

  const handleOpenEdit = (lead: Lead) => {
    setEditingLead(lead);
    setIsEditModalOpen(true);
  };

  const handleLeadUpdated = (_updated: Lead) => {
    fetchLeads();
  };

  const getStatusBadgeVariant = (status?: CampaignLeadStatus) => {
    switch (status) {
      case 'untouched':
        return 'neutral';
      case 'queued':
        return 'info';
      case 'calling':
        return 'warning';
      case 'contacted':
        return 'purple';
      case 'completed':
        return 'success';
      case 'failed':
        return 'danger';
      case 'callback':
        return 'brand';
      default:
        return 'neutral';
    }
  };

  const formatScheduledTime = (isoString?: string) => {
    if (!isoString) return null;
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Candidate Leads Directory"
        description="Manage candidate contact cards, portal application facts, scheduled screening calls, and voice outreach."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Upload className="h-4 w-4" />}
              onClick={() => setIsImportModalOpen(true)}
            >
              Import CSV
            </Button>
            <Button
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setIsAddModalOpen(true)}
            >
              Add Lead
            </Button>
          </div>
        }
      />

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 flex items-center justify-between border-slate-200 shadow-xs">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">Total Candidates</span>
            <div className="text-2xl font-extrabold text-slate-950 mt-1 tracking-tight">{data?.total ?? 0}</div>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-xs">
            <Users className="h-5 w-5" />
          </div>
        </Card>
        <Card className="p-5 flex items-center justify-between border-slate-200 shadow-xs">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">Untouched Leads</span>
            <div className="text-2xl font-extrabold text-slate-950 mt-1 tracking-tight">{data?.untouchedTotal ?? 0}</div>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 shadow-xs">
            <Calendar className="h-5 w-5" />
          </div>
        </Card>
        <Card className="p-5 flex items-center justify-between border-slate-200 shadow-xs">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">Active Campaigns</span>
            <div className="text-2xl font-extrabold text-slate-950 mt-1 tracking-tight">{campaigns.length} Active</div>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 shadow-xs">
            <Filter className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <Card noPadding className="overflow-hidden border-slate-200 shadow-xs">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:w-80">
            <Input
              placeholder="Search candidate name, phone, role..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              leftIcon={<Search className="h-4 w-4 text-slate-400" />}
              className="border-slate-200 bg-white"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Select
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value as any);
                setPage(1);
              }}
              options={[
                { value: 'all', label: 'All Lifecycle Statuses' },
                { value: 'untouched', label: 'Untouched' },
                { value: 'queued', label: 'Queued' },
                { value: 'calling', label: 'Calling' },
                { value: 'contacted', label: 'Contacted' },
                { value: 'completed', label: 'Completed' },
                { value: 'failed', label: 'Failed' },
                { value: 'callback', label: 'Callback Requested' },
              ]}
              className="border-slate-200 text-xs"
            />
            <Select
              value={campaignFilter}
              onChange={e => {
                setCampaignFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { value: 'all', label: 'All Campaigns' },
                ...campaigns.map(c => ({ value: c.id, label: c.name })),
              ]}
              className="border-slate-200 text-xs"
            />
          </div>
        </div>

        {/* Data Table */}
        {loading ? (
          <LoadingState label="Loading candidate directory..." />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            title="No candidates found"
            description="No contacts match your current search or filter parameters."
            actionLabel="Add Lead"
            onAction={() => setIsAddModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 font-mono">
                <tr>
                  <th className="px-5 py-3.5">Candidate & Role</th>
                  <th className="px-5 py-3.5">Contact Info</th>
                  <th className="px-5 py-3.5">Scheduled Call</th>
                  <th className="px-5 py-3.5">Campaign & Status</th>
                  <th className="px-5 py-3.5">Portal Stated Facts</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {data.items.map(({ lead, campaignLead }) => {
                  const status = campaignLead?.status || 'untouched';
                  const meta = (lead.metadata || {}) as Record<string, any>;
                  const appliedRole = meta.role || meta.applied_role || 'Candidate';
                  const company = meta.company || 'FluidLive';
                  const scheduledTimeStr = formatScheduledTime(meta.scheduledCallTime || meta.scheduledAt);

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => setSelectedLeadId(lead.id)}
                      className="hover:bg-slate-50/70 cursor-pointer transition-colors group"
                    >
                      {/* Candidate & Role */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs uppercase">
                            {lead.name ? lead.name.slice(0, 2).toUpperCase() : 'LE'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                              <span>{lead.name}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                              <Briefcase className="h-3 w-3 text-slate-400" />
                              <span>{appliedRole}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-500">{company}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="px-5 py-3.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 text-slate-900 font-mono text-[11px] font-semibold">
                            <Phone className="h-3 w-3 text-slate-400" />
                            <span>{formatPhoneNumber(lead.phone)}</span>
                          </div>
                          {lead.email && (
                            <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                              <Mail className="h-3 w-3 text-slate-400" />
                              <span>{lead.email}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Scheduled Call */}
                      <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                        {scheduledTimeStr ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-[11px] font-semibold">
                            <CalendarClock className="h-3.5 w-3.5 text-emerald-600" />
                            <span>{scheduledTimeStr}</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(lead)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/60 border border-dashed border-slate-300 transition-colors"
                          >
                            <CalendarClock className="h-3 w-3" />
                            <span>+ Set Schedule</span>
                          </button>
                        )}
                      </td>

                      {/* Campaign & Status */}
                      <td className="px-5 py-3.5">
                        <div className="space-y-1">
                          <div className="font-medium text-slate-800 text-[11px]">
                            {campaignLead
                              ? campaigns.find(c => c.id === campaignLead.campaignId)?.name || campaignLead.campaignId
                              : 'Unassigned Pool'}
                          </div>
                          <div>
                            <Badge variant={getStatusBadgeVariant(status)} dot size="sm">
                              {status}
                            </Badge>
                          </div>
                        </div>
                      </td>

                      {/* Stated Facts */}
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1 text-[10px]">
                          {meta.experience && (
                            <span className="rounded bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-slate-700 font-mono">
                              Exp: {meta.experience}
                            </span>
                          )}
                          {meta.notice && (
                            <span className="rounded bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-slate-700 font-mono">
                              Notice: {meta.notice}
                            </span>
                          )}
                          {meta.workMode && (
                            <span className="rounded bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-slate-700">
                              {meta.workMode}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Instant Actions */}
                      <td className="px-5 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEdit(lead)}
                            leftIcon={<Edit3 className="h-3.5 w-3.5 text-slate-600" />}
                            title="Edit candidate details & call schedule"
                            className="rounded-lg text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 text-xs px-2.5"
                          >
                            Edit
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            isLoading={callingLeadId === lead.id}
                            leftIcon={<Phone className="h-3.5 w-3.5 text-emerald-600" />}
                            onClick={() => handleCallLead(lead.id, lead.phone, lead.name)}
                            className="rounded-lg text-emerald-700 border-emerald-200 hover:bg-emerald-50 text-xs px-2.5 font-semibold"
                          >
                            Call Now
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedLeadId(lead.id)}
                            leftIcon={<Eye className="h-3.5 w-3.5 text-indigo-600" />}
                            title="Open Candidate 360 Timeline"
                            className="rounded-lg text-indigo-700 hover:bg-indigo-50 text-xs px-2.5"
                          >
                            360°
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {data && data.total > 0 && (
          <Pagination
            currentPage={data.page}
            totalPages={data.totalPages}
            totalItems={data.total}
            pageSize={data.pageSize}
            onPageChange={setPage}
          />
        )}
      </Card>

      {/* Add Lead Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Consumer Lead"
        description="Enter consumer contact details and optional campaign association."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddSubmit}>
              Save Lead
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <Input
            label="Full Name *"
            placeholder="e.g. Rahul Sharma"
            value={newLead.name}
            onChange={e => setNewLead({ ...newLead, name: e.target.value })}
            required
          />
          <Input
            label="Phone Number *"
            placeholder="e.g. +919922935920"
            value={newLead.phone}
            onChange={e => setNewLead({ ...newLead, phone: e.target.value })}
            required
          />
          <Input
            label="Email Address"
            placeholder="e.g. jane@example.com"
            value={newLead.email}
            onChange={e => setNewLead({ ...newLead, email: e.target.value })}
          />
          <Select
            label="Associate with Campaign"
            value={selectedCampaignForAdd}
            options={[
              { value: '', label: 'None (Unassigned Pool)' },
              ...campaigns.map(c => ({ value: c.id, label: c.name })),
            ]}
            onChange={e => setSelectedCampaignForAdd(e.target.value)}
          />
        </form>
      </Modal>

      {/* Edit & Call Scheduling Modal */}
      <LeadEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingLead(null);
        }}
        lead={editingLead}
        onLeadUpdated={handleLeadUpdated}
      />

      {/* Real CSV Import Modal with Drag-and-Drop, Field Parser & Preview */}
      <LeadCsvImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        campaigns={campaigns}
        onImportComplete={fetchLeads}
      />

      {/* Lead 360° Profile & Call Timeline Drawer */}
      <LeadDetailDrawer
        leadId={selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
        onCallInitiated={fetchLeads}
        onEditLead={lead => {
          setEditingLead(lead);
          setIsEditModalOpen(true);
        }}
      />
    </div>
  );
};


