import { Router } from 'express';
import { serverLeadService } from '../services/leadService';

export const leadRoutes = Router();

// GET /api/leads
leadRoutes.get('/', async (req, res) => {
  try {
    const { search, status, campaignId, page, pageSize } = req.query;
    const result = await serverLeadService.getLeads({
      search: search as string,
      status: status as string,
      campaignId: campaignId as string,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
    res.json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

// GET /api/leads/:id
leadRoutes.get('/:id', async (req, res) => {
  try {
    const lead = await serverLeadService.getLeadById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found', timestamp: new Date().toISOString() });
    }
    res.json({ success: true, data: lead, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

// POST /api/leads
leadRoutes.post('/', async (req, res) => {
  try {
    const { name, phone, email, metadata, campaignId } = req.body;
    const lead = await serverLeadService.addLead({ name, phone, email, metadata: metadata || {} }, campaignId);
    res.status(201).json({ success: true, data: lead, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

// POST /api/leads/import
leadRoutes.post('/import', async (req, res) => {
  try {
    const { leads, campaignId } = req.body;
    const result = await serverLeadService.importLeads(leads || [], campaignId);
    res.json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

