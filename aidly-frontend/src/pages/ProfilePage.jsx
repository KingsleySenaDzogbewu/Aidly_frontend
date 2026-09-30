import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/ui';
import { InstructorApi, StudentApi } from '../api/endpoints';
import { Button, Card, Field, Input, Textarea, Icons } from '../components/ui';
import { initials } from '../utils/format';

const emptyForm = { firstName: '', lastName: '', phone: '', specialization: '', yearsExperience: '', bio: '', dateOfBirth: '', profileImageUrl: '' };

export default function ProfilePage() {
  const { user, isInstructor, isStudent, isAdmin, refreshMe } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      if (isInstructor) {
        const p = await InstructorApi.me();
        setProfile(p);
        setForm({ ...emptyForm, firstName: p.firstName, lastName: p.lastName, phone: p.phone || '', specialization: p.specialization || '', yearsExperience: p.yearsExperience ?? '', bio: p.bio || '' });
      } else if (isStudent) {
        const p = await StudentApi.me();
        setProfile(p);
        setForm({ ...emptyForm, firstName: p.firstName, lastName: p.lastName, phone: p.phone || '', dateOfBirth: p.dateOfBirth || '', profileImageUrl: p.profileImageUrl || '' });
      }
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isInstructor) {
        await InstructorApi.updateMe({
          firstName: form.firstName, lastName: form.lastName, phone: form.phone || null,
          specialization: form.specialization || null,
          yearsExperience: form.yearsExperience !== '' ? Number(form.yearsExperience) : null,
          bio: form.bio || null,
        });
      } else {
        await StudentApi.updateMe({
          firstName: form.firstName, lastName: form.lastName, phone: form.phone || null,
          dateOfBirth: form.dateOfBirth || null, profileImageUrl: form.profileImageUrl || null,
        });
      }
      toast.success('Profile updated');
      setEditing(false);
      load();
      refreshMe();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fade-in" style={{ maxWidth: 600 }}>
      <h1 className="page-title">Profile</h1>
      <p className="page-subtitle" style={{ marginBottom: 22 }}>Your account details.</p>

      {isAdmin ? (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="avatar" style={{ width: 46, height: 46, fontSize: 16 }}>{initials(null, null, user?.email)}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, wordBreak: 'break-word' }}>{user?.email}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Administrator</div>
            </div>
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 16, lineHeight: 1.6 }}>
            Admin accounts don&rsquo;t have a student/instructor profile. Manage accounts and schools from Administration.
          </p>
        </Card>
      ) : loading ? (
        <Card><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading…</div></Card>
      ) : !profile ? (
        <Card><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No profile found.</div></Card>
      ) : (
        <Card>
          {editing ? (
            <form onSubmit={save}>
              <div className="form-grid respo-two-col">
                <Field label="First name" required><Input required value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} /></Field>
                <Field label="Last name" required><Input required value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} /></Field>
                <Field label="Phone" hint="Include the country code, e.g. +233 24 123 4567"><Input type="tel" maxLength={20} placeholder="+233 24 123 4567" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></Field>
                {isInstructor && (
                  <>
                    <Field label="Specialization"><Input value={form.specialization} onChange={(e) => setForm((f) => ({ ...f, specialization: e.target.value }))} /></Field>
                    <Field label="Years experience"><Input type="number" min={0} value={form.yearsExperience} onChange={(e) => setForm((f) => ({ ...f, yearsExperience: e.target.value }))} /></Field>
                    <Field label="Bio" className="span-2"><Textarea rows={3} value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} /></Field>
                  </>
                )}
                {isStudent && (
                  <Field label="Date of birth"><Input type="date" value={form.dateOfBirth} onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))} /></Field>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <Button type="submit" loading={saving}>Save</Button>
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </form>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                <div className="avatar" style={{ width: 52, height: 52, fontSize: 17 }}>{initials(profile.firstName, profile.lastName)}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 19, fontWeight: 700, wordBreak: 'break-word' }}>{profile.firstName} {profile.lastName}</div>
                  <div style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 2, wordBreak: 'break-word' }}>{profile.email} {profile.phone ? `· ${profile.phone}` : ''}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{profile.schoolName}</div>
                </div>
              </div>

              {isInstructor && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13.5, marginBottom: 16 }}>
                  {profile.specialization && <div>Specialization: <strong>{profile.specialization}</strong></div>}
                  {profile.yearsExperience != null && <div>Experience: <strong>{profile.yearsExperience} years</strong></div>}
                  {profile.licenseNumber && <div>License: <strong>{profile.licenseNumber}</strong></div>}
                  <div>Status: <strong>{profile.active ? 'Active' : 'Inactive'}</strong></div>
                  {profile.bio && <div style={{ marginTop: 4 }}>{profile.bio}</div>}
                </div>
              )}
              {isStudent && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13.5, marginBottom: 16 }}>
                  {profile.dateOfBirth && <div>Date of birth: <strong>{profile.dateOfBirth}</strong></div>}
                  {profile.enrollmentDate && <div>Enrolled: <strong>{profile.enrollmentDate}</strong></div>}
                  <div>Status: <strong>{profile.status}</strong></div>
                </div>
              )}

              <Button variant="outline" onClick={() => setEditing(true)}>
                <Icons.IconUser size={14} /> Edit profile
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
