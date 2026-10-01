import { businessRepository } from '../repositories/businessRepository';
import { Business } from '../../src/types';

export class ServerBusinessService {
  async getBusinessProfile(): Promise<Business | null> {
    return await businessRepository.getBusinessProfile();
  }

  async updateBusinessProfile(id: string, updates: Partial<Business>): Promise<Business> {
    return await businessRepository.updateBusinessProfile(id, updates);
  }
}

export const serverBusinessService = new ServerBusinessService();

