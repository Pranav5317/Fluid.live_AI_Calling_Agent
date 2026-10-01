import { Router } from 'express';
import { serverCallService } from '../services/callService';

export const callRoutes = Router();

// GET /api/calls
callRoutes.get('/', async (req, res) => {
  try {
    const { search, status, outcome, campaignId, agentId } = req.query;
    const calls = await serverCallService.getCalls({
      search: search as string,
      status: status as string,
      outcome: outcome as string,
      campaignId: campaignId as string,
      agentId: agentId as string,
    });
    res.json({ success: true, data: calls, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

// POST /api/calls/test (Server-authorized outbound test call)
callRoutes.post('/test', async (req, res) => {
  try {
    const call = await serverCallService.initiateTestCall(req.body);
    res.status(201).json({ success: true, data: call, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message || 'Test call initiation failed', timestamp: new Date().toISOString() });
  }
});

// GET /api/calls/:id
callRoutes.get('/:id', async (req, res) => {
  try {
    const call = await serverCallService.getCallById(req.params.id);
    if (!call) {
      return res.status(404).json({ success: false, error: 'Call record not found', timestamp: new Date().toISOString() });
    }
    res.json({ success: true, data: call, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});
