import { useState } from 'react';
import { AttendanceApi } from '../../api/endpoints';
import { Badge, Button, Card, Field, Input, Icons, useToast } from '../../components/ui';
import { fmtTime } from '../../utils/format';
import {
  STATUS_LABELS, LESSON_TYPE_LABELS, confirmationReasonText, formatDistance, getCurrentPosition,
} from './attendanceUtils';

// Why an instructor's check-in was refused, from the details the server sends back.
function instructorRejection(err) {
  const d = err?.payload?.data;
  if (d?.distanceMeters != null && d?.radiusMeters != null) {
    return `You’re about ${formatDistance(d.distanceMeters)} from school. Instructors need to be within ${formatDistance(d.radiusMeters)} to check in.`;
  }
  if (d?.accuracyMeters != null && d?.maxAccuracyMeters != null) {
    return `Your phone could only place you within ${formatDistance(d.accuracyMeters)} (it needs ${formatDistance(d.maxAccuracyMeters)} or better). Turn on precise location or step outside, then try again.`;
  }
  return err?.message;
}

/**
 * Today's check-in: the button (with the lesson choice for students), or
 * today's result once there is one.
 *  - today: today's record, or null
 *  - onCheckedIn(): reload after a check-in (or when the server says it's already done)
 */
export default function CheckInCard({ isStudent, today, onCheckedIn }) {
  const toast = useToast();
  const [lessonType, setLessonType] = useState('');
  const [topic, setTopic] = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState('');
  const [error, setError] = useState('');

  const checkIn = async (e) => {
    e.preventDefault();
    if (isStudent && !lessonType) { setError('Choose whether today is a practical or a theory lesson.'); return; }
    setError('');
    setBusy(true);
    try {
      setStep('Finding your location…');
      const position = await getCurrentPosition();
      setStep('Checking you in…');
      const payload = { ...position };
      if (isStudent) {
        payload.lessonType = lessonType;
        if (topic.trim()) payload.topic = topic.trim();
      }
      const record = await AttendanceApi.checkIn(payload);
      toast.success(record?.status === 'PENDING_CONFIRMATION' ? 'Checked in - waiting for an instructor to confirm' : 'You’re checked in');
      onCheckedIn();
    } catch (err) {
      if (/already checked in/i.test(err.message || '')) { onCheckedIn(); return; }
      setError(isStudent ? err.message : instructorRejection(err));
    } finally {
      setBusy(false);
      setStep('');
    }
  };

  if (today && today.status !== 'NOT_CHECKED_IN') {
    return (
      <Card className="att-today">
        <TodayResult entry={today} />
      </Card>
    );
  }

  return (
    <Card className="att-today">
      <div className="att-card-title">Check in for today</div>
      <p className="att-muted" style={{ margin: '4px 0 16px' }}>
        We use your location once, to confirm you’re at school. {isStudent ? 'Your instructor will see the lesson you choose.' : ''}
      </p>
      <form onSubmit={checkIn}>
        {isStudent && (
          <>
            <fieldset className="att-choice" aria-describedby="att-lesson-hint">
              <legend className="field-label">Today’s lesson <span aria-hidden="true" style={{ color: 'var(--danger)' }}>*</span></legend>
              {['PRACTICAL', 'THEORY'].map((t) => (
                <label key={t} className={`att-choice-option ${lessonType === t ? 'selected' : ''}`}>
                  <input type="radio" name="lessonType" value={t} checked={lessonType === t} onChange={() => { setLessonType(t); setError(''); }} />
                  {t === 'PRACTICAL' ? <Icons.IconCar size={18} /> : <Icons.IconBook size={18} />}
                  <span>{LESSON_TYPE_LABELS[t]} lesson</span>
                </label>
              ))}
            </fieldset>
            <div id="att-lesson-hint" className="field-hint" style={{ margin: '6px 0 14px' }}>Practical = driving; theory = classroom.</div>
            <Field label="Topic" hint="Optional, e.g. Reverse parking or Road signs" style={{ marginBottom: 16 }}>
              <Input maxLength={200} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="What are you working on?" />
            </Field>
          </>
        )}
        {error && <div className="att-note att-note-danger" role="alert" style={{ marginBottom: 14 }}>{error}</div>}
        <Button type="submit" block loading={busy} className="att-checkin-btn">
          <Icons.IconPin size={16} /> {busy ? step || 'Checking in…' : 'Check in'}
        </Button>
      </form>
    </Card>
  );
}

function TodayResult({ entry }) {
  const pending = entry.status === 'PENDING_CONFIRMATION';
  const reason = confirmationReasonText(entry, { self: true });
  const lesson = [entry.lessonType && `${LESSON_TYPE_LABELS[entry.lessonType] || entry.lessonType} lesson`, entry.topic].filter(Boolean).join(' · ');
  return (
    <div className="att-result">
      <div className={`att-result-icon ${pending ? 'pending' : entry.status === 'ABSENT' ? 'absent' : ''}`}>
        {pending ? <Icons.IconClock size={22} /> : entry.status === 'ABSENT' ? <Icons.IconClose size={22} /> : <Icons.IconCheck size={22} />}
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="att-card-title">
          {pending ? 'Checked in - waiting for an instructor' : entry.status === 'ABSENT' ? 'Marked absent today' : entry.status === 'LATE' ? 'Checked in (late)' : 'You’re checked in'}
        </div>
        <div className="att-muted" style={{ marginTop: 4 }}>
          {pending && reason ? `An instructor needs to confirm it because ${reason}. ` : ''}
          {entry.checkedInAt ? `Checked in at ${fmtTime(entry.checkedInAt)}.` : ''}
          {entry.confirmedByName ? ` Confirmed by ${entry.confirmedByName}.` : ''}
          {entry.recordedByName && entry.source === 'MANUAL' ? ` Recorded by ${entry.recordedByName}${entry.reason ? ` (“${entry.reason}”)` : ''}.` : ''}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
          <Badge status={entry.status}>{STATUS_LABELS[entry.status] || entry.status}</Badge>
          {lesson && <span className="att-muted">{lesson}</span>}
        </div>
      </div>
    </div>
  );
}
