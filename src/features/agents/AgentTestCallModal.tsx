import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { Agent } from '../../types';
import { callService } from '../../services/callService';
import { phoneService } from '../../services/phoneService';
import { PhoneCall, ShieldCheck, Zap, CheckCircle2, AlertCircle, Bot } from 'lucide-react';

export interface AgentTestCallModalProps {
  agent: Agent | null;
  isOpen: boolean;
  onClose: () => void;
  onCallInitiated?: () => void;
}

export const AgentTestCallModal: React.FC<AgentTestCallModalProps> = ({
  agent,
  isOpen,
  onClose,
  onCallInitiated,
}) => {
  const [phoneNumber, setPhoneNumber] = useState('+919922935920');
  const [leadName, setLeadName] = useState('Pranav');
  const [calling, setCalling] = useState(false);
  const [callResult, setCallResult] = useState<{ success: boolean; message: string; callId?: string } | null>(null);

  if (!agent) return null;

  const handleTriggerCall = async () => {
    if (!phoneNumber.trim()) return;
    setCalling(true);
    setCallResult(null);

    try {
      // Find an active phone number to call from
      const phones = await phoneService.getPhoneNumbers();
      const outboundPhone = phones.find(p => p.status === 'active') || phones[0];
      const phoneNumberId = outboundPhone?.id || 'pn_01';

      const call = await callService.initiateTestCall({
        agentVersionId: agent.currentVersionId,
        phoneNumberId,
        toPhoneNumber: phoneNumber.trim(),
        userName: leadName.trim() || undefined,
      });

      setCallResult({
        success: true,
        message: `Call dispatched successfully! Phone will ring momentarily.`,
        callId: call.id,
      });

      if (onCallInitiated) onCallInitiated();
    } catch (err: any) {
      setCallResult({
        success: false,
        message: err?.message || 'Failed to dispatch test call via carrier gateway.',
      });
    } finally {
      setCalling(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Live Agent Telephony Test Sandbox"
      size="md"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button variant="outline" size="sm" onClick={onClose} disabled={calling}>
            Close
          </Button>
          <Button
            size="sm"
            leftIcon={<PhoneCall className="h-4 w-4" />}
            onClick={handleTriggerCall}
            isLoading={calling}
          >
            {calling ? 'Connecting Call...' : 'Call My Phone Now'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Agent Info Banner */}
        <div className="p-3.5 rounded-lg bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-white/10 flex items-center justify-center font-bold text-emerald-400">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">{agent.name}</span>
              <span className="text-[11px] text-slate-400 block">{agent.useCase}</span>
            </div>
          </div>
          <Badge variant="success" size="sm">
            Carrier Live
          </Badge>
        </div>

        {/* Input Fields */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Your Phone Number (E.164 with country code)
            </label>
            <Input
              value={phoneNumber}
              onChange={e => setPhoneNumber(e.target.value)}
              placeholder="+91 99229 35920"
              leftIcon={<PhoneCall className="h-4 w-4 text-slate-400" />}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Test Contact Name (Persona variable: user_name)
            </label>
            <Input
              value={leadName}
              onChange={e => setLeadName(e.target.value)}
              placeholder="Pranav"
            />
          </div>
        </div>

        {/* Outbound Trunk & Telemetry Details */}
        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5 text-xs text-slate-600">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Caller ID Trunk:</span>
            <span className="font-mono font-semibold text-slate-800">+917965480599 (Direct SIP)</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Dialogue Protocol:</span>
            <span className="font-medium text-slate-800">Sequential Flow • Sub-25 Words/Turn</span>
          </div>
        </div>

        {/* Feedback Alert */}
        {callResult && (
          <div
            className={`p-3.5 rounded-lg border text-xs flex items-start gap-2.5 ${
              callResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {callResult.success ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold">{callResult.message}</p>
              {callResult.callId && (
                <p className="font-mono text-[11px] text-emerald-700 mt-1">
                  Call Record ID: {callResult.callId}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

