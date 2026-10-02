import { useCallback, useEffect, useMemo, useState } from 'react';
import { AttendanceApi } from '../../api/endpoints';
import { Avatar, Badge, Button, Card, EmptyState, Field, Icons, Input, Modal, SkeletonList, Tabs, useToast } from '../../components/ui';
import { fmtDateTime, fmtTime } from '../../utils/format';
import {
  STATUS_LABELS, LESSON_TYPE_LABELS, addDays, confirmationReasonText, fmtPlainDate, formatDistance, saveBlob, todayIn,
} from './attendanceUtils';

const MARKS = ['PRESENT', 'LATE', 'ABSENT'];
const MAX_REGISTER_DAYS = 62;

// Roll call starts from what the day already says.
function initialMark(status) {
  if (status === 'LATE') return 'LATE';
  if (status === 'PRESENT' || status === 'PENDING_CONFIRMATION') return 'PRESENT';
  return 'ABSENT';
}

function daysBetween(from, to) {
  return Math.round((new Date(`${to}T12:00:00Z`) - new Date(`${from}T12:00:00Z`)) / 86400000) + 1;
}

function MarkPicker({ value, onChange, name }) {
  return (
    <div className="att-marks" role="radiogroup" aria-label={`Attendance for ${name}`}>
      {MARKS.map((m) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={value === m}
          className={`att-mark att-mark-${m.toLowerCase()} ${value === m ? 'selected' : ''}`}
          onClick={() => onChange(m)}
        >
          {STATUS_LABELS[m]}
        </button>
      ))}
    </div>
  );
}

/**
 * One day's attendance for the school, for instructors and admins:
 * confirm pending check-ins, correct a day, take the roll call, download Excel.
 *  - canSeeInstructors: admin only (switch between students and instructors)
 */
export default function DayRegister({ schoolId, timeZone, canSeeInstructors }) {
  const toast = useToast();
  const today = todayIn(timeZone);
  const [role, setRole] = useState('STUDENT');
  const [date, setDate] = useState(today);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [editing, setEditing] = useState(null); // { userId, status, reason }
  const [roll, setRoll] = useState(null); // { [userId]: { status, reason } } while taking the roll call
  const [savingRoll, setSavingRoll] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [range, setRange] = useState({ from: addDays(today, -29), to: today });
  const [downloading, setDownloading] = useState('');

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const list = await AttendanceApi.day(schoolId, { date, role });
      setEntries(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.error(err.message);
      setEntries([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, date, role]);

  useEffect(() => { setRoll(null); setEditing(null); load(); }, [load]);

  // Check-ins arrive while staff have the page open - refresh when they come back to it.
  useEffect(() => {
    const onVisible = () => { if (!document.hidden && !roll && !editing) load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load, roll, editing]);

  const counts = useMemo(() => {
    const c = {};
    entries.forEach((e) => { c[e.status] = (c[e.status] || 0) + 1; });
    return c;
  }, [entries]);
  const reviewed = entries.some((e) => e.reviewedAt);
  const who = role === 'STUDENT' ? 'student' : 'instructor';

  const confirm = async (entry) => {
    setBusyId(entry.userId);
    try {
      await AttendanceApi.confirm(entry.id);
      toast.success(`${entry.name}’s check-in confirmed`);
      await load();
    } catch (err) { toast.error(err.message); }
    finally { setBusyId(null); }
  };

  const saveEdit = async () => {
    setBusyId(editing.userId);
    try {
      await AttendanceApi.manual({ userId: editing.userId, date, status: editing.status, reason: editing.reason.trim() || undefined });
      toast.success('Attendance updated');
      setEditing(null);
      await load();
    } catch (err) { toast.error(err.message); }
    finally { setBusyId(null); }
  };

  const startRoll = () => {
    const draft = {};
    entries.forEach((e) => { draft[e.userId] = { status: initialMark(e.status), reason: '' }; });
    setEditing(null);
    setRoll(draft);
  };

  const saveRoll = async () => {
    setSavingRoll(true);
    try {
      await AttendanceApi.rollCall(schoolId, {
        date,
        role,
        entries: entries.map((e) => ({
          userId: e.userId,
          status: roll[e.userId].status,
          ...(roll[e.userId].reason.trim() ? { reason: roll[e.userId].reason.trim() } : {}),
        })),
      });
      toast.success('Roll call saved');
      setRoll(null);
      await load();
    } catch (err) { toast.error(err.message); }
    finally { setSavingRoll(false); }
  };

  const downloadDay = async () => {
    setDownloading('day');
    try {
      const blob = await AttendanceApi.exportDay(schoolId, { date, role });
      saveBlob(blob, `attendance-day-${who}-${date}.xlsx`);
    } catch (err) { toast.error(err.message); }
    finally { setDownloading(''); }
  };

  const rangeError = !range.from || !range.to ? 'Choose both dates.'
    : range.from > range.to ? 'The start date is after the end date.'
      : range.to > today ? 'The end date can’t be in the future.'
        : daysBetween(range.from, range.to) > MAX_REGISTER_DAYS ? `Choose at most ${MAX_REGISTER_DAYS} days.` : '';

  const downloadRegister = async () => {
    if (rangeError) return;
    setDownloading('register');
    try {
      const blob = await AttendanceApi.exportRegister(schoolId, { from: range.from, to: range.to, role });
      saveBlob(blob, `attendance-register-${who}-${range.from}-to-${range.to}.xlsx`);
      setExportOpen(false);
    } catch (err) { toast.error(err.message); }
    finally { setDownloading(''); }
  };

  return (
    <Card>
      <div className="att-register-head">
        <div>
          <div className="att-card-title">{date === today ? 'Today’s register' : `Register for ${fmtPlainDate(date)}`}</div>
          <div className="att-muted" style={{ marginTop: 2 }}>
            {loading ? 'Loading…' : [
              `${(counts.PRESENT || 0) + (counts.LATE || 0)} present`,
              counts.LATE ? `${counts.LATE} late` : null,
              counts.PENDING_CONFIRMATION ? `${counts.PENDING_CONFIRMATION} awaiting confirmation` : null,
              counts.ABSENT ? `${counts.ABSENT} absent` : null,
              counts.NOT_CHECKED_IN ? `${counts.NOT_CHECKED_IN} not checked in` : null,
            ].filter(Boolean).join(' · ')}
          </div>
        </div>
        {canSeeInstructors && (
          <Tabs value={role} onChange={setRole} options={[{ value: 'STUDENT', label: 'Students' }, { value: 'INSTRUCTOR', label: 'Instructors' }]} />
        )}
      </div>

      <div className="att-toolbar">
        <div className="att-date">
          <button type="button" className="btn btn-outline btn-sm" aria-label="Previous day" onClick={() => setDate((d) => addDays(d, -1))} disabled={!!roll}>
            <Icons.IconChevronRight size={14} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <Input
            type="date"
            size="sm"
            aria-label="Date"
            value={date}
            max={today}
            disabled={!!roll}
            onChange={(e) => e.target.value && setDate(e.target.value > today ? today : e.target.value)}
          />
          <button type="button" className="btn btn-outline btn-sm" aria-label="Next day" onClick={() => setDate((d) => addDays(d, 1))} disabled={!!roll || date >= today}>
            <Icons.IconChevronRight size={14} />
          </button>
          {date !== today && !roll && <Button size="sm" variant="ghost" onClick={() => setDate(today)}>Today</Button>}
        </div>
        <div className="att-toolbar-actions">
          {!roll && (
            <>
              <Button size="sm" variant="ghost" onClick={load} disabled={loading}>Refresh</Button>
              <Button size="sm" variant="outline" loading={downloading === 'day'} onClick={downloadDay}><Icons.IconDownload size={14} /> Day list</Button>
              <Button size="sm" variant="outline" onClick={() => setExportOpen(true)}><Icons.IconDownload size={14} /> Register</Button>
              <Button size="sm" onClick={startRoll} disabled={loading || entries.length === 0}>Take roll call</Button>
            </>
          )}
        </div>
      </div>

      {!loading && entries.length > 0 && !reviewed && !roll && (
        <div className="att-note att-note-warning" style={{ marginBottom: 12 }}>
          Roll call not taken yet for this day. A check-in only shows someone arrived - take the roll call to confirm who stayed.
        </div>
      )}
      {roll && (
        <div className="att-note att-note-info" style={{ marginBottom: 12 }}>
          Roll call: mark everyone as you see them now, then save. Anyone who signed in and left can be marked absent with a reason.
        </div>
      )}

      {loading ? (
        <SkeletonList count={4} small />
      ) : entries.length === 0 ? (
        <EmptyState icon={<Icons.IconUser size={22} />} title={`No active ${who}s`}>Nobody to show for this day.</EmptyState>
      ) : (
        <ul className="att-rows">
          {entries.map((e) => {
            const pendingReason = e.status === 'PENDING_CONFIRMATION' ? confirmationReasonText(e) : null;
            const detail = [
              e.lessonType && (LESSON_TYPE_LABELS[e.lessonType] || e.lessonType),
              e.topic,
              e.checkedInAt && `in at ${fmtTime(e.checkedInAt)}`,
              e.distanceMeters != null && `${formatDistance(e.distanceMeters)} from school`,
              e.accuracyMeters != null && `±${formatDistance(e.accuracyMeters)}`,
            ].filter(Boolean).join(' · ');
            const trail = [
              e.confirmedByName && `Confirmed by ${e.confirmedByName}`,
              e.source === 'MANUAL' && e.recordedByName && `Recorded by ${e.recordedByName}${e.reason ? `: “${e.reason}”` : ''}`,
              e.reviewedByName && `Roll call by ${e.reviewedByName}${e.reviewedAt ? ` · ${fmtDateTime(e.reviewedAt)}` : ''}`,
            ].filter(Boolean);
            const isEditing = editing?.userId === e.userId;
            return (
              <li key={e.userId} className={`att-row ${roll ? 'rolling' : ''}`}>
                <div className="att-row-main">
                  <div className="att-row-name">
                    <Avatar src={e.profileImageUrl} name={e.name} size={28} />
                    {e.name || `User #${e.userId}`}
                  </div>
                  {detail && <div className="att-muted">{detail}</div>}
                  {pendingReason && <div className="att-row-warn">Needs confirming: {pendingReason}</div>}
                  {!roll && trail.map((t) => <div key={t} className="att-row-trail">{t}</div>)}
                </div>

                {roll ? (
                  <div className="att-row-roll">
                    <MarkPicker
                      name={e.name}
                      value={roll[e.userId]?.status}
                      onChange={(status) => setRoll((r) => ({ ...r, [e.userId]: { ...r[e.userId], status } }))}
                    />
                    <Input
                      size="sm"
                      maxLength={500}
                      placeholder="Reason (optional)"
                      aria-label={`Reason for ${e.name}`}
                      value={roll[e.userId]?.reason || ''}
                      onChange={(ev) => setRoll((r) => ({ ...r, [e.userId]: { ...r[e.userId], reason: ev.target.value } }))}
                    />
                  </div>
                ) : (
                  <div className="att-row-side">
                    <Badge status={e.status}>{STATUS_LABELS[e.status] || e.status}</Badge>
                    {e.status === 'PENDING_CONFIRMATION' && e.id && (
                      <Button size="sm" loading={busyId === e.userId} onClick={() => confirm(e)}>Confirm</Button>
                    )}
                    {!isEditing && (
                      <Button size="sm" variant="outline" onClick={() => setEditing({ userId: e.userId, status: initialMark(e.status), reason: '' })}>Change</Button>
                    )}
                  </div>
                )}

                {isEditing && !roll && (
                  <div className="att-row-edit">
                    <MarkPicker name={e.name} value={editing.status} onChange={(status) => setEditing((x) => ({ ...x, status }))} />
                    <Input
                      size="sm"
                      maxLength={500}
                      placeholder="Reason (optional), e.g. Arrived 09:40 or Sick note"
                      aria-label={`Reason for ${e.name}`}
                      value={editing.reason}
                      onChange={(ev) => setEditing((x) => ({ ...x, reason: ev.target.value }))}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button size="sm" loading={busyId === e.userId} onClick={saveEdit}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {roll && (
        <div className="att-roll-bar">
          <Button variant="ghost" onClick={() => setRoll(null)} disabled={savingRoll}>Cancel</Button>
          <Button loading={savingRoll} onClick={saveRoll}>Save roll call ({entries.length})</Button>
        </div>
      )}

      <Modal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title={`Download the ${who} register`}
        footer={(
          <>
            <Button variant="outline" onClick={() => setExportOpen(false)}>Cancel</Button>
            <Button loading={downloading === 'register'} disabled={!!rangeError} onClick={downloadRegister}>
              <Icons.IconDownload size={14} /> Download Excel
            </Button>
          </>
        )}
      >
        <p className="att-muted" style={{ marginTop: 0 }}>
          One row per {who}, one column per day (P, L, A), with totals. Up to {MAX_REGISTER_DAYS} days, laid out to print.
        </p>
        <div className="form-grid respo-two-col">
          <Field label="From"><Input type="date" max={today} value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} /></Field>
          <Field label="To" error={rangeError || undefined}><Input type="date" max={today} value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} /></Field>
        </div>
      </Modal>
    </Card>
  );
}
