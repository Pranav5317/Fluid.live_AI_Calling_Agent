import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { LoadingState } from '../../components/common/LoadingState';
import { phoneService } from '../../services/phoneService';
import { agentService } from '../../services/agentService';
import { sarvamService } from '../../services/sarvamService';
import { PhoneNumber, Agent, SarvamAccountStatus } from '../../types';
import { formatDate } from '../../lib/formatters';
import { Plus, Zap, Bot, RefreshCw, Trash2, Phone, ShieldCheck } from 'lucide-react';

export const PhoneNumbersPage: React.FC = () => {
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [sarvamStatus, setSarvamStatus] = useState<SarvamAccountStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Link Number Modal State
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [connectionId, setConnectionId] = useState('');
  const [providerName, setProviderName] = useState('Fluid Voice Carrier (SIP Trunk)');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [numList, agList, srv] = await Promise.all([
        phoneService.getPhoneNumbers(),
        agentService.getAgents(),
        sarvamService.getStatus().catch(() => null),
      ]);
      setNumbers(numList);
      setAgents(agList);
      if (srv) {
        setSarvamStatus(srv);
        setConnectionId(srv.connectionId || '');
        if (!phoneNumber && srv.agentPhoneNumber) {
          setPhoneNumber(srv.agentPhoneNumber);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLinkNumber = async () => {
    if (!phoneNumber.trim()) {
      setErrorMessage('Phone number is required.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      await phoneService.addPhoneNumber({
        phoneNumber: phoneNumber.trim(),
        connectionId: connectionId.trim() || undefined,
        provider: providerName.trim() || undefined,
        assignedAgentId: selectedAgentId || undefined,
      });
      setIsLinkOpen(false);
      setPhoneNumber('');
      fetchData();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to link phone number.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSyncAccountLine = async () => {
    setSyncing(true);
    try {
      await phoneService.syncAccountPhone();
      await fetchData();
    } catch (err: any) {
      alert(`Sync failed: ${err?.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleBind = async (phoneId: string, agentId: string) => {
    await phoneService.bindNumberToAgent(phoneId, agentId || undefined);
    fetchData();
  };

  const handleDelete = async (phoneId: string) => {
    if (!confirm('Are you sure you want to unlink and remove this phone number?')) return;
    setDeletingId(phoneId);
    try {
      await phoneService.deletePhoneNumber(phoneId);
      await fetchData();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete phone number.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Telephony Lines & SIP Trunks"
        description="Manage caller ID numbers and SIP trunks connected to your voice infrastructure. Bind outbound lines to voice calling agents."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={handleSyncAccountLine}
              isLoading={syncing}
            >
              Sync Account Line
            </Button>
            <Button
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setErrorMessage(null);
                if (sarvamStatus) {
                  setConnectionId(sarvamStatus.connectionId || '');
                  setPhoneNumber(sarvamStatus.agentPhoneNumber || '');
                }
                setIsLinkOpen(true);
              }}
            >
              Link Phone Number
            </Button>
          </div>
        }
      />

      {/* Provider Notice */}
      <div className="p-4 rounded-lg bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-amber-400/20 text-amber-400 flex items-center justify-center shrink-0">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold block text-sm">Carrier SIP Trunk & Telephony DID Architecture</span>
            <span className="text-slate-300">
              Outbound calls route through registered Indian DID lines (e.g.{' '}
              <code className="text-amber-300 font-mono">+917965480599</code>) and Carrier connection ID{' '}
              <code className="text-amber-300 font-mono">{sarvamStatus?.connectionId?.slice(0, 16) || '7efd8897...'}...</code>.
            </span>
          </div>
        </div>
        <Badge variant="brand" size="sm">
          Telephony Active
        </Badge>
      </div>

      {loading ? (
        <LoadingState label="Fetching telephony phone numbers..." />
      ) : (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Phone Number</th>
                  <th className="px-5 py-3">Provider & Connection ID</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Assigned Agent</th>
                  <th className="px-5 py-3">Linked Date</th>
                  <th className="px-5 py-3 text-right">Binding & Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {numbers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                      No telephony numbers linked yet. Click "Sync Account Line" or "Link Phone Number" to get started.
                    </td>
                  </tr>
                ) : (
                  numbers.map(num => {
                    const assignedAg = agents.find(a => a.id === num.assignedAgentId);
                    return (
                      <tr key={num.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5 font-mono font-bold text-slate-900 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-base">🇮🇳</span>
                            <span>{num.phoneNumber}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-700">
                          <div>
                            <span className="font-semibold block">{num.provider}</span>
                            {num.providerId && (
                              <span className="font-mono text-[10px] text-slate-400 block truncate max-w-[200px]" title={num.providerId}>
                                Conn: {num.providerId}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge
                            variant={
                              num.status === 'active'
                                ? 'success'
                                : num.status === 'reserved'
                                ? 'warning'
                                : 'neutral'
                            }
                            dot
                          >
                            {num.status}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <Bot className="h-3.5 w-3.5 text-slate-400" />
                            <span className="font-semibold text-slate-800">
                              {assignedAg ? assignedAg.name : 'Unassigned'}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-slate-500">
                          {formatDate(num.createdAt)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-44">
                              <Select
                                value={num.assignedAgentId || ''}
                                options={[
                                  { value: '', label: 'Unassigned' },
                                  ...agents.map(a => ({ value: a.id, label: a.name })),
                                ]}
                                onChange={e => handleBind(num.id, e.target.value)}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDelete(num.id)}
                              disabled={deletingId === num.id}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                              title="Unlink Phone Number"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Link Telephony Phone Number Modal */}
      <Modal
        isOpen={isLinkOpen}
        onClose={() => setIsLinkOpen(false)}
        title="Link Telephony Carrier Line"
        description="Register an active outbound DID line or SIP trunk for voice calling campaigns."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsLinkOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleLinkNumber} isLoading={submitting}>
              Link Number
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {errorMessage && (
            <div className="p-2.5 rounded bg-rose-50 text-rose-700 text-xs border border-rose-200">
              {errorMessage}
            </div>
          )}

          <Input
            label="Phone Number (E.164 Format) *"
            placeholder="+917965480599"
            value={phoneNumber}
            onChange={e => setPhoneNumber(e.target.value)}
          />

          <Input
            label="Carrier Telephony Connection ID"
            placeholder="7efd8897-87-220da5aa-1d5e"
            value={connectionId}
            onChange={e => setConnectionId(e.target.value)}
          />

          <Input
            label="Provider Description"
            placeholder="Fluid Voice Carrier (SIP Trunk)"
            value={providerName}
            onChange={e => setProviderName(e.target.value)}
          />

          <Select
            label="Bind to Calling Agent (Optional)"
            value={selectedAgentId}
            options={[
              { value: '', label: 'Leave Unassigned for now' },
              ...agents.map(a => ({ value: a.id, label: a.name })),
            ]}
            onChange={e => setSelectedAgentId(e.target.value)}
          />

          <div className="flex items-center gap-2 p-2.5 rounded bg-slate-50 border border-slate-200 text-slate-600 text-[11px]">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              This number will be sent as the <code>agent_phone_number</code> in outbound carrier requests.
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
};
