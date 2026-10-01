import { Router } from 'express';
import { serverCampaignService } from '../services/campaignService';

export const campaignRoutes = Router();

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

