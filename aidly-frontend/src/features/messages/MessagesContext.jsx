import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ConversationApi } from '../../api/endpoints';
import { useAuth } from '../../auth/AuthContext';
import { useRealtime, useRealtimeEvent } from '../realtime/RealtimeContext';

const MessagesContext = createContext(null);

// New messages arrive instantly over the realtime connection; the timed check
// is only a backup (frequent if that connection is down).
const POLL_MS_LIVE = 300000;
const POLL_MS_FALLBACK = 30000;

// Keeps the inbox (and so the unread total for the sidebar badge) fresh for
// students and instructors. Admins don't take part in conversations.
export function MessagesProvider({ children }) {
  const { isAuthenticated, isStudent, isInstructor } = useAuth();
  const { connected } = useRealtime();
  const enabled = isAuthenticated && (isStudent || isInstructor);
  const [conversations, setConversations] = useState(null); // null = not loaded yet
  const conversationsRef = useRef(null);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

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
    const t = setInterval(() => { if (!document.hidden) reload(); }, connected ? POLL_MS_LIVE : POLL_MS_FALLBACK);
    const onVisible = () => { if (!document.hidden) reload(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVisible); };
  }, [enabled, reload, connected]);

  // A pushed message updates its inbox row straight away (preview, time,
  // unread count, moved to the top); an unknown conversation means a refetch.
  useRealtimeEvent('MESSAGE_CREATED', (m) => {
    if (!enabled || !m?.conversationId) return;
    if (!(conversationsRef.current || []).some((c) => c.id === m.conversationId)) { reload(); return; }
    setConversations((list) => {
      const current = list || [];
      const row = current.find((c) => c.id === m.conversationId);
      if (!row) return current;
      const updated = {
        ...row,
        lastMessagePreview: m.body,
        lastMessageAt: m.sentAt,
        unreadCount: m.mine ? row.unreadCount : (row.unreadCount || 0) + 1,
      };
      return [updated, ...current.filter((c) => c.id !== m.conversationId)];
    });
  });
  useRealtimeEvent('RECONNECTED', () => { if (enabled) reload(); });

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
