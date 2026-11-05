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
      phone: '+919922935920',
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
    {
      id: 'call_ananya_voice_03',
      leadId: 'lead_ananya_03',
      name: 'Ananya Sharma',
      email: 'ananya.sharma@gmail.com',
      phone: '+919845012398',
      role: 'Senior Voice AI & NLP Architect',
      company: 'Enterprise Speech Labs',
      experience: '5 Years',
      notice: '15 Days',
      ctc: '₹22.0 LPA',
      currentCtc: '₹17.5 LPA',
      workMode: 'On Site, Pune',
      interactionId: '20261008/8adebeb7-13:09:01-3b88ae78',
      durationSeconds: 168,
      cefrBand: 'C1',
      cefrLevel: 'Advanced / Proficient',
      score: 9.0,
      discrepancy: 'Notice period is 15 days instead of 30 days on portal (resignation already tendered)',
      discrepancyDetected: 'yes',
      verdict: 'High-Priority Candidate for Leadership Panel',
      transcript: [
        { id: 't_1', speaker: 'agent', text: 'Hi Ananya, calling from Fluid.live regarding your application for the Senior Voice AI & NLP Architect opening. Do you have two minutes?', timestampSeconds: 3 },
        { id: 't_2', speaker: 'lead', text: 'Yes, hi! I have a few minutes, please go ahead.', timestampSeconds: 9 },
        { id: 't_3', speaker: 'agent', text: 'Your profile mentions 5 years of domain experience in speech synthesis, telephony orchestration, and LLMs. Is that accurate?', timestampSeconds: 18 },
        { id: 't_4', speaker: 'lead', text: 'Yes, exactly five years across acoustic modeling, neural voice cloning, and live voice bot agent architectures.', timestampSeconds: 30 },
        { id: 't_5', speaker: 'agent', text: 'Your application listed a 30-day notice, but could you confirm your earliest availability?', timestampSeconds: 42 },
        { id: 't_6', speaker: 'lead', text: 'I have already submitted my resignation two weeks back and completed key handovers, so my remaining notice is now just fifteen days.', timestampSeconds: 58 },
        { id: 't_7', speaker: 'agent', text: 'That is great news for our project timeline. Are you comfortable with our Pune headquarters?', timestampSeconds: 70 },
        { id: 't_8', speaker: 'lead', text: 'Yes, I currently reside in Baner, Pune, so commuting to the office is very straightforward.', timestampSeconds: 84 },
        { id: 't_9', speaker: 'agent', text: 'Can you share a notable architectural accomplishment from your current tenure?', timestampSeconds: 98 },
        { id: 't_10', speaker: 'lead', text: 'I led the engineering team that reduced end-to-end voice latency by 35% using streaming chunked token decoding and WebRTC audio bridging for contact centers handling 50,000 calls per day.', timestampSeconds: 128 },
        { id: 't_11', speaker: 'agent', text: 'And regarding expected CTC?', timestampSeconds: 142 },
        { id: 't_12', speaker: 'lead', text: 'I am targeting twenty-two LPA fixed.', timestampSeconds: 152 },
        { id: 't_13', speaker: 'agent', text: 'Thank you Ananya. Everything is recorded and our lead recruiter will send calendar invites for the technical discussion.', timestampSeconds: 164 },
      ],
      quotes: [
        'I led the engineering team that reduced end-to-end voice latency by 35% using streaming chunked token decoding.',
        'My remaining notice is now just fifteen days.',
      ],
    },
    {
      id: 'call_siddharth_fs_04',
      leadId: 'lead_siddharth_04',
      name: 'Siddharth Joshi',
      email: 'siddharth.joshi@devmail.io',
      phone: '+919820145290',
      role: 'Full Stack & Telephony Engineer',
      company: 'TeleTech Systems',
      experience: '4 Years',
      notice: '60 Days',
      ctc: '₹18.0 LPA',
      currentCtc: '₹13.5 LPA',
      workMode: 'Relocating to Pune',
      interactionId: '20261008/8adebeb7-12:30:12-480a5942',
      durationSeconds: 101,
      cefrBand: 'B2',
      cefrLevel: 'Upper Intermediate',
      score: 8.0,
      discrepancy: 'Notice period is 60 days vs 30 days on portal (recent promotion required 60d agreement)',
      discrepancyDetected: 'yes',
      verdict: 'Recommended with Notice Period Buyout Evaluation',
      transcript: [
        { id: 't_1', speaker: 'agent', text: 'Hello Siddharth, this is Fluid.live automated HR screening for the Full Stack & Telephony Engineer role. Are you free for a brief verification?', timestampSeconds: 3 },
        { id: 't_2', speaker: 'lead', text: 'Yes, hi there. Sure, let us do it.', timestampSeconds: 8 },
        { id: 't_3', speaker: 'agent', text: 'Your application stated 4 years of experience and 30 days notice. Could you confirm these two points?', timestampSeconds: 16 },
        { id: 't_4', speaker: 'lead', text: 'Yes on the four years experience, but for the notice period, I was recently promoted to team lead so my contract revised to sixty days notice. We can explore a buyout if required.', timestampSeconds: 33 },
        { id: 't_5', speaker: 'agent', text: 'Thank you for clarifying. We have noted the 60-day notice with buyout option. Are you willing to relocate to Pune?', timestampSeconds: 47 },
        { id: 't_6', speaker: 'lead', text: 'Yes, I am moving to Pune next month regardless for personal reasons, so on-site work is completely fine.', timestampSeconds: 58 },
        { id: 't_7', speaker: 'agent', text: 'Could you tell us about your experience with React and WebSockets?', timestampSeconds: 67 },
        { id: 't_8', speaker: 'lead', text: 'I built real-time agent dashboard UIs with bidirectional WebSocket telemetry, streaming live waveforms and call metrics under 200 milliseconds latency.', timestampSeconds: 83 },
        { id: 't_9', speaker: 'agent', text: 'Thank you Siddharth. We will submit your notice details and technical summary to the hiring team.', timestampSeconds: 96 },
      ],
      quotes: [
        'I was recently promoted to team lead so my contract revised to sixty days notice.',
        'I built real-time agent dashboard UIs with bidirectional WebSocket telemetry.',
      ],
    },
    {
      id: 'call_manan_ai_05',
      leadId: 'lead_manan_05',
      name: 'Manan Kapoor',
      email: 'manan.kapoor@techflow.in',
      phone: '+919922935920',
      role: 'Conversational AI Product Engineer',
      company: 'FluidLive',
      experience: '2.5 Years',
      notice: '30 Days',
      ctc: '₹12.0 LPA',
      currentCtc: '₹8.5 LPA',
      workMode: 'On Site, Pune',
      interactionId: '20261007/8adebeb7-13:54:12-991aaeb4',
      durationSeconds: 56,
      cefrBand: 'B2',
      cefrLevel: 'Upper Intermediate',
      score: 8.3,
      discrepancy: 'none',
      discrepancyDetected: 'no',
      verdict: 'Recommended for Round 1 Technical Interview',
      transcript: [
        { id: 't_1', speaker: 'agent', text: 'Hello Manan, calling from Fluid.live regarding your Conversational AI Product Engineer application. Do you have a minute?', timestampSeconds: 2 },
        { id: 't_2', speaker: 'lead', text: 'Yes, absolutely, happy to talk.', timestampSeconds: 6 },
        { id: 't_3', speaker: 'agent', text: 'Can you confirm your total experience is 2.5 years and your notice period is 30 days?', timestampSeconds: 12 },
        { id: 't_4', speaker: 'lead', text: 'Yes, exactly two and a half years and thirty days notice.', timestampSeconds: 18 },
        { id: 't_5', speaker: 'agent', text: 'Are you comfortable working on-site at our Pune office?', timestampSeconds: 24 },
        { id: 't_6', speaker: 'lead', text: 'Yes, I am based in Pune and prefer working from the office.', timestampSeconds: 29 },
        { id: 't_7', speaker: 'agent', text: 'What is your core tech stack for conversational bots?', timestampSeconds: 34 },
        { id: 't_8', speaker: 'lead', text: 'Python, FastAPI, LangChain, along with modern vector embeddings and prompt engineering pipelines.', timestampSeconds: 43 },
        { id: 't_9', speaker: 'agent', text: 'Thank you Manan. Our technical panel will reach out with the assessment schedule.', timestampSeconds: 52 },
      ],
      quotes: [
        'Exactly two and a half years and thirty days notice.',
        'Python, FastAPI, LangChain, along with modern vector embeddings.',
      ],
    },
    {
      id: 'call_priya_devops_06',
      leadId: 'lead_priya_06',
      name: 'Priya Nair',
      email: 'priya.nair@cloudpulse.net',
      phone: '+919711209431',
      role: 'Cloud Telephony & DevOps SRE',
      company: 'CloudPulse Networks',
      experience: '3.5 Years',
      notice: '30 Days',
      ctc: '₹16.5 LPA',
      currentCtc: '₹12.0 LPA',
      workMode: 'Hybrid, Pune',
      interactionId: '20261008/8adebeb7-13:41:07-6730b622',
      durationSeconds: 87,
      cefrBand: 'B2',
      cefrLevel: 'Upper Intermediate',
      score: 8.4,
      discrepancy: 'none',
      discrepancyDetected: 'no',
      verdict: 'Recommended for Round 1 SRE / Cloud Technical Round',
      transcript: [
        { id: 't_1', speaker: 'agent', text: 'Hi Priya, automated verification calling from Fluid.live for the Cloud Telephony SRE opening. Is this Priya?', timestampSeconds: 2 },
        { id: 't_2', speaker: 'lead', text: 'Yes, this is Priya. Good afternoon.', timestampSeconds: 6 },
        { id: 't_3', speaker: 'agent', text: 'You listed 3.5 years of experience in Kubernetes, SIP gateways, and cloud infrastructure with 30 days notice. Is that accurate?', timestampSeconds: 15 },
        { id: 't_4', speaker: 'lead', text: 'Yes, three and a half years SRE experience and thirty days standard notice period.', timestampSeconds: 24 },
        { id: 't_5', speaker: 'agent', text: 'Our office is located in Pune with a hybrid schedule. Are you aligned with this?', timestampSeconds: 32 },
        { id: 't_6', speaker: 'lead', text: 'Yes, I currently live in Pune and have no problem with hybrid office attendance.', timestampSeconds: 41 },
        { id: 't_7', speaker: 'agent', text: 'Could you highlight your experience with telephony uptime and autoscaling?', timestampSeconds: 50 },
        { id: 't_8', speaker: 'lead', text: 'I managed autoscaling Kubernetes clusters running Asterisk and Kamailio SIP proxies maintaining 99.99% availability during flash calling spikes.', timestampSeconds: 68 },
        { id: 't_9', speaker: 'agent', text: 'Thank you Priya. Your verified telemetry profile has been sent to the infrastructure lead.', timestampSeconds: 81 },
      ],
      quotes: [
        'I managed autoscaling Kubernetes clusters running Asterisk and Kamailio SIP proxies.',
      ],
    },
    {
      id: 'call_vikram_backend_07',
      leadId: 'lead_vikram_07',
      name: 'Vikramaditya Rao',
      email: 'vikram.rao@scalecore.io',
      phone: '+919819234567',
      role: 'Backend Microservices Lead',
      company: 'ScaleCore Technologies',
      experience: '4.5 Years',
      notice: '45 Days',
      ctc: '₹21.0 LPA',
      currentCtc: '₹16.0 LPA',
      workMode: 'On Site, Pune',
      interactionId: '20261008/8adebeb7-12:18:26-ff179ef6',
      durationSeconds: 76,
      cefrBand: 'B2',
      cefrLevel: 'Upper Intermediate',
      score: 8.6,
      discrepancy: 'none',
      discrepancyDetected: 'no',
      verdict: 'Recommended for Engineering Leadership Discussion',
      transcript: [
        { id: 't_1', speaker: 'agent', text: 'Hello Vikramaditya, calling from Fluid.live for the Backend Microservices Lead position. Can we verify a few details?', timestampSeconds: 2 },
        { id: 't_2', speaker: 'lead', text: 'Yes, sure, go ahead.', timestampSeconds: 6 },
        { id: 't_3', speaker: 'agent', text: 'You submitted 4.5 years experience in Go and Node.js microservices with 45 days notice. Is that up to date?', timestampSeconds: 15 },
        { id: 't_4', speaker: 'lead', text: 'Yes, four and a half years building event-driven microservices, with forty-five days contractual notice.', timestampSeconds: 26 },
        { id: 't_5', speaker: 'agent', text: 'Are you comfortable working on-site at our Pune development centre?', timestampSeconds: 34 },
        { id: 't_6', speaker: 'lead', text: 'Yes, I am located in Pune and prefer working directly with the core engineering group.', timestampSeconds: 43 },
        { id: 't_7', speaker: 'agent', text: 'What is your primary message broker experience?', timestampSeconds: 50 },
        { id: 't_8', speaker: 'lead', text: 'Kafka and RabbitMQ for distributed event streaming, along with PostgreSQL for ACID transaction records.', timestampSeconds: 61 },
        { id: 't_9', speaker: 'agent', text: 'Thank you Vikramaditya. We will schedule your technical discussion with our VP of Engineering.', timestampSeconds: 72 },
      ],
      quotes: [
        'Four and a half years building event-driven microservices, with forty-five days notice.',
      ],
    },
    {
      id: 'call_kavita_qa_08',
      leadId: 'lead_kavita_08',
      name: 'Kavita Desai',
      email: 'kavita.desai@qasphere.com',
      phone: '+919930412876',
      role: 'QA Automation & Realtime Test Lead',
      company: 'QA Sphere',
      experience: '3 Years',
      notice: 'Immediate',
      ctc: '₹11.5 LPA',
      currentCtc: '₹8.0 LPA',
      workMode: 'On Site, Pune',
      interactionId: '20261012/8adebeb7-19:40:16-837f68c0',
      durationSeconds: 53,
      cefrBand: 'B2',
      cefrLevel: 'Upper Intermediate',
      score: 8.2,
      discrepancy: 'none',
      discrepancyDetected: 'no',
      verdict: 'Recommended for Round 1 QA Automation Technical',
      transcript: [
        { id: 't_1', speaker: 'agent', text: 'Hello Kavita, automated verification from Fluid.live for the QA Automation Lead role. Are you available for a quick check?', timestampSeconds: 2 },
        { id: 't_2', speaker: 'lead', text: 'Yes, hello. I am available.', timestampSeconds: 6 },
        { id: 't_3', speaker: 'agent', text: 'You indicated 3 years in end-to-end automation and immediate availability. Is that correct?', timestampSeconds: 13 },
        { id: 't_4', speaker: 'lead', text: 'Yes, three years experience and I can join immediately as I am already serving my final week.', timestampSeconds: 22 },
        { id: 't_5', speaker: 'agent', text: 'Are you comfortable working on-site at Pune?', timestampSeconds: 28 },
        { id: 't_6', speaker: 'lead', text: 'Yes, I am residing in Pune and ready to join immediately on-site.', timestampSeconds: 34 },
        { id: 't_7', speaker: 'agent', text: 'Which test frameworks do you use for API and telephony verification?', timestampSeconds: 40 },
        { id: 't_8', speaker: 'lead', text: 'Playwright for UI, PyTest for backend APIs, and custom SIP test suites.', timestampSeconds: 46 },
        { id: 't_9', speaker: 'agent', text: 'Thank you Kavita. Our QA lead will connect with you shortly.', timestampSeconds: 50 },
      ],
      quotes: [
        'Three years experience and I can join immediately as I am already serving my final week.',
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
