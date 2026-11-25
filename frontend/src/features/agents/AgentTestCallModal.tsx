import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { Agent } from '../../types';
import { callService } from '../../services/callService';
import { phoneService } from '../../services/phoneService';
import { leadService } from '../../services/leadService';
import {
  PhoneCall,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertCircle,
  Bot,
  User,
  Briefcase,
  Clock,
  Calendar,
  Building2,
  Sliders,
} from 'lucide-react';

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
  const [leadName, setLeadName] = useState('Pranav L');
  const [appliedRole, setAppliedRole] = useState('Senior Software Engineer');
  const [portalExperience, setPortalExperience] = useState('3.5 Years');
  const [portalNoticePeriod, setPortalNoticePeriod] = useState('Immediate');
  const [portalWorkMode, setPortalWorkMode] = useState('Pune Hybrid');
  const [calling, setCalling] = useState(false);
  const [callResult, setCallResult] = useState<{ success: boolean; message: string; callId?: string } | null>(null);

  if (!agent) return null;

  const handleSelectPreset = (name: string, phone: string, role: string, exp: string, notice: string, mode: string) => {
    setLeadName(name);
    setPhoneNumber(phone);
    setAppliedRole(role);
    setPortalExperience(exp);
    setPortalNoticePeriod(notice);
    setPortalWorkMode(mode);
    setCallResult(null);
  };

  const handleTriggerCall = async () => {
    if (!phoneNumber.trim()) return;
    setCalling(true);
    setCallResult(null);

    try {
      // Find an active phone number to call from
      const phones = await phoneService.getPhoneNumbers();
      const outboundPhone = phones.find(p => p.status === 'active') || phones[0];
      const phoneNumberId = outboundPhone?.id || 'phone_sarvam_prod_01';

      // Ensure normalized phone has +91
      let normalized = phoneNumber.trim().replace(/\s+/g, '');
      if (normalized.length === 10 && !normalized.startsWith('+')) {
        normalized = `+91${normalized}`;
      }

      // Check if candidate exists or update candidate metadata with configured portal facts
      let targetLeadId: string | undefined = undefined;
      try {
        const existingLeads = await leadService.getLeads({ search: normalized });
        const match = existingLeads?.items?.[0]?.lead;
        if (match) {
          targetLeadId = match.id;
          await leadService.updateLead(match.id, {
            name: leadName.trim() || match.name,
            metadata: {
              ...(match.metadata || {}),
              applied_role: appliedRole,
              role: appliedRole,
              portal_experience: portalExperience,
              experience: portalExperience,
              portal_notice_period: portalNoticePeriod,
              notice_period: portalNoticePeriod,
              portal_work_mode: portalWorkMode,
              workMode: portalWorkMode,
            },
          });
        }
      } catch (err) {
        // Continue with test call even if lead lookup fails
      }

      const call = await callService.initiateTestCall({
        agentVersionId: agent.currentVersionId,
        phoneNumberId,
        toPhoneNumber: normalized,
        leadId: targetLeadId,
        userName: leadName.trim() || undefined,
      });

      setCallResult({
        success: true,
        message: `Call dispatched successfully to ${normalized}! Phone will ring momentarily.`,
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
      title="Direct Outbound Candidate Verification Call"
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
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
          >
            {calling ? 'Connecting Call...' : 'Call Handset Now'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Agent Info Banner */}
        <div className="p-3.5 rounded-xl bg-slate-900 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center font-bold text-emerald-400">
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

        {/* Quick Candidate Presets */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono block">
            Select Test Candidate Preset
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                handleSelectPreset(
                  'Pranav L',
                  '+919922935920',
                  'Senior Software Engineer',
                  '3.5 Years',
                  'Immediate',
                  'Pune Hybrid'
                )
              }
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                phoneNumber.includes('9922935920')
                  ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Pranav L (+91 99229 35920)
            </button>
          </div>
        </div>

        {/* Input Fields */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Candidate Phone Number *
              </label>
              <Input
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                placeholder="+91 99229 35920"
                leftIcon={<PhoneCall className="h-4 w-4 text-slate-400" />}
                className="text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Candidate Name (user_name)
              </label>
              <Input
                value={leadName}
                onChange={e => setLeadName(e.target.value)}
                placeholder="e.g. Pranav L"
                className="text-xs"
              />
            </div>
          </div>

          {/* Candidate Portal Facts to Verify */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5">
            <div className="flex items-center gap-1.5 text-slate-700">
              <Sliders className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-xs font-bold">Portal Application Facts for Verification</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] text-slate-500 font-mono block mb-0.5">Role Applied</label>
                <input
                  type="text"
                  value={appliedRole}
                  onChange={e => setAppliedRole(e.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 font-mono block mb-0.5">Portal Experience</label>
                <input
                  type="text"
                  value={portalExperience}
                  onChange={e => setPortalExperience(e.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 font-mono block mb-0.5">Portal Notice Period</label>
                <input
                  type="text"
                  value={portalNoticePeriod}
                  onChange={e => setPortalNoticePeriod(e.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 font-mono block mb-0.5">Work Mode / Location</label>
                <input
                  type="text"
                  value={portalWorkMode}
                  onChange={e => setPortalWorkMode(e.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Carrier Info */}
        <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1.5 text-xs text-slate-600">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Outbound SIP Trunk:</span>
            <span className="font-mono font-semibold text-slate-900">+917965861007 (Sarvam Telephony)</span>
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
