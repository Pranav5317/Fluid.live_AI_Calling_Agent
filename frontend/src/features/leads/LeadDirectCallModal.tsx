import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { Lead } from '../../types';
import { callService } from '../../services/callService';
import { agentService } from '../../services/agentService';
import { phoneService } from '../../services/phoneService';
import { PhoneCall, ShieldCheck, Zap, CheckCircle2, AlertCircle, Bot, PhoneForwarded } from 'lucide-react';

export interface LeadDirectCallModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onCallInitiated?: () => void;
}

export const LeadDirectCallModal: React.FC<LeadDirectCallModalProps> = ({
  lead,
  isOpen,
  onClose,
  onCallInitiated,
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [calling, setCalling] = useState(false);
  const [callResult, setCallResult] = useState<{ success: boolean; message: string; callId?: string; attemptId?: string } | null>(null);

  useEffect(() => {
    if (lead) {
      setPhoneNumber(lead.phone || '');
      setCallResult(null);
    }
  }, [lead]);

  if (!lead) return null;

  const handleTriggerCall = async () => {
    if (!phoneNumber.trim()) return;
    setCalling(true);
    setCallResult(null);

    try {
      const [agList, numList] = await Promise.all([
        agentService.getAgents(),
        phoneService.getPhoneNumbers(),
      ]);

      const agVerId = agList[0]?.currentVersionId;
      const phoneId = numList[0]?.id;

      if (!agVerId) {
        throw new Error('No active voice agent version found. Please check Agent Workspace.');
      }
      if (!phoneId) {
        throw new Error('No active outbound caller ID found. Please check Telephony settings.');
      }

      const call = await callService.initiateTestCall({
        agentVersionId: agVerId,
        phoneNumberId: phoneId,
        toPhoneNumber: phoneNumber.trim(),
        leadId: lead.id,
        userName: lead.name,
      });

      setCallResult({
        success: true,
        message: `Outbound AI call dispatched successfully via Sarvam Gateway to ${phoneNumber.trim()}! Phone will ring momentarily.`,
        callId: call.id,
        attemptId: call.externalCallId,
      });

      if (onCallInitiated) onCallInitiated();
    } catch (err: any) {
      setCallResult({
        success: false,
        message: err?.message || 'Failed to dispatch call via Sarvam Voice Gateway.',
      });
    } finally {
      setCalling(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Direct Voice Call: ${lead.name}`}
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
            disabled={!phoneNumber.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            {calling ? 'Dispatching Call...' : 'Place Call Now'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Candidate & Campaign Context */}
        <div className="p-3.5 rounded-xl bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-sm">
              {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-bold flex items-center gap-2">
                <span>{lead.name}</span>
                {lead.doNotCall && <Badge variant="danger" size="sm">DNC Active</Badge>}
              </div>
              <div className="text-xs text-slate-400">
                {(lead.metadata as any)?.role || 'Candidate'} • {(lead.metadata as any)?.company || 'FluidLive'}
              </div>
            </div>
          </div>
          <Badge variant="success" size="sm" className="font-mono">
            Direct Mode
          </Badge>
        </div>

        {/* Destination Phone Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Destination Phone Number
            </label>
            <button
              type="button"
              onClick={() => setPhoneNumber('+919922935920')}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 underline underline-offset-2 flex items-center gap-1"
            >
              <PhoneForwarded className="h-3 w-3" />
              Use Pranav's Phone (+919922935920)
            </button>
          </div>
          <Input
            value={phoneNumber}
            onChange={e => setPhoneNumber(e.target.value)}
            placeholder="+91 XXXXX XXXXX"
            className="font-mono"
            disabled={calling}
          />
          <p className="text-[11px] text-slate-500">
            Number to receive the outbound call. You can edit this to your own number to test immediately.
          </p>
        </div>

        {/* Gateway Telemetry Box */}
        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 text-xs space-y-1.5 font-mono text-slate-600">
          <div className="flex justify-between items-center text-[11px]">
            <span>Voice Engine:</span>
            <span className="font-semibold text-slate-900">Fluid Voice (Shubh / Samvaad)</span>
          </div>
          <div className="flex justify-between items-center text-[11px]">
            <span>Outbound Caller ID:</span>
            <span className="font-semibold text-slate-900">+91 796548 0599</span>
          </div>
          <div className="flex justify-between items-center text-[11px]">
            <span>Carrier Protocol:</span>
            <span className="font-semibold text-slate-900">Sarvam SIP Trunk Gateway</span>
          </div>
        </div>

        {/* Live Call Result Feedback */}
        {callResult && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 transition-all ${
              callResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            {callResult.success ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="font-bold">{callResult.success ? 'Call Dispatched' : 'Dispatch Failed'}</div>
              <div>{callResult.message}</div>
              {callResult.attemptId && (
                <div className="font-mono text-[11px] text-slate-500 pt-1">
                  Gateway Attempt ID: <span className="font-semibold text-slate-700">{callResult.attemptId}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
