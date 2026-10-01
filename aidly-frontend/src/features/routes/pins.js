import L from 'leaflet';

export const START_COLOR = '#2f5d3a';
export const DESTINATION_COLOR = '#8a3a2f';

// Labels are instructor-typed text going into raw HTML - escape them so a
// location name can never inject markup/script into viewers' browsers.
function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

// Pill-shaped map pin with a text label (Start / Destination / place name).
export function pinIcon(label, color) {
  return L.divIcon({
    className: '',
    html: `<div style="background:${color};color:#fff;font-size:11px;font-weight:700;padding:3px 8px;border-radius:100px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.25);transform:translate(-4px,-30px);">${escapeHtml(label)}</div>`,
    iconAnchor: [0, 0],
  });
}
