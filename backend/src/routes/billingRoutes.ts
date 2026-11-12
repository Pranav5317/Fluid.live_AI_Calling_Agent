import { Router } from 'express';
import prisma from '../lib/prisma';
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

// GET /api/billing/guardrails
billingRoutes.get('/billing/guardrails', async (req, res) => {
  try {
    const row = await prisma.systemSetting.findUnique({ where: { key: 'billing_guardrails' } });
    const guardrails = (row?.value as Record<string, any>) || {
      monthlyBudgetCapUsd: 250,
      enforceHardCap: false,
    };
    res.json({ success: true, data: guardrails, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

// POST /api/billing/guardrails
billingRoutes.post('/billing/guardrails', async (req, res) => {
  try {
    const monthlyBudgetCapUsd = Number(req.body?.monthlyBudgetCapUsd ?? 250);
    const enforceHardCap = Boolean(req.body?.enforceHardCap);
    const guardrails = { monthlyBudgetCapUsd, enforceHardCap };
    await prisma.systemSetting.upsert({
      where: { key: 'billing_guardrails' },
      create: { key: 'billing_guardrails', value: guardrails },
      update: { value: guardrails },
    });
    res.json({ success: true, data: guardrails, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

