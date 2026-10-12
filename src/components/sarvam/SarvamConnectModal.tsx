import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Badge } from '../common/Badge';
import { sarvamService } from '../../services/sarvamService';
import { SarvamAccountStatus } from '../../types';
import { Zap, CheckCircle2, AlertCircle, Eye, EyeOff, Activity, ShieldCheck } from 'lucide-react';

export interface SarvamConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected?: (status: SarvamAccountStatus) => void;
}

export const SarvamConnectModal: React.FC<SarvamConnectModalProps> = ({
  isOpen,
  onClose,
  onConnected,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [orgId, setOrgId] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [defaultAppId, setDefaultAppId] = useState('');
  const [connectionId, setConnectionId] = useState('');
  const [agentPhoneNumber, setAgentPhoneNumber] = useState('');

  const [showApiKey, setShowApiKey] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<SarvamAccountStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTestResult(null);
      setLoading(true);
      sarvamService
        .getStatus()
        .then(status => {
          setCurrentStatus(status);
          setOrgId(status.orgId || '');
          setWorkspaceId(status.workspaceId || '');
          setDefaultAppId(status.defaultAppId || '');
          setConnectionId(status.connectionId || '');
          setAgentPhoneNumber(status.agentPhoneNumber || '');
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await sarvamService.testConnection({
        apiKey: apiKey || undefined,
        orgId: orgId || undefined,
        workspaceId: workspaceId || undefined,
        defaultAppId: defaultAppId || undefined,
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Failed to communicate with Sarvam API.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setTestResult(null);
    try {
      const res = await sarvamService.connectAccount({
        apiKey: apiKey.trim() || undefined,
        orgId: orgId.trim() || undefined,
        workspaceId: workspaceId.trim() || undefined,
        defaultAppId: defaultAppId.trim() || undefined,
        connectionId: connectionId.trim() || undefined,
        agentPhoneNumber: agentPhoneNumber.trim() || undefined,
      });

      if (res.data) {
        setCurrentStatus(res.data);
        if (onConnected) onConnected(res.data);
      }

      if (res.testResult) {
        setTestResult(res.testResult);
      }

      if (res.success) {
        setTimeout(() => {
          onClose();
        }, 800);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Failed to update Sarvam account credentials.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Connect Sarvam AI Voice Account"
      description="Link your Sarvam Samvaad workspace credentials to orchestrate voice agents and real-time telephony directly."
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Activity className="h-4 w-4 text-amber-500" />}
            onClick={handleTestConnection}
            isLoading={testing}
          >
            Test Connection Ping
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} isLoading={loading}>
              Save & Link Account
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Status Header Pill */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded bg-amber-400/20 flex items-center justify-center text-amber-400">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs tracking-wide">Sarvam AI Samvaad Cloud Bridge</span>
                {currentStatus?.connected ? (
                  <Badge variant="success" size="sm" dot>
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="warning" size="sm" dot>
                    Not Configured
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-slate-300">
                {currentStatus?.maskedApiKey ? (
                  <span>Active Key: <code className="font-mono text-amber-300">{currentStatus.maskedApiKey}</code></span>
                ) : (
                  'No active API key set'
                )}
              </p>
            </div>
          </div>
          <div className="text-right text-[11px] text-slate-400 hidden sm:block">
            <span className="block font-medium">Outbound DID</span>
            <span className="font-mono text-emerald-400 font-bold">{currentStatus?.agentPhoneNumber || '+91...'}</span>
          </div>
        </div>

        {/* Live Test Results Alert */}
        {testResult && (
          <div
            className={`p-3 rounded-lg flex items-start gap-2.5 text-xs ${
              testResult.success
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-rose-50 text-rose-900 border border-rose-200'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
            )}
            <div className="flex-1">
              <span className="font-bold block">
                {testResult.success ? 'Sarvam Cloud Ping Successful' : 'Connection Test Failed'}
              </span>
              <p className="mt-0.5 text-[11px]">{testResult.message}</p>
              {testResult.latencyMs && (
                <span className="text-[10px] font-mono opacity-80 mt-1 block">
                  Round-trip latency: {testResult.latencyMs}ms
                </span>
              )}
            </div>
          </div>
        )}

        {/* Form Fields */}
        <div className="space-y-3 pt-1">
          {/* API Key */}
          <div className="relative">
            <Input
              label="Sarvam Production API Key *"
              type={showApiKey ? 'text' : 'password'}
              placeholder={currentStatus?.maskedApiKey ? `Leave blank to keep active (${currentStatus.maskedApiKey})` : 'sk_samvaad_...'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
            />
            <button
              type="button"
              className="absolute right-3 top-8 text-slate-400 hover:text-slate-600"
              onClick={() => setShowApiKey(!showApiKey)}
            >
              {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Organization ID *"
              placeholder="019e9100-606e-790c-92e0-0bcfbf8523a6"
              value={orgId}
              onChange={e => setOrgId(e.target.value)}
            />
            <Input
              label="Workspace ID *"
              placeholder="019e9100-60a1-7bd7-bdb5-3b118f090be9"
              value={workspaceId}
              onChange={e => setWorkspaceId(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Default Voice Agent App ID *"
              placeholder="Conversatio-b063cf10-e735"
              value={defaultAppId}
              onChange={e => setDefaultAppId(e.target.value)}
            />
            <Input
              label="Sarvam Telephony Connection ID *"
              placeholder="7efd8897-87-220da5aa-1d5e"
              value={connectionId}
              onChange={e => setConnectionId(e.target.value)}
            />
          </div>

          <Input
            label="Dedicated Agent Caller ID Phone Number *"
            placeholder="+917965480599"
            value={agentPhoneNumber}
            onChange={e => setAgentPhoneNumber(e.target.value)}
          />

          <div className="flex items-center gap-2 p-2.5 rounded bg-slate-50 border border-slate-200 text-slate-600 text-[11px]">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              Credentials are securely managed by the Fluid.live server bridge. API keys are never exposed in client bundles.
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
};

