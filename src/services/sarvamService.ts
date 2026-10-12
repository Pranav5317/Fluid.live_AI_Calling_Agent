import { apiClient } from './apiClient';
import { SarvamAccountStatus, SarvamAccountConfig } from '../types';

export interface SarvamConnectResponse {
  success: boolean;
  data: SarvamAccountStatus;
  testResult?: {
    success: boolean;
    latencyMs: number;
    message: string;
  };
  message: string;
}

export interface SarvamTestResponse {
  success: boolean;
  data: {
    success: boolean;
    latencyMs: number;
    message: string;
  };
}

class SarvamService {
  async getStatus(): Promise<SarvamAccountStatus> {
    return await apiClient.get<SarvamAccountStatus>('/sarvam/status');
  }

  async testConnection(config?: Partial<SarvamAccountConfig>): Promise<SarvamTestResponse['data']> {
    return await apiClient.post<SarvamTestResponse['data']>('/sarvam/test', config || {});
  }

  async connectAccount(config: SarvamAccountConfig): Promise<SarvamConnectResponse> {
    const res = await apiClient.post<any>('/sarvam/connect', config);
    return res;
  }
}

export const sarvamService = new SarvamService();

