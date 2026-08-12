import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';

function pinIcon(label, color) {
  return L.divIcon({
    className: '',
    html: `<div style="background:${color};color:#fff;font-size:11px;font-weight:700;padding:3px 8px;border-radius:100px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.25);transform:translate(-4px,-30px);">${label}</div>`,
    iconAnchor: [0, 0],
  });
}

export default function RouteMap({ start, destination, path, height = 260 }) {
  const hasValid = start && destination
    && Number.isFinite(start.lat) && Number.isFinite(start.lng)
    && Number.isFinite(destination.lat) && Number.isFinite(destination.lng);

  if (!hasValid) {
    return (
      <div style={{ height, borderRadius: 10, background: 'var(--surface-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        No coordinates to display.
      </div>
    );
  }

  const startPos = [start.lat, start.lng];
  const destPos = [destination.lat, destination.lng];
  const line = (path && path.length > 1) ? path.map((p) => [p.latitude, p.longitude]) : [startPos, destPos];
  const bounds = L.latLngBounds(line);

  return (
    <div style={{ height, borderRadius: 10, overflow: 'hidden' }}>
      <MapContainer bounds={bounds} boundsOptions={{ padding: [36, 36] }} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={startPos} icon={pinIcon(start.label || 'Start', '#2f5d3a')} />
        <Marker position={destPos} icon={pinIcon(destination.label || 'Destination', '#8a3a2f')} />
        <Polyline positions={line} pathOptions={{ color: '#2f5d3a', weight: 4, opacity: 0.85, dashArray: '1,8' }} />
      </MapContainer>
    </div>
  );
}
