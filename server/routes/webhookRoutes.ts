import { Router } from 'express';
import { serverWebhookService } from '../services/webhookService';

export const webhookRoutes = Router();

// GET /api/webhooks
webhookRoutes.get('/', async (req, res) => {
  try {
    const events = await serverWebhookService.getWebhookEvents();
    res.json({ success: true, data: events, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

// POST /api/webhooks/sarvam (Sarvam Webhook Listener Endpoint)
webhookRoutes.post('/sarvam', async (req, res) => {
  try {
    const result = await serverWebhookService.processSarvamWebhook(req.body);
    res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err?.message || 'Webhook processing failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/webhooks/:id/reprocess
webhookRoutes.post('/:id/reprocess', async (req, res) => {
  try {
    const reprocessed = await serverWebhookService.reprocessEvent(req.params.id);
    res.json({ success: true, data: reprocessed, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

