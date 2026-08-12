import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/ui';
import { SchoolApi, SchoolDeletionRequestApi, VehicleApi, StudentApi, InstructorApi, UserApi } from '../api/endpoints';
import { Button, Card, Badge, Field, Input, Select, Tabs, Modal, Textarea, EmptyState, SkeletonList, Icons, Reveal } from '../components/ui';
import { fmtDateTime } from '../utils/format';

const VEHICLE_STATUSES = ['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'OUT_OF_SERVICE'];
const STUDENT_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'GRADUATED'];
const emptySchool = { schoolName: '', schoolAddress: '', schoolPhone: '', schoolEmail: '', adminEmail: '', adminPassword: '' };
const emptyVehicle = { registrationNumber: '', make: '', model: '', modelYear: 2024, color: '', gpsDeviceId: '', schoolId: '' };

// Bootstrap-admin only: browses and creates/deletes any school. A regular
// admin never reaches this component - they get YourSchoolTab instead.
function SchoolsTab({ toast }) {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptySchool);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name }
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setSchools(await SchoolApi.list() || []); }
    catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const create = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await SchoolApi.create({
        schoolName: form.schoolName, schoolAddress: form.schoolAddress,
        schoolPhone: form.schoolPhone || null, schoolEmail: form.schoolEmail || null,
        adminEmail: form.adminEmail, adminPassword: form.adminPassword,
      });
      toast.success('School and owning admin created');
      setShowForm(false);
      setForm(emptySchool);
      load();
    } catch (err) { toast.error(err.message); }
    finally { setCreating(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await SchoolApi.remove(deleteTarget.id);
      toast.success('School and its admin deleted');
      setDeleteTarget(null);
      load();
    } catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button onClick={() => setShowForm((s) => !s)}><Icons.IconPlus size={14} /> {showForm ? 'Cancel' : 'New school'}</Button>
      </div>

      {showForm && (
        <Card className="fade-in respo-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
          <form onSubmit={create} style={{ display: 'contents' }}>
            <Field label="School name" required><Input required value={form.schoolName} onChange={(e) => setForm((f) => ({ ...f, schoolName: e.target.value }))} /></Field>
            <Field label="School phone"><Input value={form.schoolPhone} onChange={(e) => setForm((f) => ({ ...f, schoolPhone: e.target.value }))} /></Field>
            <Field label="School address" required className="span-2"><Input required value={form.schoolAddress} onChange={(e) => setForm((f) => ({ ...f, schoolAddress: e.target.value }))} /></Field>
            <Field label="School email"><Input type="email" value={form.schoolEmail} onChange={(e) => setForm((f) => ({ ...f, schoolEmail: e.target.value }))} /></Field>
            <div className="divider span-2" style={{ margin: '4px 0' }} />
            <Field label="Owning admin email" required hint="This person will manage the new school" className="span-2">
              <Input type="email" required value={form.adminEmail} onChange={(e) => setForm((f) => ({ ...f, adminEmail: e.target.value }))} />
            </Field>
            <Field label="Owning admin password" required hint="8–100 characters" className="span-2">
              <Input type="password" required minLength={8} value={form.adminPassword} onChange={(e) => setForm((f) => ({ ...f, adminPassword: e.target.value }))} />
            </Field>
            <Button type="submit" className="span-2" loading={creating}>Create school &amp; admin</Button>
          </form>
        </Card>
      )}

      {loading ? <SkeletonList count={2} small /> : schools.length === 0 ? (
        <EmptyState icon={<Icons.IconSchool size={22} />} title="No schools yet" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {schools.map((s, i) => (
            <Reveal key={s.id} delay={Math.min(i, 8) * 40}>
              <Card tight hover>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700 }}>{s.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{s.address} · {s.phone} · {s.email}</div>
                  </div>
                  <Button size="sm" variant="danger" onClick={() => setDeleteTarget({ id: s.id, name: s.name })}>
                    Delete school
                  </Button>
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      )}

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete this school?"
        footer={(
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger-solid" loading={busy} onClick={confirmDelete}>Delete permanently</Button>
          </>
        )}
      >
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
          This permanently deletes {deleteTarget?.name} and its owning admin account. This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

// Regular-admin-only: everything scoped to the school this admin owns - the
// school's own details, its instructors, its students, and its fleet, each
// with the manage/delete actions that used to be spread across the Admin
// page's Directory tab and a bootstrap-style school list. Replaces both for
// a non-bootstrap admin, who never has a reason to see any other school.
function YourSchoolTab({ toast }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [school, setSchool] = useState(null);
  const [students, setStudents] = useState(null);
  const [instructors, setInstructors] = useState(null);
  const [vehicles, setVehicles] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [deleteUserTarget, setDeleteUserTarget] = useState(null); // { userId, name }
  const [deleteSchoolOpen, setDeleteSchoolOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [vehicleForm, setVehicleForm] = useState(emptyVehicle);
  const [creatingVehicle, setCreatingVehicle] = useState(false);

  const load = async () => {
    if (!user?.schoolId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [s, st, ins, veh] = await Promise.all([
        SchoolApi.get(user.schoolId),
        StudentApi.listBySchool(user.schoolId).catch(() => []),
        InstructorApi.listBySchool(user.schoolId).catch(() => []),
        VehicleApi.listBySchool(user.schoolId).catch(() => []),
      ]);
      setSchool(s);
      setStudents(st || []);
      setInstructors(ins || []);
      setVehicles(veh || []);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.schoolId]);

  const requestDeleteSchool = async () => {
    setBusy(true);
    try {
      await SchoolApi.requestOwnDeletion();
      toast.success('Deletion request submitted for the admin of admins to approve');
      setDeleteSchoolOpen(false);
    } catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  const changeStudentStatus = async (id, status) => {
    setBusyId(id);
    try { await StudentApi.setStatus(id, status); toast.success('Student updated'); await load(); }
    catch (err) { toast.error(err.message); }
    finally { setBusyId(null); }
  };

  const changeInstructorActive = async (id, active) => {
    setBusyId(id);
    try { await InstructorApi.setActive(id, active); toast.success('Instructor updated'); await load(); }
    catch (err) { toast.error(err.message); }
    finally { setBusyId(null); }
  };

  const confirmDeleteUser = async () => {
    if (!deleteUserTarget) return;
    setBusyId(deleteUserTarget.userId);
    try {
      await UserApi.remove(deleteUserTarget.userId);
      toast.success('Account deleted');
      setDeleteUserTarget(null);
      await load();
    } catch (err) { toast.error(err.message); }
    finally { setBusyId(null); }
  };

  const setVehicleStatus = async (id, status) => {
    try { await VehicleApi.setStatus(id, status); toast.success('Vehicle status updated'); load(); }
    catch (err) { toast.error(err.message); }
  };

  const createVehicle = async (e) => {
    e.preventDefault();
    setCreatingVehicle(true);
    try {
      await VehicleApi.create({
        registrationNumber: vehicleForm.registrationNumber, make: vehicleForm.make, model: vehicleForm.model,
        modelYear: Number(vehicleForm.modelYear), color: vehicleForm.color, gpsDeviceId: vehicleForm.gpsDeviceId || null,
        schoolId: Number(user.schoolId),
      });
      toast.success('Vehicle added');
      setShowVehicleForm(false);
      setVehicleForm(emptyVehicle);
      load();
    } catch (err) { toast.error(err.message); }
    finally { setCreatingVehicle(false); }
  };

  if (loading) return <SkeletonList count={3} />;

  if (!user?.schoolId) {
    return (
      <EmptyState icon={<Icons.IconSchool size={22} />} title="No school linked to your account yet">
        Your admin account isn&rsquo;t associated with a school. Contact the admin of admins if this looks wrong.
      </EmptyState>
    );
  }

  return (
    <div>
      <Card style={{ marginBottom: 26 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{school?.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              {school?.address}{school?.phone ? ` · ${school.phone}` : ''}{school?.email ? ` · ${school.email}` : ''}
            </div>
          </div>
          <Button variant="danger" onClick={() => setDeleteSchoolOpen(true)}>Request school deletion</Button>
        </div>
      </Card>

      <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 10 }}>Instructors ({instructors?.length ?? 0})</div>
      {(instructors?.length ?? 0) === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>No instructors in your school yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 26 }}>
          {instructors.map((i) => (
            <Card key={i.id} tight hover>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{i.firstName} {i.lastName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{i.email} · profile #{i.id}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Badge status={i.active ? 'ACTIVE' : 'INACTIVE'}>{i.active ? 'Active' : 'Inactive'}</Badge>
                  <Select size="sm" value={String(i.active)} onChange={(e) => changeInstructorActive(i.id, e.target.value === 'true')} disabled={busyId === i.id}>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </Select>
                  <Button size="sm" variant="outline" onClick={() => navigate('/send-notification', { state: { userId: i.userId, name: `${i.firstName} ${i.lastName}` } })}>Notify</Button>
                  <Button size="sm" variant="danger" onClick={() => setDeleteUserTarget({ userId: i.userId, name: `${i.firstName} ${i.lastName}` })}>Delete</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 10 }}>Students ({students?.length ?? 0})</div>
      {(students?.length ?? 0) === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 26 }}>No students in your school yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 26 }}>
          {students.map((s) => (
            <Card key={s.id} tight hover>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{s.firstName} {s.lastName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.email} · profile #{s.id}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Badge status={s.status}>{s.status}</Badge>
                  <Select size="sm" value={s.status} onChange={(e) => changeStudentStatus(s.id, e.target.value)} disabled={busyId === s.id}>
                    {STUDENT_STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
                  </Select>
                  <Button size="sm" variant="outline" onClick={() => navigate('/send-notification', { state: { userId: s.userId, name: `${s.firstName} ${s.lastName}` } })}>Notify</Button>
                  <Button size="sm" variant="danger" onClick={() => setDeleteUserTarget({ userId: s.userId, name: `${s.firstName} ${s.lastName}` })}>Delete</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700 }}>Fleet ({vehicles?.length ?? 0})</div>
        <Button size="sm" variant="soft" onClick={() => setShowVehicleForm((s) => !s)}><Icons.IconPlus size={13} /> {showVehicleForm ? 'Cancel' : 'New vehicle'}</Button>
      </div>

      {showVehicleForm && (
        <Card className="fade-in respo-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
          <form onSubmit={createVehicle} style={{ display: 'contents' }}>
            <Field label="Registration number" required><Input required value={vehicleForm.registrationNumber} onChange={(e) => setVehicleForm((f) => ({ ...f, registrationNumber: e.target.value }))} /></Field>
            <Field label="Make" required><Input required value={vehicleForm.make} onChange={(e) => setVehicleForm((f) => ({ ...f, make: e.target.value }))} /></Field>
            <Field label="Model" required><Input required value={vehicleForm.model} onChange={(e) => setVehicleForm((f) => ({ ...f, model: e.target.value }))} /></Field>
            <Field label="Model year" required><Input type="number" min={1980} max={2100} required value={vehicleForm.modelYear} onChange={(e) => setVehicleForm((f) => ({ ...f, modelYear: e.target.value }))} /></Field>
            <Field label="Color" required><Input required value={vehicleForm.color} onChange={(e) => setVehicleForm((f) => ({ ...f, color: e.target.value }))} /></Field>
            <Field label="GPS device ID (optional)" className="span-2"><Input value={vehicleForm.gpsDeviceId} onChange={(e) => setVehicleForm((f) => ({ ...f, gpsDeviceId: e.target.value }))} /></Field>
            <Button type="submit" className="span-2" loading={creatingVehicle}>Add vehicle</Button>
          </form>
        </Card>
      )}

      {(vehicles?.length ?? 0) === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No vehicles in your fleet yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {vehicles.map((v) => (
            <Card key={v.id} tight hover style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{v.make} {v.model} ({v.modelYear}) · {v.registrationNumber}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3 }}>{v.color}</div>
              </div>
              <Select size="sm" value={v.status} onChange={(e) => setVehicleStatus(v.id, e.target.value)}>
                {VEHICLE_STATUSES.map((st) => <option key={st} value={st}>{st.replace('_', ' ')}</option>)}
              </Select>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={deleteSchoolOpen}
        onClose={() => setDeleteSchoolOpen(false)}
        title="Request deletion of your school?"
        footer={(
          <>
            <Button variant="outline" onClick={() => setDeleteSchoolOpen(false)}>Cancel</Button>
            <Button variant="danger-solid" loading={busy} onClick={requestDeleteSchool}>Submit request</Button>
          </>
        )}
      >
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
          This submits a request to permanently delete {school?.name} and your own admin account. It won&rsquo;t take
          effect until the admin of admins approves it.
        </p>
      </Modal>

      <Modal
        open={!!deleteUserTarget}
        onClose={() => setDeleteUserTarget(null)}
        title="Delete this account?"
        footer={(
          <>
            <Button variant="outline" onClick={() => setDeleteUserTarget(null)}>Cancel</Button>
            <Button variant="danger-solid" loading={busyId === deleteUserTarget?.userId} onClick={confirmDeleteUser}>Delete account</Button>
          </>
        )}
      >
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
          This soft-deletes {deleteUserTarget?.name}&rsquo;s account (user #{deleteUserTarget?.userId}). They will no longer be able to sign in.
        </p>
      </Modal>
    </div>
  );
}

function DeletionRequestsTab({ toast }) {
  const [requests, setRequests] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null); // { id, schoolName, action: 'approve' | 'reject' }
  const [reviewNotes, setReviewNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const page = await SchoolDeletionRequestApi.listPending();
      setRequests(page?.content || page || []);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const openReview = (req, action) => { setReviewTarget({ id: req.id, schoolName: req.schoolName, action }); setReviewNotes(''); };

  const confirmReview = async () => {
    if (!reviewTarget) return;
    setBusy(true);
    try {
      if (reviewTarget.action === 'approve') {
        await SchoolDeletionRequestApi.approve(reviewTarget.id, reviewNotes || null);
        toast.success('Request approved; school and admin deleted');
      } else {
        await SchoolDeletionRequestApi.reject(reviewTarget.id, reviewNotes || null);
        toast.success('Request rejected');
      }
      setReviewTarget(null);
      load();
    } catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div>
      {loading || requests === null ? (
        <SkeletonList count={2} small />
      ) : requests.length === 0 ? (
        <EmptyState icon={<Icons.IconInbox size={22} />} title="No pending deletion requests" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {requests.map((r, i) => (
            <Reveal key={r.id} delay={Math.min(i, 8) * 40}>
              <Card tight>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700 }}>{r.schoolName}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3 }}>
                      Requested by {r.requestedByEmail} · {fmtDateTime(r.createdAt)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Button size="sm" variant="outline" onClick={() => openReview(r, 'reject')}>Reject</Button>
                    <Button size="sm" variant="danger" onClick={() => openReview(r, 'approve')}>Approve &amp; delete</Button>
                  </div>
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      )}

      <Modal
        open={!!reviewTarget}
        onClose={() => setReviewTarget(null)}
        title={reviewTarget?.action === 'approve' ? `Approve deletion of ${reviewTarget?.schoolName}?` : `Reject deletion of ${reviewTarget?.schoolName}?`}
        footer={(
          <>
            <Button variant="outline" onClick={() => setReviewTarget(null)}>Cancel</Button>
            <Button variant={reviewTarget?.action === 'approve' ? 'danger-solid' : 'primary'} loading={busy} onClick={confirmReview}>
              {reviewTarget?.action === 'approve' ? 'Approve & delete permanently' : 'Reject request'}
            </Button>
          </>
        )}
      >
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 12 }}>
          {reviewTarget?.action === 'approve'
            ? 'This permanently deletes the school and its admin account. This cannot be undone.'
            : 'The school and admin account are kept as-is; the admin can submit another request later.'}
        </p>
        <Field label="Review notes (optional)">
          <Textarea rows={2} maxLength={1000} value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} />
        </Field>
      </Modal>
    </div>
  );
}

// Bootstrap-admin only: look up any school's fleet by ID. A regular admin's
// own fleet lives in YourSchoolTab instead.
function VehiclesTab({ toast }) {
  const [schoolId, setSchoolId] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyVehicle);
  const [creating, setCreating] = useState(false);

  const load = async (id) => {
    if (!id) return;
    setLoading(true);
    try { setVehicles(await VehicleApi.listBySchool(id) || []); }
    catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const create = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await VehicleApi.create({
        registrationNumber: form.registrationNumber, make: form.make, model: form.model,
        modelYear: Number(form.modelYear), color: form.color, gpsDeviceId: form.gpsDeviceId || null,
        schoolId: Number(form.schoolId),
      });
      toast.success('Vehicle added');
      setShowForm(false);
      load(form.schoolId);
    } catch (err) { toast.error(err.message); }
    finally { setCreating(false); }
  };

  const setStatus = async (id, status) => {
    try { await VehicleApi.setStatus(id, status); toast.success('Vehicle status updated'); load(schoolId); }
    catch (err) { toast.error(err.message); }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <Input placeholder="School ID" value={schoolId} onChange={(e) => setSchoolId(e.target.value)} style={{ width: 140 }} />
        <Button variant="outline" onClick={() => load(schoolId)}>Load fleet</Button>
        <Button variant="soft" onClick={() => setShowForm((s) => !s)}><Icons.IconPlus size={13} /> {showForm ? 'Cancel' : 'New vehicle'}</Button>
      </div>

      {showForm && (
        <Card className="fade-in respo-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
          <form onSubmit={create} style={{ display: 'contents' }}>
            <Field label="Registration number" required><Input required value={form.registrationNumber} onChange={(e) => setForm((f) => ({ ...f, registrationNumber: e.target.value }))} /></Field>
            <Field label="School ID" required><Input required value={form.schoolId} onChange={(e) => setForm((f) => ({ ...f, schoolId: e.target.value }))} /></Field>
            <Field label="Make" required><Input required value={form.make} onChange={(e) => setForm((f) => ({ ...f, make: e.target.value }))} /></Field>
            <Field label="Model" required><Input required value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} /></Field>
            <Field label="Model year" required><Input type="number" min={1980} max={2100} required value={form.modelYear} onChange={(e) => setForm((f) => ({ ...f, modelYear: e.target.value }))} /></Field>
            <Field label="Color" required><Input required value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} /></Field>
            <Field label="GPS device ID (optional)" className="span-2"><Input value={form.gpsDeviceId} onChange={(e) => setForm((f) => ({ ...f, gpsDeviceId: e.target.value }))} /></Field>
            <Button type="submit" className="span-2" loading={creating}>Add vehicle</Button>
          </form>
        </Card>
      )}

      {loading ? <SkeletonList count={2} small /> : vehicles.length === 0 ? (
        <EmptyState icon={<Icons.IconCar size={22} />} title="No vehicles loaded">Enter a school ID and load its fleet.</EmptyState>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {vehicles.map((v, i) => (
            <Reveal key={v.id} delay={Math.min(i, 8) * 40}>
              <Card tight hover style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{v.make} {v.model} ({v.modelYear}) · {v.registrationNumber}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3 }}>{v.color}</div>
                </div>
                <Select size="sm" value={v.status} onChange={(e) => setStatus(v.id, e.target.value)}>
                  {VEHICLE_STATUSES.map((st) => <option key={st} value={st}>{st.replace('_', ' ')}</option>)}
                </Select>
              </Card>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FleetPage() {
  const { isBootstrapAdmin } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('schools');

  // A regular admin only ever has one school to manage - skip the tab bar
  // entirely and go straight to that dashboard. Multi-school browsing,
  // fleet-lookup-by-ID, and the deletion-request queue are bootstrap-only.
  if (!isBootstrapAdmin) {
    return (
      <div className="fade-in">
        <h1 className="page-title">Your school</h1>
        <p className="page-subtitle" style={{ marginBottom: 20 }}>Manage your school, its people, and its fleet.</p>
        <YourSchoolTab toast={toast} />
      </div>
    );
  }

  const tabOptions = [
    { value: 'schools', label: 'Schools' },
    { value: 'vehicles', label: 'Vehicles' },
    { value: 'deletions', label: 'Deletion requests' },
  ];

  return (
    <div className="fade-in">
      <h1 className="page-title">Schools &amp; fleet</h1>
      <p className="page-subtitle" style={{ marginBottom: 20 }}>Manage schools and vehicles.</p>
      <Tabs value={tab} onChange={setTab} options={tabOptions} />
      <div style={{ height: 20 }} />
      {tab === 'schools' && <SchoolsTab toast={toast} />}
      {tab === 'vehicles' && <VehiclesTab toast={toast} />}
      {tab === 'deletions' && <DeletionRequestsTab toast={toast} />}
    </div>
  );
}
