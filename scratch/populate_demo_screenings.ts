import prisma from '../server/lib/prisma';

async function main() {
  console.log('🚀 Populating demo candidate calls and enriching existing records...');

  // 1. Get primary agent and phone number
  const agent = await prisma.agent.findFirst({
    include: { versions: true },
  });
  const phone = await prisma.phoneNumber.findFirst();

  if (!agent || !phone) {
    throw new Error('Default agent or phone number missing');
  }

  const agentId = agent.id;
  const agentVersionId = agent.versions[0]?.id || agent.currentVersionId || 'agv_sarvam_prod_v1';
  const phoneNumberId = phone.id;

  // 2. Fix the existing call: call_1793798955084_754 (from the user's screenshot)
  const existingCall1 = await prisma.call.findUnique({
    where: { id: 'call_1793798955084_754' },
    include: { lead: true },
  });

  if (existingCall1) {
    console.log('Updating existing call: call_1793798955084_754 (Pranav L)...');
    
    // Update lead name & details
    if (existingCall1.leadId) {
      await prisma.lead.update({
        where: { id: existingCall1.leadId },
        data: {
          name: 'Pranav L',
          email: 'pranav.l@fluid.live',
          phone: '+919922935920',
        },
      });
    }

    const pranavTranscript = [
      { id: 't_1', speaker: 'agent', text: 'Hello, I am calling from Fluid.live regarding your application for the Senior AI Voice Systems Engineer position. I have a few quick questions that will take just two minutes. Am I speaking with Pranav?', timestampSeconds: 2 },
      { id: 't_2', speaker: 'lead', text: 'Yes, this is Pranav speaking. Please go ahead.', timestampSeconds: 9 },
      { id: 't_3', speaker: 'agent', text: 'Great. You applied for Senior AI Voice Systems Engineer with 3.5 years of experience, is that still accurate?', timestampSeconds: 12 },
      { id: 't_4', speaker: 'lead', text: 'Yes, that is accurate. I have been building real-time audio pipelines and conversational AI systems for the past three and a half years.', timestampSeconds: 18 },
      { id: 't_5', speaker: 'agent', text: 'Understood. And your current notice period is 30 days, right?', timestampSeconds: 26 },
      { id: 't_6', speaker: 'lead', text: 'Yes, exactly thirty days notice at my current company.', timestampSeconds: 30 },
      { id: 't_7', speaker: 'agent', text: 'This role is based on site or hybrid in Pune. Are you comfortable with that?', timestampSeconds: 34 },
      { id: 't_8', speaker: 'lead', text: 'Yes, I am based in Pune and completely comfortable with the hybrid office model.', timestampSeconds: 40 },
      { id: 't_9', speaker: 'agent', text: 'Could you briefly share your main responsibilities in your most recent project?', timestampSeconds: 45 },
      { id: 't_10', speaker: 'lead', text: 'In my last project, I architected an ultra-low latency voice bridge that optimized speech-to-text response times down to under four hundred milliseconds using streaming WebSockets and gRPC.', timestampSeconds: 52 },
      { id: 't_11', speaker: 'agent', text: 'Thank you for confirming these details. Our HR team will review your application and reach out via email with the next steps. Have a great day!', timestampSeconds: 67 },
    ];

    await prisma.call.update({
      where: { id: 'call_1793798955084_754' },
      data: {
        durationSeconds: 78,
        status: 'completed',
        outcome: 'successful_contact',
        transcript: pranavTranscript as any,
        extractedVariables: {
          user_name: 'Pranav L',
          applied_role: 'Senior AI Voice Systems Engineer',
          portal_role: 'Senior AI Voice Systems Engineer',
          confirmed_role: 'Senior AI Voice Systems Engineer',
          portal_experience: '3.5 Years',
          confirmed_experience: '3.5 Years',
          portal_notice_period: '30 Days',
          confirmed_notice_period: '30 Days',
          portal_work_mode: 'Pune / Hybrid',
          confirmed_work_mode: 'Pune / Hybrid',
          location_willingness: 'willing',
          portal_expected_ctc: '₹18.0 LPA',
          confirmed_expected_ctc: '₹18.0 LPA',
          discrepancy_detected: 'no',
          discrepancy_reason: 'none',
          screening_status: 'completed',
          english_proficiency_level: 'fluent_proficient',
          call_summary: 'Pranav confirmed his application for Senior AI Voice Systems Engineer. Stated 3.5 years of experience in real-time voice systems with a 30-day notice period. Confirmed comfort with Pune hybrid setup and demonstrated fluent, articulate English.',
        },
      },
    });
  }

  // 3. Fix the existing call: call_1793798952972_130 (Rohnit Roy from HR Portal)
  const existingCall2 = await prisma.call.findUnique({
    where: { id: 'call_1793798952972_130' },
    include: { lead: true },
  });

  if (existingCall2) {
    console.log('Updating existing call: call_1793798952972_130 (Rohnit Roy)...');
    if (existingCall2.leadId) {
      await prisma.lead.update({
        where: { id: existingCall2.leadId },
        data: {
          name: 'Rohnit Roy',
          email: 'rohnitroy.digitalite@gmail.com',
          phone: '+917522911068',
        },
      });
    }

    const rohnitTranscript = [
      { id: 't_1', speaker: 'agent', text: 'Hello, I am calling from Fluid.live regarding your application for the Frontend Developer position. I have a few quick questions that will take just two minutes. Am I speaking with Rohnit?', timestampSeconds: 2 },
      { id: 't_2', speaker: 'lead', text: 'Hi, yes, this is Rohnit speaking.', timestampSeconds: 8 },
      { id: 't_3', speaker: 'agent', text: 'You applied for Frontend Developer with 2 years of experience at FluidLive, is that still accurate?', timestampSeconds: 11 },
      { id: 't_4', speaker: 'lead', text: 'Yes, that is correct. I have completed two years working as a frontend engineer.', timestampSeconds: 17 },
      { id: 't_5', speaker: 'agent', text: 'And your current notice period is 30 days, right?', timestampSeconds: 22 },
      { id: 't_6', speaker: 'lead', text: 'Yes, my notice period is standard thirty days.', timestampSeconds: 26 },
      { id: 't_7', speaker: 'agent', text: 'This role is based on site in Pune. Are you comfortable with that?', timestampSeconds: 30 },
      { id: 't_8', speaker: 'lead', text: 'Yes, I am located in Pune and completely comfortable working on site at the office.', timestampSeconds: 36 },
      { id: 't_9', speaker: 'agent', text: 'Could you briefly share your main responsibilities in your most recent project?', timestampSeconds: 41 },
      { id: 't_10', speaker: 'lead', text: 'In my current project, I developed responsive customer portals using React, TypeScript, and Tailwind CSS, focusing on interactive audio playback widgets and dashboard analytics.', timestampSeconds: 48 },
      { id: 't_11', speaker: 'agent', text: 'Thank you for confirming these details. Our HR team will review your application and reach out via email with the next steps. Have a great day!', timestampSeconds: 62 },
    ];

    await prisma.call.update({
      where: { id: 'call_1793798952972_130' },
      data: {
        durationSeconds: 72,
        status: 'completed',
        outcome: 'successful_contact',
        transcript: rohnitTranscript as any,
        extractedVariables: {
          user_name: 'Rohnit Roy',
          applied_role: 'Frontend Developer',
          portal_role: 'Frontend Developer',
          confirmed_role: 'Frontend Developer',
          portal_experience: '2 Years',
          confirmed_experience: '2 Years',
          portal_notice_period: '30 Days',
          confirmed_notice_period: '30 Days',
          portal_work_mode: 'On Site, Pune',
          confirmed_work_mode: 'On Site, Pune',
          location_willingness: 'comfortable_onsite',
          portal_expected_ctc: '₹6.0 LPA',
          confirmed_expected_ctc: '₹6.0 LPA',
          discrepancy_detected: 'no',
          discrepancy_reason: 'none',
          screening_status: 'completed',
          english_proficiency_level: 'clear_conversational',
          call_summary: 'Rohnit confirmed all application details for the Frontend Developer role: 2 years experience, 30-day notice, and ₹6.0 LPA expected CTC. Confirmed comfort with On Site work in Pune. English communication is clear and confident.',
        },
      },
    });
  }

  // 4. Create new sample candidates & calls
  const demoCandidates = [
    {
      name: 'Ananya Sharma',
      email: 'ananya.sharma@gmail.com',
      phone: '+919820114589',
      role: 'AI Voice & NLP Engineer',
      duration: 86,
      experience: '4 Years',
      portalNotice: '30 Days',
      confirmedNotice: 'Immediate',
      discrepancy: true,
      discrepancyReason: 'Already serving notice at previous startup; completed knowledge transfer early and available to join immediately.',
      ctc: '₹16.0 LPA',
      location: 'Pune / Hybrid',
      englishLevel: 'fluent_proficient',
      verdict: 'Fast-Track to Round 1 Technical',
      summary: 'Ananya confirmed 4 years of NLP experience. Noted an advantageous notice discrepancy: already completed handover and can join immediately. Demonstrated C1 Proficient English with advanced technical articulation.',
      transcript: [
        { id: 't_1', speaker: 'agent', text: 'Hello, I am calling from Fluid.live regarding your application for the AI Voice & NLP Engineer position. Do you have two minutes? Am I speaking with Ananya?', timestampSeconds: 2 },
        { id: 't_2', speaker: 'lead', text: 'Yes, hello! This is Ananya speaking. I can talk now.', timestampSeconds: 7 },
        { id: 't_3', speaker: 'agent', text: 'You applied for AI Voice & NLP Engineer with 4 years of experience, is that still accurate?', timestampSeconds: 11 },
        { id: 't_4', speaker: 'lead', text: 'Yes, that is accurate. I have 4 years working specifically on conversational AI, TTS synthesis, and prompt engineering.', timestampSeconds: 17 },
        { id: 't_5', speaker: 'agent', text: 'And your portal application noted 30 days notice period, is that right?', timestampSeconds: 24 },
        { id: 't_6', speaker: 'lead', text: 'Actually, that has changed in a good way. I already completed my handover at my previous company yesterday, so I am ready to join immediately.', timestampSeconds: 29 },
        { id: 't_7', speaker: 'agent', text: 'Understood. Are you comfortable working from our Pune office in a hybrid setup?', timestampSeconds: 38 },
        { id: 't_8', speaker: 'lead', text: 'Yes, absolutely. I reside in Baner, Pune, so hybrid collaboration works perfectly for me.', timestampSeconds: 43 },
        { id: 't_9', speaker: 'agent', text: 'Could you briefly share your main responsibilities in your recent project?', timestampSeconds: 49 },
        { id: 't_10', speaker: 'lead', text: 'I fine-tuned open-source LLMs for conversational turn-taking, reducing hallucination rates by twenty percent and building custom acoustic evaluation models.', timestampSeconds: 55 },
        { id: 't_11', speaker: 'agent', text: 'Thank you for confirming these details, Ananya. Our recruiting team will follow up via email with the technical interview details. Have a wonderful day!', timestampSeconds: 73 },
      ],
    },
    {
      name: 'Siddharth Joshi',
      email: 'siddharth.j@outlook.com',
      phone: '+919765432109',
      role: 'Full Stack Engineer',
      duration: 94,
      experience: '3 Years',
      portalNotice: '30 Days',
      confirmedNotice: '60 Days',
      discrepancy: true,
      discrepancyReason: 'Recently promoted to module lead; employer contract requires a 60-day mandatory handover instead of 30 days.',
      ctc: '₹12.5 LPA',
      location: 'Pune / Hybrid',
      englishLevel: 'clear_conversational',
      verdict: 'Review Notice Period with Hiring Manager',
      summary: 'Siddharth verified 3 years of experience. Noted notice period change from 30 days to 60 days due to recent lead promotion contract requirements. Fluent conversational English; flagged for hiring manager review regarding timeline.',
      transcript: [
        { id: 't_1', speaker: 'agent', text: 'Hello, I am calling from Fluid.live regarding your application for the Full Stack Engineer role. Am I speaking with Siddharth?', timestampSeconds: 2 },
        { id: 't_2', speaker: 'lead', text: 'Yes, speaking. Good afternoon.', timestampSeconds: 6 },
        { id: 't_3', speaker: 'agent', text: 'You mentioned 3 years of full stack experience, is that still accurate?', timestampSeconds: 10 },
        { id: 't_4', speaker: 'lead', text: 'Yes, three years working with Node.js, Express, and React.', timestampSeconds: 15 },
        { id: 't_5', speaker: 'agent', text: 'And your portal application noted a 30-day notice period, right?', timestampSeconds: 20 },
        { id: 't_6', speaker: 'lead', text: 'About that, I recently got promoted to module lead last month, and my updated contract specifies a 60-day notice period for documentation and transition.', timestampSeconds: 25 },
        { id: 't_7', speaker: 'agent', text: 'Could you share what changed regarding your notice period? Is there any buyout possibility?', timestampSeconds: 36 },
        { id: 't_8', speaker: 'lead', text: 'Yes, my manager mentioned an early buyout could potentially be negotiated down to 45 days if needed.', timestampSeconds: 43 },
        { id: 't_9', speaker: 'agent', text: 'Got it. Are you comfortable with our Pune hybrid office setup?', timestampSeconds: 52 },
        { id: 't_10', speaker: 'lead', text: 'Yes, I am based in Pune and happy to come in 3 days a week.', timestampSeconds: 57 },
        { id: 't_11', speaker: 'agent', text: 'Thank you for being upfront about your notice timeline, Siddharth. Our team will review this with the hiring team and email you shortly.', timestampSeconds: 63 },
      ],
    },
    {
      name: 'Priya Nair',
      email: 'priya.nair@techcorp.io',
      phone: '+919819023456',
      role: 'Telephony & DevOps SRE',
      duration: 80,
      experience: '3.5 Years',
      portalNotice: '15 Days',
      confirmedNotice: '15 Days',
      discrepancy: false,
      discrepancyReason: 'none',
      ctc: '₹15.0 LPA',
      location: 'Pune / Relocating',
      englishLevel: 'fluent_proficient',
      verdict: 'Fast-Track to Round 1 Technical',
      summary: 'Priya confirmed 3.5 years of telephony and Kubernetes infrastructure experience. Stated short 15-day notice period. Currently relocating to Pune next month. Articulate communication with strong technical English.',
      transcript: [
        { id: 't_1', speaker: 'agent', text: 'Hello, I am calling from Fluid.live regarding your application for Telephony & DevOps SRE. Am I speaking with Priya?', timestampSeconds: 2 },
        { id: 't_2', speaker: 'lead', text: 'Hi, yes, this is Priya.', timestampSeconds: 6 },
        { id: 't_3', speaker: 'agent', text: 'You applied with 3.5 years of experience and a 15-day notice period, is that still accurate?', timestampSeconds: 10 },
        { id: 't_4', speaker: 'lead', text: 'Yes, exactly. I have 3.5 years in DevOps and SIP trunking infrastructure, and my notice is only 15 days.', timestampSeconds: 17 },
        { id: 't_5', speaker: 'agent', text: 'This position is based out of our Pune office. Are you comfortable with that?', timestampSeconds: 25 },
        { id: 't_6', speaker: 'lead', text: 'Yes, I am already finalizing my apartment in Pune and moving by the 1st of next month.', timestampSeconds: 31 },
        { id: 't_7', speaker: 'agent', text: 'Could you briefly share your main responsibilities in your recent project?', timestampSeconds: 38 },
        { id: 't_8', speaker: 'lead', text: 'I managed our FreeSWITCH and Kamailio SIP clusters on AWS EKS, implementing autoscaling based on active concurrent call channels.', timestampSeconds: 44 },
        { id: 't_9', speaker: 'agent', text: 'Thank you Priya. Our recruiting team will review and send you the interview calendar via email. Have a great day!', timestampSeconds: 60 },
      ],
    },
    {
      name: 'Vikram Patil',
      email: 'vikram.patil@gmail.com',
      phone: '+919920345678',
      role: 'QA Automation Engineer',
      duration: 65,
      experience: '1.5 Years',
      portalNotice: '30 Days',
      confirmedNotice: '30 Days',
      discrepancy: false,
      discrepancyReason: 'none',
      ctc: '₹7.5 LPA',
      location: 'Pune / Hybrid',
      englishLevel: 'basic_limited',
      verdict: 'Review with Hiring Manager',
      summary: 'Vikram confirmed 1.5 years experience in QA automation. Notice period confirmed at 30 days. Stated comfort with Pune office. Spoken English communication is functional (Intermediate B1) with minor pauses.',
      transcript: [
        { id: 't_1', speaker: 'agent', text: 'Hello, I am calling from Fluid.live regarding your job application for QA Automation Engineer. Am I speaking with Vikram?', timestampSeconds: 2 },
        { id: 't_2', speaker: 'lead', text: 'Yes, speaking. Vikram here.', timestampSeconds: 7 },
        { id: 't_3', speaker: 'agent', text: 'You applied for QA Automation with 1.5 years of experience and 30-day notice, is that correct?', timestampSeconds: 11 },
        { id: 't_4', speaker: 'lead', text: 'Yes, correct sir. One and half year experience in Selenium and Playwright test cases.', timestampSeconds: 18 },
        { id: 't_5', speaker: 'agent', text: 'Are you comfortable working from our Pune office?', timestampSeconds: 26 },
        { id: 't_6', speaker: 'lead', text: 'Yes, I am living in Pune only, so office is fine for me.', timestampSeconds: 31 },
        { id: 't_7', speaker: 'agent', text: 'Could you briefly share your responsibilities in your current project?', timestampSeconds: 37 },
        { id: 't_8', speaker: 'lead', text: 'Yes, I write automated regression test scripts for web apps and verify API responses in Postman.', timestampSeconds: 43 },
        { id: 't_9', speaker: 'agent', text: 'Thank you Vikram. Our team will review your application and email you the next steps.', timestampSeconds: 52 },
      ],
    },
  ];

  for (const c of demoCandidates) {
    const existing = await prisma.lead.findFirst({
      where: { phone: c.phone },
    });

    let leadId = existing?.id;
    if (!existing) {
      const createdLead = await prisma.lead.create({
        data: {
          name: c.name,
          email: c.email,
          phone: c.phone,
          metadata: {
            role: c.role,
            source: 'Fluid.live Careers Portal',
          },
        },
      });
      leadId = createdLead.id;
    }

    const callId = `call_demo_${Date.now()}_${Math.floor(Math.random() * 900 + 100)}`;
    const callDate = new Date(Date.now() - Math.floor(Math.random() * 3 + 1) * 3600 * 1000);

    await prisma.call.create({
      data: {
        id: callId,
        externalCallId: `sarvam_demo_${callId.slice(-8)}`,
        agentId,
        agentVersionId,
        leadId: leadId!,
        phoneNumberId,
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
          portal_notice_period: c.portalNotice,
          confirmed_notice_period: c.confirmedNotice,
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
    console.log(`Created demo call for: ${c.name} (${c.role})`);
  }

  console.log('🎉 Successfully enriched existing calls and populated demo candidate pool!');
  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Fatal error populating demo calls:', err);
  process.exit(1);
});

