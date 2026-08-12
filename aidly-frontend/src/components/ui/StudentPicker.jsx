import { useEffect, useState } from 'react';
import { StudentApi } from '../../api/endpoints';
import { Field, Select, Input } from './Field';

// Picks a student from the caller's own school (now that instructors, not
// just admins, can call GET /students/school/{schoolId}). Falls back to a
// raw profile-ID input when there's no schoolId to scope by (e.g. a
// bootstrap admin, who owns no school) or the list fails to load.
export default function StudentPicker({ schoolId, value, onChange, label = 'Student', required, hint }) {
  const [students, setStudents] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!schoolId) { setStudents(null); return undefined; }
    setLoading(true);
    StudentApi.listBySchool(schoolId)
      .then((list) => { if (!cancelled) setStudents(list || []); })
      .catch(() => { if (!cancelled) setStudents(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [schoolId]);

  if (loading) {
    return (
      <Field label={label} required={required}>
        <Select disabled value=""><option>Loading students…</option></Select>
      </Field>
    );
  }

  if (!schoolId || students === null) {
    return (
      <Field label={label} required={required} hint={hint || 'Student profile ID'}>
        <Input required={required} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Student profile ID" />
      </Field>
    );
  }

  return (
    <Field label={label} required={required} hint={hint}>
      <Select required={required} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select a student…</option>
        {students.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
      </Select>
    </Field>
  );
}
