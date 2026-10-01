import React, { useState } from 'react';
import { CallFlowNode, CallNodeType } from '../../types';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import {
  Play,
  MessageSquare,
  HelpCircle,
  GitBranch,
  Database,
  CheckCircle,
  Square,
  Plus,
  Trash2,
  Edit2,
  ArrowDown,
} from 'lucide-react';

export interface CallFlowEditorProps {
  nodes: CallFlowNode[];
  onChange: (updatedNodes: CallFlowNode[]) => void;
  readOnly?: boolean;
}

export const CallFlowEditor: React.FC<CallFlowEditorProps> = ({
  nodes,
  onChange,
  readOnly = false,
}) => {
  const [editingNode, setEditingNode] = useState<CallFlowNode | null>(null);

  const getNodeIcon = (type: CallNodeType) => {
    switch (type) {
      case 'start':
        return <Play className="h-4 w-4 text-emerald-600" />;
      case 'opening':
        return <MessageSquare className="h-4 w-4 text-brand-600" />;
      case 'question':
        return <HelpCircle className="h-4 w-4 text-sky-600" />;
      case 'conditional':
        return <GitBranch className="h-4 w-4 text-amber-600" />;
      case 'data_collection':
        return <Database className="h-4 w-4 text-purple-600" />;
      case 'closing':
        return <CheckCircle className="h-4 w-4 text-emerald-600" />;
      case 'end':
        return <Square className="h-4 w-4 text-rose-600" />;
    }
  };

  const getNodeBadgeVariant = (type: CallNodeType) => {
    switch (type) {
      case 'start':
      case 'closing':
        return 'success';
      case 'opening':
        return 'brand';
      case 'question':
        return 'info';
      case 'conditional':
        return 'warning';
      case 'data_collection':
        return 'purple';
      case 'end':
        return 'danger';
    }
  };

  const handleAddNode = () => {
    const newNode: CallFlowNode = {
      id: `node_${Date.now()}`,
      type: 'question',
      title: 'New Flow Question',
      content: 'Ask the lead a key question during the conversation.',
    };
    onChange([...nodes, newNode]);
    setEditingNode(newNode);
  };

  const handleDeleteNode = (id: string) => {
    onChange(nodes.filter(n => n.id !== id));
  };

  const handleSaveNode = () => {
    if (!editingNode) return;
    onChange(nodes.map(n => (n.id === editingNode.id ? editingNode : n)));
    setEditingNode(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Conversational Call Flow Sequence</h4>
          <p className="text-xs text-slate-500">
            Define the step-by-step logic and conditional branching rules for the AI Agent.
          </p>
        </div>
        {!readOnly && (
          <Button size="sm" variant="outline" leftIcon={<Plus className="h-4 w-4" />} onClick={handleAddNode}>
            Add Flow Step
          </Button>
        )}
      </div>

      {/* Visual Step List */}
      <div className="space-y-3 relative py-2">
        {nodes.map((node, index) => {
          const isLast = index === nodes.length - 1;
          return (
            <div key={node.id} className="relative group">
              <div className="flex items-start gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-subtle hover:border-slate-300 transition-all">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 border border-slate-200 mt-0.5">
                  {getNodeIcon(node.type)}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{node.title}</span>
                    <Badge variant={getNodeBadgeVariant(node.type)} size="sm">
                      {node.type.replace('_', ' ')}
                    </Badge>
                    {node.variableKey && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">
                        {`{{${node.variableKey}}}`}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-mono bg-slate-50/70 p-2 rounded border border-slate-100">
                    "{node.content}"
                  </p>

                  {/* Branches if conditional node */}
                  {node.branches && node.branches.length > 0 && (
                    <div className="mt-2 space-y-1 pl-3 border-l-2 border-amber-300">
                      {node.branches.map((b, idx) => (
                        <div key={idx} className="text-[11px] text-slate-600 flex items-center gap-2">
                          <GitBranch className="h-3 w-3 text-amber-600" />
                          <span className="font-mono bg-amber-50 px-1 rounded text-amber-800 font-semibold">{b.condition}</span>
                          <span>→ Go to target node</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {!readOnly && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingNode(node)}
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                      title="Edit Node"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    {node.type !== 'start' && node.type !== 'end' && (
                      <button
                        type="button"
                        onClick={() => handleDeleteNode(node.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                        title="Delete Node"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {!isLast && (
                <div className="flex justify-center py-1">
                  <ArrowDown className="h-4 w-4 text-slate-300" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit Node Modal */}
      {editingNode && (
        <Modal
          isOpen={!!editingNode}
          onClose={() => setEditingNode(null)}
          title="Edit Call Flow Node"
          footer={
            <>
              <Button variant="outline" size="sm" onClick={() => setEditingNode(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveNode}>
                Save Step
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Select
              label="Node Step Type"
              value={editingNode.type}
              options={[
                { value: 'start', label: 'Start (Connection)' },
                { value: 'opening', label: 'Opening Line' },
                { value: 'question', label: 'Question' },
                { value: 'conditional', label: 'Conditional Branch' },
                { value: 'data_collection', label: 'Data Collection' },
                { value: 'closing', label: 'Closing Line' },
                { value: 'end', label: 'End Call' },
              ]}
              onChange={e => setEditingNode({ ...editingNode, type: e.target.value as CallNodeType })}
            />
            <Input
              label="Step Title"
              value={editingNode.title}
              onChange={e => setEditingNode({ ...editingNode, title: e.target.value })}
            />
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Prompt / Script Content
              </label>
              <textarea
                className="w-full rounded-md border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
                rows={3}
                value={editingNode.content}
                onChange={e => setEditingNode({ ...editingNode, content: e.target.value })}
              />
            </div>
            <Input
              label="Extracted Variable Key (Optional)"
              placeholder="e.g. satisfaction_rating"
              value={editingNode.variableKey || ''}
              onChange={e => setEditingNode({ ...editingNode, variableKey: e.target.value })}
            />
          </div>
        </Modal>
      )}
    </div>
  );
};

