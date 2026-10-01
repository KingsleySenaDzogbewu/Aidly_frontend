// Reads coordinates the way people actually copy them: decimal ("5.70625"),
// degrees/minutes/seconds ("5°42'22.5\"N"), or a whole pair pasted from a
// map ("5.70625, -0.08222" or "5°42'22.5\"N 0°04'56.0\"W").

const ALLOWED = /^[-+\d.\s°º'′’"″”NSEW]+$/;

/** One coordinate -> decimal degrees, or NaN if it can't be read. */
export function parseCoordinate(text) {
  const s = String(text ?? '').trim().toUpperCase();
  if (!s || !ALLOWED.test(s)) return NaN;
  const nums = s.match(/\d+(?:\.\d+)?/g);
  const hemispheres = s.match(/[NSEW]/g) || [];
  if (!nums || nums.length > 3 || hemispheres.length > 1) return NaN;
  const [deg, min = 0, sec = 0] = nums.map(Number);
  if (min >= 60 || sec >= 60) return NaN;
  let value = deg + min / 60 + sec / 3600;
  if (s.startsWith('-') || hemispheres[0] === 'S' || hemispheres[0] === 'W') value = -value;
  return value;
}

/** "lat, lng" (any of the formats above) -> { lat, lng }, or null if it can't be read. */
export function parseLatLng(text) {
  const s = String(text ?? '').trim().toUpperCase();
  if (!s) return null;
  let parts;
  const dms = s.match(/^(.+?[NS])[\s,;]+(.+?[EW])$/);
  if (dms) parts = [dms[1], dms[2]];
  else if (s.includes(',')) parts = s.split(',');
  else parts = s.split(/\s+/);
  if (parts.length !== 2) return null;
  const lat = parseCoordinate(parts[0]);
  const lng = parseCoordinate(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/** { lat, lng } -> "5.70625, -0.08222" (about 1 m precision). */
export function formatLatLng(point) {
  if (!point) return '';
  return `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
}
