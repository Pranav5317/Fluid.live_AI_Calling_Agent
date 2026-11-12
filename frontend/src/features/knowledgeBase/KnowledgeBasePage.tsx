import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { LoadingState } from '../../components/common/LoadingState';
import { knowledgeService } from '../../services/knowledgeService';
import { KnowledgeBase, KnowledgeDocument } from '../../types';
import { formatDate } from '../../lib/formatters';
import { BookOpen, Plus, Upload, FileText, Trash2, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

export const KnowledgeBasePage: React.FC = () => {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKbId, setSelectedKbId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isCreateKbOpen, setIsCreateKbOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [newKbName, setNewKbName] = useState('');
  const [newKbDesc, setNewKbDesc] = useState('');
  const [uploadFileName, setUploadFileName] = useState('');

  const fetchKbs = async () => {
    setLoading(true);
    try {
      const list = await knowledgeService.getKnowledgeBases();
      setKnowledgeBases(list);
      if (list.length > 0 && !selectedKbId) {
        setSelectedKbId(list[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchDocs = async (kbId: string) => {
    const docs = await knowledgeService.getDocuments(kbId);
    setDocuments(docs);
  };

  useEffect(() => {
    fetchKbs();
  }, []);

  useEffect(() => {
    if (selectedKbId) {
      fetchDocs(selectedKbId);
    }
  }, [selectedKbId]);

  const handleCreateKb = async () => {
    if (!newKbName) return;
    const created = await knowledgeService.createKnowledgeBase(newKbName, newKbDesc);
    setIsCreateKbOpen(false);
    setNewKbName('');
    setNewKbDesc('');
    await fetchKbs();
    setSelectedKbId(created.id);
  };

  const handleUploadSubmit = async () => {
    if (!selectedKbId || !uploadFileName) return;
    await knowledgeService.uploadDocument(selectedKbId, {
      fileName: uploadFileName.endsWith('.pdf') ? uploadFileName : `${uploadFileName}.pdf`,
      fileSize: 1540000,
    });
    setIsUploadOpen(false);
    setUploadFileName('');
    fetchDocs(selectedKbId);
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!selectedKbId) return;
    await knowledgeService.deleteDocument(docId);
    fetchDocs(selectedKbId);
    fetchKbs();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Base Repository"
        description="Upload operational FAQs, policy documentation, and training materials for AI agent vector retrieval."
        actions={
          <Button
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setIsCreateKbOpen(true)}
          >
            New Knowledge Base
          </Button>
        }
      />

      {loading ? (
        <LoadingState label="Loading Knowledge Base collections..." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Knowledge Base Collection List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Collections</h3>
            {knowledgeBases.map(kb => {
              const isSelected = kb.id === selectedKbId;
              return (
                <div
                  key={kb.id}
                  onClick={() => setSelectedKbId(kb.id)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-subtle'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm leading-snug">{kb.name}</span>
                    <Badge variant={isSelected ? 'brand' : 'neutral'} size="sm">
                      {kb.documentCount} Documents
                    </Badge>
                  </div>
                  <p className={`text-xs mt-1 line-clamp-2 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                    {kb.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Document Management Pane */}
          <Card className="lg:col-span-2" noPadding>
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {knowledgeBases.find(k => k.id === selectedKbId)?.name || 'Documents'}
                </h3>
                <p className="text-xs text-slate-500">Vector indexing status & document list</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Upload className="h-4 w-4" />}
                onClick={() => setIsUploadOpen(true)}
                disabled={!selectedKbId}
              >
                Upload Document
              </Button>
            </div>

            <div className="divide-y divide-slate-100">
              {documents.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No documents in this knowledge base collection yet.
                </div>
              ) : (
                documents.map(doc => (
                  <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900 text-xs block">{doc.fileName}</span>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                          <span>{(doc.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                          <span>•</span>
                          <span>Uploaded {formatDate(doc.uploadedAt)}</span>
                        </div>
                        {doc.error && <p className="text-[11px] text-rose-600 mt-1">{doc.error}</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          doc.status === 'ready'
                            ? 'success'
                            : doc.status === 'processing'
                            ? 'warning'
                            : 'danger'
                        }
                        dot
                      >
                        {doc.status}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                        title="Delete Document"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Create Knowledge Base Modal */}
      <Modal
        isOpen={isCreateKbOpen}
        onClose={() => setIsCreateKbOpen(false)}
        title="Create Knowledge Base Collection"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsCreateKbOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateKb}>
              Create Collection
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Collection Name *"
            placeholder="e.g. 2026 Customer Service FAQs"
            value={newKbName}
            onChange={e => setNewKbName(e.target.value)}
          />
          <Input
            label="Description"
            placeholder="e.g. Operational specs and support guidelines"
            value={newKbDesc}
            onChange={e => setNewKbDesc(e.target.value)}
          />
        </div>
      </Modal>

      {/* Upload Document Modal */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Upload Document to Knowledge Base"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsUploadOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleUploadSubmit}>
              Upload & Process Embeddings
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Document File Name *"
            placeholder="e.g. Policy_Guidelines_2026.pdf"
            value={uploadFileName}
            onChange={e => setUploadFileName(e.target.value)}
          />
          <div className="p-4 rounded border border-dashed border-slate-300 bg-slate-50 text-center text-xs text-slate-500">
            Simulated vector parsing pipeline will process document upon submit.
          </div>
        </div>
      </Modal>
    </div>
  );
};

