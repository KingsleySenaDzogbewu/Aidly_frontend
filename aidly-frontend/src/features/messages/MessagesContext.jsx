import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ConversationApi } from '../../api/endpoints';
import { useAuth } from '../../auth/AuthContext';

const MessagesContext = createContext(null);

const POLL_MS = 30000;

// Keeps the inbox (and so the unread total for the sidebar badge) fresh for
// students and instructors. Admins don't take part in conversations.
export function MessagesProvider({ children }) {
  const { isAuthenticated, isStudent, isInstructor } = useAuth();
  const enabled = isAuthenticated && (isStudent || isInstructor);
  const [conversations, setConversations] = useState(null); // null = not loaded yet

  const reload = useCallback(async () => {
    if (!enabled) return;
    try {
      const list = await ConversationApi.list({ silent: true });
      setConversations(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error(err);
      setConversations((c) => c ?? []);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) { setConversations(null); return undefined; }
    reload();
    // Skip polls while the tab is in the background; catch up when it returns.
    const t = setInterval(() => { if (!document.hidden) reload(); }, POLL_MS);
    const onVisible = () => { if (!document.hidden) reload(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVisible); };
  }, [enabled, reload]);

  // Called when a conversation is opened/read so the badge drops straight away.
  const markReadLocally = useCallback((conversationId) => {
    setConversations((list) => (list || []).map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)));
  }, []);

  const unreadTotal = (conversations || []).reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  return (
    <MessagesContext.Provider value={{ enabled, conversations, unreadTotal, reload, markReadLocally }}>
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages() {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error('useMessages must be used within MessagesProvider');
  return ctx;
}
