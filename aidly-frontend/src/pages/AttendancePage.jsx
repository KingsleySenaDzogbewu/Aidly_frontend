import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { AttendanceApi, SchoolApi } from '../api/endpoints';
import { EmptyState, Icons, SkeletonList, Tabs, useToast } from '../components/ui';
import CheckInCard from '../features/attendance/CheckInCard';
import MyHistory from '../features/attendance/MyHistory';
import DayRegister from '../features/attendance/DayRegister';
import SchoolLocationCard from '../features/attendance/SchoolLocationCard';
import { DEFAULT_TIME_ZONE, todayIn } from '../features/attendance/attendanceUtils';
import '../features/attendance/attendance.css';

// Students and instructors check in once a day; instructors and admins keep
// the register. Admins don't check in themselves.
export default function AttendancePage() {
  const { user, isAdmin, isInstructor, isStudent, isBootstrapAdmin } = useAuth();
  const toast = useToast();
  const checksIn = isStudent || isInstructor;

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(checksIn);
  const [school, setSchool] = useState(null);
  const [schoolLoading, setSchoolLoading] = useState(isAdmin && !isBootstrapAdmin);
  const [tab, setTab] = useState('register');

  const loadHistory = useCallback(async () => {
    if (!checksIn) return;
    setHistoryLoading(true);
    try {
      const list = await AttendanceApi.mine();
      setHistory(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setHistoryLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checksIn]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  useEffect(() => {
    if (!isAdmin || isBootstrapAdmin || !user?.schoolId) return;
    SchoolApi.get(user.schoolId)
      .then(setSchool)
      .catch((err) => toast.error(err.message))
      .finally(() => setSchoolLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, isBootstrapAdmin, user?.schoolId]);

  if (isBootstrapAdmin) {
    return (
      <div className="fade-in">
        <h1 className="page-title">Attendance</h1>
        <EmptyState icon={<Icons.IconCalendarCheck size={22} />} title="Attendance is kept by each school">
          Each school’s admin sets its location and sees its register.
        </EmptyState>
      </div>
    );
  }

  const timeZone = school?.timeZone || DEFAULT_TIME_ZONE;
  const today = todayIn(timeZone);
  const todayEntry = history.find((e) => e.date === today) || null;
  const locationMissing = !!school && (school.latitude == null || school.longitude == null);

  return (
    <div className="fade-in att-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="page-subtitle">
            {isStudent ? 'Check in when you arrive for a lesson.'
              : isInstructor ? 'Check in, then keep today’s student register.'
                : 'Your school’s daily register for students and instructors.'}
          </p>
        </div>
      </div>

      {isAdmin && (
        schoolLoading ? <SkeletonList count={1} /> : school && (
          <>
            {locationMissing && (
              <div className="att-note att-note-warning">
                <strong>Set your school’s location first.</strong> Nobody can check in until it’s set.
              </div>
            )}
            <SchoolLocationCard key={`${school.latitude},${school.longitude}`} school={school} onSaved={setSchool} />
          </>
        )
      )}

      {checksIn && (
        historyLoading && history.length === 0
          ? <SkeletonList count={1} />
          : <CheckInCard isStudent={isStudent} today={todayEntry} onCheckedIn={loadHistory} />
      )}

      {isStudent && <MyHistory entries={history} loading={historyLoading} />}

      {isInstructor && (
        <>
          <Tabs value={tab} onChange={setTab} options={[{ value: 'register', label: 'Students' }, { value: 'mine', label: 'My attendance' }]} />
          {tab === 'register'
            ? <DayRegister schoolId={user?.schoolId} timeZone={timeZone} canSeeInstructors={false} />
            : <MyHistory entries={history} loading={historyLoading} />}
        </>
      )}

      {isAdmin && user?.schoolId && (
        <DayRegister schoolId={user.schoolId} timeZone={timeZone} canSeeInstructors />
      )}
    </div>
  );
}
