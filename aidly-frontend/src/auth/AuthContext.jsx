import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AuthApi, InstructorApi, StudentApi } from '../api/endpoints';
import { useToast } from '../components/ui';
import { getAuthState, setSession, clearSession, subscribeAuth, setRememberMe, isRemembered } from './tokenStore';

const AuthContext = createContext(null);

// Sessions without "Keep me signed in" also end after this long unused, for
// browsers that stay open on shared computers.
const IDLE_LIMIT_MS = 2 * 60 * 60 * 1000;
const ACTIVITY_KEY = 'aidly_last_active';

function readLastActive() {
  try { return Number(sessionStorage.getItem(ACTIVITY_KEY)) || 0; } catch { return 0; }
}
function writeLastActive(ts = Date.now()) {
  try { sessionStorage.setItem(ACTIVITY_KEY, String(ts)); } catch { /* storage unavailable */ }
}

// /auth/me has no name, so students and instructors get their first/last
// name from their own profile (used for the greeting and sidebar). Admins
// have no profile or name. Best effort - a failure just means no name shown.
async function withProfileName(me) {
  try {
    const roles = me?.roles || [];
    const profile = roles.includes('INSTRUCTOR') ? await InstructorApi.me()
      : roles.includes('STUDENT') ? await StudentApi.me()
        : null;
    return profile ? { ...me, firstName: profile.firstName, lastName: profile.lastName, schoolName: profile.schoolName } : me;
  } catch {
    return me;
  }
}

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(getAuthState());
  const [initializing, setInitializing] = useState(true);
  const toast = useToast();

  useEffect(() => subscribeAuth(setAuthState), []);

  // The single source of truth for "your session died" - client.js dispatches
  // this exactly once per dead session (a token refresh failed, or a request
  // came back 401 even after refreshing), regardless of which request or
  // background poll happened to trigger it. Surfacing the message here
  // guarantees the user always sees *something* explaining the redirect,
  // instead of it depending on whether that particular caller shows toasts.
  useEffect(() => {
    const onExpired = () => {
      setAuthState(getAuthState());
      toast.error('Your session has expired. Please sign in again.');
    };
    window.addEventListener('aidly:session-expired', onExpired);
    return () => window.removeEventListener('aidly:session-expired', onExpired);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On first load, always re-validate a stored token against the backend
  // before trusting it - a cached `user` object only proves a login
  // succeeded at some point in the past, not that the token is still
  // accepted now (it may have expired, or been invalidated by a backend
  // redeploy). Without this check the app would render as "logged in"
  // indefinitely on a dead token, and every subsequent API call would fail.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // A not-kept session left unused too long (e.g. a tab restored hours
      // later) ends here, before it's used.
      const last = readLastActive();
      if (getAuthState().accessToken && !isRemembered() && last && Date.now() - last > IDLE_LIMIT_MS) {
        clearSession();
      }
      const { accessToken } = getAuthState();
      if (accessToken) {
        try {
          const me = await withProfileName(await AuthApi.me());
          if (!cancelled) setSession({ user: me });
        } catch {
          if (!cancelled) clearSession();
        }
      }
      if (!cancelled) setInitializing(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishLogin = async (data) => {
    setSession({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    const me = await withProfileName(await AuthApi.me());
    setSession({ user: me });
    return me;
  };

  // A new account's first login answers with a verification challenge
  // instead of tokens - hand that back to the login page (it's kept in
  // memory only, never stored) rather than treating it as signed in.
  // `remember` is the "Keep me signed in" choice (see tokenStore).
  const login = async (email, password, remember = false) => {
    setRememberMe(remember);
    writeLastActive();
    const data = await AuthApi.login(email, password, remember);
    if (data?.verificationRequired) return { verificationRequired: true, verification: data.verification };
    return finishLogin(data);
  };

  // The confirm response is exactly a normal login response. The "Keep me
  // signed in" choice was saved by login() just before the challenge.
  const completeVerification = async (challengeId, code) => {
    const data = await AuthApi.confirmVerification(challengeId, code, isRemembered());
    return finishLogin(data);
  };

  const logout = async () => {
    const { refreshToken } = getAuthState();
    try { if (refreshToken) await AuthApi.logout(refreshToken); } catch { /* best effort */ }
    clearSession();
  };

  // Sign out a not-kept session after IDLE_LIMIT_MS without use. Activity is
  // clicks, taps and key presses, recorded at most every 30 s.
  const signedIn = !!authState.accessToken;
  useEffect(() => {
    if (!signedIn || isRemembered()) return undefined;
    if (!readLastActive()) writeLastActive();
    let lastWrite = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - lastWrite > 30000) { lastWrite = now; writeLastActive(now); }
    };
    const check = () => {
      if (Date.now() - readLastActive() > IDLE_LIMIT_MS) {
        logout();
        toast.info('You were signed out after 2 hours without activity.');
      }
    };
    const onVisible = () => { if (!document.hidden) check(); };
    ['pointerdown', 'keydown'].forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    document.addEventListener('visibilitychange', onVisible);
    const timer = setInterval(check, 60000);
    return () => {
      ['pointerdown', 'keydown'].forEach((e) => window.removeEventListener(e, onActivity));
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  const refreshMe = async () => {
    const me = await withProfileName(await AuthApi.me());
    setSession({ user: me });
    return me;
  };

  const value = useMemo(() => {
    const { accessToken, user } = authState;
    const roles = user?.roles || [];
    return {
      user,
      accessToken,
      isAuthenticated: !!(accessToken && user),
      initializing,
      roles,
      isAdmin: roles.includes('ADMIN'),
      isInstructor: roles.includes('INSTRUCTOR'),
      isStudent: roles.includes('STUDENT'),
      // Only the permanent bootstrap admin can create/delete schools and other
      // admins directly - a regular admin is scoped to their own school.
      isBootstrapAdmin: !!user?.bootstrapAdmin,
      login,
      completeVerification,
      logout,
      refreshMe,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState, initializing]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
