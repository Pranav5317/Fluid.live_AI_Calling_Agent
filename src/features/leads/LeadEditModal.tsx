import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Select } from '../../components/common/Select';
import { Lead } from '../../types';
import { leadService } from '../../services/leadService';
import {
  User,
  Phone,
  Mail,
  Briefcase,
  Building2,
  Clock,
  Calendar,
  Sparkles,
  MapPin,
  IndianRupee,
  CalendarClock,
  X,
} from 'lucide-react';

export interface LeadEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onLeadUpdated: (updatedLead: Lead) => void;
}

export const LeadEditModal: React.FC<LeadEditModalProps> = ({
  isOpen,
  onClose,
  lead,
  onLeadUpdated,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [experience, setExperience] = useState('');
  const [notice, setNotice] = useState('');
  const [workMode, setWorkMode] = useState('');
  const [compensation, setCompensation] = useState('');
  const [scheduledCallTime, setScheduledCallTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lead) {
      setName(lead.name || '');
      setPhone(lead.phone || '');
      setEmail(lead.email || '');

      const meta = (lead.metadata || {}) as Record<string, any>;
      setRole(meta.role || meta.applied_role || '');
      setCompany(meta.company || 'FluidLive');
      setExperience(meta.experience || meta.portal_experience || '2 Years');
      setNotice(meta.notice || meta.portal_notice_period || '30 Days');
      setWorkMode(meta.workMode || meta.portal_work_mode || 'On Site, Pune');
      setCompensation(meta.compensation || meta.portal_expected_ctc || '');

      // Parse scheduled time if already set
      const existingSchedule = meta.scheduledCallTime || meta.scheduledAt;
      if (existingSchedule) {
        try {
          const dateObj = new Date(existingSchedule);
          if (!isNaN(dateObj.getTime())) {
            // Format to YYYY-MM-DDTHH:mm for datetime-local input
            const localIso = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000)
              .toISOString()
              .slice(0, 16);
            setScheduledCallTime(localIso);
          } else {
            setScheduledCallTime('');
          }
        } catch {
          setScheduledCallTime('');
        }
      } else {
        setScheduledCallTime('');
      }
      setError(null);
    }
  }, [lead, isOpen]);

  const setPresetSchedule = (minutesFromNow: number) => {
    const target = new Date(Date.now() + minutesFromNow * 60 * 1000);
    const localIso = new Date(target.getTime() - target.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setScheduledCallTime(localIso);
  };

  const setTomorrowSlot = (hours: number, minutes: number) => {
    const target = new Date();
    target.setDate(target.getDate() + 1);
    target.setHours(hours, minutes, 0, 0);
    const localIso = new Date(target.getTime() - target.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setScheduledCallTime(localIso);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;
    if (!name.trim()) {
      setError('Candidate Name is required.');
      return;
    }
    if (!phone.trim()) {
      setError('Phone Number is required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updatedMetadata = {
        ...((lead.metadata as Record<string, any>) || {}),
        role: role.trim(),
        applied_role: role.trim(),
        company: company.trim(),
        experience: experience.trim(),
        portal_experience: experience.trim(),
        notice: notice.trim(),
        portal_notice_period: notice.trim(),
        workMode: workMode.trim(),
        portal_work_mode: workMode.trim(),
        compensation: compensation.trim(),
        scheduledCallTime: scheduledCallTime ? new Date(scheduledCallTime).toISOString() : null,
        scheduledAt: scheduledCallTime ? new Date(scheduledCallTime).toISOString() : null,
      };

      const result = await leadService.updateLead(lead.id, {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        metadata: updatedMetadata,
      });

      onLeadUpdated(result);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update candidate details.');
    } finally {
      setSaving(false);
    }
  };

  if (!lead) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Candidate Profile & Call Schedule"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Section 1: Candidate Contact Info */}
        <div className="space-y-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono block">
            1. Core Contact Information
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Candidate Full Name"
                leftIcon={<User className="h-4 w-4 text-slate-400" />}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number (E.164)</label>
              <Input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+91 7522 911 068"
                leftIcon={<Phone className="h-4 w-4 text-slate-400" />}
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="candidate@example.com"
              leftIcon={<Mail className="h-4 w-4 text-slate-400" />}
            />
          </div>
        </div>

        {/* Section 2: Application Facts (Metadata) */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono block">
            2. Application Portal Facts (Fed to AI Agent)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Applied Role</label>
              <Input
                value={role}
                onChange={e => setRole(e.target.value)}
                placeholder="e.g. Frontend Developer"
                leftIcon={<Briefcase className="h-4 w-4 text-slate-400" />}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Current Company</label>
              <Input
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="e.g. FluidLive"
                leftIcon={<Building2 className="h-4 w-4 text-slate-400" />}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Stated Experience</label>
              <Input
                value={experience}
                onChange={e => setExperience(e.target.value)}
                placeholder="e.g. 2 Years"
                leftIcon={<Clock className="h-4 w-4 text-slate-400" />}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Notice Period</label>
              <Input
                value={notice}
                onChange={e => setNotice(e.target.value)}
                placeholder="e.g. 30 Days or Immediate"
                leftIcon={<Calendar className="h-4 w-4 text-slate-400" />}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Work Mode</label>
              <Input
                value={workMode}
                onChange={e => setWorkMode(e.target.value)}
                placeholder="e.g. On Site, Pune"
                leftIcon={<MapPin className="h-4 w-4 text-slate-400" />}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Compensation / CTC</label>
            <Input
              value={compensation}
              onChange={e => setCompensation(e.target.value)}
              placeholder="e.g. ₹4.2 LPA → ₹6.0 LPA"
              leftIcon={<IndianRupee className="h-4 w-4 text-slate-400" />}
            />
          </div>
        </div>

        {/* Section 3: Call Scheduling */}
        <div className="space-y-3 pt-2 border-t border-slate-100 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5 font-mono uppercase tracking-wide">
                <CalendarClock className="h-4 w-4 text-blue-600" />
                3. Automated Call Scheduling
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Set a particular time for the AI Calling Agent to initiate the screening call.
              </p>
            </div>
            {scheduledCallTime && (
              <button
                type="button"
                onClick={() => setScheduledCallTime('')}
                className="text-[10px] text-slate-500 hover:text-rose-600 font-semibold underline flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Clear Time
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Call Date & Time (IST)
            </label>
            <input
              type="datetime-local"
              value={scheduledCallTime}
              onChange={e => setScheduledCallTime(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Quick Schedule Shortcuts */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] text-slate-400 font-mono">Quick Set:</span>
            <button
              type="button"
              onClick={() => setPresetSchedule(15)}
              className="text-[11px] px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors font-medium"
            >
              +15 Mins
            </button>
            <button
              type="button"
              onClick={() => setPresetSchedule(60)}
              className="text-[11px] px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors font-medium"
            >
              +1 Hour
            </button>
            <button
              type="button"
              onClick={() => setTomorrowSlot(11, 0)}
              className="text-[11px] px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors font-medium"
            >
              Tomorrow 11:00 AM
            </button>
            <button
              type="button"
              onClick={() => setTomorrowSlot(15, 30)}
              className="text-[11px] px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors font-medium"
            >
              Tomorrow 3:30 PM
            </button>
          </div>

          {scheduledCallTime && (
            <div className="p-2.5 bg-blue-100/60 rounded-lg text-[11px] text-blue-900 flex items-center gap-2 border border-blue-200/60">
              <Sparkles className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span>
                Call queued for: <strong>{new Date(scheduledCallTime).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={saving}>
            Save Candidate & Schedule
          </Button>
        </div>
      </form>
    </Modal>
  );
};
