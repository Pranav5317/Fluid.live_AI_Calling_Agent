import prisma from '../lib/prisma';
import { KnowledgeBase, KnowledgeDocument } from '../../src/types';

export class KnowledgeRepository {
  async getKnowledgeBases(): Promise<KnowledgeBase[]> {
    const list = await prisma.knowledgeBase.findMany({
      include: { documents: true },
      orderBy: { createdAt: 'desc' },
    });

    return list.map(k => ({
      id: k.id,
      name: k.name,
      description: k.description,
      documentCount: k.documents.length,
      assignedAgentIds: [],
      createdAt: k.createdAt.toISOString(),
    }));
  }

  async getDocuments(knowledgeBaseId: string): Promise<KnowledgeDocument[]> {
    const list = await prisma.knowledgeDocument.findMany({
      where: { knowledgeBaseId },
      orderBy: { uploadedAt: 'desc' },
    });

    return list.map(d => ({
      id: d.id,
      knowledgeBaseId: d.knowledgeBaseId,
      fileName: d.fileName,
      fileSize: d.fileSize,
      status: d.status as any,
      error: d.error || undefined,
      uploadedAt: d.uploadedAt.toISOString(),
    }));
  }

  async createKnowledgeBase(name: string, description: string): Promise<KnowledgeBase> {
    const created = await prisma.knowledgeBase.create({
      data: {
        name,
        description,
        documentCount: 0,
      },
    });

    return {
      id: created.id,
      name: created.name,
      description: created.description,
      documentCount: 0,
      assignedAgentIds: [],
      createdAt: created.createdAt.toISOString(),
    };
  }

  async uploadDocument(
    knowledgeBaseId: string,
    file: { fileName: string; fileSize: number }
  ): Promise<KnowledgeDocument> {
    return await prisma.$transaction(async (tx) => {
      const doc = await tx.knowledgeDocument.create({
        data: {
          knowledgeBaseId,
          fileName: file.fileName,
          fileSize: file.fileSize,
          status: 'ready',
        },
      });

      await tx.knowledgeBase.update({
        where: { id: knowledgeBaseId },
        data: { documentCount: { increment: 1 } },
      });

      return {
        id: doc.id,
        knowledgeBaseId: doc.knowledgeBaseId,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        status: doc.status as any,
        uploadedAt: doc.uploadedAt.toISOString(),
      };
    });
  }
}

export const knowledgeRepository = new KnowledgeRepository();

