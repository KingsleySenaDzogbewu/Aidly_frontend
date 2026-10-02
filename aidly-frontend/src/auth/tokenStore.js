// Framework-agnostic session store. Lives outside React so the axios
// interceptors (client.js) can read/write it synchronously; AuthContext
// subscribes to it to stay in sync with React state.
//
// "Keep me signed in" decides where the session lives:
//  - kept:     localStorage   - survives closing the browser (up to the refresh token's 7 days)
//  - not kept: sessionStorage - gone when the browser is closed (and AuthContext also
//              signs out after a period of inactivity)
const KEYS = { access: 'aidly_token', refresh: 'aidly_refresh', user: 'aidly_user' };
const REMEMBER_KEY = 'aidly_remember';

function store(kind) {
  try { return kind === 'local' ? window.localStorage : window.sessionStorage; } catch { return null; }
}
function get(kind, key) {
  try { return store(kind)?.getItem(key) ?? null; } catch { return null; }
}
function put(kind, key, val) {
  try {
    const s = store(kind);
    if (!s) return;
    if (val === null || val === undefined) s.removeItem(key);
    else s.setItem(key, val);
  } catch { /* storage unavailable, keep in-memory only */ }
}

// Sessions saved before this option existed are in localStorage with no flag:
// treat those as "kept" so nobody is signed out by the update.
let remember = get('local', REMEMBER_KEY) === '1'
  || (get('local', REMEMBER_KEY) === null && !!get('local', KEYS.access));

const where = () => (remember ? 'local' : 'session');

let state = {
  accessToken: get(where(), KEYS.access),
  refreshToken: get(where(), KEYS.refresh),
  user: (() => { try { return JSON.parse(get(where(), KEYS.user) || 'null'); } catch { return null; } })(),
};

const listeners = new Set();
function emit() { listeners.forEach((l) => l(state)); }

function persist() {
  const other = remember ? 'session' : 'local';
  put(where(), KEYS.access, state.accessToken);
  put(where(), KEYS.refresh, state.refreshToken);
  put(where(), KEYS.user, state.user ? JSON.stringify(state.user) : null);
  // Never leave a copy in the other storage.
  Object.values(KEYS).forEach((k) => put(other, k, null));
}

export function subscribeAuth(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAuthState() {
  return state;
}

export function isRemembered() {
  return remember;
}

/** Called at sign-in with the "Keep me signed in" choice. */
export function setRememberMe(value) {
  remember = !!value;
  put('local', REMEMBER_KEY, remember ? '1' : '0');
  persist();
}

export function setSession({ accessToken, refreshToken, user } = {}) {
  state = {
    accessToken: accessToken !== undefined ? accessToken : state.accessToken,
    refreshToken: refreshToken !== undefined ? refreshToken : state.refreshToken,
    user: user !== undefined ? user : state.user,
  };
  persist();
  emit();
}

export function clearSession() {
  state = { accessToken: null, refreshToken: null, user: null };
  ['local', 'session'].forEach((kind) => Object.values(KEYS).forEach((k) => put(kind, k, null)));
  emit();
}
