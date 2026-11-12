export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) {
    return `${mins}m ${secs}s`;
  }
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}h ${remMins}m`;
}

export function formatCurrency(amount: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function formatShortDate(dateString: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-IN').format(num);
}

export function formatPhoneNumber(phone: string): string {
  if (!phone) return '-';
  const cleaned = ('' + phone).replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Returns YYYY-MM-DD in IST (+05:30), avoiding UTC midnight day shifts.
 */
export function getIstDateKey(daysOffset = 0, baseDate = new Date()): string {
  const ist = new Date(baseDate.getTime() + IST_OFFSET_MS);
  if (daysOffset !== 0) {
    ist.setUTCDate(ist.getUTCDate() + daysOffset);
  }
  return ist.toISOString().slice(0, 10);
}

/**
 * Converts a 24h "HH:mm" string (e.g. "18:00") to 12h format (e.g. "6:00 PM").
 */
export function formatTime12h(hhmm: string): string {
  if (!hhmm || !hhmm.includes(':')) return hhmm;
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * Checks whether the current timestamp falls inside a lead's scheduled interval.
 */
export function isLeadScheduleActive(meta?: Record<string, any> | null, nowMs = Date.now()): boolean {
  if (!meta?.scheduledCallTime) return false;
  const start = new Date(meta.scheduledCallTime).getTime();
  if (Number.isNaN(start)) return false;
  const end = meta.scheduledWindowEnd
    ? new Date(meta.scheduledWindowEnd).getTime()
    : start + 2 * 3600000;
  if (Number.isNaN(end)) return false;
  return nowMs >= start && nowMs <= end;
}


