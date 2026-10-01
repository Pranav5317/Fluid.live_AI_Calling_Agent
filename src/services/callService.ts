import { Call, CallStatus, CallOutcome } from '../types';
import { apiClient } from './apiClient';

export interface CallFilterOptions {
  search?: string;
  status?: CallStatus | 'all';
  outcome?: CallOutcome | 'all';
  campaignId?: string | 'all';
  agentId?: string | 'all';
}

export interface ICallService {
  getCalls(options?: CallFilterOptions): Promise<Call[]>;
  getCallById(id: string): Promise<Call | undefined>;
}

class CallService implements ICallService {
  async getCalls(options: CallFilterOptions = {}): Promise<Call[]> {
    const query = new URLSearchParams();
    if (options.search) query.append('search', options.search);
    if (options.status) query.append('status', options.status);
    if (options.outcome) query.append('outcome', options.outcome);
    if (options.campaignId) query.append('campaignId', options.campaignId);
    if (options.agentId) query.append('agentId', options.agentId);
    return await apiClient.get<Call[]>(`/calls?${query.toString()}`);
  }

  async getCallById(id: string): Promise<Call | undefined> {
    return await apiClient.get<Call>(`/calls/${id}`);
  }
}

export const callService = new CallService();
