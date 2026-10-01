import { Call } from '../../src/types';
import { callRepository, CallFilterParams } from '../repositories/callRepository';

export class ServerCallService {
  async getCalls(options: CallFilterParams = {}): Promise<Call[]> {
    return callRepository.getCalls(options);
  }

  async getCallById(id: string): Promise<Call | null> {
    return callRepository.getCallById(id);
  }
}

export const serverCallService = new ServerCallService();
