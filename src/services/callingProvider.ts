import { AgentConfig, Call } from '../types';

export interface ICallingProvider {
  providerName: string;
  
  /**
   * Syncs agent configuration and prompt settings with the calling provider backend.
   */
  syncAgentConfig(agentId: string, versionId: string, config: AgentConfig): Promise<{ providerAgentId: string; syncedAt: string }>;

  /**
   * Triggers an outbound campaign execution on provider infrastructure with a locked AgentVersion.
   */
  startCampaign(
    campaignId: string,
    providerAgentId: string,
    agentVersionId: string,
    phoneNumber: string
  ): Promise<{ providerCampaignId: string; status: 'active' }>;

  /**
   * Pauses an ongoing campaign on provider infrastructure.
   */
  pauseCampaign(providerCampaignId: string): Promise<{ status: 'paused' }>;

  /**
   * Fetches latest call transcript from provider.
   */
  getCallTranscript(externalCallId: string): Promise<Call['transcript']>;

  /**
   * Allocates/provisions a new phone number from provider inventory.
   */
  provisionNumber(areaCode?: string): Promise<{ phoneNumber: string; providerId: string }>;
}

/**
 * Sarvam Calling Provider Implementation.
 * Decoupled provider abstraction interface for Fluid.Live backend execution.
 */
export class SarvamProvider implements ICallingProvider {
  public providerName = 'Sarvam AI Voice Infrastructure';

  async syncAgentConfig(agentId: string, versionId: string, _config: AgentConfig) {
    return {
      providerAgentId: `srv_agent_${agentId}_${versionId}`,
      syncedAt: new Date().toISOString(),
    };
  }

  async startCampaign(campaignId: string, providerAgentId: string, agentVersionId: string, _phoneNumber: string) {
    return {
      providerCampaignId: `srv_cmp_${campaignId}_${agentVersionId}`,
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
      { id: 't1', speaker: 'agent' as const, text: 'Hello, this is Sarvam AI Agent.', timestampSeconds: 2 },
      { id: 't2', speaker: 'lead' as const, text: 'Hi, I received your call.', timestampSeconds: 10 },
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

export const defaultCallingProvider = new SarvamProvider();
