import prisma from '../lib/prisma';
import { Call } from '../../src/types';
import { callRepository, CallFilterParams } from '../repositories/callRepository';
import { backendSarvamProvider } from './sarvamProvider';

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

    const transcriptData = await backendSarvamProvider.fetchCallTranscript(call.externalCallId);
    
    if (transcriptData) {
      const rawMessages = transcriptData.messages || transcriptData.turns || transcriptData.transcript || (Array.isArray(transcriptData) ? transcriptData : []);
      
      const formattedTranscript = rawMessages.map((msg: any, index: number) => ({
        id: `t_${index + 1}`,
        speaker: (msg.role === 'assistant' || msg.role === 'agent' || msg.speaker === 'agent') ? 'agent' : 'lead',
        text: msg.content || msg.text || msg.en_text || msg.indic_text || '',
        timestampSeconds: msg.timestampSeconds || (index + 1) * 4,
      }));

      const extractedVars = transcriptData.extracted_variables || transcriptData.agent_variables || call.extractedVariables || {};
      const durationSecs = Math.round(transcriptData.duration || call.durationSeconds || 56);
      const durationMins = Number((durationSecs / 60).toFixed(2));
      const providerCost = Number((durationMins * 0.05).toFixed(3));
      const platformCost = Number((durationMins * 0.08).toFixed(3));

      await prisma.call.update({
        where: { id: call.id },
        data: {
          status: 'completed',
          outcome: 'successful_contact',
          durationSeconds: durationSecs,
          transcript: formattedTranscript as any,
          extractedVariables: extractedVars as any,
        },
      });

      // Create production UsageEvent linked to call
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

      call.status = 'completed';
      call.outcome = 'successful_contact';
      call.durationSeconds = durationSecs;
      call.transcript = formattedTranscript as any;
      call.extractedVariables = extractedVars as any;
    }

    return { call, transcriptData };
  }
}

export const serverCallService = new ServerCallService();
