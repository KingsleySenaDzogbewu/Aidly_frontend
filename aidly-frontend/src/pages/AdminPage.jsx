import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/ui';
import { AuthApi, InstructorApi, StudentApi, UserApi, RoleApi } from '../api/endpoints';
import { Button, Card, Badge, Field, Input, Select, Tabs, Modal, EmptyState, Icons } from '../components/ui';

const emptyUser = { email: '', password: '', role: 'STUDENT', firstName: '', lastName: '', phone: '', dateOfBirth: '', schoolId: '', specialization: '', licenseNumber: '', yearsExperience: '' };
const STUDENT_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'GRADUATED'];

function RegisterTab({ toast }) {
  const { user, isBootstrapAdmin } = useAuth();
  const lockedSchoolId = !isBootstrapAdmin && user?.schoolId ? String(user.schoolId) : '';
  const [form, setForm] = useState({ ...emptyUser, schoolId: lockedSchoolId });
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await AuthApi.adminRegister({
        email: form.email, password: form.password, role: form.role, firstName: form.firstName, lastName: form.lastName,
        phone: form.phone || null, dateOfBirth: form.dateOfBirth || null, schoolId: Number(form.schoolId),
        specialization: form.specialization || null, licenseNumber: form.licenseNumber || null,
        yearsExperience: form.yearsExperience ? Number(form.yearsExperience) : null,
      });
      toast.success('User created');
      // Keep the locked school ID - the field is disabled, so wiping it would
      // send schoolId 0 on the next account.
      setForm({ ...emptyUser, schoolId: lockedSchoolId });
    } catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  const isInstructorRole = form.role === 'INSTRUCTOR';

  return (
    <Card style={{ maxWidth: 640 }}>
      <form onSubmit={submit} className="form-grid respo-two-col">
        <Field label="Email" required><Input type="email" required value={form.email} onChange={set('email')} /></Field>
        <Field label="Password" required hint="8–100 characters"><Input type="password" required minLength={8} value={form.password} onChange={set('password')} /></Field>
        <Field label="Role" required hint="Admin accounts are created by creating a school - see the Schools tab under Schools &amp; fleet">
          <Select value={form.role} onChange={set('role')}>
            <option value="STUDENT">Student</option>
            <option value="INSTRUCTOR">Instructor</option>
          </Select>
        </Field>
        <Field label="School ID" required hint={lockedSchoolId ? 'Locked to your own school' : undefined}>
          <Input required value={form.schoolId} onChange={set('schoolId')} disabled={!!lockedSchoolId} />
        </Field>
        <Field label="First name" required><Input required value={form.firstName} onChange={set('firstName')} /></Field>
        <Field label="Last name" required><Input required value={form.lastName} onChange={set('lastName')} /></Field>
        <Field label="Phone" hint="Include the country code so login codes can go by WhatsApp"><Input type="tel" maxLength={20} placeholder="+233 24 123 4567" value={form.phone} onChange={set('phone')} /></Field>
        <Field label="Date of birth"><Input type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} /></Field>
        <Field label="Specialization" hint="Instructor only"><Input value={form.specialization} onChange={set('specialization')} disabled={!isInstructorRole} /></Field>
        <Field label="License number" required={isInstructorRole} hint="Required for instructors"><Input value={form.licenseNumber} onChange={set('licenseNumber')} /></Field>
        <Field label="Years experience" className="span-2" hint="Instructor only"><Input type="number" min={0} value={form.yearsExperience} onChange={set('yearsExperience')} disabled={!isInstructorRole} /></Field>
        <Button type="submit" className="span-2" loading={busy}>Create account</Button>
      </form>
    </Card>
  );
}

function ManageTab({ toast }) {
  const [instructorId, setInstructorId] = useState('');
  const [instructorActive, setInstructorActive] = useState('true');
  const [studentId, setStudentId] = useState('');
  const [studentStatus, setStudentStatus] = useState('ACTIVE');
  const [deleteUserId, setDeleteUserId] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const applyInstructor = async () => {
    setBusy(true);
    try { await InstructorApi.setActive(instructorId, instructorActive === 'true'); toast.success('Instructor updated'); }
    catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  const applyStudent = async () => {
    setBusy(true);
    try { await StudentApi.setStatus(studentId, studentStatus); toast.success('Student updated'); }
    catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await UserApi.remove(deleteUserId);
      toast.success('User deleted');
      setDeleteUserId('');
      setConfirmOpen(false);
    } catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 640 }}>
      <Card tight>
        <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 10 }}>Activate / deactivate instructor</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Input size="sm" placeholder="Instructor profile ID" value={instructorId} onChange={(e) => setInstructorId(e.target.value)} style={{ width: 170 }} />
          <Select size="sm" value={instructorActive} onChange={(e) => setInstructorActive(e.target.value)}>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>
          <Button size="sm" loading={busy} disabled={!instructorId} onClick={applyInstructor}>Apply</Button>
        </div>
      </Card>

      <Card tight>
        <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 10 }}>Update student status</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Input size="sm" placeholder="Student profile ID" value={studentId} onChange={(e) => setStudentId(e.target.value)} style={{ width: 170 }} />
          <Select size="sm" value={studentStatus} onChange={(e) => setStudentStatus(e.target.value)}>
            {STUDENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Button size="sm" loading={busy} disabled={!studentId} onClick={applyStudent}>Apply</Button>
        </div>
      </Card>

      <Card tight>
        <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 10 }}>Delete a user account</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Input size="sm" placeholder="User ID" value={deleteUserId} onChange={(e) => setDeleteUserId(e.target.value)} style={{ width: 170 }} />
          <Button size="sm" variant="danger-solid" disabled={!deleteUserId} onClick={() => setConfirmOpen(true)}>
            <Icons.IconTrash size={13} /> Delete
          </Button>
        </div>
      </Card>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete this user account?"
        footer={(
          <>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant="danger-solid" loading={busy} onClick={confirmDelete}>Delete account</Button>
          </>
        )}
      >
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
          This soft-deletes user #{deleteUserId}. They will no longer be able to sign in.
        </p>
      </Modal>
    </div>
  );
}

// Bootstrap-admin only: browse any school's students/instructors by ID. A
// regular admin's own directory now lives on the Fleet page's "Your school"
// dashboard instead - this tab is unreachable for them.
function DirectoryTab({ toast }) {
  const navigate = useNavigate();
  const [schoolId, setSchoolId] = useState('');
  const [students, setStudents] = useState(null);
  const [instructors, setInstructors] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = async (id = schoolId) => {
    if (!id) return;
    setLoading(true);
    try {
      const [s, i] = await Promise.all([
        StudentApi.listBySchool(id).catch(() => []),
        InstructorApi.listBySchool(id).catch(() => []),
      ]);
      setStudents(s || []);
      setInstructors(i || []);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const changeStudentStatus = async (profileId, status) => {
    setBusyId(profileId);
    try { await StudentApi.setStatus(profileId, status); toast.success('Student updated'); await load(); }
    catch (err) { toast.error(err.message); }
    finally { setBusyId(null); }
  };

  const changeInstructorActive = async (profileId, active) => {
    setBusyId(profileId);
    try { await InstructorApi.setActive(profileId, active); toast.success('Instructor updated'); await load(); }
    catch (err) { toast.error(err.message); }
    finally { setBusyId(null); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.userId);
    try {
      await UserApi.remove(deleteTarget.userId);
      toast.success('User deleted');
      setDeleteTarget(null);
      await load();
    } catch (err) { toast.error(err.message); }
    finally { setBusyId(null); }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <Input placeholder="School ID" value={schoolId} onChange={(e) => setSchoolId(e.target.value)} style={{ width: 160 }} />
        <Button variant="outline" loading={loading} onClick={() => load()}>Load directory</Button>
      </div>

      {students === null ? (
        <EmptyState icon={<Icons.IconUser size={22} />} title="Load a school to browse its students and instructors">
          Find the right profile without needing to already know its ID.
        </EmptyState>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 10 }}>Students ({students.length})</div>
            {students.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No students in this school.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {students.map((s) => (
                  <Card key={s.id} tight hover>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700 }}>{s.firstName} {s.lastName}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.email} · profile #{s.id} · user #{s.userId}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Badge status={s.status}>{s.status}</Badge>
                        <Select size="sm" value={s.status} onChange={(e) => changeStudentStatus(s.id, e.target.value)} disabled={busyId === s.id}>
                          {STUDENT_STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
                        </Select>
                        <Button size="sm" variant="outline" onClick={() => navigate('/send-notification', { state: { userId: s.userId, name: `${s.firstName} ${s.lastName}` } })}>Notify</Button>
                        <Button size="sm" variant="danger" onClick={() => setDeleteTarget({ userId: s.userId, name: `${s.firstName} ${s.lastName}` })}>Delete</Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 10 }}>Instructors ({instructors.length})</div>
            {instructors.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No instructors in this school.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {instructors.map((i) => (
                  <Card key={i.id} tight hover>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700 }}>{i.firstName} {i.lastName}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{i.email} · profile #{i.id} · user #{i.userId}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Badge status={i.active ? 'ACTIVE' : 'INACTIVE'}>{i.active ? 'Active' : 'Inactive'}</Badge>
                        <Select size="sm" value={String(i.active)} onChange={(e) => changeInstructorActive(i.id, e.target.value === 'true')} disabled={busyId === i.id}>
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </Select>
                        <Button size="sm" variant="outline" onClick={() => navigate('/send-notification', { state: { userId: i.userId, name: `${i.firstName} ${i.lastName}` } })}>Notify</Button>
                        <Button size="sm" variant="danger" onClick={() => setDeleteTarget({ userId: i.userId, name: `${i.firstName} ${i.lastName}` })}>Delete</Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete this user account?"
        footer={(
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger-solid" loading={busyId === deleteTarget?.userId} onClick={confirmDelete}>Delete account</Button>
          </>
        )}
      >
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
          This soft-deletes {deleteTarget?.name}&rsquo;s account (user #{deleteTarget?.userId}). They will no longer be able to sign in.
        </p>
      </Modal>
    </div>
  );
}

function RolesTab({ toast }) {
  const [roles, setRoles] = useState(null);
  useEffect(() => { RoleApi.list().then(setRoles).catch((err) => toast.error(err.message)); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  if (roles === null) return null;
  if (roles.length === 0) return <EmptyState title="No roles found" />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 420 }}>
      {roles.map((r) => (
        <Card key={r.id} tight>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>{r.name}</div>
          {r.description && <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3 }}>{r.description}</div>}
        </Card>
      ))}
    </div>
  );
}

export default function AdminPage() {
  const { isBootstrapAdmin } = useAuth();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'register');

  // Directory (browse-any-school) only makes sense for the bootstrap admin -
  // a regular admin's own school directory now lives on the Fleet page's
  // "Your school" dashboard instead.
  const tabOptions = [
    { value: 'register', label: 'Register user' },
    ...(isBootstrapAdmin ? [{ value: 'directory', label: 'Directory' }] : []),
    { value: 'manage', label: 'Manage accounts' },
    { value: 'roles', label: 'Roles' },
  ];

  return (
    <div className="fade-in">
      <h1 className="page-title">Admin</h1>
      <p className="page-subtitle" style={{ marginBottom: 20 }}>Register accounts and manage roles.</p>
      <Tabs value={tab} onChange={setTab} options={tabOptions} />
      <div style={{ height: 20 }} />
      {tab === 'register' && <RegisterTab toast={toast} />}
      {tab === 'directory' && isBootstrapAdmin && <DirectoryTab toast={toast} />}
      {tab === 'manage' && <ManageTab toast={toast} />}
      {tab === 'roles' && <RolesTab toast={toast} />}
    </div>
  );
}
