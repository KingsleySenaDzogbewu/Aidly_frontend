import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import { pinIcon, START_COLOR, DESTINATION_COLOR } from './pins';

// Greater Accra - where the school operates - when there's nothing better to centre on.
const DEFAULT_CENTER = [5.6037, -0.187];

function ClickToPlace({ onPick }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

// When a point is typed in (not clicked), bring it into view - and once both
// pins exist, fit them both so neither ends up off-screen.
function FollowPoint({ point, start, destination }) {
  const map = useMap();
  useEffect(() => {
    if (!point) return;
    if (start && destination) {
      map.fitBounds([[start.lat, start.lng], [destination.lat, destination.lng]], { padding: [48, 48], maxZoom: 16 });
    } else {
      map.setView([point.lat, point.lng], Math.max(map.getZoom(), 14));
    }
    // Only re-run when a new point is typed, not on every drag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [point, map]);
  return null;
}

/**
 * Map for choosing a route's start and destination: click to drop the pin for
 * the active point, drag pins to adjust.
 *  - active: 'start' | 'destination' - which pin the next click places
 *  - onChange(which, { lat, lng })
 *  - focus: a point to bring into view (set when coordinates are typed)
 */
export default function RoutePointsPicker({ start, destination, active, onChange, focus, center, height = 340 }) {
  const dragHandlers = (which) => ({
    dragend: (e) => {
      const { lat, lng } = e.target.getLatLng();
      onChange(which, { lat, lng });
    },
  });

  return (
    <div style={{ height, borderRadius: 10, overflow: 'hidden', cursor: 'crosshair', border: '1px solid var(--border)' }}>
      <MapContainer center={center || DEFAULT_CENTER} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false} doubleClickZoom={false}>
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ClickToPlace onPick={(p) => onChange(active, p)} />
        <FollowPoint point={focus} start={start} destination={destination} />
        {start && (
          <Marker position={[start.lat, start.lng]} draggable icon={pinIcon('Start', START_COLOR)} eventHandlers={dragHandlers('start')} />
        )}
        {destination && (
          <Marker position={[destination.lat, destination.lng]} draggable icon={pinIcon('Destination', DESTINATION_COLOR)} eventHandlers={dragHandlers('destination')} />
        )}
      </MapContainer>
    </div>
  );
}
