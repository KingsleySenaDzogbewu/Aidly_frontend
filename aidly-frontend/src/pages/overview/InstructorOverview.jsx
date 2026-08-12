import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookingApi, CourseApi, LessonQuestionApi, LessonNoteApi } from '../../api/endpoints';
import { Icons } from '../../components/ui';
import StatCard from './StatCard';
import QuickActions from './QuickActions';
import AccountCard from './AccountCard';

export default function InstructorOverview({ user, roleLabel }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ upcoming: 0, courses: 0, assigned: 0, notes: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const now = new Date();
      const from = now.toISOString().slice(0, 19);
      const to = new Date(now.getTime() + 30 * 86400000).toISOString().slice(0, 19);
      const results = await Promise.allSettled([
        user?.instructorProfileId ? BookingApi.listByInstructor(user.instructorProfileId, from, to) : Promise.resolve([]),
        CourseApi.mine(),
        LessonQuestionApi.assigned(),
        user?.instructorProfileId ? LessonNoteApi.listByInstructor(user.instructorProfileId) : Promise.resolve([]),
      ]);
      if (cancelled) return;
      const [bookings, courses, questions, notes] = results.map((r) => (r.status === 'fulfilled' ? r.value : null));
      const questionList = questions?.content || questions || [];
      const noteList = notes?.content || notes || [];
      setStats({
        upcoming: (bookings || []).length,
        courses: (courses || []).length,
        assigned: questionList.filter((q) => q.status !== 'ANSWERED' && q.status !== 'CLOSED').length,
        notes: noteList.length,
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  return (
    <div>
      <div className="respo-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard label="Upcoming lessons" value={stats.upcoming} icon={Icons.IconCalendar} loading={loading} onClick={() => navigate('/bookings')} color="var(--hue-green)" index={0} />
        <StatCard label="My courses" value={stats.courses} icon={Icons.IconBook} loading={loading} onClick={() => navigate('/courses')} color="var(--hue-violet)" index={1} />
        <StatCard label="Assigned questions" value={stats.assigned} icon={Icons.IconNotes} loading={loading} onClick={() => navigate('/notes')} color="var(--hue-amber)" index={2} />
        <StatCard label="Lesson notes logged" value={stats.notes} icon={Icons.IconFile} loading={loading} onClick={() => navigate('/notes')} color="var(--hue-teal)" index={3} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }} className="respo-content-split">
        <QuickActions
          delay={280}
          items={[
            { to: '/add-student', label: 'Add a student', hint: 'Register a new student for your school', icon: Icons.IconUser },
            { to: '/courses', label: 'Manage courses & lessons', hint: 'Upload videos, publish lessons', icon: Icons.IconBook },
            { to: '/bookings', label: 'View schedule', hint: 'Confirm and manage bookings', icon: Icons.IconCalendar },
            { to: '/notes', label: 'Answer student questions', hint: 'Respond to assigned questions', icon: Icons.IconNotes },
            { to: '/routes', label: 'Generate a lesson route', hint: 'Plan a practical lesson', icon: Icons.IconRoute },
            { to: '/send-notification', label: 'Send a notification', hint: 'Message a student or colleague directly', icon: Icons.IconInbox },
          ]}
        />
        <AccountCard user={user} roleLabel={roleLabel} delay={340} />
      </div>
    </div>
  );
}
