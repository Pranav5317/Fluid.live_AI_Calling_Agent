import { PrismaClient } from '@prisma/client';
import {
  mockBusiness,
  mockAgents,
  mockAgentVersions,
  mockCampaigns,
  mockLeads,
  mockCampaignLeads,
  mockCalls,
  mockPhoneNumbers,
  mockKnowledgeBases,
  mockKnowledgeDocuments,
  mockUsageEvents,
  mockBillingPeriods,
  mockRecentActivities,
  mockCallActivityPoints,
  mockWebhookEvents
} from '../src/lib/mockData';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Prisma Database Seed for Fluid.Live Voice AI Platform...');

  // 1. Business
  const biz = await prisma.business.upsert({
    where: { id: mockBusiness.id },
    update: {},
    create: {
      id: mockBusiness.id,
      name: mockBusiness.name,
      email: mockBusiness.email,
      plan: mockBusiness.plan,
      timezone: mockBusiness.timezone,
      createdAt: new Date(mockBusiness.createdAt),
    },
  });

  // 2. Agents & AgentVersions
  for (const agent of mockAgents) {
    await prisma.agent.upsert({
      where: { id: agent.id },
      update: {},
      create: {
        id: agent.id,
        businessId: biz.id,
        name: agent.name,
        useCase: agent.useCase,
        status: agent.status,
        currentVersionId: agent.currentVersionId,
        createdAt: new Date(agent.createdAt),
        updatedAt: new Date(agent.updatedAt),
      },
    });

    const versions = mockAgentVersions[agent.id] || [];
    for (const ver of versions) {
      await prisma.agentVersion.upsert({
        where: { id: ver.id },
        update: {},
        create: {
          id: ver.id,
          agentId: agent.id,
          versionNumber: ver.versionNumber,
          notes: ver.notes,
          config: ver.config as any,
          createdAt: new Date(ver.createdAt),
        },
      });
    }
  }

  // 3. Phone Numbers
  for (const phone of mockPhoneNumbers) {
    await prisma.phoneNumber.upsert({
      where: { id: phone.id },
      update: {},
      create: {
        id: phone.id,
        businessId: biz.id,
        phoneNumber: phone.phoneNumber,
        status: phone.status,
        provider: phone.provider,
        assignedAgentId: phone.assignedAgentId,
        assignedCampaignId: phone.assignedCampaignId,
        createdAt: new Date(phone.createdAt),
      },
    });
  }

  // 4. Campaigns
  for (const cmp of mockCampaigns) {
    await prisma.campaign.upsert({
      where: { id: cmp.id },
      update: {},
      create: {
        id: cmp.id,
        businessId: biz.id,
        name: cmp.name,
        agentId: cmp.agentId,
        agentVersionId: cmp.agentVersionId,
        phoneNumberId: cmp.phoneNumberId,
        status: cmp.status,
        scheduledAt: cmp.scheduledAt ? new Date(cmp.scheduledAt) : null,
        startedAt: cmp.startedAt ? new Date(cmp.startedAt) : null,
        completedAt: cmp.completedAt ? new Date(cmp.completedAt) : null,
        totalLeads: cmp.totalLeads,
        completedCalls: cmp.completedCalls,
        callsAttempted: cmp.callsAttempted,
        minutesUsed: cmp.minutesUsed,
        createdAt: new Date(cmp.createdAt),
      },
    });
  }

  // 5. Leads & CampaignLeads
  for (const lead of mockLeads) {
    await prisma.lead.upsert({
      where: { id: lead.id },
      update: {},
      create: {
        id: lead.id,
        businessId: biz.id,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        metadata: lead.metadata as any,
        createdAt: new Date(lead.createdAt),
      },
    });
  }

  for (const cl of mockCampaignLeads) {
    await prisma.campaignLead.upsert({
      where: { id: cl.id },
      update: {},
      create: {
        id: cl.id,
        campaignId: cl.campaignId,
        leadId: cl.leadId,
        status: cl.status,
        attemptCount: cl.attemptCount,
        lastAttemptAt: cl.lastAttemptAt ? new Date(cl.lastAttemptAt) : null,
        nextAttemptAt: cl.nextAttemptAt ? new Date(cl.nextAttemptAt) : null,
      },
    });
  }

  // 6. Usage Events
  for (const usg of mockUsageEvents) {
    await prisma.usageEvent.upsert({
      where: { id: usg.id },
      update: {},
      create: {
        id: usg.id,
        campaignId: usg.campaignId,
        agentId: usg.agentId,
        durationMinutes: usg.durationMinutes,
        providerCostUnits: usg.providerCostUnits,
        platformCostUnits: usg.platformCostUnits,
        timestamp: new Date(usg.timestamp),
      },
    });
  }

  // 7. Calls
  for (const call of mockCalls) {
    await prisma.call.upsert({
      where: { id: call.id },
      update: {},
      create: {
        id: call.id,
        businessId: biz.id,
        externalCallId: call.externalCallId,
        campaignId: call.campaignId,
        agentId: call.agentId,
        agentVersionId: call.agentVersionId,
        leadId: call.leadId,
        phoneNumberId: call.phoneNumberId,
        status: call.status,
        outcome: call.outcome,
        durationSeconds: call.durationSeconds,
        startedAt: new Date(call.startedAt),
        endedAt: call.endedAt ? new Date(call.endedAt) : null,
        transcript: call.transcript as any,
        extractedVariables: call.extractedVariables as any,
        usageEventId: call.usageEventId,
      },
    });
  }

  // 8. Billing Periods
  for (const bp of mockBillingPeriods) {
    await prisma.billingPeriod.upsert({
      where: { id: bp.id },
      update: {},
      create: {
        id: bp.id,
        periodName: bp.periodName,
        startDate: new Date(bp.startDate),
        endDate: new Date(bp.endDate),
        totalMinutesUsed: bp.totalMinutesUsed,
        totalCallsCount: bp.totalCallsCount,
        estimatedTotalCost: bp.estimatedTotalCost,
        providerCostTotal: bp.providerCostTotal,
        platformCostTotal: bp.platformCostTotal,
        status: bp.status,
      },
    });
  }

  // 9. Knowledge Bases & Documents
  for (const kb of mockKnowledgeBases) {
    await prisma.knowledgeBase.upsert({
      where: { id: kb.id },
      update: {},
      create: {
        id: kb.id,
        businessId: biz.id,
        name: kb.name,
        description: kb.description,
        documentCount: kb.documentCount,
        createdAt: new Date(kb.createdAt),
      },
    });
  }

  for (const doc of mockKnowledgeDocuments) {
    await prisma.knowledgeDocument.upsert({
      where: { id: doc.id },
      update: {},
      create: {
        id: doc.id,
        knowledgeBaseId: doc.knowledgeBaseId,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        status: doc.status,
        error: doc.error,
        uploadedAt: new Date(doc.uploadedAt),
      },
    });
  }

  // 10. Webhook Events
  for (const wh of mockWebhookEvents) {
    await prisma.webhookEvent.upsert({
      where: { id: wh.id },
      update: {},
      create: {
        id: wh.id,
        provider: wh.provider,
        eventType: wh.eventType,
        externalId: wh.externalId,
        payload: wh.payload as any,
        status: wh.status,
        receivedAt: new Date(wh.receivedAt),
      },
    });
  }

  // 11. Recent Activities & Call Activity Points
  for (const act of mockRecentActivities) {
    await prisma.recentActivity.upsert({
      where: { id: act.id },
      update: {},
      create: {
        id: act.id,
        type: act.type,
        title: act.title,
        description: act.description,
        timestamp: new Date(act.timestamp),
        entityId: act.entityId,
      },
    });
  }

  for (const pt of mockCallActivityPoints) {
    await prisma.callActivityPoint.upsert({
      where: { id: `pt_${pt.date.replace(' ', '_')}` },
      update: {},
      create: {
        id: `pt_${pt.date.replace(' ', '_')}`,
        date: pt.date,
        attempts: pt.attempts,
        completed: pt.completed,
      },
    });
  }

  console.log('✅ Prisma Database Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during Prisma seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

