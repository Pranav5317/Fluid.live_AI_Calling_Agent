import crypto from 'crypto';
import { AgentConfig, Call } from '../../src/types';

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
}

export class BackendSarvamProvider implements IBackendSarvamProvider {
  public providerName = 'Sarvam AI Voice Infrastructure (Server Bridge)';
  private mappings = new Map<string, SarvamAgentMapping>();
  private baseUrl = process.env.SARVAM_BASE_URL || 'https://apps.sarvam.ai/api';
  private orgId = process.env.SARVAM_ORG_ID || 'default_org';
  private workspaceId = process.env.SARVAM_WORKSPACE_ID || 'default_workspace';

  private getApiKey(): string | undefined {
    return process.env.SARVAM_API_KEY;
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
  }): Promise<{ providerCallId: string; status: 'initiated' }> {
    const apiKey = this.getApiKey();
    let providerCallId = `srv_interaction_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    if (apiKey) {
      try {
        const endpoint = `${this.baseUrl}/outbounds/v1/orgs/${this.orgId}/workspaces/${this.workspaceId}/outbounds`;
        console.log(`[Sarvam Provider] Initiating outbound call via Sarvam API (${endpoint}) to ${params.toPhoneNumber}...`);
        
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
          },
          body: JSON.stringify({
            app_config: {
              app_id: params.sarvamAgentId,
              app_version: 1,
              connection_config: {
                agent_phone_number: params.fromPhoneNumber,
              },
            },
            user_config: {
              user_phone_number: params.toPhoneNumber,
            },
            metadata: {
              lead_id: params.leadId,
              agent_version_id: params.agentVersionId,
              campaign_id: params.campaignId,
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          providerCallId = data.interaction_id || data.interactionId || data.call_id || providerCallId;
          console.log(`[Sarvam Provider] Outbound call initiated successfully. Interaction ID: ${providerCallId}`);
        } else {
          const errText = await res.text();
          throw new Error(`Sarvam API outbound call initiation failed (HTTP ${res.status}): ${errText}`);
        }
      } catch (err: any) {
        console.error(`[Sarvam Provider] Error calling Sarvam outbound API: ${err?.message}`);
        throw err;
      }
    } else {
      console.log(`[Sarvam Provider] SARVAM_API_KEY omitted. Initiated simulated outbound test call. Provider Interaction ID: ${providerCallId}`);
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

  async provisionNumber(areaCode = '800') {
    const randomNum = Math.floor(1000000 + Math.random() * 9000000);
    return {
      phoneNumber: `+1 (${areaCode}) ${String(randomNum).slice(0, 3)}-${String(randomNum).slice(3)}`,
      providerId: `srv_num_${Date.now()}`,
    };
  }
}

export const backendSarvamProvider = new BackendSarvamProvider();
