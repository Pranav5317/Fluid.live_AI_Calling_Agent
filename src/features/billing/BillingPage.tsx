import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/common/Card';
import { MetricCard } from '../../components/common/MetricCard';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { LoadingState } from '../../components/common/LoadingState';
import { billingService } from '../../services/billingService';
import { BillingPeriod, UsageEvent } from '../../types';
import { formatCurrency, formatDate } from '../../lib/formatters';
import {
  CreditCard,
  Clock,
  Zap,
  Download,
  ShieldCheck,
  ExternalLink,
  Layers,
  PhoneCall,
  Server,
  FileText,
  CheckCircle2,
} from 'lucide-react';

export const BillingPage: React.FC = () => {
  const [currentPeriod, setCurrentPeriod] = useState<BillingPeriod | null>(null);
  const [history, setHistory] = useState<BillingPeriod[]>([]);
  const [usageEvents, setUsageEvents] = useState<UsageEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'sarvam' | 'platform' | 'audit'>('overview');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [curr, hist, events] = await Promise.all([
        billingService.getCurrentBillingPeriod(),
        billingService.getBillingHistory(),
        billingService.getUsageEvents(),
      ]);
      setCurrentPeriod(curr);
      setHistory(hist);
      setUsageEvents(events);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDownloadSarvamInvoice = () => {
    if (!currentPeriod?.sarvamInvoice) return;
    const inv = currentPeriod.sarvamInvoice;
    const rows = [
      `Invoice Number,${inv.invoiceNumber}`,
      `Issuer,${inv.issuer}`,
      `Billing Entity,${inv.billingEntity}`,
      `Settlement Method,${inv.settlementMethod}`,
      `Billing Period,${inv.period}`,
      '',
      'Line Item,Category,Unit Rate,Quantity,Amount',
      ...inv.lineItems.map(
        li => `"${li.name}",${li.category},"${li.unitRate}","${li.quantity}","${formatCurrency(li.amount)}"`
      ),
      '',
      `Subtotal,"${formatCurrency(inv.subtotal)}"`,
      `GST (18%),"${formatCurrency(inv.taxGst)}"`,
      `Total Payable,"${formatCurrency(inv.total)}"`,
    ].join('\n');

    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Sarvam_Telephony_Invoice_${inv.invoiceNumber}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPlatformInvoice = () => {
    if (!currentPeriod?.platformInvoice) return;
    const inv = currentPeriod.platformInvoice;
    const rows = [
      `Invoice Number,${inv.invoiceNumber}`,
      `Issuer,${inv.issuer}`,
      `Billing Entity,${inv.billingEntity}`,
      `Settlement Method,${inv.settlementMethod}`,
      `Billing Period,${inv.period}`,
      '',
      'Line Item,Category,Unit Rate,Quantity,Amount',
      ...inv.lineItems.map(
        li => `"${li.name}",${li.category},"${li.unitRate}","${li.quantity}","${formatCurrency(li.amount)}"`
      ),
      '',
      `Subtotal,"${formatCurrency(inv.subtotal)}"`,
      `GST (18%),"${formatCurrency(inv.taxGst)}"`,
      `Total Payable,"${formatCurrency(inv.total)}"`,
    ].join('\n');

    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FluidLive_Platform_Invoice_${inv.invoiceNumber}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadUsageAudit = () => {
    if (!usageEvents.length) return;
    const rows = [
      'Call / Event ID,Duration (Mins),Sarvam Telecom Cost,Fluid.live Platform Fee,Total Combined,Timestamp',
      ...usageEvents.map(u => {
        const total = (u.providerCostUnits || 0) + (u.platformCostUnits || 0);
        return `"${u.callId || u.id}",${u.durationMinutes.toFixed(2)},"${formatCurrency(u.providerCostUnits)}","${formatCurrency(u.platformCostUnits)}","${formatCurrency(total)}","${formatDate(u.timestamp)}"`;
      }),
    ].join('\n');

    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FluidLive_Call_Usage_Audit_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading || !currentPeriod) return <LoadingState label="Calculating enterprise billing ledgers..." />;

  const sarvamInv = currentPeriod.sarvamInvoice;
  const platformInv = currentPeriod.platformInvoice;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enterprise Billing & Dual-Ledger Accounting"
        description="Transparent institutional separation of Sarvam AI Telephony Infrastructure Pass-Through vs Fluid.live Dashboard SaaS License."
      />

      {/* Top Utilization KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Sarvam AI Telephony API"
          value={formatCurrency(currentPeriod.providerCostTotal)}
          description="Carrier & speech synthesis (₹1.00/min)"
          icon={<PhoneCall className="h-4 w-4 text-amber-600" />}
        />
        <MetricCard
          title="Fluid.live Dashboard Usage"
          value={formatCurrency(currentPeriod.platformCostTotal)}
          description="Platform orchestration (₹0.50/min)"
          icon={<Server className="h-4 w-4 text-brand-600" />}
        />
        <MetricCard
          title="Total Combined Billing"
          value={formatCurrency(currentPeriod.estimatedTotalCost)}
          description="Direct Sarvam + Dashboard"
          icon={<CreditCard className="h-4 w-4 text-purple-600" />}
        />
        <MetricCard
          title="Total Voice Minutes"
          value={`${currentPeriod.totalMinutesUsed.toFixed(1)}m`}
          description={`${currentPeriod.totalCallsCount} connected calls`}
          icon={<Clock className="h-4 w-4 text-emerald-600" />}
        />
      </div>

      {/* Tab Bar Navigation */}
      <div className="flex border-b border-slate-200 space-x-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 flex items-center space-x-2 ${
            activeTab === 'overview'
              ? 'border-brand-600 text-brand-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Dual Invoice Overview</span>
        </button>
        <button
          onClick={() => setActiveTab('sarvam')}
          className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 flex items-center space-x-2 ${
            activeTab === 'sarvam'
              ? 'border-brand-600 text-brand-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <PhoneCall className="h-4 w-4 text-amber-500" />
          <span>Sarvam AI Telephony Statement</span>
        </button>
        <button
          onClick={() => setActiveTab('platform')}
          className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 flex items-center space-x-2 ${
            activeTab === 'platform'
              ? 'border-brand-600 text-brand-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Server className="h-4 w-4 text-brand-600" />
          <span>Fluid.live SaaS Platform Invoice</span>
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 flex items-center space-x-2 ${
            activeTab === 'audit'
              ? 'border-brand-600 text-brand-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Call-by-Call Audit Log ({usageEvents.length})</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW (SIDE-BY-SIDE DUAL INVOICES) */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Invoice 1: Sarvam AI Telephony Pass-Through */}
          <Card className="flex flex-col justify-between border-amber-200/80 bg-gradient-to-b from-amber-50/20 to-white">
            <div>
              <CardHeader>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                      Invoice 1 (Telephony Infrastructure)
                    </span>
                    <Badge variant="success" size="sm">Pass-Through</Badge>
                  </div>
                  <CardTitle className="mt-2 text-lg">Sarvam AI Telephony Statement</CardTitle>
                  <CardDescription>
                    Direct telecom pipes, speech recognition (STT) and voice synthesis (TTS) consumption.
                  </CardDescription>
                </div>
              </CardHeader>

              <div className="space-y-3 px-6 text-xs text-slate-600">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span>Statement Ref</span>
                  <span className="font-mono font-bold text-slate-900">{sarvamInv?.invoiceNumber}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span>Issuing Entity</span>
                  <span className="font-semibold text-slate-900">{sarvamInv?.issuer}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span>Settlement Mechanism</span>
                  <span className="font-medium text-amber-700">Pre-funded Sarvam Telephony Wallet</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span>Billing Period</span>
                  <span className="font-medium text-slate-900">{sarvamInv?.period}</span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                    Line Item Breakdown
                  </span>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    {sarvamInv?.lineItems.map(li => (
                      <div key={li.id} className="flex justify-between text-slate-700">
                        <span className="truncate pr-2">{li.name} ({li.quantity})</span>
                        <span className="font-semibold text-slate-900">{formatCurrency(li.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal</span>
                    <span className="font-mono font-medium text-slate-900">{formatCurrency(sarvamInv?.subtotal || 0)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>GST (18%)</span>
                    <span className="font-mono font-medium text-slate-900">{formatCurrency(sarvamInv?.taxGst || 0)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-bold text-slate-900">
                    <span>Total Infrastructure Cost</span>
                    <span className="font-mono text-amber-700">{formatCurrency(sarvamInv?.total || 0)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                leftIcon={<Download className="h-4 w-4" />}
                onClick={handleDownloadSarvamInvoice}
              >
                Download Statement
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                leftIcon={<ExternalLink className="h-4 w-4" />}
                onClick={() => window.open('https://dashboard.sarvam.ai/settings/billing', '_blank')}
              >
                Open Sarvam Wallet
              </Button>
            </div>
          </Card>

          {/* Invoice 2: Fluid.live Dashboard & Software Subscription */}
          <Card className="flex flex-col justify-between border-brand-200/80 bg-gradient-to-b from-brand-50/20 to-white">
            <div>
              <CardHeader>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-700 bg-brand-100 px-2 py-0.5 rounded">
                      Invoice 2 (Dashboard Platform Usage)
                    </span>
                    <Badge variant="brand" size="sm">Platform</Badge>
                  </div>
                  <CardTitle className="mt-2 text-lg">Fluid.live Dashboard Usage Invoice</CardTitle>
                  <CardDescription>
                    Usage fee for campaign orchestration, dialogue state machine, and variable extraction.
                  </CardDescription>
                </div>
              </CardHeader>

              <div className="space-y-3 px-6 text-xs text-slate-600">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span>Invoice Number</span>
                  <span className="font-mono font-bold text-slate-900">{platformInv?.invoiceNumber}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span>Issuing Entity</span>
                  <span className="font-semibold text-slate-900">{platformInv?.issuer}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span>Settlement Mechanism</span>
                  <span className="font-medium text-brand-700">Corporate SaaS Billing (Net-30 / Auto-Debit)</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span>Billing Period</span>
                  <span className="font-medium text-slate-900">{platformInv?.period}</span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                    Line Item Breakdown
                  </span>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    {platformInv?.lineItems.map(li => (
                      <div key={li.id} className="flex justify-between text-slate-700">
                        <span className="truncate pr-2">{li.name} ({li.quantity})</span>
                        <span className="font-semibold text-slate-900">{formatCurrency(li.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal</span>
                    <span className="font-mono font-medium text-slate-900">{formatCurrency(platformInv?.subtotal || 0)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>GST (18%)</span>
                    <span className="font-mono font-medium text-slate-900">{formatCurrency(platformInv?.taxGst || 0)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-bold text-slate-900">
                    <span>Total Platform SaaS Fee</span>
                    <span className="font-mono text-brand-700">{formatCurrency(platformInv?.total || 0)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
              <Button
                variant="primary"
                size="sm"
                className="w-full"
                leftIcon={<Download className="h-4 w-4" />}
                onClick={handleDownloadPlatformInvoice}
              >
                Download Official Tax Invoice
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: SARVAM TELEPHONY STATEMENT */}
      {activeTab === 'sarvam' && sarvamInv && (
        <Card noPadding>
          <div className="p-6 border-b border-slate-200 bg-amber-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900">Sarvam AI Infrastructure Pass-Through Statement</h3>
                <Badge variant="success" size="sm">Prepaid Wallet</Badge>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Statement Ref: <span className="font-mono font-semibold">{sarvamInv.invoiceNumber}</span> • Issued by {sarvamInv.issuer}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Download className="h-4 w-4" />}
                onClick={handleDownloadSarvamInvoice}
              >
                Download Statement
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                leftIcon={<ExternalLink className="h-4 w-4" />}
                onClick={() => window.open('https://dashboard.sarvam.ai/settings/billing', '_blank')}
              >
                Open Sarvam Wallet
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Infrastructure Service</th>
                  <th className="px-6 py-3">Provider Unit Rate</th>
                  <th className="px-6 py-3">Metered Quantity</th>
                  <th className="px-6 py-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {sarvamInv.lineItems.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-semibold text-slate-900">{item.name}</td>
                    <td className="px-6 py-4 font-mono">{item.unitRate}</td>
                    <td className="px-6 py-4 font-mono">{item.quantity}</td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-900 text-right">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200 text-xs font-mono">
                <tr>
                  <td colSpan={3} className="px-6 py-2.5 text-right font-medium text-slate-600">Telecom Subtotal:</td>
                  <td className="px-6 py-2.5 text-right font-bold text-slate-900">{formatCurrency(sarvamInv.subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-6 py-2.5 text-right font-medium text-slate-600">GST (18%):</td>
                  <td className="px-6 py-2.5 text-right font-bold text-slate-900">{formatCurrency(sarvamInv.taxGst)}</td>
                </tr>
                <tr className="border-t border-slate-300 bg-amber-50/50">
                  <td colSpan={3} className="px-6 py-3 text-right font-bold text-amber-900">Total Telecom Deduction:</td>
                  <td className="px-6 py-3 text-right font-extrabold text-amber-700 text-sm">{formatCurrency(sarvamInv.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: FLUID.LIVE PLATFORM INVOICE */}
      {activeTab === 'platform' && platformInv && (
        <Card noPadding>
          <div className="p-6 border-b border-slate-200 bg-brand-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900">Fluid.live Dashboard Usage Invoice</h3>
                <Badge variant="brand" size="sm">Platform Usage</Badge>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Invoice Number: <span className="font-mono font-semibold">{platformInv.invoiceNumber}</span> • Issued by {platformInv.issuer}
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Download className="h-4 w-4" />}
              onClick={handleDownloadPlatformInvoice}
            >
              Download Tax Invoice (CSV)
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Software Service / Module</th>
                  <th className="px-6 py-3">Contract Rate</th>
                  <th className="px-6 py-3">Licensed Quantity</th>
                  <th className="px-6 py-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {platformInv.lineItems.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-semibold text-slate-900">{item.name}</td>
                    <td className="px-6 py-4 font-mono">{item.unitRate}</td>
                    <td className="px-6 py-4 font-mono">{item.quantity}</td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-900 text-right">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200 text-xs font-mono">
                <tr>
                  <td colSpan={3} className="px-6 py-2.5 text-right font-medium text-slate-600">Platform Subtotal:</td>
                  <td className="px-6 py-2.5 text-right font-bold text-slate-900">{formatCurrency(platformInv.subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-6 py-2.5 text-right font-medium text-slate-600">GST (18%):</td>
                  <td className="px-6 py-2.5 text-right font-bold text-slate-900">{formatCurrency(platformInv.taxGst)}</td>
                </tr>
                <tr className="border-t border-slate-300 bg-brand-50/50">
                  <td colSpan={3} className="px-6 py-3 text-right font-bold text-brand-900">Total Platform Payable:</td>
                  <td className="px-6 py-3 text-right font-extrabold text-brand-700 text-sm">{formatCurrency(platformInv.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 4: CALL-BY-CALL USAGE AUDIT */}
      {activeTab === 'audit' && (
        <Card noPadding>
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Itemized Call-by-Call Usage Audit Log</h3>
              <p className="text-xs text-slate-500">Every outbound call attempt and its exact billing status</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Download className="h-4 w-4" />}
                onClick={handleDownloadUsageAudit}
              >
                Export Audit Log (CSV)
              </Button>
            </div>
          </div>

          <div className="px-5 py-3 bg-blue-50/60 border-b border-blue-100 flex items-center justify-between text-xs text-blue-800">
            <span className="flex items-center gap-1.5">
              <span className="font-semibold">Telecom Metering Policy:</span>
              <span>Sarvam AI and carrier SIP trunks only bill for answered calls with active conversation duration. Unanswered or unconnected attempts are strictly unbilled (₹0.00).</span>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Call Event ID</th>
                  <th className="px-5 py-3">Call Status</th>
                  <th className="px-5 py-3">Duration</th>
                  <th className="px-5 py-3">Sarvam Telecom (₹1.00/m)</th>
                  <th className="px-5 py-3">Fluid.live SaaS (₹0.50/m)</th>
                  <th className="px-5 py-3">Total Charge</th>
                  <th className="px-5 py-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {usageEvents.map(u => {
                  const isConnected = u.durationMinutes > 0;
                  const combined = (u.providerCostUnits || 0) + (u.platformCostUnits || 0);
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-slate-900 truncate max-w-[150px]">{u.callId || u.id}</td>
                      <td className="px-5 py-3.5">
                        {isConnected ? (
                          <Badge variant="success" size="sm">Connected / Answered</Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">Unconnected (Free)</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono font-medium text-slate-800">
                        {isConnected ? `${u.durationMinutes.toFixed(2)}m (${Math.round(u.durationMinutes * 60)}s)` : '0s'}
                      </td>
                      <td className="px-5 py-3.5 font-mono">
                        {isConnected ? (
                          <span className="text-amber-700 font-semibold">{formatCurrency(u.providerCostUnits)}</span>
                        ) : (
                          <span className="text-slate-400">₹0.00</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono">
                        {isConnected ? (
                          <span className="text-brand-700 font-semibold">{formatCurrency(u.platformCostUnits)}</span>
                        ) : (
                          <span className="text-slate-400">₹0.00</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold">
                        {isConnected ? (
                          <span className="text-slate-900">{formatCurrency(combined)}</span>
                        ) : (
                          <span className="text-slate-400 font-normal">Unbilled</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right text-slate-500">{formatDate(u.timestamp)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Historical Cycles */}
      <Card noPadding>
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Historical Cycle Settlement</h3>
            <p className="text-xs text-slate-500">Dual-ledger settlement history across previous billing cycles</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Cycle</th>
                <th className="px-5 py-3">Minutes</th>
                <th className="px-5 py-3">Calls</th>
                <th className="px-5 py-3">Sarvam Telecom</th>
                <th className="px-5 py-3">Platform Orchestration</th>
                <th className="px-5 py-3">Combined Total</th>
                <th className="px-5 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {history.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-3.5 font-bold text-slate-900">{item.periodName}</td>
                  <td className="px-5 py-3.5 font-mono">{item.totalMinutesUsed.toFixed(1)}m</td>
                  <td className="px-5 py-3.5 font-mono">{item.totalCallsCount}</td>
                  <td className="px-5 py-3.5 font-mono text-amber-700 font-semibold">{formatCurrency(item.providerCostTotal)}</td>
                  <td className="px-5 py-3.5 font-mono text-brand-700 font-semibold">{formatCurrency(item.platformCostTotal)}</td>
                  <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                    {formatCurrency(item.estimatedTotalCost)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Badge variant={item.status === 'paid' ? 'success' : 'info'}>
                      {item.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
