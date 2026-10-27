import { Router } from 'express';
import { serverCampaignService } from '../services/campaignService';
import { callSchedulerService } from '../services/callSchedulerService';

export const campaignRoutes = Router();

// --- AUTONOMOUS DYNAMIC CALL SCHEDULER & DISPATCH ENGINE ROUTES ---
// GET /api/campaigns/scheduler/status
campaignRoutes.get('/scheduler/status', async (req, res) => {
  try {
    const status = await callSchedulerService.getSchedulerStatus();
    res.json({ success: true, data: status, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

// POST & GET /api/campaigns/scheduler/tick (Supports both manual trigger and Vercel Cron)
const handleSchedulerTick = async (req: any, res: any) => {
  try {
    const options = { ...(req.body || {}), ...(req.query?.forceIgnoreWindow ? { forceIgnoreWindow: req.query.forceIgnoreWindow === 'true' } : {}) };
    const result = await callSchedulerService.runSchedulerTick(options);
    res.json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
};
campaignRoutes.post('/scheduler/tick', handleSchedulerTick);
campaignRoutes.get('/scheduler/tick', handleSchedulerTick);

// --- FEATURE 3: CADENCE & RETRY ENGINE ROUTES (Placed before /:id) ---
// GET /api/campaigns/retries/queue
campaignRoutes.get('/retries/queue', async (req, res) => {
  try {
    const queue = await serverCampaignService.getRetryQueue(req.query.campaignId as string);
    res.json({ success: true, data: queue, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

// POST /api/campaigns/retries/process-due
campaignRoutes.post('/retries/process-due', async (req, res) => {
  try {
    const result = await serverCampaignService.processDueRetries(req.body?.campaignId);
    res.json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

// POST /api/campaigns/retries/:id/execute-now
campaignRoutes.post('/retries/:id/execute-now', async (req, res) => {
  try {
    const result = await serverCampaignService.executeRetryNow(req.params.id);
    res.json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

// GET /api/campaigns
campaignRoutes.get('/', async (req, res) => {
  try {
    const { search, status } = req.query;
    const campaigns = await serverCampaignService.getCampaigns(search as string, status as string);
    res.json({ success: true, data: campaigns, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

// GET /api/campaigns/:id
campaignRoutes.get('/:id', async (req, res) => {
  try {
    const campaign = await serverCampaignService.getCampaignById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found', timestamp: new Date().toISOString() });
    }
    res.json({ success: true, data: campaign, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

// POST /api/campaigns
campaignRoutes.post('/', async (req, res) => {
  try {
    const campaign = await serverCampaignService.createCampaign(req.body);
    res.status(201).json({ success: true, data: campaign, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

// POST /api/campaigns/:id/start
campaignRoutes.post('/:id/start', async (req, res) => {
  try {
    const campaign = await serverCampaignService.startCampaign(req.params.id);
    res.json({ success: true, data: campaign, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

// POST /api/campaigns/:id/pause
campaignRoutes.post('/:id/pause', async (req, res) => {
  try {
    const campaign = await serverCampaignService.pauseCampaign(req.params.id);
    res.json({ success: true, data: campaign, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

// POST /api/campaigns/:id/resume
campaignRoutes.post('/:id/resume', async (req, res) => {
  try {
    const campaign = await serverCampaignService.resumeCampaign(req.params.id);
    res.json({ success: true, data: campaign, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

// POST /api/campaigns/:id/stop
campaignRoutes.post('/:id/stop', async (req, res) => {
  try {
    const campaign = await serverCampaignService.stopCampaign(req.params.id);
    res.json({ success: true, data: campaign, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

// --- FEATURE 2: BATCH DIALER & EXECUTION MONITOR ROUTES ---
// POST /api/campaigns/:id/dial-batch
campaignRoutes.post('/:id/dial-batch', async (req, res) => {
  try {
    const result = await serverCampaignService.dialBatch(req.params.id, req.body);
    res.json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

// GET /api/campaigns/:id/monitor
campaignRoutes.get('/:id/monitor', async (req, res) => {
  try {
    const monitor = await serverCampaignService.getExecutionMonitor(req.params.id);
    res.json({ success: true, data: monitor, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

