import { Router } from 'express';
import { serverAgentService } from '../services/agentService';

export const agentRoutes = Router();

// GET /api/agents
agentRoutes.get('/', async (req, res) => {
  try {
    const agents = await serverAgentService.getAgents();
    res.json({ success: true, data: agents, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

// GET /api/agents/:id
agentRoutes.get('/:id', async (req, res) => {
  try {
    const agentDetails = await serverAgentService.getAgentById(req.params.id);
    if (!agentDetails) {
      return res.status(404).json({ success: false, error: 'Agent not found', timestamp: new Date().toISOString() });
    }
    res.json({ success: true, data: agentDetails, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

// POST /api/agents
agentRoutes.post('/', async (req, res) => {
  try {
    const { name, useCase, config } = req.body;
    const agent = await serverAgentService.createAgent(name, useCase, config);
    res.status(201).json({ success: true, data: agent, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

// GET /api/agents/:id/versions
agentRoutes.get('/:id/versions', async (req, res) => {
  try {
    const versions = await serverAgentService.getAgentVersions(req.params.id);
    res.json({ success: true, data: versions, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

// POST /api/agents/:id/versions
agentRoutes.post('/:id/versions', async (req, res) => {
  try {
    const { config, notes } = req.body;
    const version = await serverAgentService.createAgentVersion(req.params.id, config, notes);
    res.status(201).json({ success: true, data: version, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

// POST /api/agents/:id/activate
agentRoutes.post('/:id/activate', async (req, res) => {
  try {
    const agent = await serverAgentService.toggleAgentStatus(req.params.id);
    res.json({ success: true, data: agent, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

// POST /api/agents/:id/sync-sarvam
agentRoutes.post('/:id/sync-sarvam', async (req, res) => {
  try {
    const mapping = await serverAgentService.syncWithSarvam(req.params.id);
    res.json({ success: true, data: mapping, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});
