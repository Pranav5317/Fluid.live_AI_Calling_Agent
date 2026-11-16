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
  Ban,
  Sliders,
  SlidersHorizontal,
  Timer,
  ListFilter,
  AlertTriangle,
  RotateCcw,
  Moon,
  Sunrise,
  Sun,
  Coffee,
  Sunset,
} from 'lucide-react';

export interface LeadEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onLeadUpdated: (updatedLead: Lead) => void;
}

export type ScheduleMode = 'slider' | 'dropdown' | 'hhmmss' | 'presets';

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

export function minutesToHhmm(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(1439, Math.round(totalMinutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function parseTimeParts(timeStr: string): { h12: number; m: number; s: number; period: 'AM' | 'PM' } {
  if (!timeStr) return { h12: 12, m: 0, s: 0, period: 'AM' };
  const parts = timeStr.split(':');
  const h24 = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  const s = parseInt(parts[2] || '0', 10);
  const validH24 = isNaN(h24) ? 0 : Math.max(0, Math.min(23, h24));
  const validM = isNaN(m) ? 0 : Math.max(0, Math.min(59, m));
  const validS = isNaN(s) ? 0 : Math.max(0, Math.min(59, s));
  const period: 'AM' | 'PM' = validH24 >= 12 ? 'PM' : 'AM';
  const h12 = validH24 % 12 === 0 ? 12 : validH24 % 12;
  return { h12, m: validM, s: validS, period };
}

export function timePartsToTimeStr(h12: number, m: number, s: number, period: 'AM' | 'PM', includeSeconds: boolean): string {
  let h24 = (h12 % 12);
  if (period === 'PM') h24 += 12;
  const hStr = String(h24).padStart(2, '0');
  const mStr = String(Math.max(0, Math.min(59, m))).padStart(2, '0');
  const sStr = String(Math.max(0, Math.min(59, s))).padStart(2, '0');
  return includeSeconds ? `${hStr}:${mStr}:${sStr}` : `${hStr}:${mStr}`;
}

export function getIntervalDurationLabel(startMins: number, endMins: number): string {
  const diff = endMins - startMins;
  if (diff <= 0) return 'Invalid Interval';
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  if (h === 0) return `${m} mins`;
  if (m === 0) return `${h} ${h === 1 ? 'hr' : 'hrs'}`;
  return `${h} ${h === 1 ? 'hr' : 'hrs'} ${m} mins`;
}

export const DROPDOWN_TIME_OPTIONS = Array.from({ length: 35 }, (_, i) => {
  const totalMins = 360 + i * 30; // 06:00 to 23:00 in 30-min steps
  const hhmm = minutesToHhmm(totalMins);
  return {
    value: hhmm,
    label: `${formatTime12h(hhmm)} (${hhmm})`,
    minutes: totalMins,
  };
});

export const DURATION_PRESETS = [
  { label: '30m', minutes: 30 },
  { label: '45m', minutes: 45 },
  { label: '1h', minutes: 60 },
  { label: '1.5h', minutes: 90 },
  { label: '2h', minutes: 120 },
  { label: '3h', minutes: 180 },
  { label: '4h', minutes: 240 },
];

export const CALLING_SLOT_PRESETS = [
  {
    id: 'evening_6_8',
    label: 'Between 6:00 PM – 8:00 PM',
    shortLabel: '6:00 PM – 8:00 PM',
    startTime: '18:00',
    endTime: '20:00',
    badge: 'Recommended',
    tag: 'Evening Prime',
    iconName: 'Moon',
  },
  {
    id: 'morning_10_12',
    label: 'Between 10:00 AM – 12:00 PM',
    shortLabel: '10:00 AM – 12:00 PM',
    startTime: '10:00',
    endTime: '12:00',
    badge: 'Morning Slot',
    tag: 'Start of Day',
    iconName: 'Sunrise',
  },
  {
    id: 'midday_12_2',
    label: 'Between 12:00 PM – 2:00 PM',
    shortLabel: '12:00 PM – 2:00 PM',
    startTime: '12:00',
    endTime: '14:00',
    badge: 'Midday Slot',
    tag: 'Pre-Lunch',
    iconName: 'Sun',
  },
  {
    id: 'afternoon_2_4',
    label: 'Between 2:00 PM – 4:00 PM',
    shortLabel: '2:00 PM – 4:00 PM',
    startTime: '14:00',
    endTime: '16:00',
    badge: 'Afternoon Slot',
    tag: 'Post-Lunch',
    iconName: 'Coffee',
  },
  {
    id: 'late_afternoon_4_6',
    label: 'Between 4:00 PM – 6:00 PM',
    shortLabel: '4:00 PM – 6:00 PM',
    startTime: '16:00',
    endTime: '18:00',
    badge: 'Late Afternoon',
    tag: 'Tea Break',
    iconName: 'Sunset',
  },
  {
    id: 'custom',
    label: 'Custom Calling Interval',
    shortLabel: 'Custom',
    startTime: '',
    endTime: '',
    badge: 'Custom Hours',
    tag: 'User Defined',
    iconName: 'Timer',
  },
] as const;

export function renderSlotIcon(iconName: string, className = "h-4 w-4") {
  switch (iconName) {
    case 'Moon':
      return <Moon className={`${className} text-indigo-500`} />;
    case 'Sunrise':
      return <Sunrise className={`${className} text-amber-500`} />;
    case 'Sun':
      return <Sun className={`${className} text-amber-500`} />;
    case 'Coffee':
      return <Coffee className={`${className} text-amber-600`} />;
    case 'Sunset':
      return <Sunset className={`${className} text-rose-500`} />;
    case 'Timer':
    default:
      return <Timer className={`${className} text-indigo-600`} />;
  }
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

  // Interval-Based Scheduling State
  const [isScheduled, setIsScheduled] = useState(false);
  const [slotDate, setSlotDate] = useState(() => getIstDateKey(0));
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('slider');
  const [selectedSlotPreset, setSelectedSlotPreset] = useState<string>('evening_6_8');
  const [customStartTime, setCustomStartTime] = useState('18:00');
  const [customEndTime, setCustomEndTime] = useState('20:00');

  const [doNotCall, setDoNotCall] = useState(false);
  const [dncReason, setDncReason] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lead) {
      setName(lead.name || '');
      setPhone(lead.phone || '');
      setEmail(lead.email || '');
      setDoNotCall(Boolean(lead.doNotCall));
      setDncReason(lead.dncReason || '');

      const meta = (lead.metadata || {}) as Record<string, any>;
      setRole(meta.role || meta.applied_role || '');
      setCompany(meta.company || '');
      setExperience(meta.experience || meta.portal_experience || '');
      setNotice(meta.notice || meta.portal_notice_period || '');
      setWorkMode(meta.workMode || meta.portal_work_mode || '');
      setCompensation(meta.compensation || meta.portal_expected_ctc || '');

      // Parse interval schedule if already set
      if (meta.scheduledSlotStart && meta.scheduledSlotEnd) {
        setIsScheduled(true);
        setSlotDate(meta.scheduledSlotDate || getIstDateKey(0));
        setCustomStartTime(meta.scheduledSlotStart);
        setCustomEndTime(meta.scheduledSlotEnd);
        const matched = CALLING_SLOT_PRESETS.find(
          p => p.startTime === meta.scheduledSlotStart.slice(0, 5) && p.endTime === meta.scheduledSlotEnd.slice(0, 5)
        );
        if (matched) {
          setSelectedSlotPreset(matched.id);
        } else {
          setSelectedSlotPreset('custom');
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
              setCustomStartTime(matched.startTime);
              setCustomEndTime(matched.endTime);
            } else {
              setSelectedSlotPreset('custom');
              setCustomStartTime(`${hh}:${mm}`);
              setCustomEndTime(`${endHh}:${endMm}`);
            }
          } else {
            setSlotDate(getIstDateKey(0));
            setSelectedSlotPreset('evening_6_8');
            setCustomStartTime('18:00');
            setCustomEndTime('20:00');
          }
        } catch {
          setSlotDate(getIstDateKey(0));
          setSelectedSlotPreset('evening_6_8');
          setCustomStartTime('18:00');
          setCustomEndTime('20:00');
        }
      } else {
        setIsScheduled(false);
        setSlotDate(getIstDateKey(0));
        setSelectedSlotPreset('evening_6_8');
        setCustomStartTime('18:00');
        setCustomEndTime('20:00');
      }
      setError(null);
    }
  }, [lead, isOpen]);

  // Determine current active start and end time
  const activeStartTime =
    selectedSlotPreset === 'custom'
      ? customStartTime
      : CALLING_SLOT_PRESETS.find(p => p.id === selectedSlotPreset)?.startTime || customStartTime || '18:00';

  const activeEndTime =
    selectedSlotPreset === 'custom'
      ? customEndTime
      : CALLING_SLOT_PRESETS.find(p => p.id === selectedSlotPreset)?.endTime || customEndTime || '20:00';

  const matchedPreset = CALLING_SLOT_PRESETS.find(
    p => p.id !== 'custom' && p.startTime === activeStartTime.slice(0, 5) && p.endTime === activeEndTime.slice(0, 5)
  );

  const activeSlotLabel = matchedPreset
    ? matchedPreset.label
    : `Between ${formatTime12h(activeStartTime)} – ${formatTime12h(activeEndTime)}`;

  const normalizedStart = activeStartTime.length === 5 ? `${activeStartTime}:00` : activeStartTime;
  const normalizedEnd = activeEndTime.length === 5 ? `${activeEndTime}:00` : activeEndTime;

  const slotStartIsoPreview = isScheduled && activeStartTime
    ? new Date(`${slotDate}T${normalizedStart}+05:30`).toISOString()
    : undefined;
  const slotEndIsoPreview = isScheduled && activeEndTime
    ? new Date(`${slotDate}T${normalizedEnd}+05:30`).toISOString()
    : undefined;

  const startMins = parseTimeToMinutes(activeStartTime);
  const endMins = parseTimeToMinutes(activeEndTime);
  const isCustomIntervalInvalid = isScheduled && (!activeStartTime || !activeEndTime || endMins <= startMins);

  const applyTimeChange = (newStart: string, newEnd: string, mode?: ScheduleMode) => {
    setCustomStartTime(newStart);
    setCustomEndTime(newEnd);
    setIsScheduled(true);
    const matched = CALLING_SLOT_PRESETS.find(
      p => p.id !== 'custom' && p.startTime === newStart.slice(0, 5) && p.endTime === newEnd.slice(0, 5)
    );
    if (matched) {
      setSelectedSlotPreset(matched.id);
    } else {
      setSelectedSlotPreset('custom');
    }
    if (mode) setScheduleMode(mode);
  };

  const handleSliderStartChange = (newMins: number) => {
    let nextStart = newMins;
    let nextEnd = endMins;
    if (nextStart >= nextEnd) {
      nextEnd = Math.min(1410, nextStart + 15);
    }
    applyTimeChange(minutesToHhmm(nextStart), minutesToHhmm(nextEnd));
  };

  const handleSliderEndChange = (newMins: number) => {
    let nextStart = startMins;
    let nextEnd = newMins;
    if (nextEnd <= nextStart) {
      nextStart = Math.max(360, nextEnd - 15);
    }
    applyTimeChange(minutesToHhmm(nextStart), minutesToHhmm(nextEnd));
  };

  const handleDurationPreset = (durationMins: number) => {
    const nextEnd = Math.min(1439, startMins + durationMins);
    applyTimeChange(minutesToHhmm(startMins), minutesToHhmm(nextEnd));
  };

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
        const normStart = activeStartTime.length === 5 ? `${activeStartTime}:00` : activeStartTime;
        const normEnd = activeEndTime.length === 5 ? `${activeEndTime}:00` : activeEndTime;
        const slotStartIso = new Date(`${slotDate}T${normStart}+05:30`).toISOString();
        const slotEndIso = new Date(`${slotDate}T${normEnd}+05:30`).toISOString();

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
          scheduledSlotStart: activeStartTime.slice(0, 5),
          scheduledSlotEnd: activeEndTime.slice(0, 5),
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
        doNotCall,
        dncReason: doNotCall ? (dncReason.trim() || 'Marked Do Not Call') : null,
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
                Set a preferred calling window (slider, dropdown, HH:mm:ss, or presets) for autonomous dispatch.
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
              <button
                type="button"
                onClick={() => setDatePreset(2)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all ${
                  slotDate === getIstDateKey(2) && isScheduled
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300'
                }`}
              >
                +2 Days
              </button>
              <input
                type="date"
                value={slotDate}
                onChange={e => {
                  setSlotDate(e.target.value);
                  setIsScheduled(true);
                }}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                Customise Calling Window
              </label>
              <span className="text-[10px] text-slate-500 font-medium">
                Choose preferred format
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-200/60 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setScheduleMode('slider');
                  setIsScheduled(true);
                }}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                  scheduleMode === 'slider'
                    ? 'bg-white text-indigo-900 shadow-xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Sliders className="h-3.5 w-3.5 text-indigo-600" />
                <span>Range Slider</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setScheduleMode('dropdown');
                  setIsScheduled(true);
                }}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                  scheduleMode === 'dropdown'
                    ? 'bg-white text-indigo-900 shadow-xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <ListFilter className="h-3.5 w-3.5 text-indigo-600" />
                <span>Dropdown</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setScheduleMode('hhmmss');
                  setIsScheduled(true);
                }}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                  scheduleMode === 'hhmmss'
                    ? 'bg-white text-indigo-900 shadow-xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Timer className="h-3.5 w-3.5 text-indigo-600" />
                <span>HH:MM:SS</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setScheduleMode('presets');
                  setIsScheduled(true);
                }}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                  scheduleMode === 'presets'
                    ? 'bg-white text-indigo-900 shadow-xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>Presets</span>
              </button>
            </div>
          </div>

          {/* Mode 1: Range Slider View */}
          {scheduleMode === 'slider' && (
            <div className="space-y-3 bg-white p-4 rounded-xl border border-indigo-200 shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
                  <span className="flex items-center gap-1.5 text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 font-mono">
                    <Clock className="h-3 w-3 text-indigo-500" /> Start: {formatTime12h(activeStartTime)}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-900 bg-indigo-100/70 px-2.5 py-0.5 rounded-full">
                    Span: {getIntervalDurationLabel(startMins, endMins)}
                  </span>
                  <span className="flex items-center gap-1.5 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 font-mono">
                    End: {formatTime12h(activeEndTime)} <Clock className="h-3 w-3 text-blue-500" />
                  </span>
                </div>

                {/* Visual Timeline Track */}
                <div className="relative w-full h-8 bg-slate-100 rounded-lg border border-slate-200 overflow-hidden select-none">
                  {/* Active Interval Span Fill */}
                  <div
                    className="absolute top-0 bottom-0 bg-gradient-to-r from-indigo-500 via-indigo-600 to-blue-500 rounded-md opacity-90 transition-all duration-150 shadow-sm"
                    style={{
                      left: `${Math.max(0, Math.min(100, ((startMins - 360) / 1020) * 100))}%`,
                      width: `${Math.max(2, Math.min(100, ((endMins - startMins) / 1020) * 100))}%`,
                    }}
                  />
                  {/* Hour markers */}
                  <div className="absolute inset-0 flex items-center justify-between px-2 text-[9px] font-bold text-slate-500 pointer-events-none z-10">
                    <span className={startMins < 420 ? 'text-white drop-shadow-xs' : ''}>6 AM</span>
                    <span>9 AM</span>
                    <span>12 PM</span>
                    <span>3 PM</span>
                    <span>6 PM</span>
                    <span>9 PM</span>
                    <span className={endMins > 1320 ? 'text-white drop-shadow-xs' : ''}>11 PM</span>
                  </div>
                </div>
              </div>

              {/* Dual Range Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-700">
                    <span>Start Time (Slide)</span>
                    <span className="font-mono font-bold text-indigo-600">{formatTime12h(activeStartTime)}</span>
                  </div>
                  <input
                    type="range"
                    min={360}
                    max={1350}
                    step={15}
                    value={startMins}
                    onChange={e => handleSliderStartChange(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                    <span>06:00 AM</span>
                    <span>10:30 PM</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-700">
                    <span>End Time (Slide)</span>
                    <span className="font-mono font-bold text-blue-600">{formatTime12h(activeEndTime)}</span>
                  </div>
                  <input
                    type="range"
                    min={375}
                    max={1380}
                    step={15}
                    value={endMins}
                    onChange={e => handleSliderEndChange(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                    <span>06:15 AM</span>
                    <span>11:00 PM</span>
                  </div>
                </div>
              </div>

              {/* Quick Duration Extenders */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">Quick Span:</span>
                {DURATION_PRESETS.map(dp => {
                  const isCurrent = endMins - startMins === dp.minutes;
                  return (
                    <button
                      key={dp.minutes}
                      type="button"
                      onClick={() => handleDurationPreset(dp.minutes)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                        isCurrent
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-indigo-50 hover:border-indigo-200'
                      }`}
                    >
                      {dp.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mode 2: Dropdown View */}
          {scheduleMode === 'dropdown' && (
            <div className="space-y-3 bg-white p-4 rounded-xl border border-indigo-200 shadow-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Start Time (IST)
                  </label>
                  <select
                    value={activeStartTime.slice(0, 5)}
                    onChange={e => {
                      const newStart = e.target.value;
                      const newStartMins = parseTimeToMinutes(newStart);
                      let newEndMins = endMins;
                      if (newEndMins <= newStartMins) {
                        newEndMins = Math.min(1439, newStartMins + 120);
                      }
                      applyTimeChange(newStart, minutesToHhmm(newEndMins), 'dropdown');
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  >
                    {DROPDOWN_TIME_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    End Time (IST)
                  </label>
                  <select
                    value={activeEndTime.slice(0, 5)}
                    onChange={e => applyTimeChange(activeStartTime, e.target.value, 'dropdown')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  >
                    {DROPDOWN_TIME_OPTIONS.filter(opt => opt.minutes > startMins).map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label} (+{getIntervalDurationLabel(startMins, opt.minutes)})
                      </option>
                    ))}
                    {!DROPDOWN_TIME_OPTIONS.some(o => o.value === activeEndTime.slice(0, 5)) && (
                      <option value={activeEndTime.slice(0, 5)}>
                        {formatTime12h(activeEndTime)} ({activeEndTime.slice(0, 5)})
                      </option>
                    )}
                  </select>
                </div>
              </div>

              {/* Quick Duration Preset Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">Duration:</span>
                {DURATION_PRESETS.map(dp => {
                  const isCurrent = endMins - startMins === dp.minutes;
                  return (
                    <button
                      key={dp.minutes}
                      type="button"
                      onClick={() => handleDurationPreset(dp.minutes)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                        isCurrent
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-indigo-50 hover:border-indigo-200'
                      }`}
                    >
                      {dp.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mode 3: HH:MM:SS Precision View */}
          {scheduleMode === 'hhmmss' && (() => {
            const startParts = parseTimeParts(activeStartTime);
            const endParts = parseTimeParts(activeEndTime);

            const handleStartPartChange = (field: 'h12' | 'm' | 's' | 'period', val: any) => {
              const current = parseTimeParts(activeStartTime);
              const updated = { ...current, [field]: val };
              const newTimeStr = timePartsToTimeStr(updated.h12, updated.m, updated.s, updated.period, true);
              applyTimeChange(newTimeStr, activeEndTime, 'hhmmss');
            };

            const handleEndPartChange = (field: 'h12' | 'm' | 's' | 'period', val: any) => {
              const current = parseTimeParts(activeEndTime);
              const updated = { ...current, [field]: val };
              const newTimeStr = timePartsToTimeStr(updated.h12, updated.m, updated.s, updated.period, true);
              applyTimeChange(activeStartTime, newTimeStr, 'hhmmss');
            };

            return (
              <div className="space-y-3 bg-white p-4 rounded-xl border border-indigo-200 shadow-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Start Time Precision Block */}
                  <div className="space-y-2 p-3 bg-slate-50/70 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-indigo-600" /> Start Time (HH:MM:SS)
                      </span>
                      <span className="text-[10px] font-mono text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">
                        {activeStartTime} IST
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {/* HH */}
                      <div className="flex-1 text-center">
                        <input
                          type="number"
                          min={1}
                          max={12}
                          value={startParts.h12}
                          onChange={e => {
                            const val = Math.max(1, Math.min(12, parseInt(e.target.value, 10) || 1));
                            handleStartPartChange('h12', val);
                          }}
                          className="w-full text-center px-1 py-1.5 font-mono text-sm font-bold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="text-[9px] text-slate-400 font-semibold uppercase">HH</span>
                      </div>
                      <span className="font-bold text-slate-400 text-sm">:</span>
                      {/* MM */}
                      <div className="flex-1 text-center">
                        <input
                          type="number"
                          min={0}
                          max={59}
                          value={startParts.m}
                          onChange={e => {
                            const val = Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0));
                            handleStartPartChange('m', val);
                          }}
                          className="w-full text-center px-1 py-1.5 font-mono text-sm font-bold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="text-[9px] text-slate-400 font-semibold uppercase">MM</span>
                      </div>
                      <span className="font-bold text-slate-400 text-sm">:</span>
                      {/* SS */}
                      <div className="flex-1 text-center">
                        <input
                          type="number"
                          min={0}
                          max={59}
                          value={startParts.s}
                          onChange={e => {
                            const val = Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0));
                            handleStartPartChange('s', val);
                          }}
                          className="w-full text-center px-1 py-1.5 font-mono text-sm font-bold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="text-[9px] text-slate-400 font-semibold uppercase">SS</span>
                      </div>
                      {/* AM / PM Toggle */}
                      <button
                        type="button"
                        onClick={() => handleStartPartChange('period', startParts.period === 'AM' ? 'PM' : 'AM')}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold border bg-indigo-600 text-white border-indigo-600 shadow-xs hover:bg-indigo-700"
                      >
                        {startParts.period}
                      </button>
                    </div>
                  </div>

                  {/* End Time Precision Block */}
                  <div className="space-y-2 p-3 bg-slate-50/70 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-blue-600" /> End Time (HH:MM:SS)
                      </span>
                      <span className="text-[10px] font-mono text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                        {activeEndTime} IST
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {/* HH */}
                      <div className="flex-1 text-center">
                        <input
                          type="number"
                          min={1}
                          max={12}
                          value={endParts.h12}
                          onChange={e => {
                            const val = Math.max(1, Math.min(12, parseInt(e.target.value, 10) || 1));
                            handleEndPartChange('h12', val);
                          }}
                          className="w-full text-center px-1 py-1.5 font-mono text-sm font-bold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-[9px] text-slate-400 font-semibold uppercase">HH</span>
                      </div>
                      <span className="font-bold text-slate-400 text-sm">:</span>
                      {/* MM */}
                      <div className="flex-1 text-center">
                        <input
                          type="number"
                          min={0}
                          max={59}
                          value={endParts.m}
                          onChange={e => {
                            const val = Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0));
                            handleEndPartChange('m', val);
                          }}
                          className="w-full text-center px-1 py-1.5 font-mono text-sm font-bold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-[9px] text-slate-400 font-semibold uppercase">MM</span>
                      </div>
                      <span className="font-bold text-slate-400 text-sm">:</span>
                      {/* SS */}
                      <div className="flex-1 text-center">
                        <input
                          type="number"
                          min={0}
                          max={59}
                          value={endParts.s}
                          onChange={e => {
                            const val = Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0));
                            handleEndPartChange('s', val);
                          }}
                          className="w-full text-center px-1 py-1.5 font-mono text-sm font-bold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-[9px] text-slate-400 font-semibold uppercase">SS</span>
                      </div>
                      {/* AM / PM Toggle */}
                      <button
                        type="button"
                        onClick={() => handleEndPartChange('period', endParts.period === 'AM' ? 'PM' : 'AM')}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold border bg-blue-600 text-white border-blue-600 shadow-xs hover:bg-blue-700"
                      >
                        {endParts.period}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Precision Helpers */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      applyTimeChange(activeStartTime.slice(0, 5), activeEndTime.slice(0, 5), 'hhmmss');
                    }}
                    className="text-[11px] font-semibold text-slate-600 hover:text-indigo-600 bg-slate-100 px-2.5 py-1 rounded-md flex items-center gap-1"
                  >
                    <RotateCcw className="h-3 w-3" /> Reset Seconds (:00)
                  </button>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Add to End:</span>
                    <button
                      type="button"
                      onClick={() => handleDurationPreset((endMins - startMins) + 15)}
                      className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 hover:bg-indigo-50 text-slate-700 border border-slate-200"
                    >
                      +15m
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDurationPreset((endMins - startMins) + 30)}
                      className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 hover:bg-indigo-50 text-slate-700 border border-slate-200"
                    >
                      +30m
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDurationPreset((endMins - startMins) + 60)}
                      className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 hover:bg-indigo-50 text-slate-700 border border-slate-200"
                    >
                      +1h
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Mode 4: Presets View */}
          {scheduleMode === 'presets' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CALLING_SLOT_PRESETS.map(slot => {
                const isSelected = isScheduled && selectedSlotPreset === slot.id;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => {
                      if (slot.id === 'custom') {
                        setSelectedSlotPreset('custom');
                        setScheduleMode('slider');
                      } else {
                        setSelectedSlotPreset(slot.id);
                        setCustomStartTime(slot.startTime);
                        setCustomEndTime(slot.endTime);
                      }
                      setIsScheduled(true);
                    }}
                    className={`flex items-start justify-between p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 shadow-xs ring-1 ring-indigo-500'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                          {renderSlotIcon(slot.iconName, "h-4 w-4")}
                        </div>
                        <span className={`text-xs font-bold ${isSelected ? 'text-indigo-950' : 'text-slate-900'}`}>
                          {slot.shortLabel}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-1 font-medium">
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
          )}

          {/* Live Schedule Confirmation & Interval Status Banner */}
          {isScheduled ? (
            <div
              className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
                isCustomIntervalInvalid
                  ? 'bg-rose-50 border-rose-300 text-rose-950'
                  : inActiveSlotNow
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-xs'
                  : slotDate === todayIstKey && endMins < ((new Date(Date.now() + 5.5 * 3600000).getUTCHours()) * 60 + (new Date(Date.now() + 5.5 * 3600000).getUTCMinutes()))
                  ? 'bg-amber-50 border-amber-300 text-amber-950'
                  : 'bg-indigo-50/70 border-indigo-200 text-indigo-950'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    isCustomIntervalInvalid
                      ? 'bg-rose-200 text-rose-800'
                      : inActiveSlotNow
                      ? 'bg-emerald-200 text-emerald-800'
                      : slotDate === todayIstKey && endMins < ((new Date(Date.now() + 5.5 * 3600000).getUTCHours()) * 60 + (new Date(Date.now() + 5.5 * 3600000).getUTCMinutes()))
                      ? 'bg-amber-200 text-amber-800'
                      : 'bg-indigo-200 text-indigo-800'
                  }`}
                >
                  {isCustomIntervalInvalid ? (
                    <AlertTriangle className="h-5 w-5" />
                  ) : inActiveSlotNow ? (
                    <span className="relative flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-600"></span>
                    </span>
                  ) : slotDate === todayIstKey && endMins < ((new Date(Date.now() + 5.5 * 3600000).getUTCHours()) * 60 + (new Date(Date.now() + 5.5 * 3600000).getUTCMinutes())) ? (
                    <AlertTriangle className="h-5 w-5" />
                  ) : (
                    <Clock className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold flex items-center gap-2">
                    <span>
                      {slotDate === todayIstKey ? 'Today' : slotDate === tomorrowIstKey ? 'Tomorrow' : slotDate} ({activeSlotLabel})
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/5 font-semibold">
                      {getIntervalDurationLabel(startMins, endMins)}
                    </span>
                  </div>
                  <div className="text-[11px] mt-0.5">
                    {isCustomIntervalInvalid ? (
                      <span className="font-semibold text-rose-700">
                        End Time must be strictly later than Start Time.
                      </span>
                    ) : inActiveSlotNow ? (
                      <span className="font-semibold text-emerald-700 flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        <span>Active Calling Window Right Now • Eligible for immediate autonomous dispatch</span>
                      </span>
                    ) : slotDate === todayIstKey && endMins < ((new Date(Date.now() + 5.5 * 3600000).getUTCHours()) * 60 + (new Date(Date.now() + 5.5 * 3600000).getUTCMinutes())) ? (
                      <span className="text-amber-800 font-medium">
                        Window ended earlier today. Roll forward to tomorrow for next dispatch.
                      </span>
                    ) : (
                      <span className="text-slate-600">
                        Scheduled for automated voice outreach during this interval.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {slotDate === todayIstKey && endMins < ((new Date(Date.now() + 5.5 * 3600000).getUTCHours()) * 60 + (new Date(Date.now() + 5.5 * 3600000).getUTCMinutes())) && !isCustomIntervalInvalid && (
                <button
                  type="button"
                  onClick={() => setDatePreset(1)}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-700 shadow-xs shrink-0 flex items-center gap-1.5"
                >
                  <Calendar className="h-3.5 w-3.5" /> Roll to Tomorrow
                </button>
              )}
            </div>
          ) : (
            <div className="text-center p-3 rounded-lg border border-dashed border-slate-300 bg-white/60 text-xs text-slate-500">
              No calling window set. Candidate will remain in regular outbound queue. Click any mode above to schedule.
            </div>
          )}
        </div>

        {/* Section 4: Compliance / Do Not Call */}
        <div
          className={`p-3.5 rounded-xl border transition-colors ${
            doNotCall ? 'bg-rose-50/70 border-rose-200' : 'bg-slate-50/70 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Ban className={`h-4 w-4 ${doNotCall ? 'text-rose-600' : 'text-slate-400'}`} />
              <div>
                <div className="text-xs font-bold text-slate-800">Do Not Call (DNC) Compliance Lock</div>
                <div className="text-[11px] text-slate-500">
                  Blocks all autonomous scheduler dispatches, campaign dials, and manual test calls.
                </div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={doNotCall}
                onChange={e => setDoNotCall(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600" />
            </label>
          </div>
          {doNotCall && (
            <div className="mt-2.5">
              <Input
                value={dncReason}
                onChange={e => setDncReason(e.target.value)}
                placeholder="Reason (e.g., Candidate opted out, Offer accepted elsewhere)"
              />
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
