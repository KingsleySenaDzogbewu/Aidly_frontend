// Framework-agnostic session store. Lives outside React so the axios
// interceptors (client.js) can read/write it synchronously; AuthContext
// subscribes to it to stay in sync with React state.
const KEYS = { access: 'aidly_token', refresh: 'aidly_refresh', user: 'aidly_user' };

function safeGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key, val) {
  try {
    if (val === null || val === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, val);
  } catch { /* storage unavailable, keep in-memory only */ }
}

let state = {
  accessToken: safeGet(KEYS.access),
  refreshToken: safeGet(KEYS.refresh),
  user: (() => { try { return JSON.parse(safeGet(KEYS.user) || 'null'); } catch { return null; } })(),
};

const listeners = new Set();
function emit() { listeners.forEach((l) => l(state)); }

export function subscribeAuth(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAuthState() {
  return state;
}

export function setSession({ accessToken, refreshToken, user } = {}) {
  state = {
    accessToken: accessToken !== undefined ? accessToken : state.accessToken,
    refreshToken: refreshToken !== undefined ? refreshToken : state.refreshToken,
    user: user !== undefined ? user : state.user,
  };
  safeSet(KEYS.access, state.accessToken);
  safeSet(KEYS.refresh, state.refreshToken);
  safeSet(KEYS.user, state.user ? JSON.stringify(state.user) : null);
  emit();
}

export function clearSession() {
  state = { accessToken: null, refreshToken: null, user: null };
  safeSet(KEYS.access, null);
  safeSet(KEYS.refresh, null);
  safeSet(KEYS.user, null);
  emit();
}
