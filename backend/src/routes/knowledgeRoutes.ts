import { Router } from 'express';
import { serverKnowledgeService } from '../services/knowledgeService';

export const knowledgeRoutes = Router();

// GET /api/knowledge-bases
knowledgeRoutes.get('/', async (req, res) => {
  try {
    const bases = await serverKnowledgeService.getKnowledgeBases();
    res.json({ success: true, data: bases, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

// POST /api/knowledge-bases
knowledgeRoutes.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    const kb = await serverKnowledgeService.createKnowledgeBase(name, description);
    res.status(201).json({ success: true, data: kb, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

// GET /api/knowledge-bases/:id/documents
knowledgeRoutes.get('/:id/documents', async (req, res) => {
  try {
    const docs = await serverKnowledgeService.getDocuments(req.params.id);
    res.json({ success: true, data: docs, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

// POST /api/knowledge-bases/:id/documents
knowledgeRoutes.post('/:id/documents', async (req, res) => {
  try {
    const { fileName, fileSize } = req.body;
    const doc = await serverKnowledgeService.uploadDocument(req.params.id, { fileName, fileSize });
    res.status(201).json({ success: true, data: doc, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

