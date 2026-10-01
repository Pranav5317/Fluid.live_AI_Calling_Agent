import { Router } from 'express';
import { serverBusinessService } from '../services/businessService';

export const businessRoutes = Router();

// GET /api/business
businessRoutes.get('/', async (req, res) => {
  try {
    const business = await serverBusinessService.getBusinessProfile();
    res.json({ success: true, data: business, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

// PATCH /api/business/:id
businessRoutes.patch('/:id', async (req, res) => {
  try {
    const updated = await serverBusinessService.updateBusinessProfile(req.params.id, req.body);
    res.json({ success: true, data: updated, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

