import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { webhookService } from '../../services/webhookService';
import { WebhookEvent } from '../../types';
import { formatDate } from '../../lib/formatters';
import { Building2, Users, Bell, Zap, RefreshCw } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [webhooks, setWebhooks] = useState<WebhookEvent[]>([]);
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);

  const fetchWebhooks = async () => {
    const list = await webhookService.getWebhookEvents();
    setWebhooks(list);
  };

  useEffect(() => {
    fetchWebhooks();
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization Settings & Event Audit"
        description="Configuration boundary for Business Profile, Roles, Alert Routing, and Sarvam Webhook Audit Trails."
      />

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Business Profile & Timezone</h3>
              <Badge variant="neutral" size="sm">v1.2</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Apex Enterprises Inc. • Timezone: America/New_York
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
              3 Active Admin Seats • Organization Security Enforced
            </p>
          </div>
        </Card>
      </div>

      {/* Webhook & Raw Provider Event Stream Audit Trail (Requirement #14 & Finding 6) */}
      <Card noPadding>
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900">Sarvam Webhook & Event Audit Stream</h3>
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
    </div>
  );
};
