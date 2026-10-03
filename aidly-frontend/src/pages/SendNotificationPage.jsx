import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useToast } from '../components/ui';
import { useAuth } from '../auth/AuthContext';
import { NotificationApi, StudentApi, InstructorApi, SchoolApi } from '../api/endpoints';
import { Button, Card, Field, Input, Select, Textarea } from '../components/ui';

// PUSH isn't wired to a provider on the backend yet and always fails - not offered.
const CHANNELS = ['IN_APP', 'EMAIL', 'SMS'];
const emptyForm = { userId: '', subject: '', body: '', channel: 'IN_APP', recipientAddress: '' };

// Backend: POST /notifications/send takes a User ID (not a student/instructor
// profile ID). People pick a name from the school's lists instead and the
// matching userId is sent. The bootstrap admin, who owns no school, picks the
// school first.
export default function SendNotificationPage() {
  const location = useLocation();
  const toast = useToast();
  const { user, isBootstrapAdmin } = useAuth();
  const prefill = location.state || {};
  const [form, setForm] = useState({ ...emptyForm, userId: prefill.userId ? String(prefill.userId) : '' });
  const [busy, setBusy] = useState(false);
  const [recipients, setRecipients] = useState(null);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  // The bootstrap admin owns no school, so they choose which school's people to list.
  const [schools, setSchools] = useState([]);
  const [chosenSchoolId, setChosenSchoolId] = useState('');
  const schoolId = user?.schoolId || chosenSchoolId;

  useEffect(() => {
    if (!isBootstrapAdmin) return;
    SchoolApi.list().then((list) => setSchools(list || [])).catch(() => setSchools([]));
  }, [isBootstrapAdmin]);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  useEffect(() => {
    let cancelled = false;
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
  }, [schoolId]);

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
          {isBootstrapAdmin && (
            <Field label="School" required className="span-2">
              <Select required value={chosenSchoolId} onChange={(e) => { setChosenSchoolId(e.target.value); setForm((f) => ({ ...f, userId: '' })); }}>
                <option value="">Choose a school…</option>
                {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
          )}
          {isBootstrapAdmin && !chosenSchoolId ? null : loadingRecipients ? (
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
            <Field label="Recipient" required>
              <Select disabled value=""><option>No one to send to at this school</option></Select>
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
