import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SchoolApi, CourseApi, LessonQuestionApi, LessonNoteApi } from '../../api/endpoints';
import { Icons } from '../../components/ui';
import StatCard from './StatCard';
import QuickActions from './QuickActions';
import AccountCard from './AccountCard';

export default function AdminOverview({ user, roleLabel }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ schools: 0, courses: 0, pending: 0, notes: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const results = await Promise.allSettled([
        SchoolApi.list(),
        CourseApi.list(),
        LessonQuestionApi.byStatus('PENDING'),
        LessonNoteApi.listAll(),
      ]);
      if (cancelled) return;
      const [schools, courses, pending, notes] = results.map((r) => (r.status === 'fulfilled' ? r.value : null));
      const pendingList = pending?.content || pending || [];
      const noteList = notes?.content || notes || [];
      setStats({
        schools: (schools || []).length,
        courses: (courses || []).length,
        pending: pendingList.length,
        notes: noteList.length,
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div>
      <div className="respo-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard label="Schools" value={stats.schools} icon={Icons.IconSchool} loading={loading} onClick={() => navigate('/fleet')} color="var(--hue-green)" index={0} />
        <StatCard label="Courses" value={stats.courses} icon={Icons.IconBook} loading={loading} onClick={() => navigate('/courses')} color="var(--hue-violet)" index={1} />
        <StatCard label="Pending questions" value={stats.pending} icon={Icons.IconNotes} loading={loading} onClick={() => navigate('/notes')} color="var(--hue-amber)" index={2} />
        <StatCard label="Lesson notes logged" value={stats.notes} icon={Icons.IconFile} loading={loading} onClick={() => navigate('/notes')} color="var(--hue-teal)" index={3} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }} className="respo-content-split">
        <QuickActions
          delay={280}
          items={[
            { to: '/fleet', label: 'Manage schools & fleet', hint: 'Schools, vehicles, availability', icon: Icons.IconSchool },
            // The Directory tab is bootstrap-only; a regular admin's people live on "Your school".
            { to: user?.bootstrapAdmin ? '/admin?tab=directory' : '/fleet', label: 'Browse students & instructors', hint: 'Find a profile without typing an ID', icon: Icons.IconUser },
            { to: '/admin', label: 'Administration', hint: 'Users, roles, accounts', icon: Icons.IconShield },
            { to: '/courses', label: 'Oversee courses', hint: 'Publish, archive, assign instructors', icon: Icons.IconBook },
            { to: '/notes', label: 'Review pending questions', hint: 'Across the whole school', icon: Icons.IconInbox },
          ]}
        />
        <AccountCard user={user} roleLabel={roleLabel} delay={340} />
      </div>
    </div>
  );
}
