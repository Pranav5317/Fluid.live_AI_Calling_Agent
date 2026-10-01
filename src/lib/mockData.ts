import {
  Business,
  Agent,
  AgentVersion,
  Campaign,
  Lead,
  CampaignLead,
  Call,
  PhoneNumber,
  KnowledgeBase,
  KnowledgeDocument,
  UsageEvent,
  BillingPeriod,
  DashboardMetrics,
  RecentActivity,
  CallActivityPoint,
  WebhookEvent
} from '../types';

export const mockBusiness: Business = {
  id: 'biz_01h9x7890abcdef',
  name: 'Apex Enterprises Inc.',
  email: 'ops@apexenterprises.com',
  plan: 'Enterprise Tier 2',
  timezone: 'America/New_York',
  createdAt: '2025-11-15T08:00:00Z',
};

export const mockAgentVersions: Record<string, AgentVersion[]> = {
  'ag_csat_01': [
    {
      id: 'agv_csat_v1',
      agentId: 'ag_csat_01',
      versionNumber: 1,
      notes: 'Initial prompt release with 3 survey questions',
      createdAt: '2026-08-01T10:00:00Z',
      config: {
        voiceModel: 'Sarvam Neural Voice - English (US) - Professional Female',
        language: 'en-US',
        openingLine: "Hello, this is Sarah calling on behalf of Apex Enterprises. I'm following up on your recent service experience. Do you have 2 minutes to share your feedback?",
        closingBehavior: 'Thank the customer politely, summarize their satisfaction rating, and close the call gracefully.',
        systemPrompt: `You are Sarah, an empathetic customer satisfaction specialist calling on behalf of Apex Enterprises.
Your goal is to gather honest feedback about the lead's recent experience.
Be warm, professional, concise, and respectful of their time.
If the customer expresses dissatisfaction, acknowledge their feelings gently and note down the reason.
If they ask for a manager callback, mark the callback variable as true.`,
        flowNodes: [
          {
            id: 'node_1',
            type: 'start',
            title: 'Start Call',
            content: 'Initiate call connection and verify audio stream.',
            nextNodeId: 'node_2',
          },
          {
            id: 'node_2',
            type: 'opening',
            title: 'Opening Greeting',
            content: "Hello, this is Sarah calling on behalf of Apex Enterprises. Do you have 2 minutes to share your feedback?",
            nextNodeId: 'node_3',
          },
          {
            id: 'node_3',
            type: 'question',
            title: 'Satisfaction Rating',
            content: "On a scale of 1 to 5, how satisfied were you with your overall service experience?",
            variableKey: 'satisfaction_rating',
            nextNodeId: 'node_4',
          },
          {
            id: 'node_4',
            type: 'conditional',
            title: 'Rating Check',
            content: 'Check if rating is less than 3 for escalation.',
            branches: [
              { condition: 'satisfaction_rating <= 2', targetNodeId: 'node_5_dissatisfied' },
              { condition: 'satisfaction_rating >= 3', targetNodeId: 'node_5_satisfied' }
            ]
          },
          {
            id: 'node_5_dissatisfied',
            type: 'data_collection',
            title: 'Capture Issue Detail',
            content: 'Ask what went wrong and offer a manager callback.',
            variableKey: 'dissatisfaction_reason',
            nextNodeId: 'node_6',
          },
          {
            id: 'node_5_satisfied',
            type: 'data_collection',
            title: 'Capture Positive Feedback',
            content: 'Ask what they enjoyed most about the service.',
            variableKey: 'positive_feedback',
            nextNodeId: 'node_6',
          },
          {
            id: 'node_6',
            type: 'closing',
            title: 'Closing Remark',
            content: 'Thank you so much for your time and feedback today. Have a wonderful day!',
            nextNodeId: 'node_7',
          },
          {
            id: 'node_7',
            type: 'end',
            title: 'End Call',
            content: 'Terminate call session and output extracted variables.',
          }
        ],
        knowledgeBaseIds: ['kb_faqs_01'],
        extractedVariables: [
          { key: 'satisfaction_rating', label: 'Satisfaction Rating (1-5)', type: 'number', required: true, description: 'Customer numerical rating from 1 to 5' },
          { key: 'dissatisfaction_reason', label: 'Reason for Low Rating', type: 'string', required: false, description: 'Details if score was 1 or 2' },
          { key: 'callback_requested', label: 'Callback Requested', type: 'boolean', required: true, description: 'True if customer wants supervisor follow-up' },
          { key: 'primary_topic', label: 'Primary Feedback Category', type: 'enum', required: false, description: 'Category of feedback', enumOptions: ['Product Quality', 'Support Speed', 'Pricing', 'Ease of Use'] }
        ],
        runtimeSettings: {
          maxDurationMinutes: 5,
          silenceTimeoutSeconds: 6,
          interruptionSensitivity: 'medium',
          recordingEnabled: true,
        }
      }
    },
    {
      id: 'agv_csat_v2',
      agentId: 'ag_csat_01',
      versionNumber: 2,
      notes: 'Added secondary net promoter score question and faster silence detection',
      createdAt: '2026-09-10T14:30:00Z',
      config: {
        voiceModel: 'Sarvam Neural Voice - English (US) - Professional Female v2',
        language: 'en-US',
        openingLine: "Hi, this is Sarah from Apex Enterprises following up on your recent service. Do you have 90 seconds to share your experience?",
        closingBehavior: 'Express sincere gratitude and confirm callback details if requested.',
        systemPrompt: `You are Sarah, an AI representative for Apex Enterprises. Conduct a concise CSAT survey.`,
        flowNodes: [],
        knowledgeBaseIds: ['kb_faqs_01'],
        extractedVariables: [
          { key: 'satisfaction_rating', label: 'Satisfaction Rating (1-5)', type: 'number', required: true, description: 'Score 1 to 5' },
          { key: 'nps_score', label: 'NPS Score (0-10)', type: 'number', required: false, description: 'Likelihood to recommend' },
          { key: 'callback_requested', label: 'Callback Requested', type: 'boolean', required: true, description: 'Supervisor follow-up' },
        ],
        runtimeSettings: {
          maxDurationMinutes: 4,
          silenceTimeoutSeconds: 5,
          interruptionSensitivity: 'high',
          recordingEnabled: true,
        }
      }
    }
  ],
  'ag_renewal_02': [
    {
      id: 'agv_renewal_v1',
      agentId: 'ag_renewal_02',
      versionNumber: 1,
      notes: 'Initial production release for annual subscription renewals',
      createdAt: '2026-08-15T11:00:00Z',
      config: {
        voiceModel: 'Sarvam Neural Voice - English (US) - Executive Male',
        language: 'en-US',
        openingLine: "Hello, this is David calling from Apex Enterprises Account Services regarding your upcoming annual subscription renewal. Is now a convenient time to speak?",
        closingBehavior: 'Confirm discount offer status and send confirmation email notice.',
        systemPrompt: `You are David, a Senior Account Specialist at Apex Enterprises. You are calling customers whose annual plan is renewing within 30 days. Remind them of their upcoming renewal, present their early-bird 10% discount, and verify if they wish to auto-renew or speak to their account manager.`,
        flowNodes: [
          { id: 'rn_1', type: 'start', title: 'Call Start', content: 'Connect call' },
          { id: 'rn_2', type: 'opening', title: 'Account Introduction', content: 'Greetings and purpose of renewal outreach' },
          { id: 'rn_3', type: 'question', title: 'Intent to Renew', content: 'Do you plan to renew your subscription for another year?' },
          { id: 'rn_4', type: 'end', title: 'Call End', content: 'Closing confirmation' }
        ],
        knowledgeBaseIds: ['kb_policy_02'],
        extractedVariables: [
          { key: 'renewal_intent', label: 'Renewal Intent', type: 'enum', required: true, description: 'Customer intent', enumOptions: ['Will Renew', 'Considering', 'Will Cancel', 'Undecided'] },
          { key: 'discount_accepted', label: 'Discount Accepted', type: 'boolean', required: true, description: 'Early-bird 10% offer accepted' },
          { key: 'account_manager_needed', label: 'Account Manager Needed', type: 'boolean', required: true, description: 'Wants personal manager call' }
        ],
        runtimeSettings: {
          maxDurationMinutes: 8,
          silenceTimeoutSeconds: 7,
          interruptionSensitivity: 'medium',
          recordingEnabled: true,
        }
      }
    }
  ],
  'ag_onboarding_03': [
    {
      id: 'agv_onboarding_v1',
      agentId: 'ag_onboarding_03',
      versionNumber: 1,
      notes: 'First launch for post-purchase onboarding check-in',
      createdAt: '2026-09-01T09:00:00Z',
      config: {
        voiceModel: 'Sarvam Neural Voice - English (IN) - Professional Female',
        language: 'en-IN',
        openingLine: "Hi, this is Maya from Apex Customer Success! I saw you recently got started with our platform and wanted to check if you need help setting up your team.",
        closingBehavior: 'Send onboarding guide link via SMS and wrap up.',
        systemPrompt: `You are Maya, Onboarding Lead at Apex Enterprises. Offer assistance to new customers.`,
        flowNodes: [],
        knowledgeBaseIds: ['kb_faqs_01', 'kb_prod_03'],
        extractedVariables: [
          { key: 'onboarding_status', label: 'Onboarding Status', type: 'enum', required: true, description: 'Progress level', enumOptions: ['Not Started', 'In Progress', 'Fully Setup'] },
          { key: 'demo_scheduled', label: 'Demo Scheduled', type: 'boolean', required: true, description: 'Booked live demo session' }
        ],
        runtimeSettings: {
          maxDurationMinutes: 6,
          silenceTimeoutSeconds: 5,
          interruptionSensitivity: 'medium',
          recordingEnabled: true,
        }
      }
    }
  ]
};

export const mockAgents: Agent[] = [
  {
    id: 'ag_csat_01',
    name: 'Customer Satisfaction Specialist',
    useCase: 'Post-service satisfaction survey & feedback collection',
    status: 'active',
    currentVersionId: 'agv_csat_v2',
    campaignsCount: 2,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-09-10T14:30:00Z',
  },
  {
    id: 'ag_renewal_02',
    name: 'Subscription Renewal Assistant',
    useCase: 'Annual contract renewal outreach & account retention',
    status: 'active',
    currentVersionId: 'agv_renewal_v1',
    campaignsCount: 1,
    createdAt: '2026-08-15T11:00:00Z',
    updatedAt: '2026-09-05T09:15:00Z',
  },
  {
    id: 'ag_onboarding_03',
    name: 'New Client Onboarding Concierge',
    useCase: 'Welcome call, setup verification & demo scheduling',
    status: 'active',
    currentVersionId: 'agv_onboarding_v1',
    campaignsCount: 1,
    createdAt: '2026-09-01T09:00:00Z',
    updatedAt: '2026-09-18T16:20:00Z',
  },
  {
    id: 'ag_appt_04',
    name: 'Appointment Verification Agent',
    useCase: 'Pre-appointment confirmation and rescheduling',
    status: 'inactive',
    currentVersionId: 'agv_appt_v1',
    campaignsCount: 0,
    createdAt: '2026-09-12T13:00:00Z',
    updatedAt: '2026-09-12T13:00:00Z',
  }
];

export const mockCampaigns: Campaign[] = [
  {
    id: 'cmp_csat_q3',
    name: 'Q3 Customer Satisfaction Survey',
    agentId: 'ag_csat_01',
    agentVersionId: 'agv_csat_v2',
    phoneNumberId: 'phone_01',
    status: 'running',
    startedAt: '2026-09-15T08:00:00Z',
    totalLeads: 250,
    completedCalls: 184,
    callsAttempted: 215,
    minutesUsed: 462.5,
    createdAt: '2026-09-14T10:00:00Z',
  },
  {
    id: 'cmp_renewal_q4',
    name: 'Q4 Annual Subscription Renewal Outreach',
    agentId: 'ag_renewal_02',
    agentVersionId: 'agv_renewal_v1',
    phoneNumberId: 'phone_02',
    status: 'running',
    startedAt: '2026-09-18T09:30:00Z',
    totalLeads: 120,
    completedCalls: 68,
    callsAttempted: 82,
    minutesUsed: 310.2,
    createdAt: '2026-09-17T14:00:00Z',
  },
  {
    id: 'cmp_onboarding_sep',
    name: 'September Client Onboarding Welcome Calls',
    agentId: 'ag_onboarding_03',
    agentVersionId: 'agv_onboarding_v1',
    phoneNumberId: 'phone_01',
    status: 'paused',
    startedAt: '2026-09-10T11:00:00Z',
    totalLeads: 85,
    completedCalls: 54,
    callsAttempted: 62,
    minutesUsed: 185.0,
    createdAt: '2026-09-09T16:00:00Z',
  },
  {
    id: 'cmp_feedback_vip',
    name: 'VIP Executive Feedback Drive',
    agentId: 'ag_csat_01',
    agentVersionId: 'agv_csat_v2',
    phoneNumberId: 'phone_03',
    status: 'scheduled',
    scheduledAt: '2026-09-25T09:00:00Z',
    totalLeads: 50,
    completedCalls: 0,
    callsAttempted: 0,
    minutesUsed: 0,
    createdAt: '2026-09-20T12:00:00Z',
  },
  {
    id: 'cmp_csat_q2_archive',
    name: 'Q2 Customer Satisfaction Survey (Completed)',
    agentId: 'ag_csat_01',
    agentVersionId: 'agv_csat_v1',
    phoneNumberId: 'phone_01',
    status: 'completed',
    startedAt: '2026-06-01T08:00:00Z',
    completedAt: '2026-06-30T17:00:00Z',
    totalLeads: 400,
    completedCalls: 382,
    callsAttempted: 395,
    minutesUsed: 940.8,
    createdAt: '2026-05-28T10:00:00Z',
  }
];

export const mockLeads: Lead[] = [
  { id: 'lead_101', name: 'Eleanor Vance', phone: '+14155550142', email: 'eleanor.vance@example.com', metadata: { region: 'US-West', accountTier: 'Platinum', signupDate: '2025-02-10' }, createdAt: '2026-09-01T10:00:00Z' },
  { id: 'lead_102', name: 'Marcus Brody', phone: '+13125550189', email: 'marcus.brody@example.com', metadata: { region: 'US-Midwest', accountTier: 'Gold', signupDate: '2025-04-14' }, createdAt: '2026-09-01T10:00:00Z' },
  { id: 'lead_103', name: 'Sophia Chen', phone: '+12125550133', email: 'sophia.chen@example.com', metadata: { region: 'US-East', accountTier: 'Enterprise', signupDate: '2024-11-20' }, createdAt: '2026-09-02T11:30:00Z' },
  { id: 'lead_104', name: 'Julian Thorne', phone: '+14155550198', email: 'j.thorne@example.com', metadata: { region: 'US-West', accountTier: 'Silver', signupDate: '2025-08-05' }, createdAt: '2026-09-02T11:30:00Z' },
  { id: 'lead_105', name: 'Amara Okafor', phone: '+14045550121', email: 'amara.okafor@example.com', metadata: { region: 'US-South', accountTier: 'Gold', signupDate: '2025-01-12' }, createdAt: '2026-09-03T09:15:00Z' },
  { id: 'lead_106', name: 'David Sterling', phone: '+12065550165', email: 'dsterling@example.com', metadata: { region: 'US-Northwest', accountTier: 'Platinum', signupDate: '2024-09-30' }, createdAt: '2026-09-03T09:15:00Z' },
  { id: 'lead_107', name: 'Priya Patel', phone: '+17135550177', email: 'priya.patel@example.com', metadata: { region: 'US-South', accountTier: 'Enterprise', signupDate: '2024-05-18' }, createdAt: '2026-09-05T14:20:00Z' },
  { id: 'lead_108', name: 'Liam O\'Connor', phone: '+16175550112', email: 'liam.oc@example.com', metadata: { region: 'US-Northeast', accountTier: 'Standard', signupDate: '2025-07-22' }, createdAt: '2026-09-05T14:20:00Z' },
  { id: 'lead_109', name: 'Chloe Dubois', phone: '+13055550154', email: 'chloe.dubois@example.com', metadata: { region: 'US-Southeast', accountTier: 'Gold', signupDate: '2025-03-11' }, createdAt: '2026-09-06T10:00:00Z' },
  { id: 'lead_110', name: 'Alexander Wright', phone: '+12145550190', email: 'awright@example.com', metadata: { region: 'US-South', accountTier: 'Platinum', signupDate: '2024-12-01' }, createdAt: '2026-09-06T10:00:00Z' },
  { id: 'lead_111', name: 'Hana Tanaka', phone: '+14155550171', email: 'hana.t@example.com', metadata: { region: 'US-West', accountTier: 'Enterprise', signupDate: '2025-06-19' }, createdAt: '2026-09-10T08:45:00Z' },
  { id: 'lead_112', name: 'Robert Vance', phone: '+13125550119', email: 'rvance@example.com', metadata: { region: 'US-Midwest', accountTier: 'Silver', signupDate: '2025-05-02' }, createdAt: '2026-09-10T08:45:00Z' },
  { id: 'lead_113', name: 'Elena Rostova', phone: '+12125550148', email: 'elena.rostova@example.com', metadata: { region: 'US-East', accountTier: 'Gold', signupDate: '2025-01-30' }, createdAt: '2026-09-12T13:00:00Z' },
  { id: 'lead_114', name: 'Carlos Mendez', phone: '+16025550162', email: 'carlos.m@example.com', metadata: { region: 'US-Southwest', accountTier: 'Standard', signupDate: '2025-08-14' }, createdAt: '2026-09-12T13:00:00Z' },
  { id: 'lead_115', name: 'Grace Miller', phone: '+12065550183', email: 'grace.m@example.com', metadata: { region: 'US-Northwest', accountTier: 'Platinum', signupDate: '2024-10-15' }, createdAt: '2026-09-15T09:00:00Z' }
];

export const mockCampaignLeads: CampaignLead[] = [
  { id: 'cmpl_1', campaignId: 'cmp_csat_q3', leadId: 'lead_101', status: 'completed', attemptCount: 1, lastAttemptAt: '2026-09-21T14:32:00Z' },
  { id: 'cmpl_2', campaignId: 'cmp_csat_q3', leadId: 'lead_102', status: 'contacted', attemptCount: 1, lastAttemptAt: '2026-09-21T15:10:00Z' },
  { id: 'cmpl_3', campaignId: 'cmp_csat_q3', leadId: 'lead_103', status: 'callback', attemptCount: 2, lastAttemptAt: '2026-09-21T16:05:00Z', nextAttemptAt: '2026-09-22T16:00:00Z' },
  { id: 'cmpl_4', campaignId: 'cmp_csat_q3', leadId: 'lead_104', status: 'untouched', attemptCount: 0 },
  { id: 'cmpl_5', campaignId: 'cmp_csat_q3', leadId: 'lead_105', status: 'calling', attemptCount: 1, lastAttemptAt: '2026-09-22T10:14:00Z' },
  { id: 'cmpl_6', campaignId: 'cmp_renewal_q4', leadId: 'lead_106', status: 'completed', attemptCount: 1, lastAttemptAt: '2026-09-20T11:20:00Z' },
  { id: 'cmpl_7', campaignId: 'cmp_renewal_q4', leadId: 'lead_107', status: 'failed', attemptCount: 3, lastAttemptAt: '2026-09-21T09:45:00Z' },
  { id: 'cmpl_8', campaignId: 'cmp_renewal_q4', leadId: 'lead_108', status: 'untouched', attemptCount: 0 },
  { id: 'cmpl_9', campaignId: 'cmp_onboarding_sep', leadId: 'lead_109', status: 'completed', attemptCount: 1, lastAttemptAt: '2026-09-18T13:15:00Z' },
  { id: 'cmpl_10', campaignId: 'cmp_onboarding_sep', leadId: 'lead_110', status: 'queued', attemptCount: 0 }
];

export const mockCalls: Call[] = [
  {
    id: 'call_9001',
    externalCallId: 'srv_call_8849102',
    campaignId: 'cmp_csat_q3',
    agentId: 'ag_csat_01',
    agentVersionId: 'agv_csat_v2',
    leadId: 'lead_101',
    phoneNumberId: 'phone_01',
    status: 'completed',
    outcome: 'successful_contact',
    durationSeconds: 164,
    startedAt: '2026-09-21T14:29:16Z',
    endedAt: '2026-09-21T14:32:00Z',
    extractedVariables: {
      satisfaction_rating: 5,
      callback_requested: false,
      primary_topic: 'Support Speed'
    },
    usageEventId: 'usg_9001',
    transcript: [
      { id: 'tr_1', speaker: 'agent', text: "Hello, this is Sarah calling on behalf of Apex Enterprises. Do you have 2 minutes to share your feedback?", timestampSeconds: 2 },
      { id: 'tr_2', speaker: 'lead', text: "Sure Eleanor here. I actually had a great experience with your support team yesterday.", timestampSeconds: 12 },
      { id: 'tr_3', speaker: 'agent', text: "That is wonderful to hear! On a scale of 1 to 5, how satisfied were you overall?", timestampSeconds: 24 },
      { id: 'tr_4', speaker: 'lead', text: "Definitely a 5. They solved my issue in under ten minutes.", timestampSeconds: 32 },
      { id: 'tr_5', speaker: 'agent', text: "Thank you so much Eleanor! We really appreciate your high rating and business. Have a great day!", timestampSeconds: 48 }
    ]
  },
  {
    id: 'call_9002',
    externalCallId: 'srv_call_8849103',
    campaignId: 'cmp_csat_q3',
    agentId: 'ag_csat_01',
    agentVersionId: 'agv_csat_v2',
    leadId: 'lead_103',
    phoneNumberId: 'phone_01',
    status: 'completed',
    outcome: 'callback_requested',
    durationSeconds: 215,
    startedAt: '2026-09-21T16:01:25Z',
    endedAt: '2026-09-21T16:05:00Z',
    extractedVariables: {
      satisfaction_rating: 2,
      dissatisfaction_reason: 'Delayed invoice receipt and missing line items',
      callback_requested: true,
      primary_topic: 'Pricing'
    },
    usageEventId: 'usg_9002',
    transcript: [
      { id: 'tr_11', speaker: 'agent', text: "Hi Sophia, this is Sarah from Apex Enterprises. Do you have a moment for a quick feedback check?", timestampSeconds: 3 },
      { id: 'tr_12', speaker: 'lead', text: "Honestly I'm quite frustrated. My invoice came late and the totals didn't line up.", timestampSeconds: 15 },
      { id: 'tr_13', speaker: 'agent', text: "I completely understand how stressful billing discrepancies are. On a scale of 1 to 5, how would you rate the resolution so far?", timestampSeconds: 30 },
      { id: 'tr_14', speaker: 'lead', text: "I'd give it a 2. I need a billing manager to call me back tomorrow afternoon.", timestampSeconds: 45 },
      { id: 'tr_15', speaker: 'agent', text: "I have flagged this immediately for our Billing Supervisor to contact you tomorrow. Thank you Sophia.", timestampSeconds: 62 }
    ]
  },
  {
    id: 'call_9003',
    externalCallId: 'srv_call_8849104',
    campaignId: 'cmp_renewal_q4',
    agentId: 'ag_renewal_02',
    agentVersionId: 'agv_renewal_v1',
    leadId: 'lead_106',
    phoneNumberId: 'phone_02',
    status: 'completed',
    outcome: 'successful_contact',
    durationSeconds: 280,
    startedAt: '2026-09-20T11:15:20Z',
    endedAt: '2026-09-20T11:20:00Z',
    extractedVariables: {
      renewal_intent: 'Will Renew',
      discount_accepted: true,
      account_manager_needed: false
    },
    usageEventId: 'usg_9003',
    transcript: [
      { id: 'tr_21', speaker: 'agent', text: "Hello David, this is David calling from Apex Account Services regarding your upcoming renewal.", timestampSeconds: 4 },
      { id: 'tr_22', speaker: 'lead', text: "Hi David. Yes, we are planning to continue our annual license.", timestampSeconds: 16 },
      { id: 'tr_23', speaker: 'agent', text: "Excellent news! As a valued Platinum client, I can apply our 10% early-bird discount right now.", timestampSeconds: 32 },
      { id: 'tr_24', speaker: 'lead', text: "Great, please apply that and email the updated agreement.", timestampSeconds: 46 }
    ]
  },
  {
    id: 'call_9004',
    externalCallId: 'srv_call_8849105',
    campaignId: 'cmp_renewal_q4',
    agentId: 'ag_renewal_02',
    agentVersionId: 'agv_renewal_v1',
    leadId: 'lead_107',
    phoneNumberId: 'phone_02',
    status: 'failed',
    outcome: 'unreachable',
    durationSeconds: 22,
    startedAt: '2026-09-21T09:44:38Z',
    endedAt: '2026-09-21T09:45:00Z',
    extractedVariables: {},
    usageEventId: 'usg_9004',
    transcript: [
      { id: 'tr_31', speaker: 'agent', text: "Call connection attempted...", timestampSeconds: 1 }
    ]
  }
];

export const mockPhoneNumbers: PhoneNumber[] = [
  {
    id: 'phone_01',
    phoneNumber: '+1 (800) 555-0199',
    status: 'active',
    provider: 'Sarvam Voice Telephony Infrastructure',
    assignedAgentId: 'ag_csat_01',
    assignedCampaignId: 'cmp_csat_q3',
    createdAt: '2026-07-01T00:00:00Z'
  },
  {
    id: 'phone_02',
    phoneNumber: '+1 (800) 555-0244',
    status: 'active',
    provider: 'Sarvam Voice Telephony Infrastructure',
    assignedAgentId: 'ag_renewal_02',
    assignedCampaignId: 'cmp_renewal_q4',
    createdAt: '2026-07-15T00:00:00Z'
  },
  {
    id: 'phone_03',
    phoneNumber: '+1 (888) 555-0812',
    status: 'reserved',
    provider: 'Sarvam Voice Telephony Infrastructure',
    assignedAgentId: 'ag_onboarding_03',
    createdAt: '2026-08-01T00:00:00Z'
  },
  {
    id: 'phone_04',
    phoneNumber: '+1 (888) 555-0950',
    status: 'unassigned',
    provider: 'Sarvam Voice Telephony Infrastructure',
    createdAt: '2026-09-01T00:00:00Z'
  }
];

export const mockKnowledgeBases: KnowledgeBase[] = [
  {
    id: 'kb_faqs_01',
    name: 'Enterprise Service FAQs & Terms',
    description: 'Standard operational guidelines, support hours, refund policies and troubleshooting steps.',
    documentCount: 4,
    assignedAgentIds: ['ag_csat_01', 'ag_onboarding_03'],
    createdAt: '2026-07-10T10:00:00Z'
  },
  {
    id: 'kb_policy_02',
    name: '2026 Annual Subscription Policy',
    description: 'Contract terms, early-bird renewal rules, upgrade tiers and payment schedules.',
    documentCount: 2,
    assignedAgentIds: ['ag_renewal_02'],
    createdAt: '2026-08-05T14:00:00Z'
  },
  {
    id: 'kb_prod_03',
    name: 'Product Onboarding & Setup Manual',
    description: 'Step-by-step account configuration guides, API keys setup and user permissions.',
    documentCount: 3,
    assignedAgentIds: ['ag_onboarding_03'],
    createdAt: '2026-08-20T09:30:00Z'
  }
];

export const mockKnowledgeDocuments: KnowledgeDocument[] = [
  { id: 'doc_1', knowledgeBaseId: 'kb_faqs_01', fileName: 'Customer_Support_FAQ_2026.pdf', fileSize: 1420500, status: 'ready', uploadedAt: '2026-07-10T10:05:00Z' },
  { id: 'doc_2', knowledgeBaseId: 'kb_faqs_01', fileName: 'Service_Level_Agreement_v3.pdf', fileSize: 2840000, status: 'ready', uploadedAt: '2026-07-11T11:20:00Z' },
  { id: 'doc_3', knowledgeBaseId: 'kb_faqs_01', fileName: 'Billing_Escalation_Matrix.docx', fileSize: 512000, status: 'ready', uploadedAt: '2026-07-12T09:00:00Z' },
  { id: 'doc_4', knowledgeBaseId: 'kb_policy_02', fileName: 'Annual_Renewal_Terms_2026.pdf', fileSize: 1890000, status: 'ready', uploadedAt: '2026-08-05T14:10:00Z' },
  { id: 'doc_5', knowledgeBaseId: 'kb_policy_02', fileName: 'Special_Discount_Schedule.pdf', fileSize: 850000, status: 'processing', uploadedAt: '2026-09-22T08:15:00Z' },
  { id: 'doc_6', knowledgeBaseId: 'kb_prod_03', fileName: 'API_Integration_Quickstart.pdf', fileSize: 3400000, status: 'failed', uploadedAt: '2026-09-21T16:40:00Z', error: 'Document OCR parsing timeout. Please re-upload as clear PDF.' }
];

export const mockUsageEvents: UsageEvent[] = [
  { id: 'usg_9001', callId: 'call_9001', campaignId: 'cmp_csat_q3', agentId: 'ag_csat_01', durationMinutes: 2.73, providerCostUnits: 0.136, platformCostUnits: 0.218, timestamp: '2026-09-21T14:32:00Z' },
  { id: 'usg_9002', callId: 'call_9002', campaignId: 'cmp_csat_q3', agentId: 'ag_csat_01', durationMinutes: 3.58, providerCostUnits: 0.179, platformCostUnits: 0.286, timestamp: '2026-09-21T16:05:00Z' },
  { id: 'usg_9003', callId: 'call_9003', campaignId: 'cmp_renewal_q4', agentId: 'ag_renewal_02', durationMinutes: 4.67, providerCostUnits: 0.233, platformCostUnits: 0.373, timestamp: '2026-09-20T11:20:00Z' },
  { id: 'usg_9004', callId: 'call_9004', campaignId: 'cmp_renewal_q4', agentId: 'ag_renewal_02', durationMinutes: 0.36, providerCostUnits: 0.018, platformCostUnits: 0.028, timestamp: '2026-09-21T09:45:00Z' }
];

export const mockBillingPeriods: BillingPeriod[] = [
  {
    id: 'bp_2026_09',
    periodName: 'September 2026 (Current)',
    startDate: '2026-09-01T00:00:00Z',
    endDate: '2026-09-30T23:59:59Z',
    totalMinutesUsed: 957.7,
    totalCallsCount: 359,
    estimatedTotalCost: 143.65,
    providerCostTotal: 47.88,
    platformCostTotal: 95.77,
    status: 'current'
  },
  {
    id: 'bp_2026_08',
    periodName: 'August 2026',
    startDate: '2026-08-01T00:00:00Z',
    endDate: '2026-08-31T23:59:59Z',
    totalMinutesUsed: 1420.0,
    totalCallsCount: 540,
    estimatedTotalCost: 213.00,
    providerCostTotal: 71.00,
    platformCostTotal: 142.00,
    status: 'paid'
  }
];

export const mockDashboardMetrics: DashboardMetrics = {
  totalLeads: 2500,
  untouchedLeads: 840,
  campaignsBuilt: 5,
  callsAttempted: 692,
  minutesUtilized: 957.7,
  leadsTrendPercentage: 12.4,
  untouchedTrendPercentage: -5.2,
  campaignsTrendPercentage: 25.0,
  callsTrendPercentage: 18.6,
  minutesTrendPercentage: 21.3
};

export const mockCallActivityPoints: CallActivityPoint[] = [
  { date: 'Sep 16', attempts: 45, completed: 38 },
  { date: 'Sep 17', attempts: 62, completed: 51 },
  { date: 'Sep 18', attempts: 88, completed: 74 },
  { date: 'Sep 19', attempts: 110, completed: 92 },
  { date: 'Sep 20', attempts: 135, completed: 118 },
  { date: 'Sep 21', attempts: 142, completed: 124 },
  { date: 'Sep 22', attempts: 110, completed: 95 }
];

export const mockRecentActivities: RecentActivity[] = [
  {
    id: 'act_101',
    type: 'campaign_started',
    title: 'Q4 Annual Renewal Campaign Launched',
    description: 'Campaign assigned to agent "Subscription Renewal Assistant" with 120 leads.',
    timestamp: '2026-09-18T09:30:00Z',
    entityId: 'cmp_renewal_q4'
  },
  {
    id: 'act_102',
    type: 'agent_updated',
    title: 'Agent Version 2 Published',
    description: 'Updated prompt and lower silence timeout on "Customer Satisfaction Specialist".',
    timestamp: '2026-09-10T14:30:00Z',
    entityId: 'ag_csat_01'
  },
  {
    id: 'act_103',
    type: 'leads_imported',
    title: '150 New Consumer Leads Imported',
    description: 'Uploaded via CSV batch process for Q3 CSAT survey audience.',
    timestamp: '2026-09-15T08:00:00Z'
  },
  {
    id: 'act_104',
    type: 'call_completed',
    title: 'High Priority Callback Flagged',
    description: 'Call #srv_call_8849103 requested billing manager escalation.',
    timestamp: '2026-09-21T16:05:00Z',
    entityId: 'call_9002'
  }
];

export const mockWebhookEvents: WebhookEvent[] = [
  {
    id: 'wh_evt_001',
    provider: 'sarvam',
    eventType: 'call.completed',
    externalId: 'srv_call_8849102',
    payload: { duration: 164, status: 'completed', variablesExtracted: { satisfaction_rating: 5 } },
    status: 'processed',
    receivedAt: '2026-09-21T14:32:05Z'
  },
  {
    id: 'wh_evt_002',
    provider: 'sarvam',
    eventType: 'call.failed',
    externalId: 'srv_call_8849105',
    payload: { reason: 'UNREACHABLE_NO_ANSWER', duration: 22 },
    status: 'processed',
    receivedAt: '2026-09-21T09:45:02Z'
  }
];

