import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Select } from '../../components/common/Select';
import { LoadingState } from '../../components/common/LoadingState';
import { phoneService } from '../../services/phoneService';
import { agentService } from '../../services/agentService';
import { PhoneNumber, Agent } from '../../types';
import { formatDate } from '../../lib/formatters';
import { Hash, Plus, Zap, Bot, CheckCircle } from 'lucide-react';

export const PhoneNumbersPage: React.FC = () => {
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isProvisionOpen, setIsProvisionOpen] = useState(false);
  const [areaCode, setAreaCode] = useState('800');
  const [provisioning, setProvisioning] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [numList, agList] = await Promise.all([
        phoneService.getPhoneNumbers(),
        agentService.getAgents(),
      ]);
      setNumbers(numList);
      setAgents(agList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleProvision = async () => {
    setProvisioning(true);
    try {
      await phoneService.provisionNumber(areaCode);
      setIsProvisionOpen(false);
      fetchData();
    } finally {
      setProvisioning(false);
    }
  };

  const handleBind = async (phoneId: string, agentId: string) => {
    await phoneService.bindNumberToAgent(phoneId, agentId || undefined);
    fetchData();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sarvam Phone Numbers"
        description="Provision outbound calling numbers through Sarvam voice infrastructure and bind numbers to agents."
        actions={
          <Button
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setIsProvisionOpen(true)}
          >
            Provision Phone Number
          </Button>
        }
      />

      {/* Provider Notice */}
      <div className="p-4 rounded-lg bg-slate-900 text-white flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <Zap className="h-5 w-5 text-amber-400 shrink-0" />
          <div>
            <span className="font-bold block text-sm">Sarvam Telephony Provider Abstraction</span>
            <span className="text-slate-300">
              Numbers are allocated via Sarvam API service wrapper. Live API secrets remain isolated on backend.
            </span>
          </div>
        </div>
        <Badge variant="brand" size="sm">
          Provider Ready
        </Badge>
      </div>

      {loading ? (
        <LoadingState label="Fetching provisioned phone numbers..." />
      ) : (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Phone Number</th>
                  <th className="px-5 py-3">Provider</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Assigned Agent</th>
                  <th className="px-5 py-3">Provisioned Date</th>
                  <th className="px-5 py-3 text-right">Binding Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {numbers.map(num => {
                  const assignedAg = agents.find(a => a.id === num.assignedAgentId);
                  return (
                    <tr key={num.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-900 text-sm">
                        {num.phoneNumber}
                      </td>
                      <td className="px-5 py-3.5 text-slate-700">{num.provider}</td>
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
                        <div className="w-48 ml-auto">
                          <Select
                            value={num.assignedAgentId || ''}
                            options={[
                              { value: '', label: 'Unassigned' },
                              ...agents.map(a => ({ value: a.id, label: a.name })),
                            ]}
                            onChange={e => handleBind(num.id, e.target.value)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Provision Number Modal */}
      <Modal
        isOpen={isProvisionOpen}
        onClose={() => setIsProvisionOpen(false)}
        title="Provision Sarvam Phone Number"
        description="Select area code to allocate a new dedicated outbound calling number."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsProvisionOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleProvision} isLoading={provisioning}>
              Provision Dedicated Number
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Preferred Area Code Prefix"
            value={areaCode}
            options={[
              { value: '800', label: '+1 (800) Toll-Free Dedicated' },
              { value: '888', label: '+1 (888) Toll-Free Enterprise' },
              { value: '415', label: '+1 (415) San Francisco, CA' },
              { value: '212', label: '+1 (212) New York, NY' },
            ]}
            onChange={e => setAreaCode(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
};

