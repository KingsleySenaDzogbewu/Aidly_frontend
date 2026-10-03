import { useAuth } from '../auth/AuthContext';
import AdminOverview from './overview/AdminOverview';
import InstructorOverview from './overview/InstructorOverview';
import StudentOverview from './overview/StudentOverview';
import './overview/overview.css';

export default function OverviewPage() {
  const { user, roles, isAdmin, isInstructor, isStudent } = useAuth();

  const roleLabel = roles.join(', ') || '—';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  // A user could technically hold more than one role — admin takes the
  // most capable view, then instructor, then student, so nobody is shown
  // a dashboard for a role they don't have.
  const Dashboard = isAdmin ? AdminOverview : isInstructor ? InstructorOverview : isStudent ? StudentOverview : null;

  return (
    <div className="fade-in">
      {user?.schoolName && <div className="overview-school">{user.schoolName}</div>}
      {/* First name for students/instructors; admins have no name, so just the greeting. */}
      <h1 className="page-title">{greeting}{user?.firstName ? `, ${user.firstName}` : ''}</h1>
      <p className="page-subtitle" style={{ marginBottom: 28 }}>
        {isAdmin
          ? 'Here’s what needs your attention across the school.'
          : isInstructor
            ? 'Here’s your teaching load and what’s next.'
            : 'Here’s a snapshot of your learning journey.'}
      </p>

      {Dashboard ? <Dashboard user={user} roleLabel={roleLabel} /> : (
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Your account has no assigned role yet — contact your school admin.</p>
      )}
    </div>
  );
}
