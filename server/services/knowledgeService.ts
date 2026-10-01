import { KnowledgeBase, KnowledgeDocument } from '../../src/types';
import { knowledgeRepository } from '../repositories/knowledgeRepository';

export class ServerKnowledgeService {
  async getKnowledgeBases(): Promise<KnowledgeBase[]> {
    return knowledgeRepository.getKnowledgeBases();
  }

  async getDocuments(knowledgeBaseId: string): Promise<KnowledgeDocument[]> {
    return knowledgeRepository.getDocuments(knowledgeBaseId);
  }

  async createKnowledgeBase(name: string, description: string): Promise<KnowledgeBase> {
    return knowledgeRepository.createKnowledgeBase(name, description);
  }

  async uploadDocument(
    knowledgeBaseId: string,
    file: { fileName: string; fileSize: number }
  ): Promise<KnowledgeDocument> {
    return knowledgeRepository.uploadDocument(knowledgeBaseId, file);
  }
}

export const serverKnowledgeService = new ServerKnowledgeService();
