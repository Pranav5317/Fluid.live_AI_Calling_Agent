import express from 'express';
import cors from 'cors';
import { leadRoutes } from './routes/leadRoutes';
import { agentRoutes } from './routes/agentRoutes';
import { campaignRoutes } from './routes/campaignRoutes';
import { callRoutes } from './routes/callRoutes';
import { phoneRoutes } from './routes/phoneRoutes';
import { knowledgeRoutes } from './routes/knowledgeRoutes';
import { billingRoutes } from './routes/billingRoutes';
import { dashboardRoutes } from './routes/dashboardRoutes';
import { webhookRoutes } from './routes/webhookRoutes';
import { businessRoutes } from './routes/businessRoutes';
import { sarvamRoutes } from './routes/sarvamRoutes';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Normalize URL in case serverless gateway stripped the /api prefix
app.use((req, res, next) => {
  if (req.url && !req.url.startsWith('/api') && req.url.startsWith('/')) {
    req.url = '/api' + req.url;
  }
  next();
});

// Register API Routes for Fluid.Live Modular Monolith Backend
app.use('/api/leads', leadRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/phone-numbers', phoneRoutes);
app.use('/api/knowledge-bases', knowledgeRoutes);
app.use('/api', billingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/sarvam', sarvamRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Fluid.Live Voice AI Platform Backend API',
    sarvamBridge: 'Connected (Decoupled Provider Layer)',
    timestamp: new Date().toISOString(),
  });
});

// Global error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[API Server Error]:', err);
  res.status(500).json({
    success: false,
    error: err?.message || 'Internal Server Error',
    timestamp: new Date().toISOString(),
  });
});

export default app;

if (process.argv[1] && (process.argv[1].endsWith('server/index.ts') || process.argv[1].endsWith('server\\index.ts'))) {
  app.listen(PORT, () => {
    console.log(`[Fluid.Live Backend API] Modular Monolith Server running on http://localhost:${PORT}`);
  });
}

