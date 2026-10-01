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
import { Campaign, CampaignLeadStatus } from '../../types';
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
  FileSpreadsheet,
} from 'lucide-react';

export const LeadsPage: React.FC = () => {
  const [data, setData] = useState<LeadPaginatedResult | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CampaignLeadStatus | 'all'>('all');
  const [campaignFilter, setCampaignFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [newLead, setNewLead] = useState({ name: '', phone: '', email: '', region: 'US-East' });
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
    setNewLead({ name: '', phone: '', email: '', region: 'US-East' });
    fetchLeads();
  };

  const handleImportSubmit = async () => {
    // Simulate batch CSV import of consumer leads
    await leadService.importLeads([
      { name: 'Sarah Jenkins', phone: '+14155550299', email: 's.jenkins@example.com', metadata: { tier: 'Gold' } },
      { name: 'Michael Chang', phone: '+13125550388', email: 'mchang@example.com', metadata: { tier: 'Platinum' } },
      { name: 'Rachel Vance', phone: '+12125550477', email: 'rvance@example.com', metadata: { tier: 'Standard' } },
    ]);
    setIsImportModalOpen(false);
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consumer Leads Directory"
        description="Manage call lists, campaign associations, attempt counts and contact lifecycles."
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
        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase">Total Leads</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{data?.total ?? 0}</div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <Users className="h-5 w-5" />
          </div>
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase">Untouched Leads</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{data?.untouchedTotal ?? 0}</div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
            <Calendar className="h-5 w-5" />
          </div>
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase">Campaign Associations</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{campaigns.length} Active</div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <Filter className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <Card noPadding>
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:w-80">
            <Input
              placeholder="Search by name, phone, email, or metadata..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              leftIcon={<Search className="h-4 w-4" />}
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
            />
          </div>
        </div>

        {/* Data Table */}
        {loading ? (
          <LoadingState label="Filtering consumer lead registry..." />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            title="No leads found"
            description="No consumer contacts match your search or filter parameters."
            actionLabel="Add Lead"
            onAction={() => setIsAddModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Lead Name</th>
                  <th className="px-5 py-3">Contact Info</th>
                  <th className="px-5 py-3">Campaign</th>
                  <th className="px-5 py-3">Lifecycle Status</th>
                  <th className="px-5 py-3">Attempts</th>
                  <th className="px-5 py-3">Last Attempt</th>
                  <th className="px-5 py-3">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {data.items.map(({ lead, campaignLead }) => {
                  const status = campaignLead?.status || 'untouched';
                  const attempts = campaignLead?.attemptCount || 0;
                  const lastAttempt = campaignLead?.lastAttemptAt;
                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-slate-900">{lead.name}</td>
                      <td className="px-5 py-3.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 text-slate-800 font-mono">
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
                      <td className="px-5 py-3.5">
                        <span className="font-medium text-slate-700">
                          {campaignLead
                            ? campaigns.find(c => c.id === campaignLead.campaignId)?.name || campaignLead.campaignId
                            : 'Unassigned'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={getStatusBadgeVariant(status)} dot>
                          {status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 font-mono">{attempts}</td>
                      <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">
                        {lastAttempt ? formatDate(lastAttempt) : 'Never'}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(lead.metadata || {}).map(([k, v]) => (
                            <span
                              key={k}
                              className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 font-mono"
                            >
                              {k}: {String(v)}
                            </span>
                          ))}
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
            placeholder="e.g. Jane Doe"
            value={newLead.name}
            onChange={e => setNewLead({ ...newLead, name: e.target.value })}
            required
          />
          <Input
            label="Phone Number *"
            placeholder="e.g. +14155550199"
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

      {/* Import CSV Simulation Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Leads CSV"
        description="Upload a CSV file containing consumer names, phone numbers, and custom metadata."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleImportSubmit} leftIcon={<FileSpreadsheet className="h-4 w-4" />}>
              Process Batch Import
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center bg-slate-50 hover:bg-slate-100/50 cursor-pointer transition-colors">
            <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-800">Drop CSV file here or click to browse</p>
            <p className="text-[11px] text-slate-500 mt-1">Headers supported: name, phone, email, metadata</p>
          </div>
          <div className="bg-slate-100/70 p-3 rounded text-xs text-slate-600">
            <span className="font-semibold block text-slate-800 mb-1">CSV Format Template Sample:</span>
            <code className="block text-[11px] font-mono text-slate-700">
              name,phone,email,region<br />
              Marcus Vance,+14155550188,marcus@example.com,US-West
            </code>
          </div>
        </div>
      </Modal>
    </div>
  );
};

