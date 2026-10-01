import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/ui';
import { BookingApi, VehicleApi, LessonRouteApi } from '../api/endpoints';
import { Button, Card, Badge, Field, Input, Textarea, Select, Tabs, EmptyState, SkeletonList, Icons, Reveal, StudentPicker } from '../components/ui';
import { fmtDateTime, fmtTime, fmtWeekday, fromLocalDateTimeInput } from '../utils/format';
import useIsMobile from '../hooks/useIsMobile';

const BOOKING_TYPES = ['ROAD_LESSON', 'THEORY_SESSION', 'DRIVING_ASSESSMENT', 'PRACTICE_TEST'];

const emptyForm = { studentId: '', instructorId: '', vehicleId: '', scheduledAt: '', durationMinutes: 60, bookingType: 'ROAD_LESSON', notes: '' };

// A confirmed lesson whose time has passed but hasn't been marked complete yet.
function needsCompleting(b) {
  const end = b.endAt || b.scheduledAt;
  return b.status === 'CONFIRMED' && !!end && new Date(end).getTime() < Date.now();
}

function NeedsCompletingTag() {
  return <Badge variant="warning">Needs completing</Badge>;
}

export default function BookingsPage() {
  const { user, isAdmin, isInstructor, isStudent } = useAuth();
  const toast = useToast();
  const canManage = isAdmin || isInstructor;
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  // Students: which of their bookings have a planned route (bookingId -> routeId),
  // so those lessons can offer "View route".
  const [routeByBooking, setRouteByBooking] = useState({});
  useEffect(() => {
    if (!isStudent) return;
    LessonRouteApi.mine()
      .then((res) => {
        const map = {};
        (res?.content || res || []).forEach((r) => { map[r.bookingId] = r.id; });
        setRouteByBooking(map);
      })
      .catch(() => {});
  }, [isStudent]);

  const viewRouteButton = (b, style) => (isStudent && routeByBooking[b.id] ? (
    <Button size="sm" variant="outline" style={style} onClick={() => navigate(`/routes?route=${routeByBooking[b.id]}`)}>
      <Icons.IconMap size={13} /> View route
    </Button>
  ) : null);

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('calendar');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm, instructorId: user?.instructorProfileId || '' });
  const [creating, setCreating] = useState(false);
  const [vehicles, setVehicles] = useState([]);

  const [lookupStudentId, setLookupStudentId] = useState('');
  const [lookupInstructorId, setLookupInstructorId] = useState('');

  const loadForStudent = async (id) => {
    if (!id) return;
    setLoading(true);
    try { setBookings(await BookingApi.listByStudent(id) || []); }
    catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const loadForInstructor = async (id) => {
    if (!id) return;
    setLoading(true);
    // Include the last 30 days too - a lesson can only be marked complete
    // after it happens, so it must still be listed once its start time passes.
    const now = new Date();
    const from = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 19);
    const to = new Date(now.getTime() + 30 * 86400000).toISOString().slice(0, 19);
    try { setBookings(await BookingApi.listByInstructor(id, from, to) || []); }
    catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const loadMine = () => {
    if (!user) return;
    if (isStudent) loadForStudent(user.studentProfileId);
    else if (isInstructor) loadForInstructor(user.instructorProfileId);
    else setLoading(false);
  };

  useEffect(() => { loadMine(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

  useEffect(() => {
    if (user?.schoolId) VehicleApi.listBySchool(user.schoolId).then((v) => setVehicles((v || []).filter((x) => x.status === 'AVAILABLE'))).catch(() => {});
  }, [user?.schoolId]);

  const createBooking = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await BookingApi.create({
        studentId: Number(form.studentId),
        instructorId: Number(form.instructorId),
        vehicleId: form.vehicleId ? Number(form.vehicleId) : null,
        scheduledAt: fromLocalDateTimeInput(form.scheduledAt),
        durationMinutes: Number(form.durationMinutes),
        bookingType: form.bookingType,
        notes: form.notes || null,
      });
      toast.success('Booking created');
      setShowForm(false);
      setForm({ ...emptyForm, instructorId: user?.instructorProfileId || '' });
      loadMine();
    } catch (err) { toast.error(err.message); }
    finally { setCreating(false); }
  };

  const doAction = async (id, action) => {
    try {
      await BookingApi[action](id);
      toast.success('Booking updated');
      loadMine();
    } catch (err) { toast.error(err.message); }
  };

  const dayGroups = useMemo(() => {
    const rows = [...bookings].sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
    const map = new Map();
    rows.forEach((b) => {
      const d = b.scheduledAt ? b.scheduledAt.slice(0, 10) : 'Unscheduled';
      if (!map.has(d)) map.set(d, []);
      map.get(d).push(b);
    });
    return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
  }, [bookings]);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Bookings</h1>
          <p className="page-subtitle">Practical lesson scheduling.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Tabs value={view} onChange={setView} options={[{ value: 'calendar', label: 'Calendar' }, { value: 'list', label: 'List' }]} />
          {canManage && (
            <Button onClick={() => setShowForm((s) => !s)}>
              <Icons.IconPlus size={14} /> {showForm ? 'Cancel' : 'New booking'}
            </Button>
          )}
        </div>
      </div>

      {isAdmin && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
          <Input size="sm" placeholder="Student profile ID" value={lookupStudentId} onChange={(e) => setLookupStudentId(e.target.value)} style={{ width: 170 }} />
          <Button size="sm" variant="outline" onClick={() => loadForStudent(lookupStudentId)}>Load student&rsquo;s bookings</Button>
          <Input size="sm" placeholder="Instructor profile ID" value={lookupInstructorId} onChange={(e) => setLookupInstructorId(e.target.value)} style={{ width: 170 }} />
          <Button size="sm" variant="outline" onClick={() => loadForInstructor(lookupInstructorId)}>Load instructor&rsquo;s schedule</Button>
        </div>
      )}

      {showForm && (
        <Card className="fade-in" style={{ marginBottom: 20 }}>
          <form onSubmit={createBooking}>
            <div className="form-grid respo-two-col">
              <StudentPicker schoolId={user?.schoolId} required value={form.studentId} onChange={(v) => setForm((f) => ({ ...f, studentId: v }))} />
              <Field label="Instructor profile ID" required hint={isInstructor ? 'Defaults to you' : undefined}>
                <Input required value={form.instructorId} onChange={(e) => setForm((f) => ({ ...f, instructorId: e.target.value }))} />
              </Field>
              <Field label="Vehicle (optional)">
                <Select value={form.vehicleId} onChange={(e) => setForm((f) => ({ ...f, vehicleId: e.target.value }))}>
                  <option value="">No vehicle needed</option>
                  {vehicles.map((v) => <option key={v.id} value={v.id}>{v.make} {v.model} · {v.registrationNumber}</option>)}
                </Select>
              </Field>
              <Field label="Booking type" required>
                <Select value={form.bookingType} onChange={(e) => setForm((f) => ({ ...f, bookingType: e.target.value }))}>
                  {BOOKING_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </Select>
              </Field>
              <Field label="Scheduled at" required hint="Must be in the future">
                <Input type="datetime-local" required value={form.scheduledAt} onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))} />
              </Field>
              <Field label="Duration (minutes)" required>
                <Input type="number" min={1} required value={form.durationMinutes} onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))} />
              </Field>
              <Field label="Notes" className="span-2">
                <Textarea rows={2} maxLength={1000} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </Field>
            </div>
            <Button type="submit" loading={creating} style={{ marginTop: 16 }}>Create booking</Button>
          </form>
        </Card>
      )}

      {loading ? (
        <SkeletonList count={3} />
      ) : bookings.length === 0 ? (
        <EmptyState icon={<Icons.IconCalendar size={22} />} title="No bookings loaded">
          {isAdmin ? 'Look up a student or instructor above.' : 'Nothing scheduled yet.'}
        </EmptyState>
      ) : view === 'calendar' ? (
        <>
        {/* On phones each day fills most of the width (one full day + a peek of the
            next) and snaps into place, instead of 220px columns cut off mid-card. */}
        {isMobile && dayGroups.length > 1 && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Swipe for more days →</div>
        )}
        <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8, WebkitOverflowScrolling: 'touch', scrollSnapType: isMobile ? 'x mandatory' : undefined }}>
          {dayGroups.map((grp) => (
            <div key={grp.date} style={{ flex: isMobile ? '0 0 85%' : '0 0 220px', scrollSnapAlign: isMobile ? 'start' : undefined }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10, paddingBottom: 8, borderBottom: '2px solid var(--border)' }}>
                {grp.date === 'Unscheduled' ? grp.date : fmtWeekday(grp.date)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {grp.items.map((b) => (
                  <div key={b.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)', borderRadius: 9, padding: '10px 12px' }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--accent)' }}>{fmtTime(b.scheduledAt)}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 3 }}>{b.studentName || `Student #${b.studentId}`}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{b.bookingType?.replace('_', ' ')} · {b.status}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>Booking #{b.id}</div>
                    {canManage && needsCompleting(b) && <div style={{ marginTop: 6 }}><NeedsCompletingTag /></div>}
                    {viewRouteButton(b, { marginTop: 8, width: '100%' })}
                    {canManage && (
                      <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
                        <button className="btn btn-outline btn-sm" style={{ flex: 1, padding: '7px 5px', fontSize: 11 }} onClick={() => doAction(b.id, 'confirm')}>Confirm</button>
                        <button className="btn btn-outline btn-sm" style={{ flex: 1, padding: '7px 5px', fontSize: 11 }} onClick={() => doAction(b.id, 'complete')}>Complete</button>
                        <button className="btn btn-outline btn-sm" style={{ flex: 1, padding: '7px 5px', fontSize: 11, color: 'var(--danger)' }} onClick={() => doAction(b.id, 'cancel')}>Cancel</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {bookings.map((b, i) => (
            <Reveal key={b.id} delay={Math.min(i, 8) * 40}>
              <Card tight hover>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 14.5, fontWeight: 700 }}>{b.studentName || `Student #${b.studentId}`} · {b.instructorName || `Instructor #${b.instructorId}`}</div>
                      <Badge status={b.status}>{b.status}</Badge>
                      {canManage && needsCompleting(b) && <NeedsCompletingTag />}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                      {fmtDateTime(b.scheduledAt)} · {b.durationMinutes} min · {b.bookingType?.replace('_', ' ')}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 4 }}>Booking #{b.id}</div>
                    {b.notes && <div style={{ fontSize: 12.5, color: 'var(--text)', marginTop: 6 }}>{b.notes}</div>}
                  </div>
                  {viewRouteButton(b, { flexShrink: 0 })}
                  {canManage && (
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                      <Button size="sm" variant="outline" onClick={() => doAction(b.id, 'confirm')}>Confirm</Button>
                      <Button size="sm" variant="outline" onClick={() => doAction(b.id, 'complete')}>Complete</Button>
                      <Button size="sm" variant="danger" onClick={() => doAction(b.id, 'cancel')}>Cancel</Button>
                    </div>
                  )}
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
