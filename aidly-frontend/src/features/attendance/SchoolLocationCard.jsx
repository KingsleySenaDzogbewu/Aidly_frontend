import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from 'react-leaflet';
import { SchoolApi } from '../../api/endpoints';
import { Button, Card, Field, Icons, Input, useToast } from '../../components/ui';
import { pinIcon, START_COLOR } from '../routes/pins';
import { formatLatLng } from '../../utils/coordinates';
import { formatDistance, getCurrentPosition } from './attendanceUtils';

const DEFAULT_CENTER = [5.6037, -0.187];
const MIN_RADIUS = 20;
const MAX_RADIUS = 2000;

function ClickToPlace({ onPick }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

// Bring a point into view when it's set from outside the map (current location).
function Follow({ point }) {
  const map = useMap();
  useEffect(() => {
    if (point) map.setView([point.lat, point.lng], Math.max(map.getZoom(), 16));
  }, [point, map]);
  return null;
}

/**
 * Admin: where the school is and how close a check-in must be.
 *  - school: the admin's school (GET /schools/{id})
 *  - onSaved(school): the updated school
 */
export default function SchoolLocationCard({ school, onSaved }) {
  const toast = useToast();
  const isSet = school?.latitude != null && school?.longitude != null;
  const [open, setOpen] = useState(!isSet);
  const [point, setPoint] = useState(isSet ? { lat: school.latitude, lng: school.longitude } : null);
  const [focus, setFocus] = useState(null);
  const [radius, setRadius] = useState(String(school?.attendanceRadiusMeters ?? 150));
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  const radiusNum = Number(radius);
  const radiusError = !Number.isFinite(radiusNum) || radiusNum < MIN_RADIUS || radiusNum > MAX_RADIUS
    ? `Between ${MIN_RADIUS} and ${MAX_RADIUS} metres.` : '';

  const useCurrent = async () => {
    setLocating(true);
    try {
      const pos = await getCurrentPosition();
      const p = { lat: pos.latitude, lng: pos.longitude };
      setPoint(p);
      setFocus(p);
      if (pos.accuracyMeters > 50) toast.info(`Your phone placed you within about ${formatDistance(pos.accuracyMeters)}. Drag the pin if it’s off.`);
    } catch (err) { toast.error(err.message); }
    finally { setLocating(false); }
  };

  const save = async () => {
    if (!point || radiusError) return;
    setSaving(true);
    try {
      const updated = await SchoolApi.setMyLocation({
        latitude: Number(point.lat.toFixed(6)),
        longitude: Number(point.lng.toFixed(6)),
        attendanceRadiusMeters: Math.round(radiusNum),
      });
      toast.success('School location saved - students and instructors can check in now');
      onSaved(updated);
      setOpen(false);
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  if (!open) {
    return (
      <Card tight>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icons.IconPin size={18} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>School location is set</div>
              <div className="att-muted">
                Check-ins count within {formatDistance(school.attendanceRadiusMeters)} of {formatLatLng({ lat: school.latitude, lng: school.longitude })}
                {school.timeZone ? ` · ${school.timeZone}` : ''}
              </div>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Change</Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="att-card-title">School location</div>
      <p className="att-muted" style={{ margin: '4px 0 14px' }}>
        Click the map where the school is (or use your current location while you’re there). Check-ins inside the circle count as present.
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <Button size="sm" variant="outline" loading={locating} onClick={useCurrent}>
          <Icons.IconPin size={14} /> Use my current location
        </Button>
        <span className="att-muted" style={{ alignSelf: 'center' }}>
          {point ? `Pin: ${formatLatLng(point)}` : 'No pin yet'}
        </span>
      </div>
      <div className="att-map">
        <MapContainer center={point ? [point.lat, point.lng] : DEFAULT_CENTER} zoom={point ? 16 : 12} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false} doubleClickZoom={false}>
          <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <ClickToPlace onPick={setPoint} />
          <Follow point={focus} />
          {point && (
            <>
              {!radiusError && <Circle center={[point.lat, point.lng]} radius={radiusNum} pathOptions={{ color: START_COLOR, weight: 2, fillOpacity: 0.12 }} />}
              <Marker
                position={[point.lat, point.lng]}
                draggable
                icon={pinIcon('School', START_COLOR)}
                eventHandlers={{ dragend: (e) => { const { lat, lng } = e.target.getLatLng(); setPoint({ lat, lng }); } }}
              />
            </>
          )}
        </MapContainer>
      </div>
      <div className="att-location-foot">
        <Field label="Check-in radius (metres)" hint="How close to the pin a check-in must be. 150 m suits most schools." error={radiusError || undefined}>
          <Input type="number" min={MIN_RADIUS} max={MAX_RADIUS} step={10} value={radius} onChange={(e) => setRadius(e.target.value)} />
        </Field>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          {isSet && <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>}
          <Button loading={saving} disabled={!point || !!radiusError} onClick={save}>Save location</Button>
        </div>
      </div>
    </Card>
  );
}
