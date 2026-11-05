import prisma from '../server/lib/prisma';

async function main() {
  console.log('🧹 Cleaning database: Keeping ONLY Rohnit Roy with phone +91 9922935920...');

  const agent = await prisma.agent.findFirst({ include: { versions: true } });
  const phone = await prisma.phoneNumber.findFirst();

  if (!agent || !phone) {
    throw new Error('Default agent or phone line not found');
  }

  const agentId = agent.id;
  const agentVersionId = agent.versions[0]?.id || agent.currentVersionId || 'agv_sarvam_prod_v1';
  const phoneNumberId = phone.id;

  // 1. Upsert Rohnit Roy's Lead
  const rohnitLead = await prisma.lead.upsert({
    where: { id: 'lead_rohnit_roy_01' },
    update: {
      name: 'Rohnit Roy',
      email: 'rohnitroy.digitalite@gmail.com',
      phone: '+919922935920',
      metadata: {
        role: 'Frontend Developer',
        company: 'FluidLive',
        experience: '2 Years',
        notice: '30 Days',
        compensation: '₹4.0L → ₹6.0L',
        workMode: 'On Site',
        location: 'Pune, Maharashtra',
      },
    },
    create: {
      id: 'lead_rohnit_roy_01',
      name: 'Rohnit Roy',
      email: 'rohnitroy.digitalite@gmail.com',
      phone: '+919922935920',
      metadata: {
        role: 'Frontend Developer',
        company: 'FluidLive',
        experience: '2 Years',
        notice: '30 Days',
        compensation: '₹4.0L → ₹6.0L',
        workMode: 'On Site',
        location: 'Pune, Maharashtra',
      },
    },
  });

  console.log('✅ Rohnit Roy Lead verified with phone:', rohnitLead.phone);

  // 2. Set up Rohnit Roy's Call with full dialogue and verified details
  const rohnitTranscript = [
    { id: 't_1', speaker: 'agent', text: 'Hello, I am calling from Fluid.live regarding your application for the Frontend Developer position. I have a few quick questions that will take just two minutes. Am I speaking with Rohnit?', timestampSeconds: 2 },
    { id: 't_2', speaker: 'lead', text: 'Hi, yes, this is Rohnit speaking.', timestampSeconds: 7 },
    { id: 't_3', speaker: 'agent', text: 'You applied for Frontend Developer with 2 years of experience at FluidLive, is that still accurate?', timestampSeconds: 11 },
    { id: 't_4', speaker: 'lead', text: 'Yes, that is correct. I have completed two years working as a frontend engineer.', timestampSeconds: 16 },
    { id: 't_5', speaker: 'agent', text: 'And your current notice period is 30 days, right?', timestampSeconds: 22 },
    { id: 't_6', speaker: 'lead', text: 'Yes, my notice period is standard thirty days.', timestampSeconds: 26 },
    { id: 't_7', speaker: 'agent', text: 'This role is based on site in Pune. Are you comfortable with that?', timestampSeconds: 30 },
    { id: 't_8', speaker: 'lead', text: 'Yes, I am located in Pune and completely comfortable working on site at the office.', timestampSeconds: 36 },
    { id: 't_9', speaker: 'agent', text: 'Could you briefly share your main responsibilities in your most recent project at FluidLive?', timestampSeconds: 41 },
    { id: 't_10', speaker: 'lead', text: 'In my current project, I developed responsive customer portals using React, TypeScript, and Tailwind CSS, focusing on interactive audio playback widgets and dashboard analytics.', timestampSeconds: 48 },
    { id: 't_11', speaker: 'agent', text: 'Thank you for confirming these details. Our HR team will review your application and reach out via email with the next steps. Have a great day!', timestampSeconds: 62 },
  ];

  const rohnitCallId = 'call_rohnit_roy_live_01';
  await prisma.call.upsert({
    where: { id: rohnitCallId },
    update: {
      externalCallId: '20261104/358ff422-rohnit-roy',
      leadId: rohnitLead.id,
      agentId,
      agentVersionId,
      phoneNumberId,
      status: 'completed',
      outcome: 'successful_contact',
      durationSeconds: 72,
      startedAt: new Date(Date.now() - 3600 * 1000),
      endedAt: new Date(Date.now() - 3600 * 1000 + 72000),
      transcript: rohnitTranscript as any,
      extractedVariables: {
        user_name: 'Rohnit Roy',
        applied_role: 'Frontend Developer',
        portal_role: 'Frontend Developer',
        confirmed_role: 'Frontend Developer',
        portal_experience: '2 Years',
        confirmed_experience: '2 Years',
        portal_company: 'FluidLive',
        confirmed_company: 'FluidLive',
        portal_notice_period: '30 Days',
        confirmed_notice_period: '30 Days',
        portal_work_mode: 'On Site, Pune',
        confirmed_work_mode: 'On Site, Pune',
        location_willingness: 'comfortable_onsite',
        portal_current_ctc: '₹4.0 LPA',
        portal_expected_ctc: '₹6.0 LPA',
        confirmed_expected_ctc: '₹6.0 LPA',
        discrepancy_detected: 'no',
        discrepancy_reason: 'none',
        screening_status: 'completed',
        english_proficiency_level: 'clear_conversational',
        call_summary: 'Rohnit confirmed all application details for the Frontend Developer role: 2 years experience at FluidLive, 30-day notice, and ₹6.0 LPA expected CTC. Confirmed comfort with On Site work in Pune. English communication is clear, confident, and professional.',
      },
    },
    create: {
      id: rohnitCallId,
      externalCallId: '20261104/358ff422-rohnit-roy',
      leadId: rohnitLead.id,
      agentId,
      agentVersionId,
      phoneNumberId,
      status: 'completed',
      outcome: 'successful_contact',
      durationSeconds: 72,
      startedAt: new Date(Date.now() - 3600 * 1000),
      endedAt: new Date(Date.now() - 3600 * 1000 + 72000),
      transcript: rohnitTranscript as any,
      extractedVariables: {
        user_name: 'Rohnit Roy',
        applied_role: 'Frontend Developer',
        portal_role: 'Frontend Developer',
        confirmed_role: 'Frontend Developer',
        portal_experience: '2 Years',
        confirmed_experience: '2 Years',
        portal_company: 'FluidLive',
        confirmed_company: 'FluidLive',
        portal_notice_period: '30 Days',
        confirmed_notice_period: '30 Days',
        portal_work_mode: 'On Site, Pune',
        confirmed_work_mode: 'On Site, Pune',
        location_willingness: 'comfortable_onsite',
        portal_current_ctc: '₹4.0 LPA',
        portal_expected_ctc: '₹6.0 LPA',
        confirmed_expected_ctc: '₹6.0 LPA',
        discrepancy_detected: 'no',
        discrepancy_reason: 'none',
        screening_status: 'completed',
        english_proficiency_level: 'clear_conversational',
        call_summary: 'Rohnit confirmed all application details for the Frontend Developer role: 2 years experience at FluidLive, 30-day notice, and ₹6.0 LPA expected CTC. Confirmed comfort with On Site work in Pune. English communication is clear, confident, and professional.',
      },
    },
  });

  console.log('✅ Rohnit Roy Call configured.');

  // 3. Remove all other calls that do NOT belong to Rohnit Roy
  const deletedCalls = await prisma.call.deleteMany({
    where: {
      id: { not: rohnitCallId },
    },
  });
  console.log(`🗑️ Deleted ${deletedCalls.count} other call records.`);

  // 4. Remove all other leads except Rohnit Roy
  const deletedLeads = await prisma.lead.deleteMany({
    where: {
      id: { not: rohnitLead.id },
    },
  });
  console.log(`🗑️ Deleted ${deletedLeads.count} other lead records.`);

  console.log('🎉 Database successfully pruned to ONLY Rohnit Roy (+91 9922935920)!');

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Error during cleanup:', err);
  process.exit(1);
});

