export function fmtDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function fmtDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function fmtTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
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
  const d = new Date(iso);
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
