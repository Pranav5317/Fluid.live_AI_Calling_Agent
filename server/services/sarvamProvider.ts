import { AgentConfig, Call } from '../../src/types';

export interface SarvamAgentMapping {
  fluidAgentId: string;
  fluidVersionId: string;
  sarvamAgentId: string;
  sarvamVersionId: string;
  syncedAt: string;
}

export interface IBackendSarvamProvider {
  providerName: string;
  syncAgentConfig(agentId: string, versionId: string, config: AgentConfig): Promise<SarvamAgentMapping>;
  startCampaign(campaignId: string, agentId: string, versionId: string, phoneNumber: string): Promise<{ providerCampaignId: string; status: 'active' }>;
  pauseCampaign(providerCampaignId: string): Promise<{ status: 'paused' }>;
  getCallTranscript(externalCallId: string): Promise<Call['transcript']>;
  provisionNumber(areaCode?: string): Promise<{ phoneNumber: string; providerId: string }>;
  getMapping(fluidVersionId: string): SarvamAgentMapping | undefined;
}

export class BackendSarvamProvider implements IBackendSarvamProvider {
  public providerName = 'Sarvam AI Voice Infrastructure (Server Bridge)';
  private mappings = new Map<string, SarvamAgentMapping>();

  async syncAgentConfig(agentId: string, versionId: string, config: AgentConfig): Promise<SarvamAgentMapping> {
    const sarvamAgentId = `srv_agent_${agentId}`;
    const sarvamVersionId = `srv_ver_${versionId}_${Date.now().toString().slice(-4)}`;

    const mapping: SarvamAgentMapping = {
      fluidAgentId: agentId,
      fluidVersionId: versionId,
      sarvamAgentId,
      sarvamVersionId,
      syncedAt: new Date().toISOString(),
    };

    // Store explicit mapping between Fluid AgentVersion and Sarvam provider version ID
    this.mappings.set(versionId, mapping);
    return mapping;
  }

  getMapping(fluidVersionId: string): SarvamAgentMapping | undefined {
    return this.mappings.get(fluidVersionId);
  }

  async startCampaign(campaignId: string, agentId: string, versionId: string, _phoneNumber: string) {
    let mapping = this.getMapping(versionId);
    if (!mapping) {
      mapping = {
        fluidAgentId: agentId,
        fluidVersionId: versionId,
        sarvamAgentId: `srv_agent_${agentId}`,
        sarvamVersionId: `srv_ver_${versionId}`,
        syncedAt: new Date().toISOString(),
      };
      this.mappings.set(versionId, mapping);
    }

    return {
      providerCampaignId: `srv_cmp_${campaignId}_${mapping.sarvamVersionId}`,
      status: 'active' as const,
    };
  }

  async pauseCampaign(providerCampaignId: string) {
    return {
      status: 'paused' as const,
    };
  }

  async getCallTranscript(_externalCallId: string) {
    return [
      { id: 'tr_srv_1', speaker: 'agent' as const, text: 'Hello, this is Sarvam AI Agent.', timestampSeconds: 2 },
      { id: 'tr_srv_2', speaker: 'lead' as const, text: 'Hi, I received your call.', timestampSeconds: 10 },
    ];
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

