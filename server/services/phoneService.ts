import { PhoneNumber } from '../../src/types';
import { phoneRepository } from '../repositories/phoneRepository';

export class ServerPhoneService {
  async getPhoneNumbers(): Promise<PhoneNumber[]> {
    return phoneRepository.getPhoneNumbers();
  }

  async provisionNumber(areaCode = '800'): Promise<PhoneNumber> {
    return phoneRepository.provisionNumber(areaCode);
  }

  async bindNumberToAgent(phoneId: string, agentId?: string): Promise<PhoneNumber> {
    return phoneRepository.bindNumberToAgent(phoneId, agentId);
  }
}

export const serverPhoneService = new ServerPhoneService();
