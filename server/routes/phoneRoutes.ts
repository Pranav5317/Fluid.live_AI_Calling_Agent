import { Router } from 'express';
import { serverPhoneService } from '../services/phoneService';

export const phoneRoutes = Router();

// GET /api/phone-numbers
phoneRoutes.get('/', async (req, res) => {
  try {
    const numbers = await serverPhoneService.getPhoneNumbers();
    res.json({ success: true, data: numbers, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

// POST /api/phone-numbers
phoneRoutes.post('/', async (req, res) => {
  try {
    const { areaCode } = req.body;
    const number = await serverPhoneService.provisionNumber(areaCode);
    res.status(201).json({ success: true, data: number, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

// PATCH /api/phone-numbers/:id
phoneRoutes.patch('/:id', async (req, res) => {
  try {
    const { assignedAgentId } = req.body;
    const number = await serverPhoneService.bindNumberToAgent(req.params.id, assignedAgentId);
    res.json({ success: true, data: number, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

