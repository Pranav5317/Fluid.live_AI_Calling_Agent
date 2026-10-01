import prisma from '../lib/prisma';
import { Call } from '../../src/types';
import { callRepository, CallFilterParams } from '../repositories/callRepository';
import { backendSarvamProvider } from './sarvamProvider';

export interface InitiateTestCallDTO {
  agentVersionId: string;
  phoneNumberId: string;
  toPhoneNumber: string;
  leadId?: string;
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

    // 3. Initiate call via Sarvam Provider
    const result = await backendSarvamProvider.initiateOutboundCall({
      agentVersionId: agentVersion.id,
      sarvamAgentId: mapping.sarvamAgentId,
      fromPhoneNumber: phoneNumber.phoneNumber,
      toPhoneNumber: dto.toPhoneNumber,
      leadId: lead.id,
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
}

export const serverCallService = new ServerCallService();
