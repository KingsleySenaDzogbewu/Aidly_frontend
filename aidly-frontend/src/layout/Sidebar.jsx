import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { useAuth } from '../auth/AuthContext';
import { useNotifications } from '../features/notifications/NotificationsContext';
import { useMessages } from '../features/messages/MessagesContext';
import { Icons } from '../components/ui';

// badge: which unread count to show; messagesOnly: students/instructors only (admins don't message).
const NAV = [
  { to: '/', label: 'Overview', icon: Icons.IconHome, end: true },
  { to: '/live', label: 'Live sessions', icon: Icons.IconVideo },
  { to: '/courses', label: 'Courses & lessons', icon: Icons.IconBook },
  { to: '/quizzes', label: 'Quizzes', icon: Icons.IconQuiz },
  { to: '/notes', label: 'Notes & questions', icon: Icons.IconNotes },
  { to: '/messages', label: 'Messages', icon: Icons.IconChat, badge: 'messages', messagesOnly: true },
  { to: '/announcements', label: 'Announcements', icon: Icons.IconMegaphone },
  { to: '/notifications', label: 'Notifications', icon: Icons.IconBell, badge: 'notifications' },
  { to: '/bookings', label: 'Bookings', icon: Icons.IconCalendar },
  { to: '/routes', label: 'Routes & progress', icon: Icons.IconRoute },
  { to: '/leaderboard', label: 'Leaderboard', icon: Icons.IconTrophy },
  { to: '/profile', label: 'Profile', icon: Icons.IconUser },
];

const ADMIN_NAV = [
  { to: '/fleet', label: 'Schools & fleet', icon: Icons.IconSchool },
  { to: '/admin', label: 'Admin', icon: Icons.IconShield },
  { to: '/send-notification', label: 'Send notification', icon: Icons.IconInbox },
];

const INSTRUCTOR_NAV = [
  { to: '/add-student', label: 'Add student', icon: Icons.IconUser },
  { to: '/send-notification', label: 'Send notification', icon: Icons.IconInbox },
];

export default function Sidebar({ mobile, open, onNavigate, onClose }) {
  const { user, isAdmin, isInstructor, isBootstrapAdmin, roles, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { enabled: canMessage, unreadTotal: unreadMessages } = useMessages();
  const badgeCount = (item) => (item.badge === 'notifications' ? unreadCount : item.badge === 'messages' ? unreadMessages : 0);

  const classes = ['sidebar', mobile ? 'mobile' : '', mobile && open ? 'open' : ''].filter(Boolean).join(' ');

  // On phones the floating "Report a Bug" button is hidden (it covered page
  // content), so the menu gets its own item wired to the same Sentry form.
  const reportBugRef = useRef(null);
  const [canReportBug] = useState(() => !!Sentry.getFeedback());
  useEffect(() => {
    const feedback = Sentry.getFeedback();
    if (!mobile || !feedback || !reportBugRef.current) return undefined;
    return feedback.attachTo(reportBugRef.current);
  }, [mobile]);

  return (
    <nav className={classes} aria-label="Primary" aria-hidden={mobile && !open}>
      <div className="brand">
        <div className="brand-mark">
          <svg width="16" height="14" viewBox="0 0 16 14" fill="none">
            <rect y="0" width="16" height="3.4" rx="1.5" fill="currentColor" />
            <rect y="5.3" width="10" height="3.4" rx="1.5" fill="currentColor" opacity="0.65" />
            <rect y="10.6" width="13" height="3.4" rx="1.5" fill="currentColor" opacity="0.4" />
          </svg>
        </div>
        <div className="brand-name">Aidly</div>
        {mobile && (
          <button type="button" className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
            <Icons.IconClose size={18} />
          </button>
        )}
      </div>

      <div className="nav-group">
        {NAV.filter((item) => !item.messagesOnly || canMessage).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className={item.badge === 'notifications' && unreadCount > 0 ? 'nav-bell-shake' : ''}>
              <item.icon size={16} />
            </span>
            {item.label}
            {badgeCount(item) > 0 && <span className="nav-badge">{badgeCount(item)}</span>}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="nav-section-label">Administration</div>
            {ADMIN_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <item.icon size={16} />
                {item.label}
              </NavLink>
            ))}
          </>
        )}

        {isInstructor && !isAdmin && (
          <>
            <div className="nav-section-label">My school</div>
            {INSTRUCTOR_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <item.icon size={16} />
                {item.label}
              </NavLink>
            ))}
          </>
        )}

        {mobile && canReportBug && (
          <button type="button" ref={reportBugRef} className="nav-item" onClick={onNavigate}>
            <Icons.IconWarn size={16} />
            Report a bug
          </button>
        )}
      </div>

      <div className="user-card">
        {user?.firstName && (
          <div className="user-card-name">{user.firstName} {user.lastName}</div>
        )}
        <div className={user?.firstName ? 'user-card-email user-card-email-sub' : 'user-card-email'}>{user?.email}</div>
        <div className="user-card-role">
          {isAdmin && isBootstrapAdmin ? 'Admin of admins (all schools)' : isAdmin ? 'Admin (your school)' : roles.join(', ') || '—'}
        </div>
        <button
          type="button"
          className="btn btn-outline btn-sm btn-block"
          style={{ marginTop: 10 }}
          onClick={logout}
        >
          <Icons.IconLogout size={14} /> Sign out
        </button>
      </div>
    </nav>
  );
}
