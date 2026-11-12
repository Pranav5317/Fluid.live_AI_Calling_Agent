import { Router } from 'express';
import { backendSarvamProvider } from '../services/sarvamProvider';

export const sarvamRoutes = Router();

// GET /api/sarvam/status - Returns active Sarvam account connection details (masked API key)
sarvamRoutes.get('/status', (req, res) => {
  try {
    const status = backendSarvamProvider.getStatus();
    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err?.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/sarvam/test - Tests connectivity to Sarvam API
sarvamRoutes.post('/test', async (req, res) => {
  try {
    const result = await backendSarvamProvider.testConnection(req.body);
    res.json({
      success: result.success,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err?.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/sarvam/connect - Saves/updates Sarvam credentials and verifies connection live
sarvamRoutes.post('/connect', async (req, res) => {
  try {
    const { apiKey, orgId, workspaceId, defaultAppId, connectionId, agentPhoneNumber } = req.body;

    const result = await backendSarvamProvider.updateConfig({
      apiKey,
      orgId,
      workspaceId,
      defaultAppId,
      connectionId,
      agentPhoneNumber,
    });

    res.json({
      success: result.success,
      data: result.status,
      testResult: result.testResult,
      message: result.success
        ? 'Sarvam account connected & verified successfully.'
        : 'Credentials saved, but verification ping failed. Please review settings.',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err?.message,
      timestamp: new Date().toISOString(),
    });
  }
});

