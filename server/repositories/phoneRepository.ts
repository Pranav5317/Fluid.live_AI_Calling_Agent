import prisma from '../lib/prisma';
import { PhoneNumber } from '../../src/types';
import { backendSarvamProvider } from '../services/sarvamProvider';

export class PhoneRepository {
  async getPhoneNumbers(): Promise<PhoneNumber[]> {
    const list = await prisma.phoneNumber.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return list.map(n => ({
      id: n.id,
      phoneNumber: n.phoneNumber,
      status: n.status as any,
      provider: n.provider,
      providerId: n.providerId || undefined,
      assignedAgentId: n.assignedAgentId || undefined,
      assignedCampaignId: n.assignedCampaignId || undefined,
      createdAt: n.createdAt.toISOString(),
    }));
  }

  /**
   * Adds or links a real Sarvam Telephony line (e.g. +917965480599 with SIP Connection ID).
   */
  async addPhoneNumber(data: {
    phoneNumber: string;
    connectionId?: string;
    provider?: string;
    assignedAgentId?: string;
  }): Promise<PhoneNumber> {
    let cleanPhone = data.phoneNumber.trim().replace(/[\s\-\(\)]/g, '');
    if (!cleanPhone.startsWith('+')) {
      cleanPhone = `+${cleanPhone}`;
    }

    const providerId = data.connectionId?.trim() || backendSarvamProvider.getConnectionId();
    const providerName = data.provider?.trim() || 'Sarvam AI Telephony (SIP Trunk)';
    const status = data.assignedAgentId ? 'active' : 'unassigned';

    const existing = await prisma.phoneNumber.findUnique({
      where: { phoneNumber: cleanPhone },
    });

    let record;
    if (existing) {
      record = await prisma.phoneNumber.update({
        where: { id: existing.id },
        data: {
          provider: providerName,
          providerId,
          assignedAgentId: data.assignedAgentId || existing.assignedAgentId,
          status: data.assignedAgentId ? 'active' : existing.status,
        },
      });
    } else {
      record = await prisma.phoneNumber.create({
        data: {
          phoneNumber: cleanPhone,
          status,
          provider: providerName,
          providerId,
          assignedAgentId: data.assignedAgentId || null,
        },
      });
    }

    return {
      id: record.id,
      phoneNumber: record.phoneNumber,
      status: record.status as any,
      provider: record.provider,
      providerId: record.providerId || undefined,
      assignedAgentId: record.assignedAgentId || undefined,
      createdAt: record.createdAt.toISOString(),
    };
  }

  /**
   * Automatically synchronizes the active Sarvam Telephony line configured on the account.
   */
  async syncSarvamPhoneNumber(): Promise<PhoneNumber> {
    const activeNumber = backendSarvamProvider.getAgentPhoneNumber();
    const activeConnectionId = backendSarvamProvider.getConnectionId();

    // Check if an agent is available to bind if unassigned
    const primaryAgent = await prisma.agent.findFirst({
      where: { status: 'active' },
      orderBy: { createdAt: 'asc' },
    });

    return this.addPhoneNumber({
      phoneNumber: activeNumber,
      connectionId: activeConnectionId,
      provider: 'Sarvam AI Telephony (SIP Trunk)',
      assignedAgentId: primaryAgent?.id,
    });
  }

  /**
   * Unlinks and deletes a phone number from the registry.
   */
  async deletePhoneNumber(id: string): Promise<boolean> {
    // Check if the number is locked by an active/running campaign
    const runningCampaign = await prisma.campaign.findFirst({
      where: { phoneNumberId: id, status: 'running' },
    });

    if (runningCampaign) {
      throw new Error(`Cannot delete phone number: It is currently locked by active campaign "${runningCampaign.name}".`);
    }

    await prisma.phoneNumber.delete({
      where: { id },
    });

    return true;
  }

  async bindNumberToAgent(phoneId: string, agentId?: string): Promise<PhoneNumber> {
    const updated = await prisma.phoneNumber.update({
      where: { id: phoneId },
      data: {
        assignedAgentId: agentId || null,
        status: agentId ? 'active' : 'unassigned',
      },
    });

    return {
      id: updated.id,
      phoneNumber: updated.phoneNumber,
      status: updated.status as any,
      provider: updated.provider,
      providerId: updated.providerId || undefined,
      assignedAgentId: updated.assignedAgentId || undefined,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  // Deprecated shim for backward compatibility
  async provisionNumber(areaCode = '800'): Promise<PhoneNumber> {
    return this.syncSarvamPhoneNumber();
  }
}

export const phoneRepository = new PhoneRepository();
