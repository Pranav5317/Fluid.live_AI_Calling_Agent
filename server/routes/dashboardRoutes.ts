import { Router } from 'express';
import { serverDashboardService } from '../services/dashboardService';
import { businessRepository } from '../repositories/businessRepository';

export const dashboardRoutes = Router();

// GET /api/dashboard/metrics
dashboardRoutes.get('/metrics', async (req, res) => {
  try {
    const metrics = await serverDashboardService.getMetrics();
    res.json({ success: true, data: metrics, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

// GET /api/dashboard/activity
dashboardRoutes.get('/activity', async (req, res) => {
  try {
    const activity = await serverDashboardService.getRecentActivities();
    res.json({ success: true, data: activity, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

// GET /api/dashboard/chart
dashboardRoutes.get('/chart', async (req, res) => {
  try {
    const chart = await serverDashboardService.getCallActivityChart();
    res.json({ success: true, data: chart, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

// GET /api/dashboard/business
dashboardRoutes.get('/business', async (req, res) => {
  try {
    const biz = await businessRepository.getBusinessProfile();
    res.json({ success: true, data: biz, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});
