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
  Clock,
  Download,
  ExternalLink,
  PhoneCall,
  Server,
  FileText,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Coins,
  RotateCw,
} from 'lucide-react';

export const BillingPage: React.FC = () => {
  const [currentPeriod, setCurrentPeriod] = useState<BillingPeriod | null>(null);
  const [usageEvents, setUsageEvents] = useState<UsageEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [curr, events] = await Promise.all([
        billingService.getCurrentBillingPeriod(),
        billingService.getUsageEvents(),
      ]);
      setCurrentPeriod(curr);
      setUsageEvents(events);
    } catch (err) {
      console.error('Failed to load usage data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDownloadUsageAudit = () => {
    if (!usageEvents.length) return;
    const rows = [
      'Call / Event ID,Call Status,Duration (Seconds),Duration (Minutes),Carrier Telecom Rate,Calculated Cost,Timestamp',
      ...usageEvents.map(u => {
        const isConnected = u.durationMinutes > 0;
        const durSecs = Math.round(u.durationMinutes * 60);
        const cost = isConnected ? formatCurrency(u.providerCostUnits) : '₹0.00';
        const status = isConnected ? 'Connected' : 'Unconnected / No Answer';
        return `"${u.callId || u.id}","${status}",${durSecs},${u.durationMinutes.toFixed(2)},"₹1.00/min","${cost}","${formatDate(u.timestamp)}"`;
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

  if (loading || !currentPeriod) {
    return <LoadingState label="Loading telephony usage & cost metrics..." />;
  }

  const connectedEvents = usageEvents.filter(u => u.durationMinutes > 0);
  const connectedCount = connectedEvents.length;
  const avgSeconds = connectedCount > 0 
    ? Math.round((currentPeriod.totalMinutesUsed * 60) / connectedCount) 
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Telephony Usage & Cost Analytics"
          description="Real-time metered telecom consumption, conversation duration, and voice model infrastructure costs."
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={handleDownloadUsageAudit}
          >
            Export Usage Audit (CSV)
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RotateCw className="h-4 w-4" />}
            onClick={fetchData}
          >
            Refresh Metrics
          </Button>
        </div>
      </div>

      {/* Top Utilization KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Voice Minutes"
          value={`${currentPeriod.totalMinutesUsed.toFixed(1)}m`}
          description="Total active conversation time"
          icon={<Clock className="h-4 w-4 text-emerald-600" />}
        />
        <MetricCard
          title="Connected Calls"
          value={String(connectedCount)}
          description={`${usageEvents.length} total call attempts`}
          icon={<PhoneCall className="h-4 w-4 text-blue-600" />}
        />
        <MetricCard
          title="Telephony Carrier Cost"
          value={formatCurrency(currentPeriod.providerCostTotal)}
          description="Carrier SIP & speech models (₹1.00/min)"
          icon={<Coins className="h-4 w-4 text-amber-600" />}
        />
        <MetricCard
          title="Avg Call Duration"
          value={`${avgSeconds}s`}
          description="Per connected conversation"
          icon={<BarChart3 className="h-4 w-4 text-purple-600" />}
        />
      </div>

      {/* Infrastructure Telephony Rate Card */}
      <Card noPadding>
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-amber-50/50 via-slate-50/30 to-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-slate-900">Voice AI & Telephony Infrastructure Rates</h3>
              <Badge variant="success" size="sm">Active Pipeline</Badge>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Telecom pipes, speech recognition (STT), and voice synthesis (TTS) consumption metered strictly on active call seconds.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Effective Blended Rate:</span>
            <span className="text-sm font-mono font-bold text-amber-700 bg-amber-100/80 px-2.5 py-1 rounded-md">
              ₹1.00 / minute
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100 bg-white p-6 gap-6">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              1. Outbound SIP Telephony
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-slate-900">₹0.60</span>
              <span className="text-xs text-slate-500">/ min</span>
            </div>
            <p className="text-xs text-slate-500">
              Carrier trunk connection, bi-directional audio streaming, and line maintenance.
            </p>
          </div>

          <div className="space-y-1 md:pl-6">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              2. Saaras Real-Time ASR
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-slate-900">₹0.30</span>
              <span className="text-xs text-slate-500">/ min</span>
            </div>
            <p className="text-xs text-slate-500">
              Low-latency Indic speech-to-text transcription and turn detection.
            </p>
          </div>

          <div className="space-y-1 md:pl-6">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              3. Bulbul Neural Voice TTS
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-slate-900">₹0.10</span>
              <span className="text-xs text-slate-500">/ min</span>
            </div>
            <p className="text-xs text-slate-500">
              High-naturalness Indian language speech synthesis and audio buffering.
            </p>
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-600">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span>
            <strong>Zero Waste Policy:</strong> Unanswered calls, busy lines, or failed connection attempts are 100% free (₹0.00). You are only charged for answered conversational seconds.
          </span>
        </div>
      </Card>

      {/* Call-by-Call Usage Audit Log Table */}
      <Card noPadding>
        <div className="p-5 border-b border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-brand-600" />
              <h3 className="text-sm font-bold text-slate-900">Call-by-Call Usage Audit Log</h3>
              <Badge variant="neutral" size="sm">{usageEvents.length} events</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Itemized telecom duration and metered calculation for each call event.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={handleDownloadUsageAudit}
          >
            Export CSV
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Call Event ID</th>
                <th className="px-5 py-3">Call Status</th>
                <th className="px-5 py-3">Duration</th>
                <th className="px-5 py-3">Telecom Rate</th>
                <th className="px-5 py-3">Calculated Cost</th>
                <th className="px-5 py-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {usageEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    No call usage recorded yet. Make a call to see live itemized consumption.
                  </td>
                </tr>
              ) : (
                usageEvents.map(u => {
                  const isConnected = u.durationMinutes > 0;
                  const durSecs = Math.round(u.durationMinutes * 60);
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-slate-900 truncate max-w-[180px]">
                        {u.callId || u.id}
                      </td>
                      <td className="px-5 py-3.5">
                        {isConnected ? (
                          <Badge variant="success" size="sm">Connected / Answered</Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">Unconnected (Free)</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono font-medium text-slate-800">
                        {isConnected ? `${u.durationMinutes.toFixed(2)}m (${durSecs}s)` : '0s'}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-600">
                        ₹1.00 / min
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold">
                        {isConnected ? (
                          <span className="text-amber-800">{formatCurrency(u.providerCostUnits)}</span>
                        ) : (
                          <span className="text-slate-400 font-normal">₹0.00 (Unbilled)</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right text-slate-500">
                        {formatDate(u.timestamp)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
