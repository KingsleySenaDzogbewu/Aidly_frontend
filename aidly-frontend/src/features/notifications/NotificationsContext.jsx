import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { NotificationApi } from '../../api/endpoints';
import { useAuth } from '../../auth/AuthContext';

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const { isAuthenticated } = useAuth();
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
    if (!isAuthenticated) { setItems([]); return; }
    reload();
    const t = setInterval(reload, 60000);
    return () => clearInterval(t);
  }, [isAuthenticated, reload]);

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
