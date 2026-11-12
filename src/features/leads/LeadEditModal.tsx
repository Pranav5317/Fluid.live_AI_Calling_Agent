import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Select } from '../../components/common/Select';
import { Lead } from '../../types';
import { leadService } from '../../services/leadService';
import { getIstDateKey, formatTime12h, isLeadScheduleActive } from '../../lib/formatters';
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
  CheckCircle2,
} from 'lucide-react';

export interface LeadEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onLeadUpdated: (updatedLead: Lead) => void;
}

export const CALLING_SLOT_PRESETS = [
  {
    id: 'evening_6_8',
    label: 'Between 6:00 PM – 8:00 PM',
    shortLabel: '6:00 PM – 8:00 PM',
    startTime: '18:00',
    endTime: '20:00',
    badge: 'Recommended',
    tag: 'Evening Prime',
    icon: '🌙',
  },
  {
    id: 'morning_10_12',
    label: 'Between 10:00 AM – 12:00 PM',
    shortLabel: '10:00 AM – 12:00 PM',
    startTime: '10:00',
    endTime: '12:00',
    badge: 'Morning Slot',
    tag: 'Start of Day',
    icon: '🌅',
  },
  {
    id: 'midday_12_2',
    label: 'Between 12:00 PM – 2:00 PM',
    shortLabel: '12:00 PM – 2:00 PM',
    startTime: '12:00',
    endTime: '14:00',
    badge: 'Midday Slot',
    tag: 'Pre-Lunch',
    icon: '☀️',
  },
  {
    id: 'afternoon_2_4',
    label: 'Between 2:00 PM – 4:00 PM',
    shortLabel: '2:00 PM – 4:00 PM',
    startTime: '14:00',
    endTime: '16:00',
    badge: 'Afternoon Slot',
    tag: 'Post-Lunch',
    icon: '☕',
  },
  {
    id: 'late_afternoon_4_6',
    label: 'Between 4:00 PM – 6:00 PM',
    shortLabel: '4:00 PM – 6:00 PM',
    startTime: '16:00',
    endTime: '18:00',
    badge: 'Late Afternoon',
    tag: 'Tea Break',
    icon: '🌇',
  },
  {
    id: 'custom',
    label: 'Custom Calling Interval',
    shortLabel: 'Custom',
    startTime: '',
    endTime: '',
    badge: 'Custom Hours',
    tag: 'User Defined',
    icon: '⏱️',
  },
] as const;

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

  // Interval-Based Scheduling State
  const [isScheduled, setIsScheduled] = useState(false);
  const [slotDate, setSlotDate] = useState(() => getIstDateKey(0));
  const [selectedSlotPreset, setSelectedSlotPreset] = useState<string>('evening_6_8');
  const [customStartTime, setCustomStartTime] = useState('18:00');
  const [customEndTime, setCustomEndTime] = useState('20:00');

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

      // Parse interval schedule if already set
      if (meta.scheduledSlotStart && meta.scheduledSlotEnd) {
        setIsScheduled(true);
        setSlotDate(meta.scheduledSlotDate || getIstDateKey(0));
        const matched = CALLING_SLOT_PRESETS.find(
          p => p.startTime === meta.scheduledSlotStart && p.endTime === meta.scheduledSlotEnd
        );
        if (matched) {
          setSelectedSlotPreset(matched.id);
        } else {
          setSelectedSlotPreset('custom');
          setCustomStartTime(meta.scheduledSlotStart);
          setCustomEndTime(meta.scheduledSlotEnd);
        }
      } else if (meta.scheduledCallTime || meta.scheduledAt) {
        setIsScheduled(true);
        const iso = meta.scheduledCallTime || meta.scheduledAt;
        try {
          const d = new Date(iso);
          if (!isNaN(d.getTime())) {
            setSlotDate(getIstDateKey(0, d));
            const ist = new Date(d.getTime() + 5.5 * 3600000);
            const hh = String(ist.getUTCHours()).padStart(2, '0');
            const mm = String(ist.getUTCMinutes()).padStart(2, '0');
            const endIst = new Date(ist.getTime() + 2 * 3600000);
            const endHh = String(endIst.getUTCHours()).padStart(2, '0');
            const endMm = String(endIst.getUTCMinutes()).padStart(2, '0');
            const matched = CALLING_SLOT_PRESETS.find(p => p.startTime === `${hh}:${mm}`);
            if (matched) {
              setSelectedSlotPreset(matched.id);
            } else {
              setSelectedSlotPreset('custom');
              setCustomStartTime(`${hh}:${mm}`);
              setCustomEndTime(`${endHh}:${endMm}`);
            }
          } else {
            setSlotDate(getIstDateKey(0));
            setSelectedSlotPreset('evening_6_8');
          }
        } catch {
          setSlotDate(getIstDateKey(0));
          setSelectedSlotPreset('evening_6_8');
        }
      } else {
        setIsScheduled(false);
        setSlotDate(getIstDateKey(0));
        setSelectedSlotPreset('evening_6_8');
      }
      setError(null);
    }
  }, [lead, isOpen]);

  // Determine current active start and end time
  const activeStartTime =
    selectedSlotPreset === 'custom'
      ? customStartTime
      : CALLING_SLOT_PRESETS.find(p => p.id === selectedSlotPreset)?.startTime || '18:00';

  const activeEndTime =
    selectedSlotPreset === 'custom'
      ? customEndTime
      : CALLING_SLOT_PRESETS.find(p => p.id === selectedSlotPreset)?.endTime || '20:00';

  const activeSlotLabel =
    selectedSlotPreset === 'custom'
      ? `Between ${formatTime12h(activeStartTime)} – ${formatTime12h(activeEndTime)}`
      : CALLING_SLOT_PRESETS.find(p => p.id === selectedSlotPreset)?.label || 'Between 6:00 PM – 8:00 PM';

  const slotStartIsoPreview = isScheduled && activeStartTime
    ? new Date(`${slotDate}T${activeStartTime}:00+05:30`).toISOString()
    : undefined;
  const slotEndIsoPreview = isScheduled && activeEndTime
    ? new Date(`${slotDate}T${activeEndTime}:00+05:30`).toISOString()
    : undefined;

  const isCustomIntervalInvalid =
    isScheduled &&
    (!activeStartTime || !activeEndTime || activeEndTime <= activeStartTime);

  const setDatePreset = (daysFromToday: number) => {
    setSlotDate(getIstDateKey(daysFromToday));
    setIsScheduled(true);
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
    if (isCustomIntervalInvalid) {
      setError('Calling interval End Time must be later than Start Time.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let updatedMetadata: Record<string, any>;

      if (isScheduled) {
        // Construct ISO timestamps in IST timezone (+05:30)
        // e.g. slotDate = "2026-11-05", startTime = "18:00" -> "2026-11-05T18:00:00+05:30"
        const slotStartIso = new Date(`${slotDate}T${activeStartTime}:00+05:30`).toISOString();
        const slotEndIso = new Date(`${slotDate}T${activeEndTime}:00+05:30`).toISOString();

        updatedMetadata = {
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
          scheduledSlotDate: slotDate,
          scheduledSlotStart: activeStartTime,
          scheduledSlotEnd: activeEndTime,
          scheduledSlotLabel: activeSlotLabel,
          scheduledCallTime: slotStartIso,
          scheduledWindowEnd: slotEndIso,
          scheduledAt: slotStartIso,
        };
      } else {
        // Schedule cleared
        updatedMetadata = {
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
          scheduledSlotDate: null,
          scheduledSlotStart: null,
          scheduledSlotEnd: null,
          scheduledSlotLabel: null,
          scheduledCallTime: null,
          scheduledWindowEnd: null,
          scheduledAt: null,
        };
      }

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

  const todayIstKey = getIstDateKey(0);
  const tomorrowIstKey = getIstDateKey(1);
  const inActiveSlotNow = isLeadScheduleActive({
    scheduledCallTime: slotStartIsoPreview,
    scheduledWindowEnd: slotEndIsoPreview,
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Candidate Profile & Interval Calling Schedule"
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

        {/* Section 2: Portal Stated Facts */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono block">
            2. Candidate Application Details
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

        {/* Section 3: Interval-Based Call Scheduling */}
        <div className="space-y-4 pt-3 border-t border-slate-100 bg-gradient-to-br from-indigo-50/60 via-white to-blue-50/40 p-4 rounded-xl border border-indigo-100/80">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5 font-mono uppercase tracking-wide">
                <CalendarClock className="h-4 w-4 text-indigo-600" />
                3. Interval Calling Window
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Set a preferred calling window (e.g. between 6:00 PM to 8:00 PM) for autonomous dispatch.
              </p>
            </div>
            {isScheduled && (
              <button
                type="button"
                onClick={() => setIsScheduled(false)}
                className="text-[10px] text-slate-500 hover:text-rose-600 font-semibold underline flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Clear Schedule
              </button>
            )}
          </div>

          {/* Date Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Target Outreach Date
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDatePreset(0)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all ${
                  slotDate === todayIstKey && isScheduled
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setDatePreset(1)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all ${
                  slotDate === tomorrowIstKey && isScheduled
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300'
                }`}
              >
                Tomorrow
              </button>
              <input
                type="date"
                value={slotDate}
                onChange={e => {
                  setSlotDate(e.target.value);
                  setIsScheduled(true);
                }}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Time Slot Intervals Grid */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Select Preferred Time Interval
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CALLING_SLOT_PRESETS.map(slot => {
                const isSelected = isScheduled && selectedSlotPreset === slot.id;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => {
                      setSelectedSlotPreset(slot.id);
                      setIsScheduled(true);
                    }}
                    className={`flex items-start justify-between p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 shadow-xs ring-1 ring-indigo-500'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{slot.icon}</span>
                        <span className={`text-xs font-bold ${isSelected ? 'text-indigo-950' : 'text-slate-900'}`}>
                          {slot.shortLabel}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">
                        {slot.tag}
                      </span>
                    </div>
                    {slot.badge && (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {slot.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Interval Picker */}
          {selectedSlotPreset === 'custom' && isScheduled && (
            <div className="space-y-2 p-3 bg-white rounded-xl border border-indigo-200">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Start Time (IST)
                  </label>
                  <input
                    type="time"
                    value={customStartTime}
                    onChange={e => setCustomStartTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    End Time (IST)
                  </label>
                  <input
                    type="time"
                    value={customEndTime}
                    onChange={e => setCustomEndTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
              {isCustomIntervalInvalid && (
                <p className="text-[11px] font-semibold text-rose-600">
                  End Time must be later than Start Time.
                </p>
              )}
            </div>
          )}

          {/* Live Schedule Confirmation & Interval Status Banner */}
          {isScheduled ? (
            <div
              className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                inActiveSlotNow
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : 'bg-blue-50 border-blue-200 text-blue-950'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    inActiveSlotNow ? 'bg-emerald-200 text-emerald-800' : 'bg-blue-200 text-blue-800'
                  }`}
                >
                  {inActiveSlotNow ? (
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
                    </span>
                  ) : (
                    <Clock className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold">
                    {slotDate === todayIstKey ? 'Today' : slotDate === tomorrowIstKey ? 'Tomorrow' : slotDate} ({activeSlotLabel})
                  </div>
                  <div className="text-[11px] mt-0.5">
                    {inActiveSlotNow ? (
                      <span className="font-semibold text-emerald-700">
                        🟢 Active Calling Window Right Now • Eligible for immediate dispatch
                      </span>
                    ) : (
                      <span className="text-slate-600">
                        Scheduled for automated dispatch during this interval.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center p-3 rounded-lg border border-dashed border-slate-300 bg-white/60 text-xs text-slate-500">
              No calling window set. Candidate will remain in regular outbound queue. Click any slot above to schedule.
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
