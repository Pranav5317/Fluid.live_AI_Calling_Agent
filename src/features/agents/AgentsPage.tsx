import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { agentService } from '../../services/agentService';
import { knowledgeService } from '../../services/knowledgeService';
import { Agent, KnowledgeBase } from '../../types';
import { AgentBuilderModal } from './AgentBuilderModal';
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
} from 'lucide-react';

export const AgentsPage: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [editingInitialData, setEditingInitialData] = useState<any>(undefined);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const [list, kbList] = await Promise.all([
        agentService.getAgents(),
        knowledgeService.getKnowledgeBases(),
      ]);
      setAgents(list);
      setKnowledgeBases(kbList);
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
    await agentService.duplicateAgent(id);
    fetchAgents();
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
                <div className="flex items-center gap-1">
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
                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
                    title="Duplicate Agent"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Edit2 className="h-3.5 w-3.5" />}
                    onClick={() => handleEdit(ag)}
                  >
                    Configure Agent
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
          knowledgeBases={knowledgeBases}
        />
      )}
    </div>
  );
};

