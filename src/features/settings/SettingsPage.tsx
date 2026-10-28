import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { webhookService } from '../../services/webhookService';
import { sarvamService } from '../../services/sarvamService';
import { phoneService } from '../../services/phoneService';
import { SarvamConnectModal } from '../../components/sarvam/SarvamConnectModal';
import { WebhookEvent, SarvamAccountStatus } from '../../types';
import { formatDate } from '../../lib/formatters';
import { Building2, Users, Zap, RefreshCw, Activity, Phone, KeyRound, ExternalLink, CheckCircle } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [webhooks, setWebhooks] = useState<WebhookEvent[]>([]);
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);

  // Sarvam Account State
  const [sarvamStatus, setSarvamStatus] = useState<SarvamAccountStatus | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [testingPing, setTestingPing] = useState(false);
  const [syncingPhone, setSyncingPhone] = useState(false);
  const [pingMessage, setPingMessage] = useState<{ success: boolean; text: string } | null>(null);

  const fetchWebhooks = async () => {
    const list = await webhookService.getWebhookEvents();
    setWebhooks(list);
  };

  const fetchSarvamStatus = async () => {
    try {
      const status = await sarvamService.getStatus();
      setSarvamStatus(status);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchWebhooks();
    fetchSarvamStatus();
  }, []);

  const handleReprocess = async (eventId: string) => {
    setReprocessingId(eventId);
    try {
      await webhookService.reprocessEvent(eventId);
      await fetchWebhooks();
    } finally {
      setReprocessingId(null);
    }
  };

  const handleTestPing = async () => {
    setTestingPing(true);
    setPingMessage(null);
    try {
      const res = await sarvamService.testConnection();
      setPingMessage({
        success: res.success,
        text: res.message,
      });
      fetchSarvamStatus();
    } catch (err: any) {
      setPingMessage({
        success: false,
        text: err?.message || 'Connection ping failed.',
      });
    } finally {
      setTestingPing(false);
    }
  };

  const handleSyncPhone = async () => {
    setSyncingPhone(true);
    try {
      await phoneService.syncAccountPhone();
      alert(`Synchronized Carrier Caller ID: ${sarvamStatus?.agentPhoneNumber || '+917965480599'}`);
    } catch (err: any) {
      alert(`Failed to sync phone line: ${err?.message}`);
    } finally {
      setSyncingPhone(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization Settings & Integrations"
        description="Configuration boundary for Voice Cloud Infrastructure, Phone Line Syncing, Team Roles, and Webhook Audit Trails."
      />

      {/* Primary: Voice Carrier Account Integration Hub */}
      <Card noPadding>
        <div className="p-5 border-b border-slate-200 bg-slate-900 text-white rounded-t-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-400/20 text-amber-400 flex items-center justify-center shrink-0">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Voice Cloud & Telephony Trunk Integration</h3>
                <Badge variant={sarvamStatus?.connected ? 'success' : 'warning'} size="sm" dot>
                  {sarvamStatus?.connected ? 'Active & Connected' : 'Unconfigured'}
                </Badge>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Direct carrier connection for low-latency voice models and SIP telephony routing.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 text-slate-200 hover:bg-slate-800"
              leftIcon={<Activity className="h-4 w-4 text-amber-400" />}
              onClick={handleTestPing}
              isLoading={testingPing}
            >
              Ping Test
            </Button>
            <Button
              size="sm"
              leftIcon={<KeyRound className="h-4 w-4" />}
              onClick={() => setIsConnectModalOpen(true)}
            >
              Configure Credentials
            </Button>
          </div>
        </div>

        {pingMessage && (
          <div
            className={`px-5 py-3 text-xs flex items-center gap-2 border-b ${
              pingMessage.success
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            {pingMessage.success ? (
              <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <Zap className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{pingMessage.text}</span>
          </div>
        )}

        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 bg-white text-xs">
          <div className="space-y-1 p-3 rounded-lg border border-slate-100 bg-slate-50/50">
            <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] block">
              Active API Key
            </span>
            <span className="font-mono font-bold text-slate-800 text-xs">
              {sarvamStatus?.maskedApiKey || 'None'}
            </span>
            <span className="text-[11px] text-slate-400 block">Server-isolated credential</span>
          </div>

          <div className="space-y-1 p-3 rounded-lg border border-slate-100 bg-slate-50/50">
            <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] block">
              Organization & Workspace
            </span>
            <span className="font-mono font-bold text-slate-800 text-xs block truncate" title={sarvamStatus?.orgId}>
              Org: {sarvamStatus?.orgId?.slice(0, 18)}...
            </span>
            <span className="font-mono text-slate-600 text-[11px] block truncate" title={sarvamStatus?.workspaceId}>
              WS: {sarvamStatus?.workspaceId?.slice(0, 18)}...
            </span>
          </div>

          <div className="space-y-1 p-3 rounded-lg border border-slate-100 bg-slate-50/50">
            <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] block">
              Telephony Caller ID & App
            </span>
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-emerald-700 text-xs">
                {sarvamStatus?.agentPhoneNumber || 'Not linked'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px]"
                leftIcon={<Phone className="h-3 w-3" />}
                onClick={handleSyncPhone}
                isLoading={syncingPhone}
              >
                Sync Line
              </Button>
            </div>
            <span className="font-mono text-slate-500 text-[11px] block truncate" title={sarvamStatus?.defaultAppId}>
              App: {sarvamStatus?.defaultAppId || 'Conversatio-...'}
            </span>
          </div>
        </div>
      </Card>

      {/* Secondary Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Business Profile & Timezone</h3>
              <Badge variant="success" size="sm">Active</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Fluid.live Technologies • Timezone: Asia/Kolkata (IST)
            </p>
          </div>
        </Card>

        <Card className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Team Users & Permissions</h3>
              <Badge variant="neutral" size="sm">RBAC</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Administrator Access • Role-Based Access Control Enabled
            </p>
          </div>
        </Card>
      </div>

      {/* Webhook & Raw Provider Event Stream Audit Trail */}
      <Card noPadding>
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900">Carrier Webhook & Event Audit Stream</h3>
            </div>
            <p className="text-xs text-slate-500">
              Raw provider payloads received at backend endpoint. Idempotency keys & reprocessing log.
            </p>
          </div>
          <Badge variant="brand" size="sm">
            Backend Endpoint Active
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Event ID</th>
                <th className="px-5 py-3">Event Type</th>
                <th className="px-5 py-3">External Ref (Idempotency Key)</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Received Timestamp</th>
                <th className="px-5 py-3 text-right">Audit Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {webhooks.map(evt => (
                <tr key={evt.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-3.5 font-mono font-bold text-slate-900">{evt.id}</td>
                  <td className="px-5 py-3.5">
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-mono font-semibold text-slate-800">
                      {evt.eventType}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-slate-700">{evt.externalId}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant={evt.status === 'processed' ? 'success' : 'danger'} dot>
                      {evt.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">
                    {formatDate(evt.receivedAt)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                      isLoading={reprocessingId === evt.id}
                      onClick={() => handleReprocess(evt.id)}
                    >
                      Reprocess Event
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Connect Modal */}
      <SarvamConnectModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onConnected={status => {
          setSarvamStatus(status);
        }}
      />
    </div>
  );
};
