import { Router } from 'express';
import { serverBillingService } from '../services/billingService';

export const billingRoutes = Router();

// GET /api/usage
billingRoutes.get('/usage', async (req, res) => {
  try {
    const { campaignId } = req.query;
    const events = await serverBillingService.getUsageEvents(campaignId as string);
    res.json({ success: true, data: events, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

// GET /api/billing/current
billingRoutes.get('/billing/current', async (req, res) => {
  try {
    const current = await serverBillingService.getCurrentBillingPeriod();
    res.json({ success: true, data: current, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

// GET /api/billing/history
billingRoutes.get('/billing/history', async (req, res) => {
  try {
    const history = await serverBillingService.getBillingHistory();
    res.json({ success: true, data: history, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

