import { AgentConfig, Call } from '../types';

export interface ICallingProvider {
  providerName: string;
  syncAgentConfig(agentId: string, versionId: string, config: AgentConfig): Promise<{ providerAgentId: string; syncedAt: string }>;
  startCampaign(
    campaignId: string,
    providerAgentId: string,
    agentVersionId: string,
    phoneNumber: string
  ): Promise<{ providerCampaignId: string; status: 'active' }>;
  pauseCampaign(providerCampaignId: string): Promise<{ status: 'paused' }>;
  getCallTranscript(externalCallId: string): Promise<Call['transcript']>;
}

/**
 * Sarvam Calling Provider Frontend Interface.
 * Real calls and provisioning are handled by the server bridge through Sarvam Samvaad.
 */
export class SarvamProvider implements ICallingProvider {
  public providerName = 'Sarvam AI Voice Infrastructure';

  async syncAgentConfig(agentId: string, versionId: string, _config: AgentConfig) {
    return {
      providerAgentId: `srv_agent_${agentId}_${versionId}`,
      syncedAt: new Date().toISOString(),
    };
  }

  async startCampaign(campaignId: string, _providerAgentId: string, agentVersionId: string, _phoneNumber: string) {
    return {
      providerCampaignId: `srv_cmp_${campaignId}_${agentVersionId}`,
      status: 'active' as const,
    };
  }

  async pauseCampaign(_providerCampaignId: string) {
    return {
      status: 'paused' as const,
    };
  }

  async getCallTranscript(_externalCallId: string): Promise<Call['transcript']> {
    return [];
  }
}

export const defaultCallingProvider = new SarvamProvider();
