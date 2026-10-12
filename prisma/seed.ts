import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Prisma Database Seed for Fluid.Live Voice AI Platform...');

  // 1. Business Profile
  const biz = await prisma.business.upsert({
    where: { id: 'biz_fluid_prod_01' },
    update: {
      name: 'Fluid.live Technologies',
      email: 'admin@fluid.live',
      plan: 'Enterprise Tier',
      timezone: 'Asia/Kolkata',
    },
    create: {
      id: 'biz_fluid_prod_01',
      name: 'Fluid.live Technologies',
      email: 'admin@fluid.live',
      plan: 'Enterprise Tier',
      timezone: 'Asia/Kolkata',
    },
  });

  // 2. Verified Calling Agent (Shubh Persona)
  const agent = await prisma.agent.upsert({
    where: { id: 'ag_sarvam_prod_01' },
    update: {
      name: 'Fluid Voice Assistant (Samvaad)',
      useCase: 'Verification & Outbound Customer Outreach',
      status: 'active',
    },
    create: {
      id: 'ag_sarvam_prod_01',
      businessId: biz.id,
      name: 'Fluid Voice Assistant (Samvaad)',
      useCase: 'Verification & Outbound Customer Outreach',
      status: 'active',
      currentVersionId: 'agv_sarvam_prod_v1',
    },
  });

  await prisma.agentVersion.upsert({
    where: {
      agentId_versionNumber: {
        agentId: agent.id,
        versionNumber: 1,
      },
    },
    update: {},
    create: {
      id: 'agv_sarvam_prod_v1',
      agentId: agent.id,
      versionNumber: 1,
      notes: 'Production Sarvam Voice Agent Integration',
      config: {
        app_id: 'Conversatio-b063cf10-e735',
        voiceId: 'sarvam_v1',
        language: 'en-IN',
        firstGreeting: 'नमस्ते <user_name> जी, मैं Fluid.live से शुभ बात कर रहा हूँ।',
        closingBehavior: 'धन्यवाद <user_name> जी, आपका दिन शुभ हो!',
        connection_id: '7efd8897-87-220da5aa-1d5e',
      },
    },
  });

  // 3. Telephony Line
  await prisma.phoneNumber.upsert({
    where: { phoneNumber: '+917965480599' },
    update: {
      status: 'active',
      assignedAgentId: agent.id,
    },
    create: {
      id: 'phone_sarvam_prod_01',
      businessId: biz.id,
      phoneNumber: '+917965480599',
      status: 'active',
      provider: 'Sarvam AI Telephony (SIP Trunk)',
      providerId: '7efd8897-87-220da5aa-1d5e',
      assignedAgentId: agent.id,
    },
  });

  console.log('✅ Clean Fluid.Live production seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during Prisma seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
