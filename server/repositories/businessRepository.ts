import prisma from '../lib/prisma';
import { Business } from '../../src/types';

export class BusinessRepository {
  async getBusinessProfile(): Promise<Business | null> {
    const biz = await prisma.business.findFirst();
    if (!biz) return null;
    return {
      id: biz.id,
      name: biz.name,
      email: biz.email,
      plan: biz.plan,
      timezone: biz.timezone,
      createdAt: biz.createdAt.toISOString(),
    };
  }

  async updateBusinessProfile(id: string, updates: Partial<Business>): Promise<Business> {
    const updated = await prisma.business.update({
      where: { id },
      data: {
        ...(updates.name && { name: updates.name }),
        ...(updates.email && { email: updates.email }),
        ...(updates.plan && { plan: updates.plan }),
        ...(updates.timezone && { timezone: updates.timezone }),
      },
    });
    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      plan: updated.plan,
      timezone: updated.timezone,
      createdAt: updated.createdAt.toISOString(),
    };
  }
}

export const businessRepository = new BusinessRepository();

