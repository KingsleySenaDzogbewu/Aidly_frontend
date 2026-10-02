import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/ui';
import { AuthApi, StudentApi, UserApi } from '../api/endpoints';
import { Avatar, Badge, Button, Card, EmptyState, Field, Icons, Input, Modal, SkeletonList } from '../components/ui';
import PhotoField from '../features/photos/PhotoField';
import PhotoEditor from '../features/photos/PhotoEditor';

const emptyForm = { email: '', password: '', firstName: '', lastName: '', phone: '', dateOfBirth: '' };

// Instructors can register STUDENT accounts (only for their own school -
// enforced server-side in AuthServiceImpl.validateCallerCanCreate). Admins
// have the equivalent, broader capability already on the Admin page.
export default function CreateStudentPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState(emptyForm);
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [students, setStudents] = useState(null);
  const [photoTarget, setPhotoTarget] = useState(null); // { userId, name, src }
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const loadStudents = async () => {
    if (!user?.schoolId) { setStudents([]); return; }
    try {
      const list = await StudentApi.listBySchool(user.schoolId);
      setStudents((list || []).slice().sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`)));
    } catch (err) {
      toast.error(err.message);
      setStudents([]);
    }
  };
  useEffect(() => { loadStudents(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.schoolId]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const created = await AuthApi.register({
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || null,
        dateOfBirth: form.dateOfBirth || null,
        schoolId: user?.schoolId,
        role: 'STUDENT',
      });
      toast.success(`Student account created for ${form.email}`);
      // The photo goes up once the account exists. If it fails, the account
      // is still there and the photo can be added from the list below.
      const newUserId = created?.user?.id;
      if (photo && newUserId) {
        try { await UserApi.uploadPhoto(newUserId, photo); }
        catch (err) { toast.error(`The account was created, but the photo didn’t save: ${err.message} You can add it from “Your students” below.`); }
      }
      setForm(emptyForm);
      setPhoto(null);
      loadStudents();
    } catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="fade-in">
      <h1 className="page-title">Add a student</h1>
      <p className="page-subtitle" style={{ marginBottom: 20 }}>
        Create a new student account for your school (School ID {user?.schoolId ?? '—'}). They&rsquo;ll sign in with the
        email and temporary password you set below.
      </p>
      <Card style={{ maxWidth: 560 }}>
        <form onSubmit={submit} className="form-grid respo-two-col">
          <Field label="Email" required className="span-2">
            <Input type="email" required value={form.email} onChange={set('email')} placeholder="student@school.com" />
          </Field>
          <Field label="Temporary password" required hint="8–100 characters — they can change it later" className="span-2">
            <Input type="password" required minLength={8} value={form.password} onChange={set('password')} />
          </Field>
          <Field label="First name" required><Input required value={form.firstName} onChange={set('firstName')} /></Field>
          <Field label="Last name" required><Input required value={form.lastName} onChange={set('lastName')} /></Field>
          <Field label="Phone" hint="Include the country code so login codes can go by WhatsApp"><Input type="tel" maxLength={20} placeholder="+233 24 123 4567" value={form.phone} onChange={set('phone')} /></Field>
          <Field label="Date of birth"><Input type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} /></Field>
          <Field label="Photo" className="span-2" hint="Optional. JPEG, PNG or WebP, up to 5 MB. You can add or change it later.">
            <PhotoField value={photo} onChange={setPhoto} name={`${form.firstName} ${form.lastName}`.trim()} />
          </Field>
          <Button type="submit" className="span-2" loading={busy}>Create student account</Button>
        </form>
      </Card>

      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '28px 0 12px' }}>Your students</h2>
      {students === null ? (
        <SkeletonList count={3} small />
      ) : students.length === 0 ? (
        <EmptyState icon={<Icons.IconUser size={22} />} title="No students yet">Students you add will show here.</EmptyState>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 560 }}>
          {students.map((s) => (
            <Card key={s.id} tight>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Avatar src={s.profileImageUrl} firstName={s.firstName} lastName={s.lastName} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{s.firstName} {s.lastName}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.email}</div>
                </div>
                {s.status && s.status !== 'ACTIVE' && <Badge status={s.status}>{s.status}</Badge>}
                <Button size="sm" variant="outline" onClick={() => setPhotoTarget({ userId: s.userId, name: `${s.firstName} ${s.lastName}`, src: s.profileImageUrl })}>
                  {s.profileImageUrl ? 'Change photo' : 'Add photo'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!photoTarget} onClose={() => setPhotoTarget(null)} title={`${photoTarget?.name ?? ''}’s photo`}>
        {photoTarget && (
          <PhotoEditor
            userId={photoTarget.userId}
            src={photoTarget.src}
            name={photoTarget.name}
            onChanged={(url) => { setPhotoTarget((t) => (t ? { ...t, src: url } : t)); loadStudents(); }}
          />
        )}
      </Modal>
    </div>
  );
}
