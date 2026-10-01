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
import { CreditCard, Clock, Zap, Download, Layers, ShieldCheck } from 'lucide-react';

export const BillingPage: React.FC = () => {
  const [currentPeriod, setCurrentPeriod] = useState<BillingPeriod | null>(null);
  const [history, setHistory] = useState<BillingPeriod[]>([]);
  const [usageEvents, setUsageEvents] = useState<UsageEvent[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading || !currentPeriod) return <LoadingState label="Calculating usage & billing metrics..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing & Time Utilization"
        description="Monitor voice minute consumption, provider infrastructure cost splits and billing cycle history."
      />

      {/* Top Utilization KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Minutes Utilized"
          value={`${currentPeriod.totalMinutesUsed.toFixed(1)}m`}
          trendPercentage={14.2}
          icon={<Clock className="h-4 w-4 text-brand-600" />}
        />
        <MetricCard
          title="Total Calls Processed"
          value={currentPeriod.totalCallsCount}
          trendPercentage={18.0}
          icon={<Zap className="h-4 w-4 text-emerald-600" />}
        />
        <MetricCard
          title="Estimated Accrued Cost"
          value={formatCurrency(currentPeriod.estimatedTotalCost)}
          description="Current period estimate"
          icon={<CreditCard className="h-4 w-4 text-purple-600" />}
        />
        <MetricCard
          title="Active Plan"
          value="Enterprise Tier"
          description="Sarvam bridge enabled"
          icon={<ShieldCheck className="h-4 w-4 text-sky-600" />}
        />
      </div>

      {/* Provider-Agnostic Usage vs Billing Separation Card (Requirement #9) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Usage Event Allocation Breakdown</CardTitle>
              <CardDescription>Transparent separation of Telephony Provider Cost vs Platform Software Fee</CardDescription>
            </div>
            <Badge variant="brand" size="sm">
              Model Isolated
            </Badge>
          </CardHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-2">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                Sarvam Provider Telecom Usage
              </span>
              <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
                {formatCurrency(currentPeriod.providerCostTotal)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Direct voice synthesis & telephony rate</p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                Fluid.Live Platform Software Fee
              </span>
              <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
                {formatCurrency(currentPeriod.platformCostTotal)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Campaign orchestration & analytics</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Billing Period Date Range:</span>
            <span className="font-mono font-semibold text-slate-900">
              {formatDate(currentPeriod.startDate)} - {formatDate(currentPeriod.endDate)}
            </span>
          </div>
        </Card>

        {/* Plan & Payment Summary */}
        <Card className="flex flex-col justify-between">
          <div>
            <CardHeader>
              <CardTitle>Payment Overview</CardTitle>
            </CardHeader>
            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span>Billing Status</span>
                <Badge variant="success" size="sm">Current Active</Badge>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span>Auto-Renewal</span>
                <span className="font-bold text-slate-900">Enabled</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span>Payment Method</span>
                <span className="font-mono text-slate-900">Visa •••• 4242</span>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" className="mt-4 w-full" leftIcon={<Download className="h-4 w-4" />}>
            Download Usage Summary
          </Button>
        </Card>
      </div>

      {/* Invoice History Table */}
      <Card noPadding>
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Invoice History & Cycle Log</h3>
            <p className="text-xs text-slate-500">Past usage billing periods and settlement status</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Billing Cycle</th>
                <th className="px-5 py-3">Total Minutes</th>
                <th className="px-5 py-3">Total Calls</th>
                <th className="px-5 py-3">Provider Cost</th>
                <th className="px-5 py-3">Platform Cost</th>
                <th className="px-5 py-3">Total Invoice</th>
                <th className="px-5 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {history.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-3.5 font-bold text-slate-900">{item.periodName}</td>
                  <td className="px-5 py-3.5 font-mono">{item.totalMinutesUsed.toFixed(1)}m</td>
                  <td className="px-5 py-3.5 font-mono">{item.totalCallsCount}</td>
                  <td className="px-5 py-3.5 font-mono">{formatCurrency(item.providerCostTotal)}</td>
                  <td className="px-5 py-3.5 font-mono">{formatCurrency(item.platformCostTotal)}</td>
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

