import { WebhookEvent } from '../../src/types';
import { webhookRepository } from '../repositories/webhookRepository';
import { SarvamWebhookPayload, WebhookProcessingResult } from '../contracts/apiContracts';

export class ServerWebhookService {
  async getWebhookEvents(): Promise<WebhookEvent[]> {
    return webhookRepository.getWebhookEvents();
  }

  async processSarvamWebhook(payload: SarvamWebhookPayload): Promise<WebhookProcessingResult> {
    return webhookRepository.processSarvamWebhook(payload);
  }

  async reprocessEvent(eventId: string): Promise<WebhookEvent> {
    return webhookRepository.reprocessEvent(eventId);
  }
}

export const serverWebhookService = new ServerWebhookService();
