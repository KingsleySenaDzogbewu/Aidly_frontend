import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookingApi, CourseApi, LessonQuestionApi, LicenseWorkflowApi, GamificationApi, LICENSE_STAGES } from '../../api/endpoints';
import { Card, Icons, Badge } from '../../components/ui';
import RoadMotif from '../../components/motion/RoadMotif';
import { humanize } from '../../utils/format';
import StatCard from './StatCard';
import QuickActions from './QuickActions';
import AccountCard from './AccountCard';
import GamificationCard from './GamificationCard';

const STAGE_COLORS = [
  'var(--hue-amber)', 'var(--hue-rose)', 'var(--hue-violet)', 'var(--hue-teal)',
  'var(--hue-green)', 'var(--hue-violet)', 'var(--hue-teal)', 'var(--hue-green)',
];

export default function StudentOverview({ user, roleLabel }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ upcoming: 0, openQuestions: 0, courses: 0 });
  const [workflow, setWorkflow] = useState(null);
  const [gameSummary, setGameSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const results = await Promise.allSettled([
        user?.studentProfileId ? BookingApi.listByStudent(user.studentProfileId) : Promise.resolve([]),
        LessonQuestionApi.myQuestions(),
        CourseApi.list(),
        user?.studentProfileId ? LicenseWorkflowApi.get(user.studentProfileId) : Promise.resolve(null),
        GamificationApi.me(),
      ]);
      if (cancelled) return;
      const [bookings, questions, courses, wf, game] = results.map((r) => (r.status === 'fulfilled' ? r.value : null));
      const now = Date.now();
      // Only lessons still to come - a cancelled or already-completed booking isn't "upcoming".
      const upcoming = (bookings || []).filter((b) => b.scheduledAt && new Date(b.scheduledAt).getTime() > now && (b.status === 'PENDING' || b.status === 'CONFIRMED')).length;
      const questionList = questions?.content || questions || [];
      setStats({
        upcoming,
        openQuestions: questionList.filter((q) => q.status !== 'ANSWERED' && q.status !== 'CLOSED').length,
        courses: (courses || []).length,
      });
      setWorkflow(wf);
      setGameSummary(game);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const curIdx = workflow ? LICENSE_STAGES.indexOf(workflow.currentStage) : -1;
  const progressPct = curIdx >= 0 ? (curIdx / (LICENSE_STAGES.length - 1)) * 100 : 0;
  const stageColor = curIdx >= 0 ? STAGE_COLORS[curIdx % STAGE_COLORS.length] : 'var(--border-strong)';

  return (
    <div>
      <div className="respo-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard label="Upcoming lessons" value={stats.upcoming} icon={Icons.IconCalendar} loading={loading} onClick={() => navigate('/bookings')} color="var(--hue-green)" index={0} />
        <StatCard label="Theory progress" value={Math.round(workflow?.theoryProgressPercent || 0)} icon={Icons.IconRoute} loading={loading} onClick={() => navigate('/routes')} color="var(--hue-teal)" index={1} />
        <StatCard label="Open questions" value={stats.openQuestions} icon={Icons.IconNotes} loading={loading} onClick={() => navigate('/notes')} color="var(--hue-amber)" index={2} />
        <StatCard label="Courses available" value={stats.courses} icon={Icons.IconBook} loading={loading} onClick={() => navigate('/courses')} color="var(--hue-violet)" index={3} />
      </div>

      <Card className="fade-in-up" style={{ marginBottom: 20, animationDelay: '260ms' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Your license journey</div>
          {workflow && <Badge>{humanize(workflow.currentStage)}</Badge>}
        </div>
        {workflow ? (
          <div className="overview-journey-road"><RoadMotif progress={progressPct} color={stageColor} /></div>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 10 }}>
            Your license workflow hasn&rsquo;t been started yet &mdash; ask your school admin to initialize it.
          </p>
        )}
        <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 14 }} onClick={() => navigate('/routes')}>View full progress</button>
      </Card>

      <div style={{ marginBottom: 20 }}>
        <GamificationCard summary={gameSummary} loading={loading} delay={300} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }} className="respo-content-split">
        <QuickActions
          delay={340}
          items={[
            { to: '/notes', label: 'Ask a question', hint: 'Get help from your instructor', icon: Icons.IconNotes },
            { to: '/quizzes', label: 'Take a quiz', hint: 'Test your theory knowledge', icon: Icons.IconQuiz },
            { to: '/live', label: 'Join a live session', hint: 'See what’s scheduled', icon: Icons.IconVideo },
            { to: '/bookings', label: 'View my bookings', hint: 'Upcoming practical lessons', icon: Icons.IconCalendar },
          ]}
        />
        <AccountCard user={user} roleLabel={roleLabel} delay={400} />
      </div>
    </div>
  );
}
