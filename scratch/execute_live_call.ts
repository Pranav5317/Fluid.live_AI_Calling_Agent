import prisma from '../server/lib/prisma';
import { backendSarvamProvider } from '../server/services/sarvamProvider';

async function main() {
  const targetPhoneNumber = process.argv[2] || '+919876543210';

  console.log(`\n🚀 =========================================================`);
  console.log(`🚀 INITIATING REAL SARVAM OUTBOUND TEST CALL`);
  console.log(`🚀 Destination Number: ${targetPhoneNumber}`);
  console.log(`🚀 Org ID: ${process.env.SARVAM_ORG_ID}`);
  console.log(`🚀 Workspace ID: ${process.env.SARVAM_WORKSPACE_ID}`);
  console.log(`🚀 App ID: ${process.env.SARVAM_APP_ID}`);
  console.log(`🚀 Connection ID: ${process.env.SARVAM_CONNECTION_ID}`);
  console.log(`🚀 Agent Phone Number: ${process.env.SARVAM_AGENT_PHONE_NUMBER}`);
  console.log(`🚀 API Key Prefix: ${process.env.SARVAM_API_KEY?.substring(0, 15)}...`);
  console.log(`🚀 =========================================================\n`);

  // 1. Fetch persistent lead, agent version, phone number from DB
  const agentVer = await prisma.agentVersion.findFirst({ include: { agent: true } });
  const phone = await prisma.phoneNumber.findFirst();
  const lead = await prisma.lead.findFirst();

  if (!agentVer || !phone || !lead) {
    console.error('❌ Missing database records (agentVersion, phone, or lead).');
    await prisma.$disconnect();
    return;
  }

  try {
    const result = await backendSarvamProvider.initiateOutboundCall({
      agentVersionId: agentVer.id,
      sarvamAgentId: process.env.SARVAM_APP_ID || 'Conversatio-b063cf10-e735',
      fromPhoneNumber: process.env.SARVAM_AGENT_PHONE_NUMBER || '+917965480599',
      toPhoneNumber: targetPhoneNumber,
      leadId: lead.id,
      connectionId: process.env.SARVAM_CONNECTION_ID || '7efd8897-87-220da5aa-1d5e',
    });

    console.log('\n🎉 =========================================================');
    console.log('🎉 OUTBOUND CALL DISPATCHED SUCCESSFULLY TO SARVAM API!');
    console.log(`🎉 Provider Attempt ID: ${result.providerCallId}`);
    console.log(`🎉 Status: ${result.status}`);
    console.log('🎉 =========================================================\n');

    // Persist Call record in Neon PostgreSQL
    const createdCall = await prisma.call.upsert({
      where: { externalCallId: result.providerCallId },
      create: {
        id: `call_live_${Date.now()}`,
        externalCallId: result.providerCallId,
        agentId: agentVer.agentId,
        agentVersionId: agentVer.id,
        leadId: lead.id,
        phoneNumberId: phone.id,
        status: 'initiated',
        outcome: 'successful_contact',
        startedAt: new Date(),
      },
      update: {
        status: 'initiated',
      },
    });

    console.log(`✅ Persisted Call record in Neon PostgreSQL (Call ID: ${createdCall.id}).`);
  } catch (err: any) {
    console.error('\n❌ Outbound Call Initiation Failed!');
    console.error('Error details:', err?.message || err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
