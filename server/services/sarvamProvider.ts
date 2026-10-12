import crypto from 'crypto';
import { AgentConfig, Call, SarvamAccountStatus, SarvamAccountConfig } from '../../src/types';
import { updateEnvVariables } from '../lib/envUtils';

export interface SarvamAgentMapping {
  fluidAgentId: string;
  fluidVersionId: string;
  sarvamAgentId: string;
  sarvamVersionId: string;
  syncedAt: string;
}

export interface NormalizedSarvamEvent {
  providerEventId: string;
  externalCallId: string;
  eventType: string;
  canonicalStatus: 'initiated' | 'in-progress' | 'completed' | 'failed' | 'no_answer' | 'unknown';
  outcome?: Call['outcome'];
  durationSeconds?: number;
  providerCostUnits?: number;
  platformCostUnits?: number;
  transcript?: Call['transcript'];
  extractedVariables?: Record<string, any>;
  campaignId?: string;
  agentId?: string;
  agentVersionId?: string;
  leadId?: string;
}

export interface IBackendSarvamProvider {
  providerName: string;
  syncAgentConfig(agentId: string, versionId: string, config: AgentConfig): Promise<SarvamAgentMapping>;
  initiateOutboundCall(params: {
    agentVersionId: string;
    sarvamAgentId: string;
    fromPhoneNumber: string;
    toPhoneNumber: string;
    leadId: string;
    campaignId?: string;
  }): Promise<{ providerCallId: string; status: 'initiated' }>;
  normalizeWebhookPayload(payload: Record<string, any>): NormalizedSarvamEvent;
  provisionNumber(areaCode?: string): Promise<{ phoneNumber: string; providerId: string }>;
  getMapping(fluidVersionId: string): SarvamAgentMapping | undefined;
  fetchCallTranscript(interactionId: string, appId?: string): Promise<any>;
  fetchInteractions(params?: { startDatetime?: string; endDatetime?: string; limit?: number; appId?: string }): Promise<any>;
}

export class BackendSarvamProvider implements IBackendSarvamProvider {
  public providerName = 'Sarvam AI Voice Infrastructure (Server Bridge)';
  private mappings = new Map<string, SarvamAgentMapping>();
  private baseUrl = process.env.SARVAM_BASE_URL || 'https://apps.sarvam.ai/api';
  private orgId = process.env.SARVAM_ORG_ID || '019e9100-606e-790c-92e0-0bcfbf8523a6';
  private workspaceId = process.env.SARVAM_WORKSPACE_ID || '019e9100-60a1-7bd7-bdb5-3b118f090be9';
  private defaultAppId = process.env.SARVAM_APP_ID || 'Conversatio-b063cf10-e735';
  private connectionId = process.env.SARVAM_CONNECTION_ID || '7efd8897-87-220da5aa-1d5e';
  private agentPhoneNumber = process.env.SARVAM_AGENT_PHONE_NUMBER || '+917965480599';
  private apiKey = process.env.SARVAM_API_KEY;
  private lastVerifiedAt: string | undefined = undefined;
  private lastLatencyMs: number | undefined = undefined;

  private getApiKey(): string | undefined {
    return this.apiKey || process.env.SARVAM_API_KEY;
  }

  public getConnectionId(): string {
    return this.connectionId;
  }

  public getAgentPhoneNumber(): string {
    return this.agentPhoneNumber;
  }

  public getDefaultAppId(): string {
    return this.defaultAppId;
  }

  public getOrgId(): string {
    return this.orgId;
  }

  public getWorkspaceId(): string {
    return this.workspaceId;
  }

  public getStatus(): SarvamAccountStatus {
    const key = this.getApiKey();
    return {
      connected: !!key,
      orgId: this.orgId,
      workspaceId: this.workspaceId,
      defaultAppId: this.defaultAppId,
      connectionId: this.connectionId,
      agentPhoneNumber: this.agentPhoneNumber,
      maskedApiKey: key ? (key.length > 18 ? `${key.substring(0, 14)}••••${key.substring(key.length - 4)}` : '••••••••') : null,
      lastVerifiedAt: this.lastVerifiedAt,
      latencyMs: this.lastLatencyMs,
    };
  }

  public async testConnection(customConfig?: Partial<SarvamAccountConfig>): Promise<{ success: boolean; latencyMs: number; message: string; details?: any }> {
    const testKey = customConfig?.apiKey || this.getApiKey();
    const testOrgId = customConfig?.orgId || this.orgId;
    const testWorkspaceId = customConfig?.workspaceId || this.workspaceId;
    const testAppId = customConfig?.defaultAppId || this.defaultAppId;

    if (!testKey) {
      return { success: false, latencyMs: 0, message: 'No Sarvam API Key provided.' };
    }

    const startTime = Date.now();
    try {
      const now = new Date();
      const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const start = encodeURIComponent(past24h.toISOString());
      const end = encodeURIComponent(now.toISOString());
      const endpoint = `${this.baseUrl}/analytics/v1/${testOrgId}/${testWorkspaceId}/${testAppId}/interactions?start_datetime=${start}&end_datetime=${end}&limit=1`;
      console.log(`[Sarvam Provider] Testing connection to ${endpoint}...`);
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'X-API-Key': testKey,
          'Content-Type': 'application/json',
        },
      });

      const latencyMs = Date.now() - startTime;
      if (res.ok) {
        this.lastVerifiedAt = new Date().toISOString();
        this.lastLatencyMs = latencyMs;
        console.log(`[Sarvam Provider] Test succeeded in ${latencyMs}ms`);
        return {
          success: true,
          latencyMs,
          message: `Successfully connected & authenticated with Sarvam AI Voice Cloud (${latencyMs}ms).`,
        };
      } else {
        const errText = await res.text();
        console.warn(`[Sarvam Provider] Connection test HTTP ${res.status}: ${errText}`);
        return {
          success: false,
          latencyMs,
          message: `Sarvam API returned HTTP ${res.status}: ${errText.slice(0, 200)}`,
        };
      }
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      return {
        success: false,
        latencyMs,
        message: `Network connection to Sarvam failed: ${err?.message}`,
      };
    }
  }

  public async updateConfig(config: SarvamAccountConfig): Promise<{ success: boolean; status: SarvamAccountStatus; testResult: any }> {
    const envUpdates: Record<string, string> = {};

    if (config.apiKey !== undefined && config.apiKey.trim()) {
      this.apiKey = config.apiKey.trim();
      process.env.SARVAM_API_KEY = this.apiKey;
      envUpdates.SARVAM_API_KEY = this.apiKey;
    }
    if (config.orgId !== undefined && config.orgId.trim()) {
      this.orgId = config.orgId.trim();
      process.env.SARVAM_ORG_ID = this.orgId;
      envUpdates.SARVAM_ORG_ID = this.orgId;
    }
    if (config.workspaceId !== undefined && config.workspaceId.trim()) {
      this.workspaceId = config.workspaceId.trim();
      process.env.SARVAM_WORKSPACE_ID = this.workspaceId;
      envUpdates.SARVAM_WORKSPACE_ID = this.workspaceId;
    }
    if (config.defaultAppId !== undefined && config.defaultAppId.trim()) {
      this.defaultAppId = config.defaultAppId.trim();
      process.env.SARVAM_APP_ID = this.defaultAppId;
      envUpdates.SARVAM_APP_ID = this.defaultAppId;
    }
    if (config.connectionId !== undefined && config.connectionId.trim()) {
      this.connectionId = config.connectionId.trim();
      process.env.SARVAM_CONNECTION_ID = this.connectionId;
      envUpdates.SARVAM_CONNECTION_ID = this.connectionId;
    }
    if (config.agentPhoneNumber !== undefined && config.agentPhoneNumber.trim()) {
      this.agentPhoneNumber = config.agentPhoneNumber.trim();
      process.env.SARVAM_AGENT_PHONE_NUMBER = this.agentPhoneNumber;
      envUpdates.SARVAM_AGENT_PHONE_NUMBER = this.agentPhoneNumber;
    }

    if (Object.keys(envUpdates).length > 0) {
      updateEnvVariables(envUpdates);
    }

    const testResult = await this.testConnection();
    return {
      success: testResult.success,
      status: this.getStatus(),
      testResult,
    };
  }

  async syncAgentConfig(agentId: string, versionId: string, config: AgentConfig): Promise<SarvamAgentMapping> {
    const apiKey = this.getApiKey();
    let sarvamAgentId = `srv_app_${agentId}`;
    let sarvamVersionId = `1`;

    if (apiKey) {
      try {
        const endpoint = `${this.baseUrl}/v1/orgs/${this.orgId}/workspaces/${this.workspaceId}/apps`;
        console.log(`[Sarvam Provider] Syncing agent config to Sarvam API (${endpoint})...`);
        
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
          },
          body: JSON.stringify({
            name: `Fluid_Agent_${agentId}`,
            app_type: 'voice_agent',
            config: {
              prompt: config.systemPrompt,
              greeting: config.firstGreeting || config.openingLine,
              voice: config.voiceId || config.voiceModel || 'sarvam_v1',
              language: config.language || 'en-IN',
              temperature: config.temperature || 0.7,
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          sarvamAgentId = data.app_id || data.id || sarvamAgentId;
          sarvamVersionId = String(data.app_version || 1);
          console.log(`[Sarvam Provider] Sync succeeded. Provider App ID: ${sarvamAgentId}`);
        } else {
          console.warn(`[Sarvam Provider] HTTP ${res.status} from Sarvam API during syncAgentConfig. Falling back to local mapping.`);
        }
      } catch (err: any) {
        console.error(`[Sarvam Provider] Network error syncing agent to Sarvam: ${err?.message}`);
      }
    } else {
      console.log(`[Sarvam Provider] SARVAM_API_KEY omitted. Registered simulated provider mapping.`);
    }

    const mapping: SarvamAgentMapping = {
      fluidAgentId: agentId,
      fluidVersionId: versionId,
      sarvamAgentId,
      sarvamVersionId,
      syncedAt: new Date().toISOString(),
    };

    this.mappings.set(versionId, mapping);
    return mapping;
  }

  getMapping(fluidVersionId: string): SarvamAgentMapping | undefined {
    return this.mappings.get(fluidVersionId);
  }

  async initiateOutboundCall(params: {
    agentVersionId: string;
    sarvamAgentId: string;
    fromPhoneNumber: string;
    toPhoneNumber: string;
    leadId: string;
    campaignId?: string;
    connectionId?: string;
    webhookUrl?: string;
    userName?: string;
    agentVariables?: Record<string, any>;
    initialBotMessage?: string;
    outroMessage?: string;
    systemPrompt?: string;
  }): Promise<{ providerCallId: string; status: 'initiated' }> {
    const apiKey = this.getApiKey();
    let providerCallId = `srv_interaction_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    if (apiKey) {
      try {
        const endpoint = `${this.baseUrl}/outbounds/v1/orgs/${this.orgId}/workspaces/${this.workspaceId}/outbounds`;
        console.log(`[Sarvam Provider] Initiating outbound call via Sarvam API (${endpoint}) to ${params.toPhoneNumber} (Lead Name: ${params.userName || 'Customer'})...`);
        
        const appId = (params.sarvamAgentId && !params.sarvamAgentId.startsWith('srv_app_')) 
          ? params.sarvamAgentId 
          : this.defaultAppId;

        const connectionId = params.connectionId || this.connectionId;
        const agentPhoneNumber = (params.fromPhoneNumber && params.fromPhoneNumber.startsWith('+91'))
          ? params.fromPhoneNumber
          : this.agentPhoneNumber;

        const cleanUserName = params.userName ? params.userName.replace(/\s*\(.*?\)\s*/g, '').trim() : 'Valued Customer';

        const payload: any = {
          app_config: {
            app_id: appId,
            app_version: 1,
            connection_config: {
              connection_id: connectionId,
              agent_phone_number: agentPhoneNumber,
            },
            agent_variables: {
              user_name: cleanUserName,
              call_summary: '<call_summary>',
              follow_up_preference: '<follow_up_preference>',
              interest_level: '<interest_level>',
              verification_status: '<verification_status>',
              ...(params.agentVariables || {}),
            },
          },
          user_config: {
            user_phone_number: params.toPhoneNumber,
          },
        };

        if (params.initialBotMessage || params.systemPrompt) {
          payload.app_config.app_overrides = {
            ...(params.initialBotMessage ? { initial_bot_message: params.initialBotMessage.replace(/<user_name>/g, cleanUserName) } : {}),
            ...(params.systemPrompt ? { prompt: params.systemPrompt.replace(/<user_name>/g, cleanUserName) } : {}),
          };
        }

        if (params.webhookUrl) {
          payload.webhook_config = {
            url: params.webhookUrl,
            metadata: {
              lead_id: params.leadId,
              agent_version_id: params.agentVersionId,
              campaign_id: params.campaignId,
            },
          };
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data = await res.json();
          providerCallId = data.attempt_id || data.interaction_id || data.interactionId || data.call_id || providerCallId;
          console.log(`[Sarvam Provider] Outbound call initiated successfully. Attempt ID: ${providerCallId}`);
        } else {
          const errText = await res.text();
          throw new Error(`Sarvam API outbound call initiation failed (HTTP ${res.status}): ${errText}`);
        }
      } catch (err: any) {
        console.error(`[Sarvam Provider] Error calling Sarvam outbound API: ${err?.message}`);
        throw err;
      }
    } else {
      console.log(`[Sarvam Provider] SARVAM_API_KEY omitted. Initiated simulated outbound test call. Provider Attempt ID: ${providerCallId}`);
    }

    return { providerCallId, status: 'initiated' };
  }

  normalizeWebhookPayload(payload: Record<string, any>): NormalizedSarvamEvent {
    // 1. Stable Call Correlation Identifier
    const rawCallId = payload.interaction_id || payload.interactionId || payload.call_id || payload.callId || payload.metadata?.local_call_id;
    let externalCallId = rawCallId;
    if (!externalCallId) {
      if (payload.user_phone_number || payload.to_phone_number || payload.metadata?.lead_id) {
        const hash = crypto.createHash('sha256').update(JSON.stringify({
          to: payload.user_phone_number || payload.user_config?.user_phone_number || payload.to_phone_number,
          lead: payload.metadata?.lead_id,
          time: payload.start_datetime || payload.timestamp || payload.created_at || 'n/a'
        })).digest('hex').substring(0, 16);
        externalCallId = `call_fallback_${hash}`;
      } else {
        externalCallId = 'srv_interaction_unknown';
      }
    }
    
    // 2. Webhook Delivery Event Identifier for Idempotency (100% Deterministic)
    const rawEventId = payload.event_id || payload.eventId || payload.id;
    let providerEventId = rawEventId;
    if (!providerEventId) {
      const eventTypeHint = payload.event_type || payload.eventType || (payload.duration !== undefined ? 'completed' : 'initiated');
      const hash = crypto.createHash('sha256').update(JSON.stringify({
        callId: externalCallId,
        eventType: eventTypeHint,
        start: payload.start_datetime || payload.timestamp || '',
        duration: payload.duration !== undefined ? payload.duration : null
      })).digest('hex').substring(0, 16);
      providerEventId = `wh_evt_${hash}`;
    }
    
    const eventType = payload.event_type || payload.eventType || (payload.duration !== undefined || payload.end_datetime ? 'call.completed' : 'call.initiated');

    let canonicalStatus: NormalizedSarvamEvent['canonicalStatus'] = 'unknown';
    let outcome: Call['outcome'] | undefined = undefined;

    // Detect completion via duration or end_datetime or event_type
    if (payload.duration !== undefined || payload.end_datetime || eventType === 'call.completed' || eventType === 'call.ended') {
      canonicalStatus = 'completed';
      outcome = (payload.outcome as any) || 'successful_contact';
    } else if (eventType === 'call.initiated' || eventType === 'call.created') {
      canonicalStatus = 'initiated';
    } else if (eventType === 'call.connected' || eventType === 'call.answered') {
      canonicalStatus = 'in-progress';
    } else if (eventType === 'call.failed') {
      canonicalStatus = 'failed';
      outcome = 'system_error';
    } else if (eventType === 'call.no_answer' || eventType === 'call.busy') {
      canonicalStatus = 'no_answer';
      outcome = 'unreachable';
    } else {
      canonicalStatus = 'unknown';
    }

    const duration = payload.duration || payload.duration_seconds || payload.durationSeconds || (canonicalStatus === 'completed' ? 120 : 0);
    const durationMinutes = Number((duration / 60).toFixed(2));

    // Normalize interaction_transcript array if present
    let transcript: Call['transcript'] | undefined = undefined;
    if (Array.isArray(payload.interaction_transcript)) {
      transcript = payload.interaction_transcript.map((turn: any, index: number) => ({
        id: `t_${index}`,
        speaker: turn.role === 'user' ? 'lead' : 'agent',
        text: turn.en_text || turn.text || turn.indic_text || '',
        timestampSeconds: (index + 1) * 4,
      }));
    } else if (Array.isArray(payload.transcript)) {
      transcript = payload.transcript;
    }

    // Normalize extracted variables
    const extractedVariables = payload.final_agent_variables || payload.output_agent_variables || payload.extracted_variables || payload.extractedVariables || undefined;

    const metadata = payload.metadata || {};

    return {
      providerEventId,
      externalCallId,
      eventType,
      canonicalStatus,
      outcome,
      durationSeconds: duration,
      providerCostUnits: payload.provider_cost_units || payload.providerCostUnits || Number((durationMinutes * 0.05).toFixed(3)),
      platformCostUnits: payload.platform_cost_units || payload.platformCostUnits || Number((durationMinutes * 0.08).toFixed(3)),
      transcript,
      extractedVariables,
      campaignId: metadata.campaign_id || payload.campaign_id || payload.campaignId || undefined,
      agentId: metadata.agent_id || payload.agent_id || payload.agentId || undefined,
      agentVersionId: metadata.agent_version_id || payload.agent_version_id || payload.agentVersionId || undefined,
      leadId: metadata.lead_id || payload.lead_id || payload.leadId || undefined,
    };
  }

  async startCampaign(campaignId: string, agentId: string, versionId: string, _phoneNumber: string) {
    let mapping = this.getMapping(versionId);
    if (!mapping) {
      mapping = await this.syncAgentConfig(agentId, versionId, { systemPrompt: 'Campaign agent' } as any);
    }
    return {
      providerCampaignId: `srv_cmp_${campaignId}_${mapping.sarvamVersionId}`,
      status: 'active' as const,
    };
  }

  async pauseCampaign(_providerCampaignId: string) {
    return { status: 'paused' as const };
  }

  async fetchCallTranscript(jobOrInteractionId: string, appId?: string): Promise<any> {
    const apiKey = this.getApiKey();
    const targetAppId = appId || process.env.SARVAM_APP_ID || 'Conversatio-b063cf10-e735';
    
    if (!apiKey) {
      console.warn(`[Sarvam Provider] SARVAM_API_KEY omitted. Cannot fetch transcript for interaction ${jobOrInteractionId}`);
      return null;
    }

    try {
      let realInteractionId = jobOrInteractionId;
      let extractedVariables: any = undefined;
      let callDuration: number | undefined = undefined;

      // If jobOrInteractionId doesn't contain a slash '/', resolve interaction_id & agent_variables via /interactions
      if (!jobOrInteractionId.includes('/')) {
        console.log(`[Sarvam Provider] Resolving job_id/attempt_id (${jobOrInteractionId}) to Sarvam interaction_id...`);
        const interactionsRes = await this.fetchInteractions({ appId: targetAppId, limit: 30 });
        if (interactionsRes && Array.isArray(interactionsRes.items)) {
          const matchedItem = interactionsRes.items.find(
            (item: any) => item.job_id === jobOrInteractionId || item.interaction_id?.endsWith(jobOrInteractionId)
          ) || interactionsRes.items[0]; // Fallback to latest interaction if direct attempt match is processing

          if (matchedItem) {
            realInteractionId = matchedItem.interaction_id;
            extractedVariables = matchedItem.agent_variables || matchedItem.extracted_variables;
            callDuration = matchedItem.duration_in_seconds;
            console.log(`[Sarvam Provider] Mapped attempt ${jobOrInteractionId} -> interaction_id: ${realInteractionId}`);
          }
        }
      }

      const endpoint = `${this.baseUrl}/analytics/v1/${this.orgId}/${this.workspaceId}/${targetAppId}/transcripts/${realInteractionId}`;
      console.log(`[Sarvam Provider] Fetching transcript from Sarvam Analytics API (${endpoint})...`);

      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        const data = await res.json();
        console.log(`[Sarvam Provider] Successfully fetched transcript for ${realInteractionId}. Messages count: ${data.messages?.length || 0}`);
        return {
          ...data,
          extracted_variables: extractedVariables || data.extracted_variables || data.agent_variables,
          duration: callDuration || data.duration,
        };
      } else {
        const errText = await res.text();
        console.warn(`[Sarvam Provider] HTTP ${res.status} fetching transcript: ${errText}`);
        return null;
      }
    } catch (err: any) {
      console.error(`[Sarvam Provider] Error fetching transcript: ${err?.message}`);
      return null;
    }
  }

  async fetchInteractions(params?: { startDatetime?: string; endDatetime?: string; limit?: number; appId?: string }): Promise<any> {
    const apiKey = this.getApiKey();
    const targetAppId = params?.appId || process.env.SARVAM_APP_ID || 'Conversatio-b063cf10-e735';
    
    if (!apiKey) {
      return { items: [], total: 0 };
    }

    try {
      const now = new Date();
      const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const start = params?.startDatetime || past24h.toISOString();
      const end = params?.endDatetime || now.toISOString();
      const limit = params?.limit || 20;

      const endpoint = `${this.baseUrl}/analytics/v1/${this.orgId}/${this.workspaceId}/${targetAppId}/interactions?start_datetime=${encodeURIComponent(start)}&end_datetime=${encodeURIComponent(end)}&limit=${limit}`;
      console.log(`[Sarvam Provider] Fetching interactions from Sarvam Analytics API (${endpoint})...`);

      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        const data = await res.json();
        return data;
      } else {
        const errText = await res.text();
        console.warn(`[Sarvam Provider] HTTP ${res.status} fetching interactions: ${errText}`);
        return { items: [], total: 0 };
      }
    } catch (err: any) {
      console.error(`[Sarvam Provider] Error fetching interactions: ${err?.message}`);
      return { items: [], total: 0 };
    }
  }

  async provisionNumber(_areaCode = '800') {
    return {
      phoneNumber: this.agentPhoneNumber,
      providerId: this.connectionId,
    };
  }
}

export const backendSarvamProvider = new BackendSarvamProvider();
