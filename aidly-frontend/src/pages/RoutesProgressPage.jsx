import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/ui';
import { LessonRouteApi, LicenseWorkflowApi, DrivingAssessmentApi, BookingApi, LICENSE_STAGES } from '../api/endpoints';
import { Button, Card, Badge, Field, Input, Select, Textarea, Tabs, EmptyState, SkeletonList, Icons, Reveal } from '../components/ui';
import RouteMap from '../features/routes/RouteMap';
import { START_COLOR, DESTINATION_COLOR } from '../features/routes/pins';
import RoutePointsPicker from '../features/routes/RoutePointsPicker';
import { parseLatLng, formatLatLng } from '../utils/coordinates';
import RoadMotif from '../components/motion/RoadMotif';
import useCountUp from '../hooks/useCountUp';
import { humanize, fmtDateTime, toLocalDateTimeInput, fromLocalDateTimeInput } from '../utils/format';
import './routes-progress.css';

const emptyPlan = { bookingId: '', startLocation: '', destinationLocation: '', start: null, destination: null };
const POINT_LABELS = { start: 'Start', destination: 'Destination' };
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
  const { user, isInstructor, isStudent } = useAuth();
  const toast = useToast();
  const [searchParams] = useSearchParams();

  const [routes, setRoutes] = useState([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [plan, setPlan] = useState(emptyPlan);
  const [activePoint, setActivePoint] = useState('start'); // which pin the next map click places
  const [manualOpen, setManualOpen] = useState(false);
  const [manualText, setManualText] = useState({ start: '', destination: '' });
  const [focusPoint, setFocusPoint] = useState(null);
  const [bookingOptions, setBookingOptions] = useState(null); // null = loading
  const [generating, setGenerating] = useState(false);
  const [lookupBookingId, setLookupBookingId] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  // ?route=<id> (from a booking's "View route") opens that route's map straight away.
  const [expandedId, setExpandedId] = useState(() => Number(searchParams.get('route')) || null);

  // Instructors see the routes they've planned; students see the routes for their own bookings.
  const hasOwnList = isInstructor || isStudent;

  const loadMine = async () => {
    if (isInstructor && !user?.instructorProfileId) return;
    if (!hasOwnList) return;
    setLoadingRoutes(true);
    try {
      const res = isInstructor
        ? await LessonRouteApi.listByInstructor(user.instructorProfileId)
        : await LessonRouteApi.mine();
      setRoutes(res?.content || res || []);
    } catch (err) { toast.error(err.message); }
    finally { setLoadingRoutes(false); }
  };
  useEffect(() => { loadMine(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

  // Bring the route linked from a booking into view once the list has loaded.
  useEffect(() => {
    const linked = Number(searchParams.get('route'));
    if (!linked || routes.length === 0) return;
    document.getElementById(`route-${linked}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [routes, searchParams]);

  // The instructor's own upcoming lessons, so the route is attached by choosing a
  // lesson rather than typing a booking ID (the backend only accepts their own).
  useEffect(() => {
    if (!showForm || !isInstructor || !user?.instructorProfileId) return;
    setBookingOptions(null);
    const now = Date.now();
    const from = new Date(now - 7 * 86400000).toISOString().slice(0, 19);
    const to = new Date(now + 60 * 86400000).toISOString().slice(0, 19);
    BookingApi.listByInstructor(user.instructorProfileId, from, to)
      .then((list) => setBookingOptions((list || [])
        .filter((b) => b.status === 'PENDING' || b.status === 'CONFIRMED')
        .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))))
      .catch(() => setBookingOptions([]));
  }, [showForm, isInstructor, user?.instructorProfileId]);

  const routedBookingIds = new Set(routes.map((r) => r.bookingId));

  // A pin placed or dragged on the map.
  const placePoint = (which, point) => {
    setPlan((p) => ({ ...p, [which]: point }));
    setManualText((t) => ({ ...t, [which]: formatLatLng(point) }));
    if (which === 'start' && !plan.destination) setActivePoint('destination');
  };

  // Coordinates typed or pasted in any common format.
  const typePoint = (which, text) => {
    setManualText((t) => ({ ...t, [which]: text }));
    const point = parseLatLng(text);
    if (point) {
      setPlan((p) => ({ ...p, [which]: point }));
      setFocusPoint(point);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setPlan(emptyPlan);
    setManualText({ start: '', destination: '' });
    setActivePoint('start');
    setManualOpen(false);
  };

  const generate = async (e) => {
    e.preventDefault();
    if (!plan.bookingId) { toast.error('Choose the lesson this route is for.'); return; }
    if (!plan.start || !plan.destination) {
      toast.error('Place both the start and destination pins on the map (or enter their coordinates).');
      return;
    }
    setGenerating(true);
    try {
      const created = await LessonRouteApi.generate({
        bookingId: Number(plan.bookingId),
        startLocation: plan.startLocation.trim(),
        destinationLocation: plan.destinationLocation.trim(),
        startLatitude: plan.start.lat,
        startLongitude: plan.start.lng,
        destinationLatitude: plan.destination.lat,
        destinationLongitude: plan.destination.lng,
      });
      toast.success('Route generated — your student can see it on their bookings');
      closeForm();
      if (created?.id) setExpandedId(created.id);
      loadMine();
    } catch (err) {
      // The routing service can't snap a pin that's far from any road.
      if (/routable point/i.test(err.message || '')) {
        toast.error('One of the pins isn’t close to a road. Move the start or destination pin onto a street and try again.');
      } else {
        toast.error(err.message);
      }
    } finally { setGenerating(false); }
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
          <Button onClick={() => (showForm ? closeForm() : setShowForm(true))}>
            <Icons.IconPlus size={14} /> {showForm ? 'Cancel' : 'Generate route'}
          </Button>
        </div>
      )}

      {showForm && (
        <Card className="fade-in" style={{ marginBottom: 18 }}>
          <form onSubmit={generate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* 1. Which lesson */}
            <Field label="Lesson" required hint="Your upcoming lessons. The student on that booking will see this route.">
              {bookingOptions === null ? (
                <Select disabled value=""><option>Loading your lessons…</option></Select>
              ) : bookingOptions.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '6px 0' }}>
                  You have no upcoming lessons. Create a booking on the <Link to="/bookings">Bookings</Link> page first.
                </div>
              ) : (
                <Select required value={plan.bookingId} onChange={(e) => setPlan((p) => ({ ...p, bookingId: e.target.value }))}>
                  <option value="">Choose a lesson…</option>
                  {bookingOptions.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.studentName} · {fmtDateTime(b.scheduledAt)} · {humanize(b.bookingType)}{routedBookingIds.has(b.id) ? ' · has a route' : ''}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            {/* 2. Where: pins on the map */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {['start', 'destination'].map((which) => {
                  const isActive = activePoint === which;
                  const color = which === 'start' ? START_COLOR : DESTINATION_COLOR;
                  return (
                    <button
                      key={which}
                      type="button"
                      onClick={() => setActivePoint(which)}
                      aria-pressed={isActive}
                      className="btn btn-sm"
                      style={{
                        border: `1.5px solid ${isActive ? color : 'var(--border)'}`,
                        background: isActive ? 'var(--accent-soft-bg)' : 'var(--surface)',
                        color: 'var(--text)', display: 'inline-flex', alignItems: 'center', gap: 7,
                      }}
                    >
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                      {plan[which] ? `Move ${POINT_LABELS[which].toLowerCase()}` : `Set ${POINT_LABELS[which].toLowerCase()}`}
                      {plan[which] && <Icons.IconCheck size={13} />}
                    </button>
                  );
                })}
              </div>
              <div className="field-hint">
                Click the map to place the <strong>{POINT_LABELS[activePoint].toLowerCase()}</strong> pin. Drag a pin to adjust it; zoom with + and −. Put pins on a road.
              </div>
              <RoutePointsPicker
                start={plan.start}
                destination={plan.destination}
                active={activePoint}
                onChange={placePoint}
                focus={focusPoint}
                center={routes[0] ? [routes[0].startLatitude, routes[0].startLongitude] : undefined}
              />
              <div style={{ display: 'flex', gap: '4px 18px', flexWrap: 'wrap', fontSize: 12, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                <span>Start: {plan.start ? formatLatLng(plan.start) : 'not set'}</span>
                <span>Destination: {plan.destination ? formatLatLng(plan.destination) : 'not set'}</span>
                <button type="button" className="login-link-btn" style={{ margin: 0, fontSize: 12 }} onClick={() => setManualOpen((o) => !o)}>
                  {manualOpen ? 'Hide coordinate boxes' : 'Enter coordinates manually'}
                </button>
              </div>
              {manualOpen && (
                <div className="form-grid respo-two-col fade-in">
                  {['start', 'destination'].map((which) => {
                    const text = manualText[which];
                    const unreadable = text.trim() !== '' && !parseLatLng(text);
                    return (
                      <Field
                        key={which}
                        label={`${POINT_LABELS[which]} coordinates`}
                        error={unreadable ? 'Can’t read that. Use e.g. 5.70625, -0.08222 or 5°42\'22.5"N 0°04\'56.0"W' : undefined}
                        hint="Paste from Google Maps (right-click a spot). Degrees like 5°42'22.5&quot;N work too."
                      >
                        <Input value={text} placeholder={which === 'start' ? '5.70625, -0.08222' : '5.65447, -0.19486'} onChange={(e) => typePoint(which, e.target.value)} />
                      </Field>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Names students will read */}
            <div className="form-grid respo-two-col">
              <Field label="Start location name" required hint="What students will see, e.g. Santeo junction (2–500 characters)">
                <Input required minLength={2} maxLength={500} value={plan.startLocation} onChange={(e) => setPlan((p) => ({ ...p, startLocation: e.target.value }))} />
              </Field>
              <Field label="Destination name" required hint="e.g. St Thomas Aquinas SHS (2–500 characters)">
                <Input required minLength={2} maxLength={500} value={plan.destinationLocation} onChange={(e) => setPlan((p) => ({ ...p, destinationLocation: e.target.value }))} />
              </Field>
            </div>

            <Button type="submit" loading={generating} disabled={!bookingOptions || bookingOptions.length === 0}>Generate route</Button>
          </form>
        </Card>
      )}

      {/* Students get their own list below, so they don't need to know booking IDs. */}
      {!isStudent && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
          <Input placeholder="Look up route by booking ID" value={lookupBookingId} onChange={(e) => setLookupBookingId(e.target.value)} style={{ maxWidth: 240, flex: '1 1 200px' }} />
          <Button variant="outline" onClick={lookup}>Look up</Button>
        </div>
      )}

      <RouteResultCard route={lookupResult} />

      {isStudent && (
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: '0 0 14px' }}>
          The roads you&rsquo;ll drive on in your practical lessons, planned by your instructor.
        </p>
      )}

      {hasOwnList && (loadingRoutes ? (
        <SkeletonList count={2} small />
      ) : routes.length === 0 ? (
        <EmptyState icon={<Icons.IconMap size={22} />} title="No routes yet">
          {isStudent ? 'When your instructor plans a route for one of your lessons, it appears here.' : null}
        </EmptyState>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {routes.map((r) => (
            <Card key={r.id} id={`route-${r.id}`} tight hover style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{r.startLocation} → {r.destinationLocation}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>
                    {r.distanceKm} km · {r.durationMinutes} min · Booking #{r.bookingId}{isStudent && r.instructorName ? ` · ${r.instructorName}` : ''}
                  </div>
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
  const [notStarted, setNotStarted] = useState(false); // loaded, but no workflow exists for this student yet
  const [theoryInput, setTheoryInput] = useState('');
  const [busy, setBusy] = useState(false);
  const stepperRef = useRef(null);

  const activeStudentId = isStudent ? user?.studentProfileId : lookupStudentId;

  const load = async (id) => {
    if (!id) return;
    try {
      setWorkflow(await LicenseWorkflowApi.get(id));
      setNotStarted(false);
    } catch (err) {
      // 404 just means the admin hasn't started this student's workflow yet -
      // an expected state, not an error worth a red toast.
      setWorkflow(null);
      if (err.status === 404) setNotStarted(true);
      else { setNotStarted(false); toast.error(err.message); }
    }
  };

  useEffect(() => { if (isStudent) load(user?.studentProfileId); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

  const initWorkflow = async () => {
    setBusy(true);
    try { await LicenseWorkflowApi.initialize(lookupStudentId); toast.success('License progress started'); load(lookupStudentId); }
    catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  // Normally automatic (a passed linked quiz), so it's only offered as an
  // admin override at the one stage where it applies.
  const markQuizPassed = async () => {
    setBusy(true);
    try { await LicenseWorkflowApi.markQuizPassed(activeStudentId); toast.success('Marked quiz passed'); load(activeStudentId); }
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

  const advance = async (targetStage) => {
    setBusy(true);
    try {
      await LicenseWorkflowApi.advance(activeStudentId, targetStage, null);
      toast.success('Stage advanced');
      load(activeStudentId);
    } catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  const curIdx = workflow ? LICENSE_STAGES.indexOf(workflow.currentStage) : -1;
  // The backend only accepts the next stage in sequence, so only that is offered.
  const nextStage = curIdx >= 0 ? LICENSE_STAGES[curIdx + 1] : undefined;

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
        </div>
      )}

      {!workflow && notStarted ? (
        <EmptyState icon={<Icons.IconShield size={22} />} title="License progress not started yet">
          {isStudent
            ? 'Your license progress hasn’t been started yet — your school admin will set it up.'
            : 'This student’s license progress hasn’t been started yet.'}
          {isAdmin && (
            <div style={{ marginTop: 12 }}>
              <Button size="sm" onClick={initWorkflow} loading={busy}>Start license progress</Button>
            </div>
          )}
        </EmptyState>
      ) : !workflow ? (
        <EmptyState icon={<Icons.IconShield size={22} />} title="No license progress loaded yet">
          {!isStudent && 'Enter a student profile ID above and click Load.'}
        </EmptyState>
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
              {!nextStage ? (
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--success)' }}>License approved 🎉</div>
              ) : nextStage === 'QUIZ_PASSED' ? (
                <>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Moves on automatically when the student passes a linked quiz.
                  </div>
                  {isAdmin && (
                    <Button size="sm" variant="outline" onClick={markQuizPassed} loading={busy}>Mark quiz passed (manual override)</Button>
                  )}
                </>
              ) : (
                <Button onClick={() => advance(nextStage)} loading={busy}>Advance to: {humanize(nextStage)}</Button>
              )}
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

      {/* Students and instructors load their own list straight away; an admin has
          nothing to show until they look a student up. */}
      {!loading && assessments === null && !isStudent && !isInstructor ? (
        <EmptyState icon={<Icons.IconShield size={22} />} title="Look up a student">
          Enter a student profile ID above to see their driving assessments.
        </EmptyState>
      ) : loading || assessments === null ? (
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
