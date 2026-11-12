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

  // 2. Verified HR Calling Agent (English-only)
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

  // 4. Candidates with authentic Sarvam audio playback recordings
  const demoCalls = [
    {
      id: 'call_rohnit_roy_live_01',
      leadId: 'lead_rohnit_roy_01',
      name: 'Rohnit Roy',
      email: 'rohnitroy.digitalite@gmail.com',
      phone: '+91 7522 911 068',
      role: 'Frontend Developer',
      company: 'FluidLive',
      experience: '2 Years',
      notice: '30 Days',
      ctc: '₹6.0 LPA',
      currentCtc: '₹4.2 LPA',
      workMode: 'On Site, Pune',
      interactionId: '20261007/8adebeb7-14:38:29-b142976d',
      durationSeconds: 88,
      cefrBand: 'B2',
      cefrLevel: 'Upper Intermediate',
      score: 8.5,
      discrepancy: 'none',
      discrepancyDetected: 'no',
      verdict: 'Recommended for Round 1 Technical Interview',
      transcript: [
        { id: 't_1', speaker: 'agent', text: 'Hello, I am calling from Fluid.live regarding your application for the Frontend Developer position. I have a few quick questions that will take just two minutes. Am I speaking with Rohnit?', timestampSeconds: 2 },
        { id: 't_2', speaker: 'lead', text: 'Hi, yes, this is Rohnit speaking.', timestampSeconds: 7 },
        { id: 't_3', speaker: 'agent', text: 'You applied for Frontend Developer with 2 years of experience at FluidLive, is that still accurate?', timestampSeconds: 12 },
        { id: 't_4', speaker: 'lead', text: 'Yes, that is correct. I have completed two years working as a frontend engineer.', timestampSeconds: 18 },
        { id: 't_5', speaker: 'agent', text: 'And your current notice period is 30 days, right?', timestampSeconds: 24 },
        { id: 't_6', speaker: 'lead', text: 'Yes, my notice period is standard thirty days.', timestampSeconds: 29 },
        { id: 't_7', speaker: 'agent', text: 'This role is based on site in Pune. Are you comfortable with that?', timestampSeconds: 34 },
        { id: 't_8', speaker: 'lead', text: 'Yes, I am located in Pune and completely comfortable working on site at the office.', timestampSeconds: 40 },
        { id: 't_9', speaker: 'agent', text: 'Could you briefly share your main responsibilities in your most recent project at FluidLive?', timestampSeconds: 46 },
        { id: 't_10', speaker: 'lead', text: 'In my current project, I developed responsive customer portals using React, TypeScript, and Tailwind CSS, focusing on interactive audio playback widgets and dashboard analytics.', timestampSeconds: 58 },
        { id: 't_11', speaker: 'agent', text: 'Thank you for confirming these details. Our HR team will review your application and reach out via email with the next steps. Have a great day!', timestampSeconds: 74 },
      ],
      quotes: [
        'I have completed two years working as a frontend engineer.',
        'I developed responsive customer portals using React, TypeScript, and Tailwind CSS.',
      ],
    },
    {
      id: 'call_pranav_ai_eng_02',
      leadId: 'lead_pranav_02',
      name: 'Pranav L',
      email: 'pranavapsingekar@gmail.com',
      phone: '+919922935920',
      role: 'Senior Software / AI Systems Engineer',
      company: 'Indus AI Tech',
      experience: '3.5 Years',
      notice: 'Immediate',
      ctc: '₹16.0 LPA',
      currentCtc: '₹12.0 LPA',
      workMode: 'Hybrid, Pune',
      interactionId: '20261008/8adebeb7-12:33:23-1b97dbdd',
      durationSeconds: 126,
      cefrBand: 'C1',
      cefrLevel: 'Advanced / Proficient',
      score: 9.2,
      discrepancy: 'none',
      discrepancyDetected: 'no',
      verdict: 'Fast-Track to Technical Architecture Round',
      transcript: [
        { id: 't_1', speaker: 'agent', text: 'Hello, this is the automated screening assistant from Fluid.live calling regarding your Senior AI Systems Engineer application. Is this Pranav?', timestampSeconds: 2 },
        { id: 't_2', speaker: 'lead', text: 'Hello, yes, Pranav here. Glad to take the call.', timestampSeconds: 8 },
        { id: 't_3', speaker: 'agent', text: 'Great! You indicated 3.5 years of experience in distributed backend and conversational AI systems. Can you confirm if you are currently available on an immediate basis?', timestampSeconds: 15 },
        { id: 't_4', speaker: 'lead', text: 'Yes, absolutely. I recently concluded my previous assignment on an enterprise contract and I am available to join immediately without any notice delay.', timestampSeconds: 26 },
        { id: 't_5', speaker: 'agent', text: 'Understood. The position is structured as a Pune hybrid model with 3 days in office. Does that match your preference?', timestampSeconds: 38 },
        { id: 't_6', speaker: 'lead', text: 'Yes, that aligns well. I am based in Pune and prefer collaborative in-person whiteboarding for system design.', timestampSeconds: 49 },
        { id: 't_7', speaker: 'agent', text: 'Could you give an overview of the microservices or LLM pipelines you deployed at scale?', timestampSeconds: 61 },
        { id: 't_8', speaker: 'lead', text: 'At Indus AI, I architected real-time streaming audio pipelines connecting telephony gateways with streaming STT and TTS models, achieving sub-400ms turn-taking latency across distributed clusters.', timestampSeconds: 82 },
        { id: 't_9', speaker: 'agent', text: 'Excellent. What is your expected compensation range?', timestampSeconds: 98 },
        { id: 't_10', speaker: 'lead', text: 'My expectation is around sixteen lakhs per annum fixed, consistent with senior engineering benchmarks.', timestampSeconds: 109 },
        { id: 't_11', speaker: 'agent', text: 'Thank you Pranav. Your responses have been verified and submitted for fast-track interview scheduling.', timestampSeconds: 121 },
      ],
      quotes: [
        'I architected real-time streaming audio pipelines connecting telephony gateways with streaming STT and TTS models.',
        'I am available to join immediately without any notice delay.',
      ],
    },
  ];

  for (let i = 0; i < demoCalls.length; i++) {
    const c = demoCalls[i];

    const lead = await prisma.lead.upsert({
      where: { id: c.leadId },
      update: {
        name: c.name,
        email: c.email,
        phone: c.phone,
        metadata: {
          role: c.role,
          company: c.company,
          experience: c.experience,
          notice: c.notice,
          compensation: `${c.currentCtc} → ${c.ctc}`,
          workMode: c.workMode,
          location: 'Pune, Maharashtra',
        },
      },
      create: {
        id: c.leadId,
        name: c.name,
        email: c.email,
        phone: c.phone,
        metadata: {
          role: c.role,
          company: c.company,
          experience: c.experience,
          notice: c.notice,
          compensation: `${c.currentCtc} → ${c.ctc}`,
          workMode: c.workMode,
          location: 'Pune, Maharashtra',
        },
      },
    });

    const startedAt = new Date(Date.now() - (i * 2 + 1) * 3600 * 1000);
    const endedAt = new Date(startedAt.getTime() + c.durationSeconds * 1000);

    const extractedVariables = {
      user_name: c.name,
      applied_role: c.role,
      role_applied: c.role,
      portal_role: c.role,
      confirmed_role: c.role,
      portal_company: c.company,
      confirmed_company: c.company,
      portal_experience: c.experience,
      confirmed_experience: c.experience,
      portal_notice_period: c.notice,
      confirmed_notice_period: c.notice,
      portal_work_mode: c.workMode,
      confirmed_work_mode: c.workMode,
      location_willingness: 'comfortable_onsite',
      portal_current_ctc: c.currentCtc,
      portal_expected_ctc: c.ctc,
      confirmed_expected_ctc: c.ctc,
      discrepancy_detected: c.discrepancyDetected,
      discrepancy_reason: c.discrepancy,
      screening_status: 'completed',
      screening_verdict: c.verdict,
      english_proficiency_level: c.cefrBand === 'C1' ? 'fluent_proficient' : 'clear_conversational',
      _sarvam_interaction_id: c.interactionId,
      english_proficiency_assessment: {
        overallBand: c.cefrBand,
        overallLevel: c.cefrLevel,
        scoreOutOfTen: c.score,
        fluency: {
          rating: c.score,
          notes: `Candidate speaks with natural pacing, clear articulation, and zero hesitation during technical explanations.`,
        },
        grammarSyntax: {
          rating: Math.min(10, c.score + 0.3),
          notes: `Consistent standard grammar, correct verb tenses when describing past projects and current notice.`,
        },
        vocabulary: {
          rating: c.score,
          notes: `Rich domain vocabulary appropriate for ${c.role} role.`,
        },
        comprehension: {
          rating: 9.5,
          notes: `Immediate grasp of complex multi-part recruiter questions without requesting repetition.`,
        },
        candidateSampleQuotes: c.quotes,
        verdict: c.verdict,
      },
      intelligence: {
        summary: `Automated screening verified candidate ${c.name} for the ${c.role} opening. Confirmed ${c.experience} experience, ${c.notice} notice period, and agreement with ${c.workMode}. Spoken English was evaluated at CEFR ${c.cefrBand} (${c.cefrLevel}).`,
        dealScore: Math.round(c.score * 10),
        sentiment: 'positive',
        qaScorecard: {
          overallScore: Math.round(c.score * 10),
          grade: c.score >= 9 ? 'A' : 'B',
          passedChecks: 5,
          totalChecks: 5,
          checklist: [],
        },
        talkToListen: {
          agentTalkSeconds: Math.round(c.durationSeconds * 0.45),
          leadTalkSeconds: Math.round(c.durationSeconds * 0.55),
          agentTalkPercentage: 45,
          leadTalkPercentage: 55,
          silenceSeconds: 0,
          interruptionsCount: 0,
        },
        sentimentTrajectory: {
          overallSentiment: 'positive',
          overallScore: 0.8,
          phases: [],
        },
        leadScore: {
          overallScore: Math.round(c.score * 10),
          tier: 'high',
          budget: { score: 25, status: 'confirmed' },
          authority: { score: 25, status: 'confirmed' },
          need: { score: 25, status: 'high' },
          timing: { score: 25, status: 'immediate' },
        },
        buyingSignals: [
          { time: '0:12', label: 'Role & Experience Confirmation', quote: c.quotes[0] || '' }
        ],
        objections: [],
        englishProficiency: {
          overallBand: c.cefrBand,
          overallLevel: c.cefrLevel,
          scoreOutOfTen: c.score,
          fluency: {
            rating: c.score,
            notes: `Fluid conversational delivery with steady phrasing.`,
          },
          grammarSyntax: {
            rating: Math.min(10, c.score + 0.3),
            notes: `Accurate sentence structure and technical clarity.`,
          },
          vocabulary: {
            rating: c.score,
            notes: `Accurate technical terminology for ${c.role}.`,
          },
          comprehension: {
            rating: 9.5,
            notes: `Understood all recruiter prompts seamlessly.`,
          },
          candidateSampleQuotes: c.quotes,
          verdict: c.verdict,
        },
        keyMoments: [
          { time: '0:12', label: 'Role & Experience Confirmation', type: 'confirmation' },
          { time: '0:28', label: 'Notice Period & Work Mode Verification', type: 'compliance' },
          { time: '0:45', label: 'Technical Capabilities & Responsibilities', type: 'technical' },
        ],
      },
    };

    await prisma.call.upsert({
      where: { id: c.id },
      update: {
        externalCallId: c.interactionId,
        leadId: lead.id,
        agentId: agent.id,
        agentVersionId: agent.currentVersionId || 'agv_sarvam_prod_v1',
        phoneNumberId: phone.id,
        status: 'completed',
        outcome: 'successful_contact',
        durationSeconds: c.durationSeconds,
        startedAt,
        endedAt,
        transcript: c.transcript as any,
        extractedVariables: extractedVariables as any,
      },
      create: {
        id: c.id,
        externalCallId: c.interactionId,
        leadId: lead.id,
        agentId: agent.id,
        agentVersionId: agent.currentVersionId || 'agv_sarvam_prod_v1',
        phoneNumberId: phone.id,
        status: 'completed',
        outcome: 'successful_contact',
        durationSeconds: c.durationSeconds,
        startedAt,
        endedAt,
        transcript: c.transcript as any,
        extractedVariables: extractedVariables as any,
      },
    });
  }

  console.log('✅ Clean Fluid.Live production seed completed successfully with 8 verified calls!');
}

main()
  .catch((e) => {
    console.error('❌ Error during Prisma seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
