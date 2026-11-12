import { Business } from '../types';
import { apiClient } from './apiClient';

export interface IBusinessService {
  getBusinessProfile(): Promise<Business>;
  updateBusinessProfile(id: string, updates: Partial<Business>): Promise<Business>;
}

class BusinessService implements IBusinessService {
  async getBusinessProfile(): Promise<Business> {
    return await apiClient.get<Business>('/business');
  }

  async updateBusinessProfile(id: string, updates: Partial<Business>): Promise<Business> {
    return await apiClient.patch<Business>(`/business/${id}`, updates);
  }
}

export const businessService = new BusinessService();
