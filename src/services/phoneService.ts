import { PhoneNumber } from '../types';
import { apiClient } from './apiClient';

export interface AddPhoneNumberDTO {
  phoneNumber: string;
  connectionId?: string;
  provider?: string;
  assignedAgentId?: string;
}

export interface IPhoneService {
  getPhoneNumbers(): Promise<PhoneNumber[]>;
  addPhoneNumber(data: AddPhoneNumberDTO): Promise<PhoneNumber>;
  syncAccountPhone(): Promise<PhoneNumber>;
  bindNumberToAgent(phoneId: string, agentId?: string): Promise<PhoneNumber>;
  deletePhoneNumber(phoneId: string): Promise<void>;
  provisionNumber(areaCode?: string): Promise<PhoneNumber>;
}

class PhoneService implements IPhoneService {
  async getPhoneNumbers(): Promise<PhoneNumber[]> {
    return await apiClient.get<PhoneNumber[]>('/phone-numbers');
  }

  async addPhoneNumber(data: AddPhoneNumberDTO): Promise<PhoneNumber> {
    return await apiClient.post<PhoneNumber>('/phone-numbers', data);
  }

  async syncAccountPhone(): Promise<PhoneNumber> {
    return await apiClient.post<PhoneNumber>('/phone-numbers/sync', {});
  }

  async bindNumberToAgent(phoneId: string, agentId?: string): Promise<PhoneNumber> {
    return await apiClient.patch<PhoneNumber>(`/phone-numbers/${phoneId}`, { assignedAgentId: agentId });
  }

  async deletePhoneNumber(phoneId: string): Promise<void> {
    await apiClient.delete(`/phone-numbers/${phoneId}`);
  }

  async provisionNumber(areaCode = '800'): Promise<PhoneNumber> {
    return await apiClient.post<PhoneNumber>('/phone-numbers', { areaCode });
  }
}

export const phoneService = new PhoneService();
