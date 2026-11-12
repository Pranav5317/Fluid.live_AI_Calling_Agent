import { Router } from 'express';
import prisma from '../lib/prisma';
import { leadRepository } from '../repositories/leadRepository';

export const integrationRoutes = Router();

const SLOT_PRESET_MAP: Record<string, { startTime: string; endTime: string; label: string }> = {
  evening_6_8: { startTime: '18:00', endTime: '20:00', label: 'Between 6:00 PM – 8:00 PM' },
  morning_10_12: { startTime: '10:00', endTime: '12:00', label: 'Between 10:00 AM – 12:00 PM' },
  midday_12_2: { startTime: '12:00', endTime: '14:00', label: 'Between 12:00 PM – 2:00 PM' },
  afternoon_2_4: { startTime: '14:00', endTime: '16:00', label: 'Between 2:00 PM – 4:00 PM' },
  late_afternoon_4_6: { startTime: '16:00', endTime: '18:00', label: 'Between 4:00 PM – 6:00 PM' },
};

function getTodayIstDate(): string {
  const ist = new Date(Date.now() + 5.5 * 3600000);
  return ist.toISOString().slice(0, 10);
}

function buildIntervalMetadata(dateKey: string, startTime: string, endTime: string, label?: string) {
  const startIso = new Date(`${dateKey}T${startTime}:00+05:30`).toISOString();
  const endIso = new Date(`${dateKey}T${endTime}:00+05:30`).toISOString();
  return {
    scheduledSlotDate: dateKey,
    scheduledSlotStart: startTime,
    scheduledSlotEnd: endTime,
    scheduledSlotLabel: label || `Between ${startTime} – ${endTime}`,
    scheduledCallTime: startIso,
    scheduledWindowEnd: endIso,
    scheduledAt: startIso,
    scheduledTimezone: 'Asia/Kolkata',
  };
}

function verifyIntegrationApiKey(req: any, res: any, next: any) {
  const expected = process.env.INTEGRATION_API_KEY;
  if (!expected) return next();
  const provided =
    (req.headers['x-api-key'] as string) ||
    (req.headers['authorization'] as string)?.replace(/^Bearer\s+/i, '');
  if (!provided || provided !== expected) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or missing INTEGRATION_API_KEY (x-api-key header).',
      timestamp: new Date().toISOString(),
    });
  }
  return next();
}

// GET /api/integrations/status
integrationRoutes.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      integrations: [
        {
          id: 'sarvam',
          name: 'Sarvam Voice AI',
          configured: Boolean(process.env.SARVAM_API_KEY),
          envVars: ['SARVAM_API_KEY', 'SARVAM_APP_ID', 'SARVAM_WEBHOOK_SECRET'],
          endpoint: '/api/webhooks/sarvam',
        },
        {
          id: 'ats_inbound',
          name: 'ATS / HR Portal Inbound Lead Sync',
          configured: true,
          securedByKey: Boolean(process.env.INTEGRATION_API_KEY),
          envVars: ['INTEGRATION_API_KEY'],
          endpoint: '/api/integrations/ats/leads',
        },
        {
          id: 'ats_outbound',
          name: 'ATS Outbound Screening Sync Webhook',
          configured: Boolean(process.env.ATS_WEBHOOK_URL),
          envVars: ['ATS_WEBHOOK_URL'],
          endpoint: 'Outbound POST on call completion',
        },
        {
          id: 'callback_slot',
          name: 'Self-Service WhatsApp / SMS Callback Slot',
          configured: Boolean(process.env.WHATSAPP_WEBHOOK_URL),
          envVars: ['WHATSAPP_WEBHOOK_URL', 'INTEGRATION_API_KEY'],
          endpoint: '/api/integrations/callback-slot',
        },
        {
          id: 'calendar_booking',
          name: 'Interview Calendar Booking Hook',
          configured: Boolean(process.env.CALENDAR_BOOKING_WEBHOOK_URL),
          envVars: ['CALENDAR_BOOKING_WEBHOOK_URL'],
          endpoint: '/api/integrations/calendar/book',
        },
        {
          id: 'cron_security',
          name: 'Vercel / External Scheduler Cron Secret',
          configured: Boolean(process.env.CRON_SECRET),
          envVars: ['CRON_SECRET'],
          endpoint: '/api/campaigns/scheduler/tick',
        },
        {
          id: 'r2_storage',
          name: 'Cloudflare R2 Audio Archival',
          configured: Boolean(process.env.R2_BUCKET_NAME && process.env.R2_ACCESS_KEY_ID),
          envVars: ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME'],
          endpoint: 'Automatic post-call archival',
        },
      ],
    },
    timestamp: new Date().toISOString(),
  });
});

// POST /api/integrations/ats/leads
// Inbound HR portal / ATS webhook to create or update a candidate and optionally schedule an interval.
integrationRoutes.post('/ats/leads', verifyIntegrationApiKey, async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      applied_role,
      portal_experience,
      portal_notice_period,
      portal_work_mode,
      company,
      preferredSlotPreset,
      preferredDate,
      startTime,
      endTime,
      campaignId,
    } = req.body || {};

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        error: 'name and phone are required',
        timestamp: new Date().toISOString(),
      });
    }

    const baseMeta: Record<string, any> = {
      role: applied_role || '',
      applied_role: applied_role || '',
      experience: portal_experience || '',
      portal_experience: portal_experience || '',
      notice: portal_notice_period || '',
      portal_notice_period: portal_notice_period || '',
      workMode: portal_work_mode || '',
      portal_work_mode: portal_work_mode || '',
      company: company || '',
      source: 'ats_webhook',
    };

    const dateKey = preferredDate || getTodayIstDate();
    if (preferredSlotPreset && SLOT_PRESET_MAP[preferredSlotPreset]) {
      const preset = SLOT_PRESET_MAP[preferredSlotPreset];
      Object.assign(baseMeta, buildIntervalMetadata(dateKey, preset.startTime, preset.endTime, preset.label));
    } else if (startTime && endTime) {
      Object.assign(baseMeta, buildIntervalMetadata(dateKey, startTime, endTime));
    }

    const existing = await prisma.lead.findFirst({ where: { phone: String(phone).trim() } });
    const lead = existing
      ? await leadRepository.updateLead(existing.id, {
          name: String(name).trim(),
          email: email ? String(email).trim() : undefined,
          metadata: { ...((existing.metadata as Record<string, any>) || {}), ...baseMeta },
        })
      : await leadRepository.addLead(
          {
            name: String(name).trim(),
            phone: String(phone).trim(),
            email: email ? String(email).trim() : undefined,
            metadata: baseMeta,
          },
          campaignId
        );

    res.status(existing ? 200 : 201).json({
      success: true,
      data: { lead, updatedExisting: Boolean(existing) },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

// POST /api/integrations/callback-slot
// Self-service candidate / WhatsApp reply endpoint to set a 2-hour calling interval.
integrationRoutes.post('/callback-slot', verifyIntegrationApiKey, async (req, res) => {
  try {
    const { leadId, phone, date, slotPreset, startTime, endTime } = req.body || {};
    if (!leadId && !phone) {
      return res.status(400).json({
        success: false,
        error: 'leadId or phone is required',
        timestamp: new Date().toISOString(),
      });
    }

    const lead = leadId
      ? await prisma.lead.findUnique({ where: { id: String(leadId) } })
      : await prisma.lead.findFirst({ where: { phone: String(phone).trim() } });

    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found', timestamp: new Date().toISOString() });
    }
    if (lead.doNotCall) {
      return res.status(403).json({ success: false, error: 'Lead is marked Do Not Call (DNC)', timestamp: new Date().toISOString() });
    }

    const dateKey = date || getTodayIstDate();
    let intervalMeta: Record<string, any>;
    if (slotPreset && SLOT_PRESET_MAP[slotPreset]) {
      const preset = SLOT_PRESET_MAP[slotPreset];
      intervalMeta = buildIntervalMetadata(dateKey, preset.startTime, preset.endTime, preset.label);
    } else if (startTime && endTime) {
      intervalMeta = buildIntervalMetadata(dateKey, startTime, endTime);
    } else {
      const defaultPreset = SLOT_PRESET_MAP.evening_6_8;
      intervalMeta = buildIntervalMetadata(dateKey, defaultPreset.startTime, defaultPreset.endTime, defaultPreset.label);
    }

    const updated = await leadRepository.updateLead(lead.id, {
      metadata: {
        ...((lead.metadata as Record<string, any>) || {}),
        ...intervalMeta,
        callbackSource: 'self_service_webhook',
      },
    });

    res.json({
      success: true,
      data: { lead: updated, scheduledInterval: intervalMeta },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

// POST /api/integrations/calendar/book
integrationRoutes.post('/calendar/book', verifyIntegrationApiKey, async (req, res) => {
  try {
    const { leadId, slotIso, notes } = req.body || {};
    if (!leadId) {
      return res.status(400).json({ success: false, error: 'leadId is required', timestamp: new Date().toISOString() });
    }

    const lead = await prisma.lead.findUnique({ where: { id: String(leadId) } });
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found', timestamp: new Date().toISOString() });
    }

    const hookUrl = process.env.CALENDAR_BOOKING_WEBHOOK_URL;
    if (!hookUrl) {
      return res.status(400).json({
        success: false,
        error: 'CALENDAR_BOOKING_WEBHOOK_URL is not configured in environment variables.',
        timestamp: new Date().toISOString(),
      });
    }

    const resp = await fetch(hookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'interview.booking_requested',
        lead: { id: lead.id, name: lead.name, phone: lead.phone, email: lead.email, metadata: lead.metadata },
        slotIso: slotIso || null,
        notes: notes || null,
        requestedAt: new Date().toISOString(),
      }),
    });

    if (!resp.ok) {
      throw new Error(`Calendar webhook responded with HTTP ${resp.status}`);
    }

    res.json({
      success: true,
      data: { booked: true, leadId: lead.id, status: resp.status },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(502).json({ success: false, error: err?.message, timestamp: new Date().toISOString() });
  }
});

