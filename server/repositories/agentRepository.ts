import prisma from '../lib/prisma';
import { Agent, AgentVersion, AgentConfig } from '../../src/types';

export class AgentRepository {
  async getAgents(): Promise<Agent[]> {
    const list = await prisma.agent.findMany({
      include: { campaigns: true },
      orderBy: { createdAt: 'desc' },
    });
    return list.map((a: any) => ({
      id: a.id,
      name: a.name,
      useCase: a.useCase,
      status: a.status as any,
      currentVersionId: a.currentVersionId,
      campaignsCount: a.campaigns.length,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    }));
  }

  async getAgentById(id: string) {
    const a = await prisma.agent.findUnique({
      where: { id },
      include: { versions: { orderBy: { versionNumber: 'asc' } } },
    });
    if (!a) return null;

    const allVersions: AgentVersion[] = a.versions.map((v: any) => ({
      id: v.id,
      agentId: v.agentId,
      versionNumber: v.versionNumber,
      notes: v.notes || undefined,
      config: v.config as AgentConfig,
      createdAt: v.createdAt.toISOString(),
    }));

    const currentVersion = allVersions.find((v: AgentVersion) => v.id === a.currentVersionId) || allVersions[allVersions.length - 1];

    return {
      agent: {
        id: a.id,
        name: a.name,
        useCase: a.useCase,
        status: a.status as any,
        currentVersionId: a.currentVersionId,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      },
      currentVersion,
      allVersions,
    };
  }

  async getAgentVersions(agentId: string): Promise<AgentVersion[]> {
    const list = await prisma.agentVersion.findMany({
      where: { agentId },
      orderBy: { versionNumber: 'asc' },
    });
    return list.map((v: any) => ({
      id: v.id,
      agentId: v.agentId,
      versionNumber: v.versionNumber,
      notes: v.notes || undefined,
      config: v.config as AgentConfig,
      createdAt: v.createdAt.toISOString(),
    }));
  }

  async createAgent(name: string, useCase: string, config: AgentConfig): Promise<Agent> {
    const versionId = `agv_${Date.now()}_v1`;

    return await prisma.$transaction(async (tx: any) => {
      const agent = await tx.agent.create({
        data: {
          name,
          useCase,
          status: 'active',
          currentVersionId: versionId,
        },
      });

      await tx.agentVersion.create({
        data: {
          id: versionId,
          agentId: agent.id,
          versionNumber: 1,
          notes: 'Initial Agent Version Creation',
          config: config as any,
        },
      });

      return {
        id: agent.id,
        name: agent.name,
        useCase: agent.useCase,
        status: agent.status as any,
        currentVersionId: versionId,
        campaignsCount: 0,
        createdAt: agent.createdAt.toISOString(),
        updatedAt: agent.updatedAt.toISOString(),
      };
    });
  }

  async createAgentVersion(agentId: string, config: AgentConfig, notes?: string): Promise<AgentVersion> {
    return await prisma.$transaction(async (tx: any) => {
      const existingVers = await tx.agentVersion.findMany({ where: { agentId } });
      const newVersionNum = existingVers.length + 1;
      const newVersionId = `agv_${agentId}_v${newVersionNum}`;

      const newVer = await tx.agentVersion.create({
        data: {
          id: newVersionId,
          agentId,
          versionNumber: newVersionNum,
          notes: notes || `Published version ${newVersionNum}`,
          config: config as any,
        },
      });

      await tx.agent.update({
        where: { id: agentId },
        data: {
          currentVersionId: newVersionId,
        },
      });

      return {
        id: newVer.id,
        agentId: newVer.agentId,
        versionNumber: newVer.versionNumber,
        notes: newVer.notes || undefined,
        config: newVer.config as AgentConfig,
        createdAt: newVer.createdAt.toISOString(),
      };
    });
  }

  async toggleAgentStatus(id: string): Promise<Agent> {
    const current = await prisma.agent.findUnique({ where: { id } });
    if (!current) throw new Error(`Agent not found: ${id}`);

    const updated = await prisma.agent.update({
      where: { id },
      data: {
        status: current.status === 'active' ? 'inactive' : 'active',
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      useCase: updated.useCase,
      status: updated.status as any,
      currentVersionId: updated.currentVersionId,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}

export const agentRepository = new AgentRepository();
