import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import { API_BASE_URL, http } from '../../api/client';
import { getAuthState, subscribeAuth } from '../../auth/tokenStore';
import { useAuth } from '../../auth/AuthContext';

const RealtimeContext = createContext(null);

// wss://<backend host>/ws, derived from the same base URL as the REST API.
function socketUrl() {
  const url = new URL(API_BASE_URL);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/ws';
  url.search = '';
  return url.toString();
}

const MIN_RETRY_MS = 2000;
const MAX_RETRY_MS = 60000;

/**
 * One STOMP-over-WebSocket connection per signed-in user (see the backend
 * guide's "Realtime updates"). The server pushes { type, payload } events:
 * MESSAGE_CREATED, CONVERSATION_READ, NOTIFICATION_CREATED, ANNOUNCEMENT_CREATED.
 * Consumers call useRealtimeEvent(type, handler). After a reconnect a synthetic
 * "RECONNECTED" event tells them to refetch, since missed events aren't replayed.
 * REST stays the source of truth; this only makes the UI update without waiting.
 */
export function RealtimeProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [connected, setConnected] = useState(false);
  const listeners = useRef(new Map()); // type -> Set<handler>

  const emit = useCallback((type, payload) => {
    (listeners.current.get(type) || []).forEach((fn) => {
      try { fn(payload); } catch (err) { console.error('[realtime] handler failed', err); }
    });
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    let everConnected = false;
    let retryMs = MIN_RETRY_MS;
    let lastToken = getAuthState().accessToken;

    const client = new Client({
      brokerURL: socketUrl(),
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      reconnectDelay: retryMs,
      // The server checks the token on CONNECT only, so always send the latest one.
      beforeConnect: () => {
        lastToken = getAuthState().accessToken;
        client.connectHeaders = { Authorization: `Bearer ${lastToken}` };
      },
      debug: () => {},
    });

    client.onConnect = () => {
      retryMs = MIN_RETRY_MS;
      client.reconnectDelay = retryMs;
      setConnected(true);
      client.subscribe('/user/queue/events', (frame) => {
        try {
          const event = JSON.parse(frame.body);
          if (event?.type) emit(event.type, event.payload);
        } catch (err) { console.error('[realtime] bad event', err); }
      });
      // Anything that happened while we were disconnected wasn't replayed.
      if (everConnected) emit('RECONNECTED');
      everConnected = true;
    };

    // Back off between attempts (the server drops every connection on deploys).
    client.onWebSocketClose = () => {
      setConnected(false);
      retryMs = Math.min(retryMs * 2, MAX_RETRY_MS);
      client.reconnectDelay = retryMs;
    };

    // Usually an expired access token: a cheap authenticated request makes the
    // HTTP layer refresh it, and the token change below reconnects.
    client.onStompError = () => {
      setConnected(false);
      http.get('/auth/me', { silent: true }).catch(() => {});
    };

    client.activate();

    // Reconnect with the new token whenever it's refreshed.
    const unsubscribe = subscribeAuth((state) => {
      if (state.accessToken && state.accessToken !== lastToken && client.active) {
        lastToken = state.accessToken;
        client.deactivate().then(() => client.activate());
      }
    });

    return () => {
      unsubscribe();
      client.deactivate();
      setConnected(false);
    };
  }, [isAuthenticated, emit]);

  const on = useCallback((type, handler) => {
    if (!listeners.current.has(type)) listeners.current.set(type, new Set());
    listeners.current.get(type).add(handler);
    return () => listeners.current.get(type)?.delete(handler);
  }, []);

  return (
    <RealtimeContext.Provider value={{ connected, on }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  return useContext(RealtimeContext) || { connected: false, on: () => () => {} };
}

/** Calls handler(payload) for each pushed event of `type` while mounted. */
export function useRealtimeEvent(type, handler) {
  const { on } = useRealtime();
  const saved = useRef(handler);
  useEffect(() => { saved.current = handler; }, [handler]);
  useEffect(() => on(type, (payload) => saved.current(payload)), [on, type]);
}
