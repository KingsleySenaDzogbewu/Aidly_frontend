import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { NotificationApi } from '../../api/endpoints';
import { useAuth } from '../../auth/AuthContext';
import { useRealtime, useRealtimeEvent } from '../realtime/RealtimeContext';

const NotificationsContext = createContext(null);

// New notifications are pushed instantly over the realtime connection; the
// timed check is only a backup (frequent if that connection is down).
const POLL_MS_LIVE = 300000;
const POLL_MS_FALLBACK = 60000;

export function NotificationsProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const { connected } = useRealtime();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    try {
      const list = await NotificationApi.mine();
      setItems(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) { setItems([]); return undefined; }
    reload();
    // Skipped while the tab is hidden: a background check would refresh the
    // session and keep an unattended tab signed in.
    const t = setInterval(() => { if (!document.hidden) reload(); }, connected ? POLL_MS_LIVE : POLL_MS_FALLBACK);
    const onVisible = () => { if (!document.hidden) reload(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [isAuthenticated, reload, connected]);

  useRealtimeEvent('NOTIFICATION_CREATED', (n) => {
    if (!n?.id) return;
    setItems((prev) => (prev.some((x) => x.id === n.id) ? prev : [n, ...prev]));
  });
  useRealtimeEvent('RECONNECTED', reload);

  const markRead = useCallback(async (id) => {
    await NotificationApi.markRead(id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
  }, []);

  const unreadCount = items.filter((n) => !n.readAt).length;

  return (
    <NotificationsContext.Provider value={{ items, loading, unreadCount, reload, markRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
