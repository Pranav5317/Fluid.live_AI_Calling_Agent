export interface Business {
  id: string;
  name: string;
  email: string;
  plan: string;
  timezone: string;
  createdAt: string;
}

export type AgentStatus = 'active' | 'inactive';

export interface ExtractedVariableConfig {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'enum';
  required: boolean;
  description: string;
  enumOptions?: string[];
}

export interface AgentRuntimeSettings {
  maxDurationMinutes: number;
  silenceTimeoutSeconds: number;
  interruptionSensitivity: 'low' | 'medium' | 'high';
  recordingEnabled: boolean;
}

export type CallNodeType = 'start' | 'opening' | 'question' | 'conditional' | 'data_collection' | 'closing' | 'end';

export interface CallFlowNode {
  id: string;
  type: CallNodeType;
  title: string;
  content: string;
  nextNodeId?: string;
  branches?: { condition: string; targetNodeId: string }[];
  variableKey?: string;
}

export interface AgentConfig {
  voiceModel: string;
  language: string;
  openingLine: string;
  closingBehavior: string;
  systemPrompt: string;
  flowNodes: CallFlowNode[];
  knowledgeBaseIds: string[];
  extractedVariables: ExtractedVariableConfig[];
  runtimeSettings: AgentRuntimeSettings;
}

export interface AgentVersion {
  id: string;
  agentId: string;
  versionNumber: number;
  config: AgentConfig;
  notes?: string;
  createdAt: string;
}

export interface Agent {
  id: string;
  name: string;
  useCase: string;
  status: AgentStatus;
  currentVersionId: string;
  campaignsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export type CampaignStatus = 
  | 'draft' 
  | 'scheduled' 
  | 'running' 
  | 'paused' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export interface Campaign {
  id: string;
  name: string;
  agentId: string;
  agentVersionId: string;
  phoneNumberId: string;
  status: CampaignStatus;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  totalLeads: number;
  completedCalls: number;
  callsAttempted: number;
  minutesUsed: number;
  createdAt: string;
}

export type CampaignLeadStatus = 
  | 'untouched' 
  | 'queued' 
  | 'calling' 
  | 'contacted' 
  | 'completed' 
  | 'failed' 
  | 'callback';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface CampaignLead {
  id: string;
  campaignId: string;
  leadId: string;
  status: CampaignLeadStatus;
  attemptCount: number;
  lastAttemptAt?: string;
  nextAttemptAt?: string;
}

export type CallStatus = 
  | 'queued' 
  | 'in-progress' 
  | 'completed' 
  | 'failed' 
  | 'busy' 
  | 'no-answer' 
  | 'voicemail';

export type CallOutcome = 
  | 'successful_contact' 
  | 'callback_requested' 
  | 'not_interested' 
  | 'unreachable' 
  | 'voicemail_left' 
  | 'wrong_number' 
  | 'technical_failure';

export interface TranscriptMessage {
  id: string;
  speaker: 'agent' | 'lead';
  text: string;
  timestampSeconds: number;
}

export interface Call {
  id: string;
  externalCallId: string;
  campaignId: string;
  agentId: string;
  agentVersionId: string;
  leadId: string;
  phoneNumberId: string;
  status: CallStatus;
  outcome: CallOutcome;
  durationSeconds: number;
  startedAt: string;
  endedAt?: string;
  transcript: TranscriptMessage[];
  extractedVariables: Record<string, any>;
  usageEventId?: string;
}

export interface UsageEvent {
  id: string;
  callId: string;
  campaignId: string;
  agentId: string;
  durationMinutes: number;
  providerCostUnits: number;
  platformCostUnits: number;
  timestamp: string;
}

export type PhoneStatus = 'active' | 'unassigned' | 'reserved';

export interface PhoneNumber {
  id: string;
  phoneNumber: string;
  status: PhoneStatus;
  provider: string;
  assignedAgentId?: string;
  assignedCampaignId?: string;
  createdAt: string;
}

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  documentCount: number;
  assignedAgentIds: string[];
  createdAt: string;
}

export type DocumentStatus = 'processing' | 'ready' | 'failed';

export interface KnowledgeDocument {
  id: string;
  knowledgeBaseId: string;
  fileName: string;
  fileSize: number;
  status: DocumentStatus;
  uploadedAt: string;
  error?: string;
}

export interface WebhookEvent {
  id: string;
  provider: 'sarvam';
  eventType: string;
  externalId: string;
  payload: Record<string, any>;
  status: 'processed' | 'failed';
  receivedAt: string;
  error?: string;
}

export interface BillingPeriod {
  id: string;
  periodName: string;
  startDate: string;
  endDate: string;
  totalMinutesUsed: number;
  totalCallsCount: number;
  estimatedTotalCost: number;
  providerCostTotal: number;
  platformCostTotal: number;
  status: 'current' | 'paid' | 'pending';
}

export interface DashboardMetrics {
  totalLeads: number;
  untouchedLeads: number;
  campaignsBuilt: number;
  callsAttempted: number;
  minutesUtilized: number;
  leadsTrendPercentage: number;
  untouchedTrendPercentage: number;
  campaignsTrendPercentage: number;
  callsTrendPercentage: number;
  minutesTrendPercentage: number;
}

export interface RecentActivity {
  id: string;
  type: 'campaign_started' | 'campaign_completed' | 'agent_created' | 'agent_updated' | 'call_completed' | 'leads_imported';
  title: string;
  description: string;
  timestamp: string;
  entityId?: string;
}

export interface CallActivityPoint {
  date: string;
  attempts: number;
  completed: number;
}

