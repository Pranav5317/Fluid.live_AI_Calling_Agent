import prisma from '../lib/prisma';
import { BillingPeriod, UsageEvent } from '../../src/types';

export class BillingRepository {
  async getUsageEvents(campaignId?: string): Promise<UsageEvent[]> {
    const where: any = {};
    if (campaignId && campaignId !== 'all') {
      where.campaignId = campaignId;
    }

    const list = await prisma.usageEvent.findMany({
      where,
      orderBy: { timestamp: 'desc' },
    });

    if (list.length > 0) {
      return list.map(u => ({
        id: u.id,
        callId: u.callId || '',
        campaignId: u.campaignId,
        agentId: u.agentId,
        durationMinutes: u.durationMinutes,
        providerCostUnits: u.providerCostUnits,
        platformCostUnits: u.platformCostUnits,
        timestamp: u.timestamp.toISOString(),
      }));
    }

    // Fallback: derive dynamically from actual calls table so every real call is accurately itemized
    const callWhere: any = {};
    if (campaignId && campaignId !== 'all') {
      callWhere.campaignId = campaignId;
    }

    const calls = await prisma.call.findMany({
      where: callWhere,
      orderBy: { startedAt: 'desc' },
    });

    return calls.map(c => {
      const durationMinutes = Number(((c.durationSeconds || 0) / 60).toFixed(2));
      return {
        id: `usg_${c.id}`,
        callId: c.id,
        campaignId: c.campaignId || null,
        agentId: c.agentId,
        durationMinutes,
        providerCostUnits: Number((durationMinutes * 1.00).toFixed(2)),
        platformCostUnits: Number((durationMinutes * 0.50).toFixed(2)),
        timestamp: c.startedAt.toISOString(),
      };
    });
  }

  async getCurrentBillingPeriod(): Promise<BillingPeriod> {
    const calls = await prisma.call.findMany();
    const totalCallsCount = calls.length;
    const totalSeconds = calls.reduce((acc, c) => acc + (c.durationSeconds || 0), 0);
    const totalMinutesUsed = Number((totalSeconds / 60).toFixed(1));

    // Rates: Direct Sarvam Telephony & Voice stream rate ₹1.00/min, Fluid.live platform rate ₹0.50/min
    const providerCostTotal = Number((totalMinutesUsed * 1.00).toFixed(2));
    const platformCostTotal = Number((totalMinutesUsed * 0.50).toFixed(2));
    const estimatedTotalCost = Number((providerCostTotal + platformCostTotal).toFixed(2));

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const periodName = `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
    const invoiceSuffix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 1. Sarvam AI Infrastructure Pass-Through Invoice
    const sarvamGst = Number((providerCostTotal * 0.18).toFixed(2));
    const sarvamInvoice = {
      invoiceNumber: `SRV-INV-${invoiceSuffix}`,
      issuer: 'Sarvam AI Technologies Pvt. Ltd.',
      billingEntity: 'Fluid.live Infrastructure Trunk',
      settlementMethod: 'Pre-funded Sarvam Telephony Wallet (api.sarvam.ai)',
      period: periodName,
      subtotal: providerCostTotal,
      taxGst: sarvamGst,
      total: Number((providerCostTotal + sarvamGst).toFixed(2)),
      status: 'current' as const,
      lineItems: [
        {
          id: 'li_srv_1',
          name: 'Outbound SIP Trunk Telephony & Audio Streaming',
          category: 'telephony' as const,
          unitRate: '₹0.60 / min',
          quantity: `${totalMinutesUsed.toFixed(1)} mins`,
          amount: Number((totalMinutesUsed * 0.60).toFixed(2)),
        },
        {
          id: 'li_srv_2',
          name: 'Sarvam Saaras Real-Time Speech-to-Text (Indic ASR)',
          category: 'telephony' as const,
          unitRate: '₹0.30 / min',
          quantity: `${totalMinutesUsed.toFixed(1)} mins`,
          amount: Number((totalMinutesUsed * 0.30).toFixed(2)),
        },
        {
          id: 'li_srv_3',
          name: 'Sarvam Bulbul Speech Synthesis (Natural Indic TTS)',
          category: 'telephony' as const,
          unitRate: '₹0.10 / min',
          quantity: `${totalMinutesUsed.toFixed(1)} mins`,
          amount: Number((totalMinutesUsed * 0.10).toFixed(2)),
        },
      ],
    };

    // 2. Fluid.live Dashboard Platform Usage Invoice (Pure usage-based)
    const platformSubtotal = platformCostTotal;
    const platformGst = Number((platformSubtotal * 0.18).toFixed(2));
    const platformInvoice = {
      invoiceNumber: `FLD-INV-${invoiceSuffix}`,
      issuer: 'Fluid.live Technologies',
      billingEntity: 'Fluid.live Enterprise Client Account',
      settlementMethod: 'Fluid.live Platform Usage Billing',
      period: periodName,
      subtotal: platformSubtotal,
      taxGst: platformGst,
      total: Number((platformSubtotal + platformGst).toFixed(2)),
      status: 'current' as const,
      lineItems: [
        {
          id: 'li_fld_1',
          name: 'Dashboard Campaign Orchestration & State Machine',
          category: 'platform' as const,
          unitRate: '₹0.50 / min',
          quantity: `${totalMinutesUsed.toFixed(1)} mins`,
          amount: platformCostTotal,
        },
      ],
    };

    return {
      id: `bp_${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}`,
      periodName,
      startDate: startOfMonth,
      endDate: endOfMonth,
      totalMinutesUsed,
      totalCallsCount,
      estimatedTotalCost,
      providerCostTotal,
      platformCostTotal,
      status: 'current',
      sarvamInvoice,
      platformInvoice,
    };
  }

  async getBillingHistory(): Promise<BillingPeriod[]> {
    const current = await this.getCurrentBillingPeriod();
    const pastPeriods = await prisma.billingPeriod.findMany({
      where: { status: { not: 'current' } },
      orderBy: { startDate: 'desc' },
    });

    return [
      current,
      ...pastPeriods.map(bp => ({
        id: bp.id,
        periodName: bp.periodName,
        startDate: bp.startDate.toISOString(),
        endDate: bp.endDate.toISOString(),
        totalMinutesUsed: bp.totalMinutesUsed,
        totalCallsCount: bp.totalCallsCount,
        estimatedTotalCost: bp.estimatedTotalCost,
        providerCostTotal: bp.providerCostTotal,
        platformCostTotal: bp.platformCostTotal,
        status: bp.status as any,
      })),
    ];
  }
}

export const billingRepository = new BillingRepository();
