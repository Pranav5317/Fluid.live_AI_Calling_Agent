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

  // 2. Verified HR Calling Agent (English-only, no persona name)
  const agent = await prisma.agent.upsert({
    where: { id: 'ag_sarvam_prod_01' },
    update: {
      name: 'Fluid.live HR Applicant Verification Agent',
      useCase: 'Candidate Application Fact-Checking & English Assessment',
      status: 'active',
    },
    create: {
      id: 'ag_sarvam_prod_01',
      businessId: biz.id,
      name: 'Fluid.live HR Applicant Verification Agent',
      useCase: 'Candidate Application Fact-Checking & English Assessment',
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
    update: {
      config: {
        app_id: 'Conversatio-b063cf10-e735',
        voiceId: 'sarvam_v1',
        language: 'en-IN',
        firstGreeting: 'Hello <user_name>, I am calling from Fluid.live regarding your job application. Do you have two minutes to quickly confirm your application details?',
        closingBehavior: 'Thank you for confirming your details, <user_name>. Our recruiting team at Fluid.live will review your application and reach out via email with next steps. Have a great day!',
        connection_id: '7efd8897-87-220da5aa-1d5e',
        systemPrompt: `Role & Identity:
You are calling from the Human Resources team at Fluid.live regarding the candidate's recent job application.
You do NOT have a personal name; always identify yourself strictly as "calling from Fluid.live".

Language & Tone:
- Professional, clear, courteous English.
- Do NOT speak Hindi or any other language; converse strictly in English.
- Natural, encouraging, and respectful tone.

Conversational Objectives:
1. Confirm Candidate Identity: Confirm you are speaking with <user_name>.
2. Confirm Application Details:
   - Verify the job role applied for and total years of relevant experience.
   - Confirm current notice period or earliest joining availability.
   - If the candidate mentions details different from their application, politely ask: "On your application you had noted [detail], but you mentioned [new detail] today. Could you share what changed?"
   - Confirm work location and comfort with hybrid/in-office collaboration.
3. Natural English Gauging Prompt:
   - Ask: "Could you briefly share your key responsibilities in your most recent project?" Listen attentively to their explanation.
4. Professional Wrap-up:
   - Thank the candidate courteously and inform them that the Fluid.live HR team will follow up via email with the next steps.`,
      },
    },
    create: {
      id: 'agv_sarvam_prod_v1',
      agentId: agent.id,
      versionNumber: 1,
      notes: 'Fluid.live HR Applicant Fact-Checking & English Assessment Agent',
      config: {
        app_id: 'Conversatio-b063cf10-e735',
        voiceId: 'sarvam_v1',
        language: 'en-IN',
        firstGreeting: 'Hello <user_name>, I am calling from Fluid.live regarding your job application. Do you have two minutes to quickly confirm your application details?',
        closingBehavior: 'Thank you for confirming your details, <user_name>. Our recruiting team at Fluid.live will review your application and reach out via email with next steps. Have a great day!',
        connection_id: '7efd8897-87-220da5aa-1d5e',
        systemPrompt: `Role & Identity:
You are calling from the Human Resources team at Fluid.live regarding the candidate's recent job application.
You do NOT have a personal name; always identify yourself strictly as "calling from Fluid.live".

Language & Tone:
- Professional, clear, courteous English.
- Do NOT speak Hindi or any other language; converse strictly in English.
- Natural, encouraging, and respectful tone.

Conversational Objectives:
1. Confirm Candidate Identity: Confirm you are speaking with <user_name>.
2. Confirm Application Details:
   - Verify the job role applied for and total years of relevant experience.
   - Confirm current notice period or earliest joining availability.
   - If the candidate mentions details different from their application, politely ask: "On your application you had noted [detail], but you mentioned [new detail] today. Could you share what changed?"
   - Confirm work location and comfort with hybrid/in-office collaboration.
3. Natural English Gauging Prompt:
   - Ask: "Could you briefly share your key responsibilities in your most recent project?" Listen attentively to their explanation.
4. Professional Wrap-up:
   - Thank the candidate courteously and inform them that the Fluid.live HR team will follow up via email with the next steps.`,
      },
    },
  });

  // 3. Telephony Line
  const phone = await prisma.phoneNumber.upsert({
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

  // 4. Permanent Rohnit Roy Candidate Screening Call
  const candidatesData = [
    {
      callId: 'call_rohnit_roy_live_01',
      leadId: 'lead_rohnit_roy_01',
      name: 'Rohnit Roy',
      email: 'rohnitroy.digitalite@gmail.com',
      phone: '+919922935920',
      role: 'Frontend Developer',
      duration: 72,
      experience: '2 Years',
      notice: '30 Days',
      ctc: '₹6.0 LPA',
      location: 'On Site, Pune',
      discrepancy: false,
      discrepancyReason: 'none',
      englishLevel: 'clear_conversational',
      verdict: 'Fast-Track to Round 1 Technical',
      summary: 'Rohnit confirmed all application details for the Frontend Developer role: 2 years experience at FluidLive, 30-day notice, and ₹6.0 LPA expected CTC. Confirmed comfort with On Site work in Pune. English communication is clear, confident, and professional.',
      transcript: [
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
      ],
    },
  ];

  for (const c of candidatesData) {
    await prisma.lead.upsert({
      where: { id: c.leadId },
      update: {
        name: c.name,
        email: c.email,
        phone: c.phone,
        metadata: { role: c.role, location: c.location },
      },
      create: {
        id: c.leadId,
        name: c.name,
        email: c.email,
        phone: c.phone,
        metadata: { role: c.role, location: c.location },
      },
    });

    const callDate = new Date(Date.now() - Math.floor(Math.random() * 4 + 1) * 3600 * 1000);

    await prisma.call.upsert({
      where: { id: c.callId },
      update: {
        leadId: c.leadId,
        agentId: agent.id,
        agentVersionId: agent.currentVersionId || 'agv_sarvam_prod_v1',
        phoneNumberId: phone.id,
        status: 'completed',
        outcome: 'successful_contact',
        durationSeconds: c.duration,
        transcript: c.transcript as any,
        extractedVariables: {
          user_name: c.name,
          applied_role: c.role,
          portal_role: c.role,
          confirmed_role: c.role,
          portal_experience: c.experience,
          confirmed_experience: c.experience,
          portal_notice_period: c.notice,
          confirmed_notice_period: c.notice,
          portal_work_mode: c.location,
          confirmed_work_mode: c.location,
          location_willingness: 'willing',
          portal_expected_ctc: c.ctc,
          confirmed_expected_ctc: c.ctc,
          discrepancy_detected: c.discrepancy ? 'yes' : 'no',
          discrepancy_reason: c.discrepancyReason,
          screening_status: 'completed',
          english_proficiency_level: c.englishLevel,
          call_summary: c.summary,
        },
      },
      create: {
        id: c.callId,
        externalCallId: `sarvam_demo_${c.callId.slice(-8)}`,
        leadId: c.leadId,
        agentId: agent.id,
        agentVersionId: agent.currentVersionId || 'agv_sarvam_prod_v1',
        phoneNumberId: phone.id,
        status: 'completed',
        outcome: 'successful_contact',
        durationSeconds: c.duration,
        startedAt: callDate,
        endedAt: new Date(callDate.getTime() + c.duration * 1000),
        transcript: c.transcript as any,
        extractedVariables: {
          user_name: c.name,
          applied_role: c.role,
          portal_role: c.role,
          confirmed_role: c.role,
          portal_experience: c.experience,
          confirmed_experience: c.experience,
          portal_notice_period: c.notice,
          confirmed_notice_period: c.notice,
          portal_work_mode: c.location,
          confirmed_work_mode: c.location,
          location_willingness: 'willing',
          portal_expected_ctc: c.ctc,
          confirmed_expected_ctc: c.ctc,
          discrepancy_detected: c.discrepancy ? 'yes' : 'no',
          discrepancy_reason: c.discrepancyReason,
          screening_status: 'completed',
          english_proficiency_level: c.englishLevel,
          call_summary: c.summary,
        },
      },
    });
  }

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
