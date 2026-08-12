import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/ui';
import { AuthApi } from '../api/endpoints';
import { Button, Card, Field, Input } from '../components/ui';

const emptyForm = { email: '', password: '', firstName: '', lastName: '', phone: '', dateOfBirth: '' };

// Instructors can register STUDENT accounts (only for their own school -
// enforced server-side in AuthServiceImpl.validateCallerCanCreate). Admins
// have the equivalent, broader capability already on the Admin page.
export default function CreateStudentPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await AuthApi.register({
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
      setForm(emptyForm);
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
          <Field label="Phone"><Input value={form.phone} onChange={set('phone')} /></Field>
          <Field label="Date of birth"><Input type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} /></Field>
          <Button type="submit" className="span-2" loading={busy}>Create student account</Button>
        </form>
      </Card>
    </div>
  );
}
