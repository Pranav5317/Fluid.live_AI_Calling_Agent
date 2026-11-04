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
