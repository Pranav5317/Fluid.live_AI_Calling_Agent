import prisma from '../lib/prisma';
import { Call } from '../../src/types';
import { callRepository, CallFilterParams } from '../repositories/callRepository';
import { backendSarvamProvider } from './sarvamProvider';
import { r2StorageService } from './r2StorageService';

export interface InitiateTestCallDTO {
  agentVersionId: string;
  phoneNumberId: string;
  toPhoneNumber: string;
  leadId?: string;
  userName?: string;
}

export class ServerCallService {
  async getCalls(options: CallFilterParams = {}): Promise<Call[]> {
    return callRepository.getCalls(options);
  }

  async getCallById(id: string): Promise<Call | null> {
    return callRepository.getCallById(id);
  }

  async initiateTestCall(dto: InitiateTestCallDTO): Promise<Call> {
    // 1. Server-Side Validation & Authorization
    if (!dto.agentVersionId || !dto.phoneNumberId || !dto.toPhoneNumber) {
      throw new Error('agentVersionId, phoneNumberId, and toPhoneNumber are required.');
    }

    const agentVersion = await prisma.agentVersion.findUnique({
      where: { id: dto.agentVersionId },
      include: { agent: true },
    });

    if (!agentVersion) {
      throw new Error(`AgentVersion not found: ${dto.agentVersionId}`);
    }

    const phoneNumber = await prisma.phoneNumber.findUnique({
      where: { id: dto.phoneNumberId },
    });

    if (!phoneNumber) {
      throw new Error(`PhoneNumber not found: ${dto.phoneNumberId}`);
    }

    // Tenant Isolation & Multi-Tenant Authorization Check
    if (agentVersion.agent.businessId && phoneNumber.businessId && agentVersion.agent.businessId !== phoneNumber.businessId) {
      throw new Error(`Tenant authorization failed: Agent business (${agentVersion.agent.businessId}) does not match PhoneNumber business (${phoneNumber.businessId}).`);
    }

    // Get or fallback lead
    let leadId = dto.leadId;
    if (!leadId) {
      const firstLead = await prisma.lead.findFirst();
      if (!firstLead) throw new Error('No lead available to initiate test call.');
      leadId = firstLead.id;
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      throw new Error(`Lead not found: ${leadId}`);
    }

    // 2. Sync/Ensure Sarvam Agent Config
    const mapping = await backendSarvamProvider.syncAgentConfig(
      agentVersion.agentId,
      agentVersion.id,
      agentVersion.config as any
    );

    const config = (agentVersion.config as any) || {};

    // 3. Initiate call via Sarvam Provider
    const result = await backendSarvamProvider.initiateOutboundCall({
      agentVersionId: agentVersion.id,
      sarvamAgentId: config.sarvamAppId || mapping.sarvamAgentId,
      connectionId: config.sarvamConnectionId || phoneNumber.providerId || undefined,
      fromPhoneNumber: phoneNumber.phoneNumber,
      toPhoneNumber: dto.toPhoneNumber,
      leadId: lead.id,
      userName: dto.userName || lead.name,
      initialBotMessage: config.firstGreeting || config.openingLine,
      outroMessage: config.closingBehavior || config.outroMessage,
      systemPrompt: config.systemPrompt,
    });

    // 4. On Provider Initiation Success, persist pending Call record
    return await callRepository.createCall({
      externalCallId: result.providerCallId,
      campaignId: null, // Standalone test call
      agentId: agentVersion.agentId,
      agentVersionId: agentVersion.id,
      leadId: lead.id,
      phoneNumberId: phoneNumber.id,
      status: 'initiated' as any,
    });
  }

  async fetchTranscriptForCall(callId: string): Promise<{ call: Call; transcriptData: any }> {
    const call = await callRepository.getCallById(callId);
    if (!call) {
      throw new Error(`Call record not found: ${callId}`);
    }

    // Pass call.startedAt to narrow the search window if resolving from job_id
    let lookupId = (call.extractedVariables as any)?._sarvam_interaction_id || call.externalCallId;
    const transcriptData = await backendSarvamProvider.fetchCallTranscript(lookupId, undefined, call.startedAt);
    
    if (transcriptData) {
      const rawMessages = transcriptData.messages || transcriptData.turns || transcriptData.transcript || (Array.isArray(transcriptData) ? transcriptData : []);
      
      const formattedTranscript = rawMessages.map((msg: any, index: number) => ({
        id: `t_${index + 1}`,
        speaker: (msg.role === 'assistant' || msg.role === 'agent' || msg.speaker === 'agent') ? 'agent' : 'lead',
        text: msg.content || msg.text || msg.en_text || msg.indic_text || '',
        timestampSeconds: msg.timestampSeconds || (index + 1) * 4,
      }));

      const rawVars = transcriptData.extracted_variables || transcriptData.agent_variables || {};
      const durationSecs = Math.round(transcriptData.duration ?? transcriptData.duration_in_seconds ?? call.durationSeconds ?? 0);
      const durationMins = Number((durationSecs / 60).toFixed(2));
      const providerCost = Number((durationMins * 0.05).toFixed(3));
      const platformCost = Number((durationMins * 0.08).toFixed(3));

      // Derive genuine outcome from real Sarvam variables & metrics
      let outcome = call.outcome || 'successful_contact';
      if (durationSecs === 0) {
        outcome = 'unreachable';
      } else if (rawVars.interest_level === 'interested') {
        outcome = rawVars.follow_up_preference === 'callback' ? 'callback_requested' : 'successful_contact';
      } else if (rawVars.interest_level === 'not_interested') {
        outcome = 'not_interested';
      } else if (rawVars.verification_status === 'incomplete' && transcriptData.goal_overall_status === 'failed') {
        outcome = 'not_interested';
      } else if (durationSecs > 0) {
        outcome = 'successful_contact';
      }

      const status = durationSecs > 0 || formattedTranscript.length > 0 ? 'completed' : (outcome === 'unreachable' ? 'failed' : 'completed');

      const extractedVars = {
        ...((call.extractedVariables as any) || {}),
        ...rawVars,
        ...(transcriptData.real_interaction_id ? { _sarvam_interaction_id: transcriptData.real_interaction_id } : {}),
      };

      await prisma.call.update({
        where: { id: call.id },
        data: {
          status,
          outcome,
          durationSeconds: durationSecs,
          transcript: formattedTranscript as any,
          extractedVariables: extractedVars as any,
        },
      });

      // Create production UsageEvent linked to call if not existing
      if (durationSecs > 0) {
        try {
          await prisma.usageEvent.create({
            data: {
              id: `usg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
              callId: call.id,
              campaignId: call.campaignId || null,
              agentId: call.agentId,
              durationMinutes: durationMins,
              providerCostUnits: providerCost,
              platformCostUnits: platformCost,
              timestamp: new Date(),
            },
          });
        } catch (e: any) {
          console.warn('UsageEvent creation skipped or already exists:', e?.message);
        }
      }

      call.status = status as any;
      call.outcome = outcome as any;
      call.durationSeconds = durationSecs;
      call.transcript = formattedTranscript as any;
      call.extractedVariables = extractedVars as any;

      // Proactively archive call audio to Cloudflare R2 in the background
      if (durationSecs > 0 && r2StorageService.isConfigured()) {
        this.getCallAudio(call.id).catch(err => {
          console.warn('[CallService] Proactive R2 background audio archive failed:', err?.message);
        });
      }
    }

    return { call, transcriptData };
  }

  async getCallAudio(callId: string): Promise<{ buffer: Buffer; contentType: string } | null> {
    const call = await callRepository.getCallById(callId);
    if (!call) return null;

    // 1. Tier 1: Check if audio is already archived in Cloudflare R2
    if (r2StorageService.isConfigured()) {
      const r2Audio = await r2StorageService.getCallAudio(call.id);
      if (r2Audio) {
        return r2Audio;
      }
    }

    // 2. Tier 2: Fallback to Sarvam Analytics recording endpoint
    let interactionId = (call.extractedVariables as any)?._sarvam_interaction_id;
    if (!interactionId) {
      if (call.externalCallId && call.externalCallId.includes('/')) {
        interactionId = call.externalCallId;
      } else {
        const resolved = await backendSarvamProvider.resolveInteractionId(call.externalCallId, undefined, call.startedAt);
        if (resolved) {
          interactionId = resolved.interactionId;
          try {
            await prisma.call.update({
              where: { id: call.id },
              data: {
                extractedVariables: {
                  ...((call.extractedVariables as any) || {}),
                  _sarvam_interaction_id: interactionId,
                },
              },
            });
          } catch (e) {
            // ignore
          }
        }
      }
    }

    if (!interactionId) {
      return null;
    }

    const audioData = await backendSarvamProvider.fetchCallRecording(interactionId);

    // 3. Automatically archive to Cloudflare R2 in background
    if (audioData && r2StorageService.isConfigured()) {
      r2StorageService.uploadCallAudio(call.id, audioData.buffer, audioData.contentType)
        .then(uploadResult => {
          if (uploadResult) {
            prisma.call.update({
              where: { id: call.id },
              data: {
                extractedVariables: {
                  ...((call.extractedVariables as any) || {}),
                  _r2_audio_key: uploadResult.key,
                  ...(uploadResult.url ? { _r2_audio_url: uploadResult.url } : {}),
                },
              },
            }).catch(e => console.warn('Failed to update call with R2 key:', e?.message));
          }
        })
        .catch(err => console.warn('R2 background archive failed:', err?.message));
    }

    return audioData;
  }
}

export const serverCallService = new ServerCallService();
