import { KnowledgeBase, KnowledgeDocument } from '../types';
import { apiClient } from './apiClient';

export interface IKnowledgeService {
  getKnowledgeBases(): Promise<KnowledgeBase[]>;
  getDocuments(knowledgeBaseId: string): Promise<KnowledgeDocument[]>;
  createKnowledgeBase(name: string, description: string): Promise<KnowledgeBase>;
  uploadDocument(knowledgeBaseId: string, file: { fileName: string; fileSize: number }): Promise<KnowledgeDocument>;
  deleteDocument(documentId: string): Promise<boolean>;
}

class KnowledgeService implements IKnowledgeService {
  async getKnowledgeBases(): Promise<KnowledgeBase[]> {
    return await apiClient.get<KnowledgeBase[]>('/knowledge-bases');
  }

  async getDocuments(knowledgeBaseId: string): Promise<KnowledgeDocument[]> {
    return await apiClient.get<KnowledgeDocument[]>(`/knowledge-bases/${knowledgeBaseId}/documents`);
  }

  async createKnowledgeBase(name: string, description: string): Promise<KnowledgeBase> {
    return await apiClient.post<KnowledgeBase>('/knowledge-bases', { name, description });
  }

  async uploadDocument(
    knowledgeBaseId: string,
    file: { fileName: string; fileSize: number }
  ): Promise<KnowledgeDocument> {
    return await apiClient.post<KnowledgeDocument>(`/knowledge-bases/${knowledgeBaseId}/documents`, file);
  }

  async deleteDocument(documentId: string): Promise<boolean> {
    const res = await apiClient.post<{ success: boolean }>(`/knowledge-bases/documents/${documentId}/delete`);
    return res.success;
  }
}

export const knowledgeService = new KnowledgeService();
