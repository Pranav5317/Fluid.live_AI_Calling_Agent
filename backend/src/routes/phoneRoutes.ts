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

// POST /api/phone-numbers - Link or add a Sarvam Telephony line
phoneRoutes.post('/', async (req, res) => {
  try {
    const { phoneNumber, connectionId, provider, assignedAgentId, areaCode } = req.body;

    let number;
    if (phoneNumber) {
      number = await serverPhoneService.addPhoneNumber({
        phoneNumber,
        connectionId,
        provider,
        assignedAgentId,
      });
    } else {
      // Fallback for legacy calls
      number = await serverPhoneService.provisionNumber(areaCode);
    }

    res.status(201).json({ success: true, data: number, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

// POST /api/phone-numbers/sync - Auto-sync active Sarvam Telephony line from account config
phoneRoutes.post('/sync', async (req, res) => {
  try {
    const number = await serverPhoneService.syncSarvamPhoneNumber();
    res.json({
      success: true,
      data: number,
      message: 'Active Sarvam Telephony line synchronized successfully.',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

// PATCH /api/phone-numbers/:id - Bind/unbind agent
phoneRoutes.patch('/:id', async (req, res) => {
  try {
    const { assignedAgentId } = req.body;
    const number = await serverPhoneService.bindNumberToAgent(req.params.id, assignedAgentId);
    res.json({ success: true, data: number, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

// DELETE /api/phone-numbers/:id - Unlink/delete phone number
phoneRoutes.delete('/:id', async (req, res) => {
  try {
    await serverPhoneService.deletePhoneNumber(req.params.id);
    res.json({
      success: true,
      message: 'Phone number unlinked successfully.',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});
