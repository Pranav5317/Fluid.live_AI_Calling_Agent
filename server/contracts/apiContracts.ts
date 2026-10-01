import {
  Business,
  Lead,
  CampaignLead,
  Campaign,
  Agent,
  AgentVersion,
  Call,
  UsageEvent,
  PhoneNumber,
  KnowledgeBase,
  KnowledgeDocument,
  WebhookEvent,
  BillingPeriod,
  DashboardMetrics,
  RecentActivity,
  CallActivityPoint
} from '../../src/types';

// API Response Wrapper Standard
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  timestamp: string;
}

// LEADS CONTRACTS
export interface GetLeadsQuery {
  search?: string;
  status?: string;
  campaignId?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateLeadDTO {
  name: string;
  phone: string;
  email?: string;
  metadata?: Record<string, any>;
  campaignId?: string;
}

export interface ImportLeadsDTO {
  leads: Array<{
    name: string;
    phone: string;
    email?: string;
    metadata?: Record<string, any>;
  }>;
  campaignId?: string;
}

// AGENTS CONTRACTS
export interface CreateAgentDTO {
  name: string;
  useCase: string;
  config: Agent['currentVersionId'] extends string ? any : any;
}

export interface CreateAgentVersionDTO {
  config: any;
  notes?: string;
}

// CAMPAIGNS CONTRACTS
export interface GetCampaignsQuery {
  search?: string;
  status?: string;
}

export interface CreateCampaignDTO {
  name: string;
  agentId: string;
  agentVersionId: string;
  phoneNumberId: string;
  totalLeads?: number;
  selectedLeadIds?: string[];
  scheduledAt?: string;
}

// CALLS CONTRACTS
export interface GetCallsQuery {
  search?: string;
  status?: string;
  outcome?: string;
  campaignId?: string;
  agentId?: string;
}

// PHONE NUMBERS CONTRACTS
export interface ProvisionNumberDTO {
  areaCode?: string;
}

export interface BindNumberDTO {
  assignedAgentId?: string;
}

// KNOWLEDGE BASE CONTRACTS
export interface CreateKnowledgeBaseDTO {
  name: string;
  description: string;
}

export interface UploadDocumentDTO {
  fileName: string;
  fileSize: number;
}

// WEBHOOK CONTRACTS (Sarvam -> Fluid Backend)
export interface SarvamWebhookPayload {
  eventType: 'call.started' | 'call.completed' | 'call.failed' | 'call.transcribed';
  interactionId: string; // Sarvam interaction/attempt ID for idempotency key
  callId?: string;
  campaignId?: string;
  agentId?: string;
  agentVersionId?: string;
  phoneNumber?: string;
  durationSeconds?: number;
  outcome?: string;
  transcript?: Array<{ speaker: 'agent' | 'lead'; text: string; timestampSeconds: number }>;
  extractedVariables?: Record<string, any>;
  providerCostUnits?: number;
  platformCostUnits?: number;
  error?: string;
}

export interface WebhookProcessingResult {
  receivedEventId: string;
  externalId: string;
  status: 'processed' | 'duplicate_ignored' | 'failed';
  processedAt: string;
}

