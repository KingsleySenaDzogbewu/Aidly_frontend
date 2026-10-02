// The backend sends times like "2026-10-02T02:23:10.683234974" (up to 9 decimal
// places on the seconds). Safari can refuse to parse more than 3, so trim them.
export function toDate(value) {
  if (value instanceof Date) return value;
  if (typeof value === 'string') return new Date(value.replace(/(\.\d{3})\d+/, '$1'));
  return new Date(value);
}

export function fmtDateTime(value) {
  if (!value) return '—';
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function fmtDate(value) {
  if (!value) return '—';
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function fmtTime(value) {
  if (!value) return '';
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "Today", "Yesterday", "Mon 28 Sep" - for headings between chat messages. */
export function fmtDayLabel(value) {
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return '';
  const days = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', ...(d.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) });
}

/** Time if today, "Yesterday", otherwise a short date - for inbox rows. */
export function fmtShortWhen(value) {
  if (!value) return '';
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return '';
  const days = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  if (days === 0) return fmtTime(d);
  if (days === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function fmtWeekday(dateOnly) {
  if (!dateOnly) return '';
  const d = new Date(`${dateOnly}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateOnly;
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function humanize(value) {
  if (!value) return '';
  return value.split('_').map((w) => w[0] + w.slice(1).toLowerCase()).join(' ');
}

export function toLocalDateTimeInput(iso) {
  // datetime-local input needs "YYYY-MM-DDTHH:mm"
  if (!iso) return '';
  const d = toDate(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalDateTimeInput(value) {
  // backend wants "YYYY-MM-DDTHH:mm:ss" with no timezone suffix
  if (!value) return value;
  return value.length === 16 ? `${value}:00` : value;
}

export function initials(firstName, lastName, email) {
  if (firstName || lastName) return `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase();
  if (email) return email.slice(0, 2).toUpperCase();
  return '?';
}
