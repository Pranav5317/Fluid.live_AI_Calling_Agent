import { PhoneNumber } from '../../src/types';
import { phoneRepository } from '../repositories/phoneRepository';

export class ServerPhoneService {
  async getPhoneNumbers(): Promise<PhoneNumber[]> {
    return phoneRepository.getPhoneNumbers();
  }

  async addPhoneNumber(data: {
    phoneNumber: string;
    connectionId?: string;
    provider?: string;
    assignedAgentId?: string;
  }): Promise<PhoneNumber> {
    return phoneRepository.addPhoneNumber(data);
  }

  async syncSarvamPhoneNumber(): Promise<PhoneNumber> {
    return phoneRepository.syncSarvamPhoneNumber();
  }

  async deletePhoneNumber(id: string): Promise<boolean> {
    return phoneRepository.deletePhoneNumber(id);
  }

  async bindNumberToAgent(phoneId: string, agentId?: string): Promise<PhoneNumber> {
    return phoneRepository.bindNumberToAgent(phoneId, agentId);
  }

  async provisionNumber(areaCode = '800'): Promise<PhoneNumber> {
    return phoneRepository.provisionNumber(areaCode);
  }
}

export const serverPhoneService = new ServerPhoneService();
