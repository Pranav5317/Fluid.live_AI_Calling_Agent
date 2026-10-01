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
      assignedAgentId: n.assignedAgentId || undefined,
      assignedCampaignId: n.assignedCampaignId || undefined,
      createdAt: n.createdAt.toISOString(),
    }));
  }

  async provisionNumber(areaCode = '800'): Promise<PhoneNumber> {
    const res = await backendSarvamProvider.provisionNumber(areaCode);
    const created = await prisma.phoneNumber.create({
      data: {
        phoneNumber: res.phoneNumber,
        status: 'unassigned',
        provider: backendSarvamProvider.providerName,
        providerId: res.providerId,
      },
    });

    return {
      id: created.id,
      phoneNumber: created.phoneNumber,
      status: created.status as any,
      provider: created.provider,
      createdAt: created.createdAt.toISOString(),
    };
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
      assignedAgentId: updated.assignedAgentId || undefined,
      createdAt: updated.createdAt.toISOString(),
    };
  }
}

export const phoneRepository = new PhoneRepository();

