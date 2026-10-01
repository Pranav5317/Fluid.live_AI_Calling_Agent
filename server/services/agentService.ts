import { Agent, AgentVersion, AgentConfig } from '../../src/types';
import { agentRepository } from '../repositories/agentRepository';
import { backendSarvamProvider } from './sarvamProvider';

export class ServerAgentService {
  async getAgents(): Promise<Agent[]> {
    return agentRepository.getAgents();
  }

  async getAgentById(id: string) {
    return agentRepository.getAgentById(id);
  }

  async getAgentVersions(agentId: string): Promise<AgentVersion[]> {
    return agentRepository.getAgentVersions(agentId);
  }

  async createAgent(name: string, useCase: string, config: AgentConfig): Promise<Agent> {
    const created = await agentRepository.createAgent(name, useCase, config);
    await backendSarvamProvider.syncAgentConfig(created.id, created.currentVersionId, config);
    return created;
  }

  async createAgentVersion(agentId: string, config: AgentConfig, notes?: string): Promise<AgentVersion> {
    const createdVer = await agentRepository.createAgentVersion(agentId, config, notes);
    await backendSarvamProvider.syncAgentConfig(agentId, createdVer.id, config);
    return createdVer;
  }

  async toggleAgentStatus(id: string): Promise<Agent> {
    return agentRepository.toggleAgentStatus(id);
  }
}

export const serverAgentService = new ServerAgentService();
