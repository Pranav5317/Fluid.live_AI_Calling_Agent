import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { agentService } from '../../services/agentService';
import { Agent } from '../../types';
import { AgentBuilderModal } from './AgentBuilderModal';
import { AgentTestCallModal } from './AgentTestCallModal';
import { formatDate } from '../../lib/formatters';
import {
  Bot,
  Plus,
  Edit2,
  Copy,
  Power,
  Megaphone,
  History,
  Mic,
  Languages,
  PhoneCall,
  Trash2,
} from 'lucide-react';

export const AgentsPage: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [editingInitialData, setEditingInitialData] = useState<any>(undefined);
  const [testCallAgent, setTestCallAgent] = useState<Agent | null>(null);

  // Delete & Duplicate State
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const list = await agentService.getAgents();
      setAgents(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleCreateNew = () => {
    setEditingAgentId(null);
    setEditingInitialData(undefined);
    setIsBuilderOpen(true);
  };

  const handleEdit = async (agent: Agent) => {
    const details = await agentService.getAgentById(agent.id);
    if (!details) return;

    setEditingAgentId(agent.id);
    setEditingInitialData({
      name: agent.name,
      useCase: agent.useCase,
      config: details.currentVersion.config,
    });
    setIsBuilderOpen(true);
  };

  const handleSaveAgent = async (agentData: { name: string; useCase: string; config: any }) => {
    if (editingAgentId) {
      await agentService.updateAgent(editingAgentId, {
        name: agentData.name,
        useCase: agentData.useCase,
        config: agentData.config,
      });
    } else {
      await agentService.createAgent(agentData);
    }
    fetchAgents();
  };

  const handleToggleStatus = async (id: string) => {
    await agentService.toggleAgentStatus(id);
    fetchAgents();
  };

  const handleDuplicate = async (id: string) => {
    if (duplicatingId) return;
    setDuplicatingId(id);
    try {
      await agentService.duplicateAgent(id);
      await fetchAgents();
    } catch (err: any) {
      console.error('Failed to duplicate agent:', err);
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!agentToDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await agentService.deleteAgent(agentToDelete.id);
      setAgentToDelete(null);
      await fetchAgents();
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete agent. Please check active campaigns.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Calling Agents Workspace"
        description="Configure voice models, conversational prompts, call flows, extracted variables, and version histories."
        actions={
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={handleCreateNew}>
            Create Calling Agent
          </Button>
        }
      />

      {loading ? (
        <LoadingState label="Loading calling agents inventory..." />
      ) : agents.length === 0 ? (
        <EmptyState
          title="No calling agents configured"
          description="Build your first conversational AI agent to handle automated phone outreach."
          actionLabel="Build Calling Agent"
          onAction={handleCreateNew}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agents.map(ag => (
            <Card key={ag.id} className="flex flex-col justify-between hover:border-slate-300 transition-all">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white font-bold">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 leading-snug">{ag.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{ag.useCase}</p>
                    </div>
                  </div>
                  <Badge variant={ag.status === 'active' ? 'success' : 'neutral'} dot>
                    {ag.status}
                  </Badge>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5 text-slate-400" />
                    <span>Version: <strong className="text-slate-800 font-mono">{ag.currentVersionId}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Megaphone className="h-3.5 w-3.5 text-slate-400" />
                    <span>Active Campaigns: <strong className="text-slate-800">{ag.campaignsCount || 0}</strong></span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">Updated {formatDate(ag.updatedAt)}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(ag.id)}
                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
                    title={ag.status === 'active' ? 'Deactivate Agent' : 'Activate Agent'}
                  >
                    <Power className={`h-4 w-4 ${ag.status === 'active' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicate(ag.id)}
                    disabled={duplicatingId === ag.id}
                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded disabled:opacity-50"
                    title="Duplicate Agent"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError(null);
                      setAgentToDelete(ag);
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                    title="Delete Agent"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    leftIcon={<PhoneCall className="h-3.5 w-3.5 text-emerald-600" />}
                    onClick={() => setTestCallAgent(ag)}
                  >
                    Test Call
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Edit2 className="h-3.5 w-3.5" />}
                    onClick={() => handleEdit(ag)}
                  >
                    Configure
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Agent Builder Modal */}
      {isBuilderOpen && (
        <AgentBuilderModal
          isOpen={isBuilderOpen}
          onClose={() => setIsBuilderOpen(false)}
          onSave={handleSaveAgent}
          initialData={editingInitialData}
        />
      )}

      {/* Live Phone Testing Modal */}
      {testCallAgent && (
        <AgentTestCallModal
          agent={testCallAgent}
          isOpen={!!testCallAgent}
          onClose={() => setTestCallAgent(null)}
        />
      )}

      {/* Delete Agent Confirmation Modal */}
      {agentToDelete && (
        <Modal
          isOpen={!!agentToDelete}
          onClose={() => !deleting && setAgentToDelete(null)}
          title="Delete Calling Agent"
          size="sm"
          footer={
            <div className="flex justify-end gap-2 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAgentToDelete(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                onClick={handleConfirmDelete}
                isLoading={deleting}
              >
                Delete Agent
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            <p className="text-sm text-slate-700">
              Are you sure you want to delete <strong className="text-slate-900">{agentToDelete.name}</strong>?
            </p>
            {deleteError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {deleteError}
              </div>
            )}
            <p className="text-xs text-slate-500">
              This action permanently removes this agent and its version history. Active campaigns linked to this agent must be archived or reassigned first.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};

