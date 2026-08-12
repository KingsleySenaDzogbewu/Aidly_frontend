import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useToast } from '../components/ui';
import { useAuth } from '../auth/AuthContext';
import { NotificationApi, StudentApi, InstructorApi } from '../api/endpoints';
import { Button, Card, Field, Input, Select, Textarea } from '../components/ui';

const CHANNELS = ['IN_APP', 'EMAIL', 'SMS', 'PUSH'];
const emptyForm = { userId: '', subject: '', body: '', channel: 'IN_APP', recipientAddress: '' };

// Backend: POST /notifications/send, hasAnyRole('ADMIN','INSTRUCTOR'), takes a
// User ID (not a student/instructor profile ID - a separate, easily confused
// number shown elsewhere in the app, e.g. Routes & Progress's "Student
// profile ID" field). Rather than make either role hunt for or transcribe
// that ID, this picks a name from the caller's own school and resolves it to
// the right userId under the hood - the same data Admin > Directory already
// pulls via these same list-by-school endpoints. Falls back to the raw ID
// field only when there's no schoolId to scope by (a bootstrap admin, who
// owns no school) or the lists fail to load.
export default function SendNotificationPage() {
  const location = useLocation();
  const toast = useToast();
  const { user } = useAuth();
  const prefill = location.state || {};
  const [form, setForm] = useState({ ...emptyForm, userId: prefill.userId ? String(prefill.userId) : '' });
  const [busy, setBusy] = useState(false);
  const [recipients, setRecipients] = useState(null);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  useEffect(() => {
    let cancelled = false;
    const schoolId = user?.schoolId;
    if (!schoolId) { setRecipients(null); return undefined; }
    setLoadingRecipients(true);
    Promise.all([
      StudentApi.listBySchool(schoolId).catch(() => []),
      InstructorApi.listBySchool(schoolId).catch(() => []),
    ])
      .then(([students, instructors]) => {
        if (cancelled) return;
        const list = [
          ...(students || []).map((s) => ({ userId: s.userId, name: `${s.firstName} ${s.lastName}`, role: 'Student' })),
          ...(instructors || []).map((i) => ({ userId: i.userId, name: `${i.firstName} ${i.lastName}`, role: 'Instructor' })),
        ];
        setRecipients(list.length > 0 ? list : null);
      })
      .finally(() => { if (!cancelled) setLoadingRecipients(false); });
    return () => { cancelled = true; };
  }, [user?.schoolId]);

  const needsAddress = form.channel === 'EMAIL' || form.channel === 'SMS';

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await NotificationApi.send({
        userId: Number(form.userId),
        subject: form.subject,
        body: form.body,
        channel: form.channel,
        recipientAddress: form.recipientAddress || null,
      });
      toast.success('Notification sent');
      setForm(emptyForm);
    } catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="fade-in">
      <h1 className="page-title">Send a notification</h1>
      <p className="page-subtitle" style={{ marginBottom: 20 }}>
        Send a one-off message to a specific user{prefill.name ? ` — sending to ${prefill.name}` : ''}.
      </p>
      <Card style={{ maxWidth: 560 }}>
        <form onSubmit={submit} className="form-grid respo-two-col">
          {loadingRecipients ? (
            <Field label="Recipient" required>
              <Select disabled value=""><option>Loading recipients…</option></Select>
            </Field>
          ) : recipients ? (
            <Field label="Recipient" required>
              <Select required value={form.userId} onChange={set('userId')}>
                <option value="">Select a recipient…</option>
                {recipients.map((r) => (
                  <option key={r.userId} value={r.userId}>{r.name} ({r.role})</option>
                ))}
              </Select>
            </Field>
          ) : (
            <Field label="User ID" required hint="The account's user ID, not a student/instructor profile ID">
              <Input type="number" required value={form.userId} onChange={set('userId')} />
            </Field>
          )}
          <Field label="Channel" required>
            <Select value={form.channel} onChange={set('channel')}>
              {CHANNELS.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
            </Select>
          </Field>
          <Field label="Subject" required className="span-2"><Input required maxLength={200} value={form.subject} onChange={set('subject')} /></Field>
          <Field label="Message" required className="span-2"><Textarea rows={4} required value={form.body} onChange={set('body')} /></Field>
          {needsAddress && (
            <Field label={form.channel === 'EMAIL' ? 'Email address' : 'Phone number'} className="span-2" hint="Where to deliver this outside the app (optional — falls back to the account's own contact info if left blank)">
              <Input value={form.recipientAddress} onChange={set('recipientAddress')} />
            </Field>
          )}
          <Button type="submit" className="span-2" loading={busy}>Send notification</Button>
        </form>
      </Card>
    </div>
  );
}
