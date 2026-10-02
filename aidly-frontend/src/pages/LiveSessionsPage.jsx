import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/ui';
import { LiveSessionApi, SchoolApi, InstructorApi } from '../api/endpoints';
import { Button, Card, Badge, Field, Input, Textarea, Select, SkeletonList, EmptyState, Icons } from '../components/ui';
import { fmtDateTime, fmtTime, fromLocalDateTimeInput } from '../utils/format';

const STATUS_OPTIONS = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

const emptyForm = { title: '', description: '', scheduledAt: '', durationMinutes: 60, meetingUrl: '', maxParticipants: '', instructorId: '', schoolId: '' };

export default function LiveSessionsPage() {
  const { user, isAdmin, isInstructor, isStudent } = useAuth();
  const toast = useToast();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm, instructorId: user?.instructorProfileId || '', schoolId: user?.schoolId || '' });
  const [creating, setCreating] = useState(false);

  const [schools, setSchools] = useState([]);
  const [instructorOptions, setInstructorOptions] = useState([]);
  const [attendanceOpenId, setAttendanceOpenId] = useState(null);
  const [attendance, setAttendance] = useState({});
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  const canManage = isAdmin || isInstructor;

  const load = async () => {
    if (!user?.schoolId) { setLoading(false); return; }
    setLoading(true);
    try {
      const list = await LiveSessionApi.upcomingForSchool(user.schoolId);
      setSessions(list || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.schoolId]);

  useEffect(() => {
    if (isAdmin && showForm) {
      SchoolApi.list().then(setSchools).catch(() => {});
    }
  }, [isAdmin, showForm]);

  useEffect(() => {
    if (isAdmin && form.schoolId) {
      InstructorApi.listBySchool(form.schoolId).then(setInstructorOptions).catch(() => setInstructorOptions([]));
    }
  }, [isAdmin, form.schoolId]);

  const updateField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const createSession = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await LiveSessionApi.create({
        instructorId: Number(form.instructorId),
        schoolId: Number(form.schoolId),
        title: form.title,
        description: form.description || null,
        scheduledAt: fromLocalDateTimeInput(form.scheduledAt),
        durationMinutes: Number(form.durationMinutes),
        meetingUrl: form.meetingUrl || null,
        maxParticipants: form.maxParticipants ? Number(form.maxParticipants) : null,
      });
      toast.success('Live session scheduled');
      setShowForm(false);
      setForm({ ...emptyForm, instructorId: user?.instructorProfileId || '', schoolId: user?.schoolId || '' });
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const register = async (id) => {
    if (!user?.studentProfileId) { toast.error('No student profile on this account'); return; }
    try {
      await LiveSessionApi.register(id, user.studentProfileId);
      toast.success('You’re registered — the meeting link is now on the session');
      load();
    } catch (err) {
      // Registered earlier (another tab/device) - that's the outcome they wanted.
      if (/already registered/i.test(err.message || '')) { toast.info('You’re already registered for this session'); load(); return; }
      toast.error(err.message);
    }
  };

  const unregister = async (id) => {
    if (!window.confirm('Unregister from this session? You’ll lose the meeting link until you register again.')) return;
    try {
      await LiveSessionApi.unregister(id);
      toast.success('You’re no longer registered for this session');
      load();
    } catch (err) { toast.error(err.message); }
  };

  const changeStatus = async (id, status) => {
    try {
      await LiveSessionApi.setStatus(id, status);
      toast.success('Status updated');
      load();
    } catch (err) { toast.error(err.message); }
  };

  const toggleAttendance = async (id) => {
    if (attendanceOpenId === id) { setAttendanceOpenId(null); return; }
    setAttendanceOpenId(id);
    setAttendanceLoading(true);
    try {
      const list = await LiveSessionApi.attendance(id);
      setAttendance((a) => ({ ...a, [id]: list || [] }));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const markPresent = async (sessionId, studentId) => {
    try {
      await LiveSessionApi.markPresent(sessionId, studentId);
      const list = await LiveSessionApi.attendance(sessionId);
      setAttendance((a) => ({ ...a, [sessionId]: list || [] }));
      toast.success('Marked present');
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Live sessions</h1>
          <p className="page-subtitle">Upcoming live classes for your school, over the next 7 days.</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowForm((s) => !s)}>
            <Icons.IconPlus size={15} /> {showForm ? 'Cancel' : 'New session'}
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="fade-in" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Schedule a live session</div>
          <form onSubmit={createSession}>
            <div className="form-grid respo-two-col">
              <Field label="Title" required>
                <Input required value={form.title} onChange={updateField('title')} />
              </Field>
              <Field label="Meeting URL" hint="Zoom, Google Meet, etc.">
                <Input value={form.meetingUrl} onChange={updateField('meetingUrl')} placeholder="https://meet.google.com/..." />
              </Field>
              <Field label="Description" className="span-2">
                <Textarea rows={2} value={form.description} onChange={updateField('description')} />
              </Field>
              <Field label="Scheduled at" required hint="Must be in the future">
                <Input type="datetime-local" required value={form.scheduledAt} onChange={updateField('scheduledAt')} />
              </Field>
              <Field label="Duration (minutes)" required>
                <Input type="number" min={1} required value={form.durationMinutes} onChange={updateField('durationMinutes')} />
              </Field>

              {isAdmin ? (
                <>
                  <Field label="School" required>
                    <Select required value={form.schoolId} onChange={updateField('schoolId')}>
                      <option value="">Select a school…</option>
                      {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>
                  </Field>
                  <Field label="Instructor" required>
                    <Select required value={form.instructorId} onChange={updateField('instructorId')} disabled={!form.schoolId}>
                      <option value="">{form.schoolId ? 'Select an instructor…' : 'Pick a school first'}</option>
                      {instructorOptions.map((i) => <option key={i.id} value={i.id}>{i.firstName} {i.lastName}</option>)}
                    </Select>
                  </Field>
                </>
              ) : (
                <Field label="Max participants">
                  <Input type="number" min={1} value={form.maxParticipants} onChange={updateField('maxParticipants')} placeholder="Unlimited" />
                </Field>
              )}
              {isAdmin && (
                <Field label="Max participants">
                  <Input type="number" min={1} value={form.maxParticipants} onChange={updateField('maxParticipants')} placeholder="Unlimited" />
                </Field>
              )}
            </div>
            <Button type="submit" loading={creating} style={{ marginTop: 16 }}>Schedule session</Button>
          </form>
        </Card>
      )}

      {loading ? (
        <SkeletonList count={3} />
      ) : sessions.length === 0 ? (
        <EmptyState icon={<Icons.IconVideo size={22} />} title="No upcoming live sessions">
          Nothing is scheduled for the next 7 days.
        </EmptyState>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sessions.map((s) => {
            // Registration unlocks the meeting link for students: show the link
            // only when the backend sends it, and say how to get it otherwise.
            const registered = isStudent && s.registered === true;
            const full = s.maxParticipants != null && (s.registeredCount ?? 0) >= s.maxParticipants;
            const canRegister = isStudent && !registered && (s.status === 'SCHEDULED' || s.status === 'IN_PROGRESS');
            return (
            <Card key={s.id} tight hover>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{s.title}</div>
                    <Badge status={s.status}>{s.status.replace('_', ' ')}</Badge>
                    {registered && <Badge variant="info">Registered ✓</Badge>}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                    {fmtDateTime(s.scheduledAt)}{s.endsAt ? ` – ${fmtTime(s.endsAt)}` : ''} · {s.durationMinutes} min · Instructor: {s.instructorName || s.instructorId} · {s.registeredCount ?? 0}{s.maxParticipants ? ` / ${s.maxParticipants}` : ''} registered
                  </div>
                  {s.description && <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 6 }}>{s.description}</div>}
                  {/* Registered students get a Join button instead (on the right). */}
                  {s.meetingUrl && !registered ? (
                    <a href={s.meetingUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, marginTop: 6, display: 'inline-block' }}>
                      Join meeting link ↗
                    </a>
                  ) : canRegister && !full ? (
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 6 }}>Register to get the meeting link.</div>
                  ) : null}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                  {canRegister && (
                    full
                      ? <Button size="sm" disabled>Session full</Button>
                      : <Button size="sm" onClick={() => register(s.id)}>Register</Button>
                  )}
                  {registered && s.meetingUrl && (
                    <a className="btn btn-primary btn-sm" href={s.meetingUrl} target="_blank" rel="noreferrer">Join ↗</a>
                  )}
                  {registered && (s.status === 'SCHEDULED' || s.status === 'IN_PROGRESS') && (
                    <Button size="sm" variant="ghost" onClick={() => unregister(s.id)}>Unregister</Button>
                  )}
                  {canManage && (
                    <>
                      <Select size="sm" value={s.status} onChange={(e) => changeStatus(s.id, e.target.value)}>
                        {STATUS_OPTIONS.map((st) => <option key={st} value={st}>{st.replace('_', ' ')}</option>)}
                      </Select>
                      <Button size="sm" variant="outline" onClick={() => toggleAttendance(s.id)}>
                        {attendanceOpenId === s.id ? 'Hide attendance' : 'Attendance'}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {attendanceOpenId === s.id && (
                <div className="fade-in" style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                  {attendanceLoading ? (
                    <SkeletonList count={2} small />
                  ) : (attendance[s.id] || []).length === 0 ? (
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>No registrations yet.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(attendance[s.id] || []).map((a) => (
                        <div key={a.studentId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, gap: 8, flexWrap: 'wrap' }}>
                          <span>{a.studentName || `Student #${a.studentId}`}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <Badge status={a.status}>{a.status}</Badge>
                            {a.status !== 'PRESENT' && (
                              <Button size="sm" variant="outline" onClick={() => markPresent(s.id, a.studentId)}>Mark present</Button>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
