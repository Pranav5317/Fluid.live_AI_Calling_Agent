import prisma from '../server/lib/prisma';

async function cleanNeonDatabase() {
  console.log('\n🧹 =========================================================');
  console.log('🧹 COMPREHENSIVE NEON POSTGRESQL DATABASE CLEANUP');
  console.log('🧹 =========================================================\n');

  try {
    // 1. Clean up mock PhoneNumbers (delete mock +1 800/888 numbers, keep +917965480599)
    const deletedPhones = await prisma.phoneNumber.deleteMany({
      where: {
        phoneNumber: { not: '+917965480599' },
      },
    });
    console.log(`✅ Cleaned up ${deletedPhones.count} mock phone number records.`);

    // Ensure production phone number exists and is active
    let prodPhone = await prisma.phoneNumber.findUnique({ where: { phoneNumber: '+917965480599' } });
    if (!prodPhone) {
      const biz = await prisma.business.findFirst();
      prodPhone = await prisma.phoneNumber.create({
        data: {
          id: 'phone_sarvam_prod_01',
          phoneNumber: '+917965480599',
          status: 'active',
          provider: 'Sarvam Voice Telephony Infrastructure',
          providerId: '7efd8897-87-220da5aa-1d5e',
          businessId: biz?.id,
        },
      });
    }

    // 2. Clean up Businesses (Keep primary "Fluid.live Technologies" business)
    let primaryBiz = await prisma.business.findFirst({
      where: { name: { contains: 'Fluid', mode: 'insensitive' } },
    });

    if (!primaryBiz) {
      primaryBiz = await prisma.business.create({
        data: {
          id: 'biz_fluid_prod_01',
          name: 'Fluid.live Technologies',
          email: 'admin@fluid.live',
          plan: 'enterprise',
          timezone: 'Asia/Kolkata',
        },
      });
    } else {
      await prisma.business.update({
        where: { id: primaryBiz.id },
        data: { name: 'Fluid.live Technologies', email: 'admin@fluid.live', timezone: 'Asia/Kolkata' },
      });
    }

    // Assign primary business to production phone
    await prisma.phoneNumber.update({
      where: { id: prodPhone.id },
      data: { businessId: primaryBiz.id },
    });

    // 3. Clean up Leads (Keep real lead +919922935920 and clean mock leads)
    const realLead = await prisma.lead.upsert({
      where: { id: 'lead_prod_9922' },
      create: {
        id: 'lead_prod_9922',
        businessId: primaryBiz.id,
        name: 'Pranav (Primary Lead)',
        phone: '+919922935920',
        email: 'pranav@fluid.live',
        metadata: { interest_level: 'high', preferred_language: 'en-IN' },
      },
      update: {
        businessId: primaryBiz.id,
        name: 'Pranav (Primary Lead)',
        phone: '+919922935920',
        email: 'pranav@fluid.live',
      },
    });
    console.log(`✅ Upserted real lead record (${realLead.name} - ${realLead.phone}).`);

    // Delete mock leads starting with +1 or test prefix
    const deletedLeads = await prisma.lead.deleteMany({
      where: {
        AND: [
          { phone: { startsWith: '+1' } },
          { id: { not: realLead.id } },
        ],
      },
    });
    console.log(`✅ Cleaned up ${deletedLeads.count} mock lead records.`);

    // 4. Clean up Agents & Agent Versions (Keep production Sarvam Agent)
    const prodAgent = await prisma.agent.upsert({
      where: { id: 'ag_sarvam_prod_01' },
      create: {
        id: 'ag_sarvam_prod_01',
        businessId: primaryBiz.id,
        name: 'Fluid Voice Assistant (Samvaad)',
        useCase: 'AI Outbound Verification & Customer Engagement',
        status: 'active',
        currentVersionId: 'agv_sarvam_prod_v1',
      },
      update: {
        businessId: primaryBiz.id,
        name: 'Fluid Voice Assistant (Samvaad)',
        useCase: 'AI Outbound Verification & Customer Engagement',
        status: 'active',
      },
    });

    const prodVer = await prisma.agentVersion.upsert({
      where: { id: 'agv_sarvam_prod_v1' },
      create: {
        id: 'agv_sarvam_prod_v1',
        agentId: prodAgent.id,
        versionNumber: 1,
        notes: 'Production Sarvam Voice Agent Integration',
        config: {
          app_id: 'Conversatio-b063cf10-e735',
          connection_id: '7efd8897-87-220da5aa-1d5e',
          voiceId: 'sarvam_v1',
          language: 'en-IN',
          systemPrompt: 'Outbound sales verification agent for Fluid.live.',
        },
      },
      update: {
        config: {
          app_id: 'Conversatio-b063cf10-e735',
          connection_id: '7efd8897-87-220da5aa-1d5e',
          voiceId: 'sarvam_v1',
          language: 'en-IN',
          systemPrompt: 'Outbound sales verification agent for Fluid.live.',
        },
      },
    });
    console.log(`✅ Configured Production Sarvam Agent: ${prodAgent.name} (${prodVer.id}).`);

    // 5. Clean up mock temporary calls while preserving real live call attempt dbe2d96e-d9f9-4292-a080-d1ba830af787
    const liveCalls = await prisma.call.findMany({
      where: { externalCallId: 'dbe2d96e-d9f9-4292-a080-d1ba830af787' },
    });

    // Update real call to associate with primary biz, prod agent, prod phone, and real lead
    if (liveCalls.length > 0) {
      await prisma.call.update({
        where: { id: liveCalls[0].id },
        data: {
          businessId: primaryBiz.id,
          agentId: prodAgent.id,
          agentVersionId: prodVer.id,
          phoneNumberId: prodPhone.id,
          leadId: realLead.id,
        },
      });
      console.log(`✅ Re-linked live call attempt (${liveCalls[0].externalCallId}) to Production Agent & Lead.`);
    }

    // Delete test calls with generated random IDs from old test runs
    const deletedTestCalls = await prisma.call.deleteMany({
      where: {
        AND: [
          { externalCallId: { not: 'dbe2d96e-d9f9-4292-a080-d1ba830af787' } },
          { externalCallId: { contains: 'test_' } },
        ],
      },
    });
    console.log(`✅ Cleaned up ${deletedTestCalls.count} temporary test call records.`);

    // 6. Summary Report
    console.log('\n📊 CLEANUP SUMMARY — CURRENT DATABASE STATE:');
    console.log(`   - Businesses: ${await prisma.business.count()} record(s)`);
    console.log(`   - Agents: ${await prisma.agent.count()} record(s)`);
    console.log(`   - Agent Versions: ${await prisma.agentVersion.count()} record(s)`);
    console.log(`   - Phone Numbers: ${await prisma.phoneNumber.count()} record(s)`);
    console.log(`   - Leads: ${await prisma.lead.count()} record(s)`);
    console.log(`   - Calls: ${await prisma.call.count()} record(s)`);
    console.log(`   - Webhook Events: ${await prisma.webhookEvent.count()} record(s)`);
    console.log('\n✨ Neon PostgreSQL Database Cleaned Successfully!');

  } catch (err: any) {
    console.error('❌ Error during DB cleanup:', err?.message || err);
  } finally {
    await prisma.$disconnect();
  }
}

cleanNeonDatabase();
