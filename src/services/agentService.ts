import { Agent, AgentVersion, AgentConfig } from '../types';
import { apiClient } from './apiClient';

export interface CreateAgentDTO {
  name: string;
  useCase: string;
  config: AgentConfig;
}

export interface IAgentService {
  getAgents(): Promise<Agent[]>;
  getAgentById(id: string): Promise<{ agent: Agent; currentVersion: AgentVersion; allVersions: AgentVersion[] } | undefined>;
  createAgent(dto: CreateAgentDTO): Promise<Agent>;
  updateAgent(id: string, updates: Partial<Pick<Agent, 'name' | 'useCase'>> & { config?: AgentConfig; versionNotes?: string }): Promise<Agent>;
  toggleAgentStatus(id: string): Promise<Agent>;
  duplicateAgent(id: string): Promise<Agent>;
}

class AgentService implements IAgentService {
  async getAgents(): Promise<Agent[]> {
    return await apiClient.get<Agent[]>('/agents');
  }

  async getAgentById(id: string) {
    return await apiClient.get<{ agent: Agent; currentVersion: AgentVersion; allVersions: AgentVersion[] }>(`/agents/${id}`);
  }

  async createAgent(dto: CreateAgentDTO): Promise<Agent> {
    return await apiClient.post<Agent>('/agents', dto);
  }

  async updateAgent(
    id: string,
    updates: Partial<Pick<Agent, 'name' | 'useCase'>> & { config?: AgentConfig; versionNotes?: string }
  ): Promise<Agent> {
    if (updates.config) {
      await apiClient.post<AgentVersion>(`/agents/${id}/versions`, {
        config: updates.config,
        notes: updates.versionNotes,
      });
    }
    const res = await apiClient.get<{ agent: Agent; currentVersion: AgentVersion; allVersions: AgentVersion[] }>(`/agents/${id}`);
    return res.agent;
  }

  async toggleAgentStatus(id: string): Promise<Agent> {
    return await apiClient.post<Agent>(`/agents/${id}/activate`);
  }

  async duplicateAgent(id: string): Promise<Agent> {
    const existing = await this.getAgentById(id);
    if (!existing) throw new Error(`Agent not found: ${id}`);

    return this.createAgent({
      name: `${existing.agent.name} (Copy)`,
      useCase: existing.agent.useCase,
      config: JSON.parse(JSON.stringify(existing.currentVersion.config)),
    });
  }
}

export const agentService = new AgentService();
