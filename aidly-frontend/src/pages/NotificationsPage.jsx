import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../features/notifications/NotificationsContext';
import { Button, Card, SkeletonList, EmptyState, Icons, Reveal, useToast } from '../components/ui';
import { fmtDateTime } from '../utils/format';

// Notifications that point at something elsewhere in the app get a button to
// open it (matched on the backend's subject wording).
function notificationLink(n) {
  const subject = n.subject || '';
  if (/^new message from/i.test(subject)) return { to: '/messages', label: 'View message' };
  if (/^announcement from/i.test(subject)) return { to: '/announcements', label: 'View announcement' };
  // "New question from …" (instructors) / answered-question notices (students).
  if (/question/i.test(subject)) return { to: '/notes?tab=questions', label: 'View question' };
  return null;
}

export default function NotificationsPage() {
  const { items, loading, markRead } = useNotifications();
  const toast = useToast();

  const markAsRead = (n) => markRead(n.id).catch((err) => toast.error(err.message || 'Couldn’t mark this notification as read. Please try again.'));
  const navigate = useNavigate();

  const open = (n, to) => {
    if (!n.readAt) markRead(n.id).catch(() => {});
    navigate(to);
  };

  return (
    <div className="fade-in">
      <h1 className="page-title">Notifications</h1>
      <p className="page-subtitle" style={{ marginBottom: 22 }}>Updates about bookings, lessons and account activity.</p>

      {loading && items.length === 0 ? (
        <SkeletonList count={3} />
      ) : items.length === 0 ? (
        <EmptyState icon={<Icons.IconBell size={22} />} title="No notifications yet">
          You&rsquo;re all caught up.
        </EmptyState>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((n, i) => {
            const unread = !n.readAt;
            return (
              <Reveal key={n.id} delay={Math.min(i, 8) * 40}>
                <Card tight hover style={{ background: unread ? 'var(--accent-soft-bg)' : 'var(--surface)' }}>
                  {/* The text keeps at least ~240px; on narrow screens the buttons wrap
                      below it instead of squeezing the title to one word per line. */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px 16px', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0, flex: '1 1 240px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {unread && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />}
                        <div style={{ fontSize: 14.5, fontWeight: 700 }}>{n.subject}</div>
                      </div>
                      <div style={{ fontSize: 13.5, color: 'var(--text)', marginTop: 6 }}>{n.body}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 8 }}>{n.channel} · {fmtDateTime(n.sentAt)}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flex: '0 0 auto', flexWrap: 'wrap' }}>
                      {notificationLink(n) && (
                        <Button size="sm" onClick={() => open(n, notificationLink(n).to)}>{notificationLink(n).label}</Button>
                      )}
                      {unread && (
                        <Button size="sm" variant="outline" onClick={() => markAsRead(n)}>
                          Mark read
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </Reveal>
            );
          })}
        </div>
      )}
    </div>
  );
}
