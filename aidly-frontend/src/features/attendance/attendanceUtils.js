// Shared wording and helpers for the attendance screens.

export const DEFAULT_TIME_ZONE = 'Africa/Accra';

export const STATUS_LABELS = {
  PRESENT: 'Present',
  PENDING_CONFIRMATION: 'Awaiting confirmation',
  LATE: 'Late',
  ABSENT: 'Absent',
  NOT_CHECKED_IN: 'Not checked in',
};

export const LESSON_TYPE_LABELS = { PRACTICAL: 'Practical', THEORY: 'Theory' };

// Why a student's check-in needs an instructor to confirm it. `self` words it
// for the student ("you're about 420 m from school").
export function confirmationReasonText(entry, { self = false } = {}) {
  const distance = entry?.distanceMeters != null ? formatDistance(entry.distanceMeters) : null;
  switch (entry?.confirmationReason) {
    case 'OUTSIDE_SCHOOL_AREA':
      if (self) return distance ? `you’re about ${distance} from school` : 'you’re outside the school area';
      return distance ? `about ${distance} from school` : 'outside the school area';
    case 'LOCATION_NOT_PRECISE':
      return self ? 'your phone’s location wasn’t precise enough' : 'the phone’s location wasn’t precise enough';
    case 'SCHOOL_LOCATION_NOT_SET':
      return 'the school’s location isn’t set yet';
    default:
      return null;
  }
}

export function formatDistance(meters) {
  if (meters == null) return '';
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

// Today's date (YYYY-MM-DD) as the school sees it.
export function todayIn(timeZone = DEFAULT_TIME_ZONE) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

// 'YYYY-MM-DD' plus/minus whole days.
export function addDays(dateOnly, days) {
  const d = new Date(`${dateOnly}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Read a plain date without the browser shifting it by time zone.
export function fmtPlainDate(dateOnly, opts = { weekday: 'short', day: 'numeric', month: 'short' }) {
  if (!dateOnly) return '—';
  return new Date(`${dateOnly}T12:00:00Z`).toLocaleDateString(undefined, { ...opts, timeZone: 'UTC' });
}

// The phone's current position, as precisely as it can. Rejects with a
// message a person can act on.
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('This browser can’t share your location. Try another browser or your phone.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracyMeters: Math.round(pos.coords.accuracy),
      }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error('Location access is blocked. Allow location for this site in your browser settings, then try again.'));
        } else if (err.code === err.TIMEOUT) {
          reject(new Error('Finding your location took too long. Move somewhere with a clearer view of the sky and try again.'));
        } else {
          reject(new Error('Your location couldn’t be found. Check that location is turned on, then try again.'));
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  });
}

// Save a downloaded file (Blob) under the given name.
export function saveBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
