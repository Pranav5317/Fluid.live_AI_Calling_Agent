import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Tabs } from '../../components/common/Tabs';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';
import { CallFlowEditor } from '../../components/callFlow/CallFlowEditor';
import { AgentConfig, ExtractedVariableConfig, KnowledgeBase } from '../../types';
import {
  Bot,
  Mic,
  MessageSquareText,
  GitBranch,
  BookOpen,
  Sliders,
  Play,
  Plus,
  Trash2,
  Sparkles,
} from 'lucide-react';

export interface AgentBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (agentData: { name: string; useCase: string; config: AgentConfig }) => Promise<void>;
  initialData?: { name: string; useCase: string; config: AgentConfig };
  knowledgeBases: KnowledgeBase[];
}

export const AgentBuilderModal: React.FC<AgentBuilderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  knowledgeBases,
}) => {
  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);

  // Form State
  const [name, setName] = useState(initialData?.name || '');
  const [useCase, setUseCase] = useState(initialData?.useCase || '');

  const [config, setConfig] = useState<AgentConfig>(
    initialData?.config || {
      voiceModel: 'Sarvam Neural Voice - English (US) - Professional Female',
      language: 'en-US',
      openingLine: 'Hello! I am calling from Apex Enterprises. Do you have a moment?',
      closingBehavior: 'Politely thank the customer and close the call session.',
      systemPrompt: 'You are an AI calling specialist for Apex Enterprises.',
      flowNodes: [
        { id: 'fn_1', type: 'start', title: 'Call Start', content: 'Establish line connection' },
        { id: 'fn_2', type: 'opening', title: 'Greeting', content: 'Deliver introductory line' },
        { id: 'fn_3', type: 'question', title: 'Main Inquiry', content: 'Ask lead primary question' },
        { id: 'fn_4', type: 'closing', title: 'Closing Script', content: 'Deliver final remark' },
        { id: 'fn_5', type: 'end', title: 'Terminate Call', content: 'Close audio stream' },
      ],
      knowledgeBaseIds: [],
      extractedVariables: [
        { key: 'satisfaction_rating', label: 'Satisfaction Rating', type: 'number', required: true, description: 'Score from 1 to 5' },
        { key: 'callback_requested', label: 'Callback Requested', type: 'boolean', required: true, description: 'True if supervisor callback requested' },
      ],
      runtimeSettings: {
        maxDurationMinutes: 5,
        silenceTimeoutSeconds: 5,
        interruptionSensitivity: 'medium',
        recordingEnabled: true,
      },
    }
  );

  // Simulated Live Preview State
  const [isPreviewActive, setIsPreviewActive] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({ name, useCase, config });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleAddVariable = () => {
    const newVar: ExtractedVariableConfig = {
      key: `custom_var_${Date.now()}`,
      label: 'New Variable',
      type: 'string',
      required: false,
      description: 'Extracted variable definition',
    };
    setConfig({
      ...config,
      extractedVariables: [...config.extractedVariables, newVar],
    });
  };

  const handleDeleteVariable = (key: string) => {
    setConfig({
      ...config,
      extractedVariables: config.extractedVariables.filter(v => v.key !== key),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit AI Calling Agent Configuration' : 'Build New AI Calling Agent'}
      size="full"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Play className="h-4 w-4 text-emerald-600" />}
            onClick={() => setIsPreviewActive(!isPreviewActive)}
          >
            {isPreviewActive ? 'Hide Live Audio Test' : 'Test Live Audio Preview'}
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} isLoading={saving}>
              Publish & Sync Agent
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Builder Form Workspace */}
        <div className="flex-1 space-y-4">
          <Tabs
            tabs={[
              { id: 'general', label: 'General', icon: <Bot className="h-4 w-4" /> },
              { id: 'voice', label: 'Voice & Audio', icon: <Mic className="h-4 w-4" /> },
              { id: 'prompt', label: 'Conversation', icon: <MessageSquareText className="h-4 w-4" /> },
              { id: 'flow', label: 'Call Flow', icon: <GitBranch className="h-4 w-4" /> },
              { id: 'kb', label: 'Knowledge', icon: <BookOpen className="h-4 w-4" /> },
              { id: 'variables', label: 'Variables', icon: <Sliders className="h-4 w-4" /> },
              { id: 'advanced', label: 'Advanced', icon: <Sparkles className="h-4 w-4" /> },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          {/* TAB 1: GENERAL */}
          {activeTab === 'general' && (
            <div className="space-y-4 pt-2">
              <Input
                label="Agent Name *"
                placeholder="e.g. Customer Satisfaction Specialist"
                value={name}
                onChange={e => setName(e.target.value)}
              />
              <Input
                label="Primary Business Use Case *"
                placeholder="e.g. Post-service satisfaction survey & feedback collection"
                value={useCase}
                onChange={e => setUseCase(e.target.value)}
              />
            </div>
          )}

          {/* TAB 2: VOICE */}
          {activeTab === 'voice' && (
            <div className="space-y-4 pt-2">
              <Select
                label="Sarvam Neural Voice Model"
                value={config.voiceModel}
                options={[
                  { value: 'Sarvam Neural Voice - English (US) - Professional Female', label: 'Sarvam Neural Voice - English (US) - Professional Female' },
                  { value: 'Sarvam Neural Voice - English (US) - Executive Male', label: 'Sarvam Neural Voice - English (US) - Executive Male' },
                  { value: 'Sarvam Neural Voice - English (IN) - Professional Female', label: 'Sarvam Neural Voice - English (IN) - Professional Female' },
                ]}
                onChange={e => setConfig({ ...config, voiceModel: e.target.value })}
              />
              <Select
                label="Primary Language"
                value={config.language}
                options={[
                  { value: 'en-US', label: 'English (US)' },
                  { value: 'en-IN', label: 'English (India)' },
                  { value: 'hi-IN', label: 'Hindi (India)' },
                ]}
                onChange={e => setConfig({ ...config, language: e.target.value })}
              />
            </div>
          )}

          {/* TAB 3: CONVERSATION PROMPT */}
          {activeTab === 'prompt' && (
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  System Instructions & Persona Prompt *
                </label>
                <textarea
                  className="w-full rounded-md border border-slate-300 p-3 text-xs text-slate-900 font-mono focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
                  rows={6}
                  value={config.systemPrompt}
                  onChange={e => setConfig({ ...config, systemPrompt: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Opening Line Script
                </label>
                <textarea
                  className="w-full rounded-md border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
                  rows={2}
                  value={config.openingLine}
                  onChange={e => setConfig({ ...config, openingLine: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Closing Behavior Directive
                </label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 p-2 text-xs text-slate-900 focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
                  value={config.closingBehavior}
                  onChange={e => setConfig({ ...config, closingBehavior: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* TAB 4: CALL FLOW */}
          {activeTab === 'flow' && (
            <div className="pt-2">
              <CallFlowEditor
                nodes={config.flowNodes}
                onChange={flowNodes => setConfig({ ...config, flowNodes })}
              />
            </div>
          )}

          {/* TAB 5: KNOWLEDGE BASE */}
          {activeTab === 'kb' && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Attach Knowledge Base Documents
              </h4>
              <p className="text-xs text-slate-500">
                The agent will retrieve facts from attached document collections to answer lead questions.
              </p>
              <div className="space-y-2">
                {knowledgeBases.map(kb => {
                  const isAttached = config.knowledgeBaseIds.includes(kb.id);
                  return (
                    <div
                      key={kb.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white"
                    >
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">{kb.name}</span>
                        <span className="text-[11px] text-slate-500">{kb.description}</span>
                      </div>
                      <Button
                        variant={isAttached ? 'outline' : 'secondary'}
                        size="sm"
                        onClick={() => {
                          const updated = isAttached
                            ? config.knowledgeBaseIds.filter(id => id !== kb.id)
                            : [...config.knowledgeBaseIds, kb.id];
                          setConfig({ ...config, knowledgeBaseIds: updated });
                        }}
                      >
                        {isAttached ? 'Attached' : 'Attach'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 6: EXTRACTED VARIABLES (Arbitrary definitions - Principle #7) */}
          {activeTab === 'variables' && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Agent Output Extracted Variables
                  </h4>
                  <p className="text-xs text-slate-500">
                    Define custom structured variables extracted from call transcripts.
                  </p>
                </div>
                <Button size="sm" variant="outline" leftIcon={<Plus className="h-4 w-4" />} onClick={handleAddVariable}>
                  Add Variable Definition
                </Button>
              </div>

              <div className="space-y-3">
                {config.extractedVariables.map((v, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white">
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <Input
                        label="Variable Key"
                        value={v.key}
                        onChange={e => {
                          const updated = [...config.extractedVariables];
                          updated[idx].key = e.target.value;
                          setConfig({ ...config, extractedVariables: updated });
                        }}
                      />
                      <Input
                        label="UI Label"
                        value={v.label}
                        onChange={e => {
                          const updated = [...config.extractedVariables];
                          updated[idx].label = e.target.value;
                          setConfig({ ...config, extractedVariables: updated });
                        }}
                      />
                      <Select
                        label="Data Type"
                        value={v.type}
                        options={[
                          { value: 'string', label: 'String Text' },
                          { value: 'number', label: 'Number' },
                          { value: 'boolean', label: 'Boolean (Yes/No)' },
                          { value: 'enum', label: 'Enum Select' },
                        ]}
                        onChange={e => {
                          const updated = [...config.extractedVariables];
                          updated[idx].type = e.target.value as any;
                          setConfig({ ...config, extractedVariables: updated });
                        }}
                      />
                      <Input
                        label="Description"
                        value={v.description}
                        onChange={e => {
                          const updated = [...config.extractedVariables];
                          updated[idx].description = e.target.value;
                          setConfig({ ...config, extractedVariables: updated });
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteVariable(v.key)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded mt-5"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: ADVANCED RUNTIME SETTINGS */}
          {activeTab === 'advanced' && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Max Call Duration (Minutes)"
                  type="number"
                  value={config.runtimeSettings.maxDurationMinutes}
                  onChange={e =>
                    setConfig({
                      ...config,
                      runtimeSettings: {
                        ...config.runtimeSettings,
                        maxDurationMinutes: Number(e.target.value),
                      },
                    })
                  }
                />
                <Input
                  label="Silence Timeout (Seconds)"
                  type="number"
                  value={config.runtimeSettings.silenceTimeoutSeconds}
                  onChange={e =>
                    setConfig({
                      ...config,
                      runtimeSettings: {
                        ...config.runtimeSettings,
                        silenceTimeoutSeconds: Number(e.target.value),
                      },
                    })
                  }
                />
              </div>

              <Select
                label="Lead Interruption Sensitivity"
                value={config.runtimeSettings.interruptionSensitivity}
                options={[
                  { value: 'low', label: 'Low - Agent finishes line before yielding' },
                  { value: 'medium', label: 'Medium - Balanced conversational pause' },
                  { value: 'high', label: 'High - Immediate yielding upon speech detection' },
                ]}
                onChange={e =>
                  setConfig({
                    ...config,
                    runtimeSettings: {
                      ...config.runtimeSettings,
                      interruptionSensitivity: e.target.value as any,
                    },
                  })
                }
              />
            </div>
          )}
        </div>

        {/* Live Conversation Preview Panel */}
        {isPreviewActive && (
          <div className="w-full lg:w-80 rounded-lg border border-slate-200 bg-slate-900 text-white p-4 flex flex-col justify-between h-[500px]">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold">Audio Test Sandbox</span>
                </div>
                <Badge variant="brand" size="sm">
                  Sarvam Neural Preview
                </Badge>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <p className="text-slate-400 text-[11px]">Connecting to Sarvam Audio Stream...</p>
                <div className="bg-slate-800/80 p-2.5 rounded border border-slate-700 text-emerald-300">
                  <span className="font-bold block text-[10px] text-slate-400">Agent Opening:</span>
                  "{config.openingLine}"
                </div>
                <div className="bg-slate-800/50 p-2.5 rounded border border-slate-700 text-slate-200">
                  <span className="font-bold block text-[10px] text-slate-400">Lead Speech Simulated:</span>
                  "Yes, I have 2 minutes to talk."
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 text-center">
              <Button size="sm" variant="danger" onClick={() => setIsPreviewActive(false)}>
                End Sandbox Call
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

