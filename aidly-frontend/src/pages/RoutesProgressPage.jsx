import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/ui';
import { LessonRouteApi, LicenseWorkflowApi, DrivingAssessmentApi, LICENSE_STAGES } from '../api/endpoints';
import { Button, Card, Badge, Field, Input, Select, Textarea, Tabs, EmptyState, SkeletonList, Icons, Reveal } from '../components/ui';
import RouteMap from '../features/routes/RouteMap';
import RoadMotif from '../components/motion/RoadMotif';
import useCountUp from '../hooks/useCountUp';
import { humanize, fmtDateTime, toLocalDateTimeInput, fromLocalDateTimeInput } from '../utils/format';
import './routes-progress.css';

const emptyRoute = { bookingId: '', startLocation: '', destinationLocation: '', startLatitude: '', startLongitude: '', destinationLatitude: '', destinationLongitude: '' };
const ASSESSMENT_RESULTS = ['PASSED', 'FAILED', 'NEEDS_IMPROVEMENT', 'PENDING'];

// A colorful trail rather than a single flat hue — one accent per stage,
// cycling through the palette so the completed path reads as a journey.
const STAGE_COLORS = [
  'var(--hue-amber)', 'var(--hue-rose)', 'var(--hue-violet)', 'var(--hue-teal)',
  'var(--hue-green)', 'var(--hue-violet)', 'var(--hue-teal)', 'var(--hue-green)',
];

function RouteResultCard({ route }) {
  if (!route) return null;
  return (
    <Card tight style={{ marginBottom: 14, overflow: 'hidden' }}>
      <div style={{ fontSize: 14.5, fontWeight: 700 }}>{route.startLocation} → {route.destinationLocation}</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
        {route.distanceKm} km · {route.durationMinutes} min{route.instructorName ? ` · Instructor: ${route.instructorName}` : ''}
      </div>
      <div style={{ marginTop: 14 }}>
        <RouteMap
          start={{ lat: route.startLatitude, lng: route.startLongitude, label: route.startLocation }}
          destination={{ lat: route.destinationLatitude, lng: route.destinationLongitude, label: route.destinationLocation }}
          path={route.coordinates}
        />
      </div>
    </Card>
  );
}

function TheoryRing({ percent }) {
  const display = useCountUp(percent);
  return (
    <div
      className="theory-ring"
      style={{ '--ring-pct': `${percent}%`, '--glow-color': 'color-mix(in oklch, var(--accent) 45%, transparent)' }}
    >
      <div className="theory-ring-inner">
        <div style={{ fontSize: 22, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{display}%</div>
        <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Theory</div>
      </div>
    </div>
  );
}

function LessonRoutesTab() {
  const { user, isInstructor } = useAuth();
  const toast = useToast();

  const [routes, setRoutes] = useState([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyRoute);
  const [generating, setGenerating] = useState(false);
  const [lookupBookingId, setLookupBookingId] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const loadMine = async () => {
    if (!isInstructor || !user?.instructorProfileId) return;
    setLoadingRoutes(true);
    try {
      const res = await LessonRouteApi.listByInstructor(user.instructorProfileId);
      setRoutes(res?.content || res || []);
    } catch (err) { toast.error(err.message); }
    finally { setLoadingRoutes(false); }
  };
  useEffect(() => { loadMine(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

  const generate = async (e) => {
    e.preventDefault();
    setGenerating(true);
    try {
      await LessonRouteApi.generate({
        bookingId: Number(form.bookingId),
        startLocation: form.startLocation,
        destinationLocation: form.destinationLocation,
        startLatitude: Number(form.startLatitude),
        startLongitude: Number(form.startLongitude),
        destinationLatitude: Number(form.destinationLatitude),
        destinationLongitude: Number(form.destinationLongitude),
      });
      toast.success('Route generated');
      setShowForm(false);
      setForm(emptyRoute);
      loadMine();
    } catch (err) { toast.error(err.message); }
    finally { setGenerating(false); }
  };

  const lookup = async () => {
    if (!lookupBookingId) return;
    try { setLookupResult(await LessonRouteApi.getByBooking(lookupBookingId)); }
    catch (err) { toast.error(err.message); }
  };

  return (
    <div>
      {isInstructor && (
        <div style={{ marginBottom: 16 }}>
          <Button onClick={() => setShowForm((s) => !s)}>
            <Icons.IconPlus size={14} /> {showForm ? 'Cancel' : 'Generate route'}
          </Button>
        </div>
      )}

      {showForm && (
        <Card className="fade-in respo-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
          <form onSubmit={generate} style={{ display: 'contents' }}>
            <Field label="Booking ID" required className="span-2"><Input required value={form.bookingId} onChange={(e) => setForm((f) => ({ ...f, bookingId: e.target.value }))} /></Field>
            <Field label="Start location" required><Input required value={form.startLocation} onChange={(e) => setForm((f) => ({ ...f, startLocation: e.target.value }))} /></Field>
            <Field label="Destination" required><Input required value={form.destinationLocation} onChange={(e) => setForm((f) => ({ ...f, destinationLocation: e.target.value }))} /></Field>
            <Field label="Start latitude" required><Input required value={form.startLatitude} onChange={(e) => setForm((f) => ({ ...f, startLatitude: e.target.value }))} /></Field>
            <Field label="Start longitude" required><Input required value={form.startLongitude} onChange={(e) => setForm((f) => ({ ...f, startLongitude: e.target.value }))} /></Field>
            <Field label="Destination latitude" required><Input required value={form.destinationLatitude} onChange={(e) => setForm((f) => ({ ...f, destinationLatitude: e.target.value }))} /></Field>
            <Field label="Destination longitude" required><Input required value={form.destinationLongitude} onChange={(e) => setForm((f) => ({ ...f, destinationLongitude: e.target.value }))} /></Field>
            <Button type="submit" className="span-2" loading={generating}>Generate route</Button>
          </form>
        </Card>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <Input placeholder="Look up route by booking ID" value={lookupBookingId} onChange={(e) => setLookupBookingId(e.target.value)} style={{ maxWidth: 240, flex: '1 1 200px' }} />
        <Button variant="outline" onClick={lookup}>Look up</Button>
      </div>

      <RouteResultCard route={lookupResult} />

      {(isInstructor) && (loadingRoutes ? (
        <SkeletonList count={2} small />
      ) : routes.length === 0 ? (
        <EmptyState icon={<Icons.IconMap size={22} />} title="No routes yet" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {routes.map((r) => (
            <Card key={r.id} tight hover style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{r.startLocation} → {r.destinationLocation}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>{r.distanceKm} km · {r.durationMinutes} min</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
                  {expandedId === r.id ? 'Hide map' : 'Show map'}
                </Button>
              </div>
              {expandedId === r.id && (
                <div className="fade-in" style={{ marginTop: 14 }}>
                  <RouteMap
                    start={{ lat: r.startLatitude, lng: r.startLongitude, label: r.startLocation }}
                    destination={{ lat: r.destinationLatitude, lng: r.destinationLongitude, label: r.destinationLocation }}
                    path={r.coordinates}
                  />
                </div>
              )}
            </Card>
          ))}
        </div>
      ))}
    </div>
  );
}

function LicenseProgressTab() {
  const { user, isAdmin, isInstructor, isStudent } = useAuth();
  const toast = useToast();

  const [lookupStudentId, setLookupStudentId] = useState('');
  const [workflow, setWorkflow] = useState(null);
  const [theoryInput, setTheoryInput] = useState('');
  const [targetStage, setTargetStage] = useState('THEORY_COMPLETED');
  const [busy, setBusy] = useState(false);
  const stepperRef = useRef(null);

  const activeStudentId = isStudent ? user?.studentProfileId : lookupStudentId;

  const load = async (id) => {
    if (!id) return;
    try { setWorkflow(await LicenseWorkflowApi.get(id)); }
    catch (err) { toast.error(err.message); }
  };

  useEffect(() => { if (isStudent) load(user?.studentProfileId); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

  const initWorkflow = async () => {
    setBusy(true);
    try { await LicenseWorkflowApi.initialize(lookupStudentId); toast.success('Workflow initialized'); load(lookupStudentId); }
    catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  const markQuizPassed = async () => {
    setBusy(true);
    try { await LicenseWorkflowApi.markQuizPassed(lookupStudentId); toast.success('Marked quiz passed'); load(lookupStudentId); }
    catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  const updateTheory = async () => {
    setBusy(true);
    try {
      await LicenseWorkflowApi.updateTheoryProgress(activeStudentId, Number(theoryInput));
      toast.success('Progress updated');
      load(activeStudentId);
    } catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  const advance = async () => {
    setBusy(true);
    try {
      await LicenseWorkflowApi.advance(activeStudentId, targetStage, null);
      toast.success('Stage advanced');
      load(activeStudentId);
    } catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  const curIdx = workflow ? LICENSE_STAGES.indexOf(workflow.currentStage) : -1;

  // On narrow screens the stepper scrolls horizontally — bring the
  // student's current stage into view instead of leaving it off-screen.
  useEffect(() => {
    if (!workflow || !stepperRef.current) return;
    const el = stepperRef.current.querySelector('[data-current="true"]');
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [workflow]);

  return (
    <div>
      {(isAdmin || isInstructor) && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <Input placeholder="Student profile ID" value={lookupStudentId} onChange={(e) => setLookupStudentId(e.target.value)} style={{ width: 170 }} />
          <Button variant="outline" onClick={() => load(lookupStudentId)}>Load</Button>
          {isAdmin && (
            <>
              <Button variant="soft" onClick={initWorkflow} loading={busy}>Initialize workflow</Button>
              <Button variant="soft" onClick={markQuizPassed} loading={busy}>Mark quiz passed</Button>
            </>
          )}
        </div>
      )}

      {!workflow ? (
        <EmptyState icon={<Icons.IconShield size={22} />} title="No license workflow loaded yet" />
      ) : (
        <Card className="fade-in-up" style={{ maxWidth: 720 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
            <TheoryRing percent={Math.min(100, workflow.theoryProgressPercent || 0)} />
            <div>
              <Badge>{humanize(workflow.currentStage)}</Badge>
              <div style={{ fontSize: 13.5, color: 'var(--text)', marginTop: 10 }}>Road training hours: <strong>{workflow.roadTrainingHours ?? 0}</strong></div>
            </div>
          </div>

          <div style={{ marginTop: 22, height: 34 }}>
            <RoadMotif progress={curIdx >= 0 ? (curIdx / (LICENSE_STAGES.length - 1)) * 100 : 0} color={curIdx >= 0 ? STAGE_COLORS[curIdx % STAGE_COLORS.length] : 'var(--border-strong)'} />
          </div>

          <div ref={stepperRef} style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', marginTop: 6, paddingBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: 'fit-content' }}>
              {LICENSE_STAGES.map((stg, i) => {
                const done = i <= curIdx;
                const current = i === curIdx;
                const upcoming = i === curIdx + 1;
                const stageColor = STAGE_COLORS[i % STAGE_COLORS.length];
                return (
                  <div
                    key={stg}
                    data-current={current || undefined}
                    style={{ width: 78, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}
                  >
                    {i > 0 && (
                      <div
                        className={upcoming ? 'stage-connector-flow' : ''}
                        style={{
                          position: 'absolute', top: 7, left: '-50%', width: '100%', height: 2,
                          background: done ? STAGE_COLORS[(i - 1) % STAGE_COLORS.length] : (upcoming ? undefined : 'var(--border)'),
                          '--flow-color': upcoming ? stageColor : undefined,
                          transition: 'background 0.5s ease', zIndex: 0,
                        }}
                      />
                    )}
                    <div
                      className={current ? 'license-stage-dot license-stage-dot-current' : 'license-stage-dot'}
                      style={{
                        background: done ? stageColor : 'var(--surface)',
                        borderColor: done ? stageColor : 'var(--border-strong)',
                        '--glow-color': `color-mix(in oklch, ${stageColor} 50%, transparent)`,
                      }}
                    />
                    <div style={{ fontSize: 10, textAlign: 'center', marginTop: 8, color: done ? 'var(--text)' : 'var(--text-faint)', fontWeight: current ? 700 : 500, lineHeight: 1.3, padding: '0 3px' }}>
                      {humanize(stg)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {isStudent && (
            <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
              <Input type="number" min={0} max={100} placeholder="New % (0–100)" value={theoryInput} onChange={(e) => setTheoryInput(e.target.value)} style={{ width: 160 }} />
              <Button onClick={updateTheory} loading={busy}>Update progress</Button>
            </div>
          )}

          {(isAdmin || isInstructor) && (
            <div style={{ display: 'flex', gap: 8, marginTop: 20, alignItems: 'center', flexWrap: 'wrap' }}>
              <Select value={targetStage} onChange={(e) => setTargetStage(e.target.value)}>
                {LICENSE_STAGES.filter((s) => s !== 'THEORY_LEARNING').map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
              </Select>
              <Button onClick={advance} loading={busy}>Advance stage</Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function AssessmentRow({ a, canEdit, onSaved, toast }) {
  const [editing, setEditing] = useState(false);
  const [feedback, setFeedback] = useState(a.feedback || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await DrivingAssessmentApi.updateFeedback(a.id, feedback);
      toast.success('Feedback updated');
      setEditing(false);
      onSaved();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <Card tight>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            {a.studentName || `Student #${a.studentId}`} · {a.instructorName || `Instructor #${a.instructorId}`}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3 }}>
            {fmtDateTime(a.assessmentDate)} · Score {a.score}/100{a.durationMinutes ? ` · ${a.durationMinutes} min` : ''}
          </div>
        </div>
        <Badge status={a.result}>{humanize(a.result)}</Badge>
      </div>

      {editing ? (
        <div style={{ marginTop: 10 }}>
          <Textarea rows={2} maxLength={2000} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Button size="sm" loading={saving} onClick={save}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setFeedback(a.feedback || ''); }}>Cancel</Button>
          </div>
        </div>
      ) : (
        <>
          {a.feedback && <div style={{ fontSize: 13, marginTop: 8 }}>{a.feedback}</div>}
          {canEdit && (
            <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 8, padding: '4px 0' }} onClick={() => setEditing(true)}>
              {a.feedback ? 'Edit feedback' : 'Add feedback'}
            </button>
          )}
        </>
      )}
    </Card>
  );
}

function AssessmentsTab() {
  const { user, isAdmin, isInstructor, isStudent } = useAuth();
  const toast = useToast();

  const [assessments, setAssessments] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lookupStudentId, setLookupStudentId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ studentId: '', bookingId: '', assessmentDate: toLocalDateTimeInput(new Date().toISOString()), score: '', result: 'PASSED', feedback: '', durationMinutes: '' });
  const [creating, setCreating] = useState(false);

  const loadForStudent = async (id) => {
    if (!id) return;
    setLoading(true);
    try { setAssessments(await DrivingAssessmentApi.listByStudent(id) || []); }
    catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const loadMine = async () => {
    if (!user?.instructorProfileId) return;
    setLoading(true);
    try { setAssessments(await DrivingAssessmentApi.listByInstructor(user.instructorProfileId) || []); }
    catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (isStudent && user?.studentProfileId) loadForStudent(user.studentProfileId);
    else if (isInstructor) loadMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const create = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await DrivingAssessmentApi.create({
        studentId: Number(form.studentId),
        bookingId: form.bookingId ? Number(form.bookingId) : null,
        assessmentDate: fromLocalDateTimeInput(form.assessmentDate),
        score: Number(form.score),
        result: form.result,
        feedback: form.feedback || null,
        durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : null,
      });
      toast.success('Assessment recorded');
      setShowForm(false);
      setForm({ studentId: '', bookingId: '', assessmentDate: toLocalDateTimeInput(new Date().toISOString()), score: '', result: 'PASSED', feedback: '', durationMinutes: '' });
      loadMine();
    } catch (err) { toast.error(err.message); }
    finally { setCreating(false); }
  };

  return (
    <div>
      {isInstructor && (
        <div style={{ marginBottom: 16 }}>
          <Button onClick={() => setShowForm((s) => !s)}><Icons.IconPlus size={14} /> {showForm ? 'Cancel' : 'Record assessment'}</Button>
        </div>
      )}

      {showForm && isInstructor && (
        <Card className="fade-in respo-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
          <form onSubmit={create} style={{ display: 'contents' }}>
            <Field label="Student profile ID" required><Input required value={form.studentId} onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))} /></Field>
            <Field label="Booking ID (optional)"><Input value={form.bookingId} onChange={(e) => setForm((f) => ({ ...f, bookingId: e.target.value }))} /></Field>
            <Field label="Assessment date" required><Input type="datetime-local" required value={form.assessmentDate} onChange={(e) => setForm((f) => ({ ...f, assessmentDate: e.target.value }))} /></Field>
            <Field label="Score (0-100)" required><Input type="number" min={0} max={100} required value={form.score} onChange={(e) => setForm((f) => ({ ...f, score: e.target.value }))} /></Field>
            <Field label="Result" required>
              <Select value={form.result} onChange={(e) => setForm((f) => ({ ...f, result: e.target.value }))}>
                {ASSESSMENT_RESULTS.map((r) => <option key={r} value={r}>{humanize(r)}</option>)}
              </Select>
            </Field>
            <Field label="Duration (minutes, optional)"><Input type="number" min={1} value={form.durationMinutes} onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))} /></Field>
            <Field label="Feedback" className="span-2"><Textarea rows={3} maxLength={2000} value={form.feedback} onChange={(e) => setForm((f) => ({ ...f, feedback: e.target.value }))} /></Field>
            <Button type="submit" className="span-2" loading={creating}>Record assessment</Button>
          </form>
        </Card>
      )}

      {(isAdmin || isInstructor) && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
          <Input placeholder="Look up a student's assessments by ID" value={lookupStudentId} onChange={(e) => setLookupStudentId(e.target.value)} style={{ maxWidth: 260, flex: '1 1 220px' }} />
          <Button variant="outline" onClick={() => loadForStudent(lookupStudentId)}>Look up</Button>
          {isInstructor && <Button variant="ghost" onClick={loadMine}>Show my assessments</Button>}
        </div>
      )}

      {loading || assessments === null ? (
        <SkeletonList count={2} small />
      ) : assessments.length === 0 ? (
        <EmptyState icon={<Icons.IconShield size={22} />} title="No driving assessments yet" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {assessments.map((a, i) => (
            <Reveal key={a.id} delay={Math.min(i, 8) * 40}>
              <AssessmentRow
                a={a}
                canEdit={isInstructor && a.instructorId === user?.instructorProfileId}
                onSaved={() => (isStudent ? loadForStudent(user.studentProfileId) : loadMine())}
                toast={toast}
              />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RoutesProgressPage() {
  const [tab, setTab] = useState('routes');
  return (
    <div className="fade-in">
      <h1 className="page-title">Routes &amp; progress</h1>
      <p className="page-subtitle" style={{ marginBottom: 20 }}>Practical lesson routes, license-stage tracking, and driving assessments.</p>

      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'routes', label: 'Lesson routes' },
          { value: 'progress', label: 'License progress' },
          { value: 'assessments', label: 'Assessments' },
        ]}
      />
      <div style={{ height: 20 }} />

      {tab === 'routes' && <LessonRoutesTab />}
      {tab === 'progress' && <LicenseProgressTab />}
      {tab === 'assessments' && <AssessmentsTab />}
    </div>
  );
}
