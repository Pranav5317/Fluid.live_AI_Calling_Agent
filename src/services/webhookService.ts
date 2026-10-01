import { WebhookEvent } from '../types';
import { apiClient } from './apiClient';

export interface IWebhookService {
  getWebhookEvents(): Promise<WebhookEvent[]>;
  reprocessEvent(eventId: string): Promise<WebhookEvent>;
}

class WebhookService implements IWebhookService {
  async getWebhookEvents(): Promise<WebhookEvent[]> {
    return await apiClient.get<WebhookEvent[]>('/webhooks');
  }

  async reprocessEvent(eventId: string): Promise<WebhookEvent> {
    return await apiClient.post<WebhookEvent>(`/webhooks/${eventId}/reprocess`);
  }
}

export const webhookService = new WebhookService();
