import { AgentConfig, CallFlowNode, ExtractedVariableConfig } from '../types';

export interface IndustryTemplate {
  id: string;
  category: 'BFSI' | 'E-Commerce' | 'Healthcare' | 'B2B SaaS' | 'Automotive';
  title: string;
  badge: string;
  description: string;
  agentName: string;
  useCase: string;
  config: Partial<AgentConfig>;
}

export const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
  {
    id: 'bfsi-emi-reminder',
    category: 'BFSI',
    title: 'Loan EMI Friendly Reminder & UPI Link',
    badge: 'BFSI & Fintech',
    description: 'Courteous bilingual verification of upcoming loan installment with instant WhatsApp UPI link delivery.',
    agentName: 'HDFC Personal Loan Payment Assistant',
    useCase: 'Pre-due date payment reminder and digital mandate verification',
    config: {
      voiceModel: 'Shubh - Friendly Verification Indian Male',
      language: 'hi-IN',
      openingLine: 'नमस्ते <user_name> ji! मैं आपके लोन अकाउंट की अपकमिंग EMI के रिगार्डिंग बात कर रहा हूँ। क्या मेरी बात <user_name> ji से हो रही है?',
      closingBehavior: 'धन्यवाद <user_name> ji! आपके रजिस्टर्ड नंबर पर पेमेंट लिंक SMS और WhatsApp पर भेज दिया गया है। हैव अ वंडरफुल डे!',
      systemPrompt: `Persona & Context:
Role: Shubh, a friendly, respectful EMI advisor calling on behalf of the bank.
Tone: Highly courteous, respectful, and helpful. Never sound threatening, aggressive, or robotic.

Rules:
1. Confirm identity first. If speaking with someone else, politely ask when the primary account holder is reachable.
2. State the EMI due date and amount clearly and politely.
3. If customer agrees to pay today, immediately offer to dispatch an instant UPI payment link via WhatsApp.
4. If customer says they already paid, politely note down the transaction reference and assure them no further reminder will be sent.
5. If customer requests a callback or extension, record their promised date and conclude politely.
6. Maximum 25 words per conversational turn. Always address the customer with respect ("ji", "Sir", "Madam").`,
      sarvamAppId: 'Conversatio-b063cf10-e735',
      flowNodes: [
        { id: 'fn_1', type: 'start', title: 'Call Connected', content: 'Establish line connection' },
        { id: 'fn_2', type: 'opening', title: 'Identity & Due Date', content: 'Confirm customer identity and remind of upcoming EMI due' },
        { id: 'fn_3', type: 'question', title: 'Payment Intent', content: 'Inquire if payment will be debited via auto-debit or UPI' },
        { id: 'fn_4', type: 'conditional', title: 'Handle Objection / Mode', content: 'Branch based on response (Pay Now vs Callback vs Already Paid)' },
        { id: 'fn_5', type: 'data_collection', title: 'Send Payment Link', content: 'Trigger instant WhatsApp payment link webhook' },
        { id: 'fn_6', type: 'closing', title: 'Courteous Closing', content: 'Thank customer respectfully' },
      ],
      extractedVariables: [
        { key: 'customer_confirmed', label: 'Identity Confirmed', type: 'boolean', required: true, description: 'Whether the right customer was verified' },
        { key: 'payment_intent', label: 'Payment Intent', type: 'enum', enumOptions: ['pay_today', 'auto_debit', 'already_paid', 'promise_later', 'dispute'], required: true, description: 'Stated payment mode or intention' },
        { key: 'promised_payment_date', label: 'Promised Payment Date', type: 'string', required: false, description: 'Date customer promised to clear the installment' },
        { key: 'whatsapp_link_sent', label: 'WhatsApp Link Dispatched', type: 'boolean', required: false, description: 'True if customer requested UPI link via WhatsApp' },
      ],
    },
  },
  {
    id: 'ecom-cod-verification',
    category: 'E-Commerce',
    title: 'COD Order Verification & Address Check',
    badge: 'D2C & E-Commerce',
    description: 'Drastically slash RTO (Return to Origin) by verifying Cash-on-Delivery orders before dispatch.',
    agentName: 'UrbanStore COD Verification Specialist',
    useCase: 'Pre-dispatch COD confirmation, address verification, and delivery slot preference',
    config: {
      voiceModel: 'Shreya - Courteous Professional Indian Female',
      language: 'en-IN',
      openingLine: 'Hi <user_name>! I am calling from UrbanStore to quickly confirm your Cash-on-Delivery order of ₹2,499. Are you available to receive this delivery this week?',
      closingBehavior: 'Thank you so much! Your order has been prioritized for dispatch. You will receive live tracking on WhatsApp soon!',
      systemPrompt: `Persona & Context:
Role: Shreya, an energetic and courteous customer concierge at UrbanStore.
Tone: Warm, prompt, and helpful.

Objectives:
1. Verify customer ordered the item intentionally.
2. Confirm the complete shipping address and pincode.
3. If confirmed, confirm that cash or UPI will be ready on delivery day.
4. If customer wants to cancel, politely capture the cancellation reason without pressuring them.
5. If customer is unavailable, offer to reschedule delivery to a preferred day.
6. Keep turns short, engaging, and friendly.`,
      sarvamAppId: 'Conversatio-b063cf10-e735',
      flowNodes: [
        { id: 'fn_1', type: 'start', title: 'Call Connected', content: 'Connect telephony line' },
        { id: 'fn_2', type: 'opening', title: 'Order Confirmation', content: 'Mention item and total COD amount' },
        { id: 'fn_3', type: 'question', title: 'Address & Availability', content: 'Confirm delivery address and availability to receive' },
        { id: 'fn_4', type: 'data_collection', title: 'Dispatch Tagging', content: 'Tag order as Confirmed or Cancelled in Shopify' },
        { id: 'fn_5', type: 'end', title: 'Dispatch Closing', content: 'Share tracking heads up and close call' },
      ],
      extractedVariables: [
        { key: 'order_confirmed', label: 'Order Confirmed', type: 'boolean', required: true, description: 'Customer confirmed they placed the order' },
        { key: 'address_verified', label: 'Address Verified', type: 'boolean', required: true, description: 'Shipping address and landmark confirmed' },
        { key: 'preferred_delivery_date', label: 'Preferred Delivery Date', type: 'string', required: false, description: 'Preferred day or time slot' },
        { key: 'cancellation_reason', label: 'Cancellation Reason', type: 'string', required: false, description: 'Reason if customer declined the order' },
      ],
    },
  },
  {
    id: 'healthcare-appointment-prep',
    category: 'Healthcare',
    title: 'Diagnostic Home Collection & Prep Reminder',
    badge: 'Healthcare & Diagnostics',
    description: 'Ensure 100% home visit fulfillment with fasting guidelines and slot confirmation.',
    agentName: 'Apollo Diagnostics Care Concierge',
    useCase: 'Patient lab appointment confirmation and 10-hour fasting preparation instruction',
    config: {
      voiceModel: 'Neural Voice - English (IN) - Professional Female',
      language: 'en-IN',
      openingLine: 'Hello <user_name>, this is Meera calling from Apollo Diagnostics regarding your health checkup scheduled for tomorrow morning at 8:00 AM.',
      closingBehavior: 'Wonderful! Our phlebotomist will arrive with a sterilized kit between 8:00 and 8:30 AM. Have a healthy day ahead!',
      systemPrompt: `Persona & Context:
Role: Meera, an empathetic and professional healthcare coordinator at Apollo Diagnostics.
Tone: Calm, clear, empathetic, and professional.

Objectives:
1. Confirm patient identity and scheduled time slot.
2. Confirm the 10-12 hour fasting protocol for blood glucose and lipid profile tests.
3. Check if patient requires any special assistance (elderly care, wheelchair access).
4. If rescheduling is needed, provide immediate options for morning slots.
5. Conclude with encouraging and caring remarks.`,
      sarvamAppId: 'Conversatio-b063cf10-e735',
      flowNodes: [
        { id: 'fn_1', type: 'start', title: 'Call Connected', content: 'Connect with patient' },
        { id: 'fn_2', type: 'opening', title: 'Appointment Verification', content: 'State appointment details and patient name' },
        { id: 'fn_3', type: 'question', title: 'Fasting Instructions', content: 'Verify patient is aware of 10-hour fasting requirement' },
        { id: 'fn_4', type: 'conditional', title: 'Slot Reschedule Check', content: 'Check if current time works or reschedule is requested' },
        { id: 'fn_5', type: 'end', title: 'Pre-Visit Wrap Up', content: 'Confirm technician arrival window' },
      ],
      extractedVariables: [
        { key: 'appointment_confirmed', label: 'Appointment Confirmed', type: 'boolean', required: true, description: 'Patient confirmed home visit' },
        { key: 'fasting_acknowledged', label: 'Fasting Acknowledged', type: 'boolean', required: true, description: 'Understands overnight fasting requirement' },
        { key: 'reschedule_requested', label: 'Reschedule Requested', type: 'boolean', required: false, description: 'True if new time slot required' },
        { key: 'special_instructions', label: 'Special Instructions', type: 'string', required: false, description: 'Directions or patient health notes' },
      ],
    },
  },
  {
    id: 'b2b-inbound-qualification',
    category: 'B2B SaaS',
    title: 'Inbound Demo Qualification & Calendly Booking',
    badge: 'B2B Sales',
    description: 'Instant 2-minute response to website leads to qualify calling volume and schedule demos.',
    agentName: 'Fluid.live Solutions Executive',
    useCase: 'Speed-to-lead inbound qualification, budget check, and calendar booking',
    config: {
      voiceModel: 'Shubh - Friendly Verification Indian Male',
      language: 'en-IN',
      openingLine: 'Hi <user_name>, this is Shubh from Fluid.live! I noticed you just submitted a demo request on our website. Did I catch you at an okay time?',
      closingBehavior: 'Awesome! I have booked a 20-minute product tour for tomorrow with our Senior Voice Architect. Check your calendar invite!',
      systemPrompt: `Persona & Context:
Role: Shubh, a sharp, consultative inbound sales representative at Fluid.live AI Calling.
Tone: Confident, crisp, polite, and consultative.

Objectives:
1. Acknowledge their recent demo request with high speed-to-lead enthusiasm.
2. Ask about their current outbound call volume (e.g., <1,000 calls/day vs >10,000 calls/day).
3. Identify their primary use case (EMI collections, lead verification, customer support, or telemarketing).
4. Propose a specific 20-minute slot tomorrow afternoon for an interactive demo.
5. Keep conversational cadence fast, sharp, and value-driven.`,
      sarvamAppId: 'Conversatio-b063cf10-e735',
      flowNodes: [
        { id: 'fn_1', type: 'start', title: 'Speed-to-Lead Connect', content: 'Connect inbound lead' },
        { id: 'fn_2', type: 'opening', title: 'Website Demo Hook', content: 'Acknowledge recent demo request submission' },
        { id: 'fn_3', type: 'question', title: 'Volume & Use Case', content: 'Ask about monthly call volume and primary use case' },
        { id: 'fn_4', type: 'data_collection', title: 'Calendly Slot Proposal', content: 'Offer 2 time slots for tomorrow' },
        { id: 'fn_5', type: 'end', title: 'Invite Dispatched', content: 'Confirm calendar invite sent to email' },
      ],
      extractedVariables: [
        { key: 'monthly_call_volume', label: 'Monthly Call Volume', type: 'number', required: true, description: 'Estimated calling volume per month' },
        { key: 'primary_use_case', label: 'Primary Use Case', type: 'string', required: true, description: 'Collections, Sales, or Support' },
        { key: 'decision_maker', label: 'Decision Maker', type: 'boolean', required: false, description: 'Whether the contact leads the tech/ops team' },
        { key: 'demo_scheduled_time', label: 'Scheduled Demo Time', type: 'string', required: false, description: 'Agreed demo calendar slot' },
      ],
    },
  },
  {
    id: 'auto-service-reminder',
    category: 'Automotive',
    title: 'Automotive Periodic Service & Doorstep Pickup',
    badge: 'Auto & Mobility',
    description: 'Proactively schedule periodic car maintenance and doorstep driver pickup.',
    agentName: 'AutoCare Service Coordinator',
    useCase: 'Mileage-based service due reminder and free doorstep driver pickup scheduling',
    config: {
      voiceModel: 'Shubh - Friendly Verification Indian Male',
      language: 'hi-IN',
      openingLine: 'नमस्ते <user_name> ji! मैं ऑटोकेयर से बोल रहा हूँ। आपकी कार की 10,000 किलोमीटर की पीरियोडिक सर्विस ड्यू हो गई है। क्या हम कल फ्री डोरस्टेप पिकअप शेड्यूल कर दें?',
      closingBehavior: 'बहुत धन्यवाद <user_name> ji! हमारे ड्राइवर कल सुबह 10 बजे आपकी लोकेशन पर पहुंच जाएंगे। आपकी कार का ख्याल हम रखेंगे!',
      systemPrompt: `Persona & Context:
Role: Shubh, a helpful service advisor at AutoCare.
Tone: Warm, reliable, reassuring.

Objectives:
1. Remind customer of their car periodic maintenance due.
2. Offer 100% free doorstep driver pickup and delivery.
3. Inquire if they are facing any specific issues (e.g. AC cooling, brake noise, mileage).
4. Confirm their pickup location and time window.
5. Provide a transparent estimate of service turnaround time.`,
      sarvamAppId: 'Conversatio-b063cf10-e735',
      flowNodes: [
        { id: 'fn_1', type: 'start', title: 'Call Connected', content: 'Connect with car owner' },
        { id: 'fn_2', type: 'opening', title: 'Maintenance Due Alert', content: 'State mileage interval and free pickup offer' },
        { id: 'fn_3', type: 'question', title: 'Vehicle Complaints', content: 'Check for AC, brake, or engine complaints' },
        { id: 'fn_4', type: 'data_collection', title: 'Driver Dispatch Booking', content: 'Book pickup time slot' },
        { id: 'fn_5', type: 'end', title: 'Confirmation Wrap Up', content: 'Confirm driver arrival time' },
      ],
      extractedVariables: [
        { key: 'service_confirmed', label: 'Service Confirmed', type: 'boolean', required: true, description: 'Customer confirmed service appointment' },
        { key: 'pickup_required', label: 'Doorstep Pickup Required', type: 'boolean', required: true, description: 'True if home driver pickup needed' },
        { key: 'vehicle_complaints', label: 'Specific Complaints', type: 'string', required: false, description: 'Reported brake, AC, or engine issues' },
        { key: 'pickup_slot', label: 'Pickup Time Slot', type: 'string', required: false, description: 'Scheduled date and hour' },
      ],
    },
  },
];
