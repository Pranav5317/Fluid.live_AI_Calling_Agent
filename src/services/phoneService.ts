import { PhoneNumber } from '../types';
import { apiClient } from './apiClient';

export interface IPhoneService {
  getPhoneNumbers(): Promise<PhoneNumber[]>;
  provisionNumber(areaCode?: string): Promise<PhoneNumber>;
  bindNumberToAgent(phoneId: string, agentId?: string): Promise<PhoneNumber>;
}

class PhoneService implements IPhoneService {
  async getPhoneNumbers(): Promise<PhoneNumber[]> {
    return await apiClient.get<PhoneNumber[]>('/phone-numbers');
  }

  async provisionNumber(areaCode = '800'): Promise<PhoneNumber> {
    return await apiClient.post<PhoneNumber>('/phone-numbers', { areaCode });
  }

  async bindNumberToAgent(phoneId: string, agentId?: string): Promise<PhoneNumber> {
    return await apiClient.patch<PhoneNumber>(`/phone-numbers/${phoneId}`, { assignedAgentId: agentId });
  }
}

export const phoneService = new PhoneService();
