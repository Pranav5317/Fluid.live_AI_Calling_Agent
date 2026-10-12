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
  Zap,
  Volume2,
} from 'lucide-react';
import { agentService } from '../../services/agentService';
import { INDUSTRY_TEMPLATES } from '../../data/industryTemplates';
import { AgentSandboxSimulator } from './AgentSandboxSimulator';

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
  const [playingVoicePreview, setPlayingVoicePreview] = useState(false);
  const [voicePreviewError, setVoicePreviewError] = useState<string | null>(null);

  // Normalize configuration to guarantee safe array & object defaults
  const normalizeAgentConfig = (raw?: Partial<AgentConfig>): AgentConfig => {
    return {
      voiceModel: raw?.voiceModel || 'Shubh - Friendly Verification Indian Male',
      language: raw?.language || 'en-IN',
      openingLine: raw?.openingLine || (raw as any)?.firstGreeting || 'नमस्ते <user_name> ji, I am calling on behalf of Fluid.live for a quick verification. Do you have a moment?',
      closingBehavior: raw?.closingBehavior || 'धन्यवाद <user_name> ji, आपका दिन शुभ हो!',
      systemPrompt: raw?.systemPrompt || `Persona\nRole: Shubh, a friendly verification assistant calling on behalf of Fluid.live, a company that offers AI voice calling for businesses.\nTone: Warm, courteous, respectful, and efficient.\n\nObjective:\nVerify customer interest in AI voice calling for their business and note follow-up preference (demo, WhatsApp, or none).\n\nSpeaking style rules:\n- Keep turns concise (under 20 words).\n- Address user respectfully (ji, Sir, Madam).\n- Ask one question at a time and wait for their response.`,
      sarvamAppId: raw?.sarvamAppId || (raw as any)?.app_id || 'Conversatio-b063cf10-e735',
      sarvamConnectionId: raw?.sarvamConnectionId || (raw as any)?.connection_id || '7efd8897-87-220da5aa-1d5e',
      flowNodes: Array.isArray(raw?.flowNodes) && raw!.flowNodes.length > 0 ? raw!.flowNodes : [
        { id: 'fn_1', type: 'start', title: 'Call Connected', content: 'Establish telephony line connection' },
        { id: 'fn_2', type: 'opening', title: 'Warm Greeting', content: 'Greet lead and confirm identity' },
        { id: 'fn_3', type: 'question', title: 'Interest Verification', content: 'Check interest in AI voice calling' },
        { id: 'fn_4', type: 'question', title: 'Follow-up Preference', content: 'Offer demo or WhatsApp details' },
        { id: 'fn_5', type: 'closing', title: 'Polite Wrap-up', content: 'Deliver concise sign-off (< 10 words)' },
        { id: 'fn_6', type: 'end', title: 'End Call', content: 'Call end_interaction' },
      ],
      knowledgeBaseIds: Array.isArray(raw?.knowledgeBaseIds) ? raw!.knowledgeBaseIds : [],
      extractedVariables: Array.isArray(raw?.extractedVariables) && raw!.extractedVariables.length > 0 ? raw!.extractedVariables : [
        { key: 'interest_level', label: 'Interest Level', type: 'enum', required: true, description: 'interested | not_interested | maybe_later', enumOptions: ['interested', 'not_interested', 'maybe_later'] },
        { key: 'follow_up_preference', label: 'Follow-up Channel', type: 'enum', required: true, description: 'demo | whatsapp_details | none', enumOptions: ['demo', 'whatsapp_details', 'none'] },
        { key: 'verification_status', label: 'Verification Status', type: 'string', required: true, description: 'completed | unreachable | refused' },
      ],
      runtimeSettings: raw?.runtimeSettings || {
        maxDurationMinutes: 3,
        silenceTimeoutSeconds: 5,
        interruptionSensitivity: 'medium',
        recordingEnabled: true,
      },
    };
  };

  // Form State
  const [name, setName] = useState(initialData?.name || '');
  const [useCase, setUseCase] = useState(initialData?.useCase || '');
  const [config, setConfig] = useState<AgentConfig>(() => normalizeAgentConfig(initialData?.config));

  // Sync state when initialData or modal open status changes
  React.useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setUseCase(initialData.useCase || '');
      setConfig(normalizeAgentConfig(initialData.config));
    } else {
      setName('');
      setUseCase('');
      setConfig(normalizeAgentConfig());
    }
  }, [initialData, isOpen]);

  // Simulated Live Preview State
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  const handleApplyTemplate = (templateId: string) => {
    const selected = INDUSTRY_TEMPLATES.find(t => t.id === templateId);
    if (!selected) return;
    setSelectedTemplateId(templateId);
    setName(selected.agentName);
    setUseCase(selected.useCase);
    setConfig(prev => ({
      ...prev,
      ...selected.config,
      // ensure nested objects are preserved
      flowNodes: selected.config.flowNodes || prev.flowNodes,
      extractedVariables: selected.config.extractedVariables || prev.extractedVariables,
      runtimeSettings: selected.config.runtimeSettings || prev.runtimeSettings,
    }));
  };

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

  const handlePlayVoicePreview = async () => {
    setPlayingVoicePreview(true);
    setVoicePreviewError(null);
    try {
      const speakerName = config.voiceModel.toLowerCase().includes('shubh')
        ? 'shubh'
        : config.voiceModel.toLowerCase().includes('shreya') || config.voiceModel.toLowerCase().includes('female')
        ? 'meera'
        : 'arvind';

      const sampleText = config.openingLine || 'Namaste! Main Shubh bol raha hoon Fluid.live se. How can I assist you today?';
      const audioBase64 = await agentService.previewVoice({
        speaker: speakerName,
        languageCode: config.language || 'en-IN',
        text: sampleText,
      });

      if (audioBase64) {
        const audio = new Audio(`data:audio/wav;base64,${audioBase64}`);
        audio.onended = () => setPlayingVoicePreview(false);
        audio.onerror = () => {
          setPlayingVoicePreview(false);
          setVoicePreviewError('Audio playback failed in browser');
        };
        await audio.play();
      } else if ('speechSynthesis' in window) {
        // High fidelity browser synthesis fallback
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(sampleText);
        utterance.lang = config.language || 'en-IN';
        if (speakerName === 'shubh') {
          utterance.pitch = 0.95;
          utterance.rate = 1.0;
        } else if (speakerName === 'meera') {
          utterance.pitch = 1.15;
          utterance.rate = 1.05;
        } else {
          utterance.pitch = 0.85;
          utterance.rate = 0.95;
        }
        utterance.onend = () => setPlayingVoicePreview(false);
        utterance.onerror = () => setPlayingVoicePreview(false);
        window.speechSynthesis.speak(utterance);
      } else {
        setPlayingVoicePreview(false);
        setVoicePreviewError('Audio playback not supported in this browser');
      }
    } catch (err: any) {
      setPlayingVoicePreview(false);
      setVoicePreviewError(err?.message || 'Voice preview failed');
    }
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
          {/* 1-Click Enterprise Industry Blueprint Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-900/40 shadow-sm gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white tracking-wide">Enterprise Industry Blueprint</span>
                  <Badge variant="brand" size="sm" className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] py-0 px-2">
                    1-Click Auto-Fill
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Load Indian enterprise workflows with calibrated personas, bilingual scripts & extracted variables.
                </p>
              </div>
            </div>

            <div className="w-full sm:w-auto">
              <select
                className="w-full sm:w-auto bg-slate-800/90 border border-indigo-700/50 text-xs rounded-lg px-3 py-1.5 text-slate-100 font-medium focus:outline-none focus:border-amber-400 hover:border-slate-600 transition"
                value={selectedTemplateId}
                onChange={e => handleApplyTemplate(e.target.value)}
              >
                <option value="" disabled>Load Industry Blueprint...</option>
                {INDUSTRY_TEMPLATES.map(t => (
                  <option key={t.id} value={t.id}>
                    [{t.category}] {t.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

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

              {/* Sarvam Samvaad App Integration */}
              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <span className="font-bold text-xs text-slate-900">Sarvam Voice App ID Mapping</span>
                  </div>
                  <Badge variant="brand" size="sm">
                    Samvaad Voice Agent
                  </Badge>
                </div>
                <Input
                  label="Sarvam Voice Agent App ID"
                  placeholder="e.g. Conversatio-b063cf10-e735 (or custom app ID)"
                  value={config.sarvamAppId || ''}
                  onChange={e => setConfig({ ...config, sarvamAppId: e.target.value })}
                />
                <p className="text-[11px] text-slate-500 leading-normal">
                  Outbound calls for this agent will directly invoke this Sarvam App. If left blank, it automatically uses your connected account's default Sarvam Voice App.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: VOICE */}
          {activeTab === 'voice' && (
            <div className="space-y-4 pt-2">
              <Select
                label="Sarvam Neural Voice Model"
                value={config.voiceModel}
                options={[
                  { value: 'Shubh - Friendly Verification Indian Male', label: 'Shubh - Friendly Verification Indian Male (Recommended)' },
                  { value: 'Shreya - Courteous Professional Indian Female', label: 'Shreya - Courteous Professional Indian Female' },
                  { value: 'Sarvam Neural Voice - English (IN) - Professional Female', label: 'Sarvam Neural Voice - English (IN) - Professional Female' },
                  { value: 'Sarvam Neural Voice - Hindi (IN) - Professional Female', label: 'Sarvam Neural Voice - Hindi (IN) - Professional Female' },
                  { value: 'Sarvam Neural Voice - English (US) - Professional Female', label: 'Sarvam Neural Voice - English (US) - Professional Female' },
                  { value: 'Sarvam Neural Voice - English (US) - Executive Male', label: 'Sarvam Neural Voice - English (US) - Executive Male' },
                ]}
                onChange={e => setConfig({ ...config, voiceModel: e.target.value })}
              />
              <Select
                label="Primary Language"
                value={config.language}
                options={[
                  { value: 'en-IN', label: 'English (India)' },
                  { value: 'hi-IN', label: 'Hindi (India)' },
                  { value: 'bn-IN', label: 'Bengali (India)' },
                  { value: 'gu-IN', label: 'Gujarati (India)' },
                  { value: 'kn-IN', label: 'Kannada (India)' },
                  { value: 'ml-IN', label: 'Malayalam (India)' },
                  { value: 'mr-IN', label: 'Marathi (India)' },
                  { value: 'pa-IN', label: 'Punjabi (India)' },
                  { value: 'ta-IN', label: 'Tamil (India)' },
                  { value: 'te-IN', label: 'Telugu (India)' },
                  { value: 'en-US', label: 'English (US)' },
                ]}
                onChange={e => setConfig({ ...config, language: e.target.value })}
              />

              {/* Real-time Voice Audio Sample Player */}
              <div className="p-4 rounded-lg bg-slate-900 text-white space-y-3 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold">Neural Voice Audio Preview (Bulbul:v1)</span>
                  </div>
                  <Badge variant="brand" size="sm">
                    Instant Playback
                  </Badge>
                </div>
                <p className="text-xs text-slate-300 italic">
                  "{config.openingLine || 'Namaste! Main Shubh bol raha hoon Fluid.live se. How can I assist you today?'}"
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                    leftIcon={<Volume2 className={`h-3.5 w-3.5 ${playingVoicePreview ? 'animate-bounce' : ''}`} />}
                    onClick={handlePlayVoicePreview}
                    isLoading={playingVoicePreview}
                  >
                    {playingVoicePreview ? 'Synthesizing & Playing...' : 'Listen to Voice Sample'}
                  </Button>
                </div>
                {voicePreviewError && (
                  <p className="text-[11px] text-rose-400 font-mono">{voicePreviewError}</p>
                )}
              </div>
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

        {/* Live Two-Way Audio Sandbox Simulator */}
        {isPreviewActive && (
          <AgentSandboxSimulator
            agentName={name}
            config={config}
            onClose={() => setIsPreviewActive(false)}
          />
        )}
      </div>
    </Modal>
  );
};

