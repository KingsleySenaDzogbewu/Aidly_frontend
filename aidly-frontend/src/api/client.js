import axios from 'axios';
import { getAuthState, setSession, clearSession } from '../auth/tokenStore';
import { busyStart, busyEnd } from './busyStore';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
  || 'https://driving-school-backend-1hjt.onrender.com/api/v1';

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

export const http = axios.create({ baseURL: API_BASE_URL });

http.interceptors.request.use((config) => {
  // Silent requests (background polling the user never triggered, like the
  // notifications interval) shouldn't drive the global top-progress bar/
  // "still working" banner - that UI reads as "something YOU did is slow",
  // which is actively misleading when nothing on screen is waiting on it.
  if (!config.silent) busyStart();
  const { accessToken } = getAuthState();
  if (accessToken && !config.noAuth) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
}, (error) => {
  if (!error.config?.silent) busyEnd();
  return Promise.reject(error);
});

function unwrap(response) {
  const body = response.data;
  if (body && typeof body === 'object' && 'success' in body) {
    if (!body.success) throw new ApiError(body.message || 'Request failed', response.status, body);
    return body.data;
  }
  return body;
}

let refreshPromise = null;

async function performRefresh() {
  const { refreshToken } = getAuthState();
  if (!refreshToken) throw new ApiError('No refresh token available', 401);
  const res = await axios.post(`${API_BASE_URL}/auth/refresh-token`, { refreshToken });
  const data = unwrap(res);
  setSession({ accessToken: data.accessToken, refreshToken: data.refreshToken || refreshToken });
  return data.accessToken;
}

// Clears the dead session and fires a single 'aidly:session-expired' event
// that AuthContext turns into exactly one "please sign in again" toast plus
// a redirect - guarded so a burst of concurrent 401s (e.g. a background
// notifications poll racing a page load) doesn't stack up several toasts.
function handleSessionExpired() {
  const hadSession = !!getAuthState().accessToken;
  clearSession();
  if (hadSession) window.dispatchEvent(new CustomEvent('aidly:session-expired'));
}

http.interceptors.response.use(
  (response) => {
    if (!response.config?.silent) busyEnd();
    return unwrap(response);
  },
  async (error) => {
    if (!error.config?.silent) busyEnd();
    const original = error.config;

    if (!error.response) {
      return Promise.reject(new ApiError(
        'Could not reach the server. Check your connection and try again.', undefined, null,
      ));
    }

    if (error.response.status === 401 && original && !original._retry && !original.noAuth) {
      original._retry = true;
      console.warn(`[api] 401 on ${original.method?.toUpperCase()} ${original.url} - token missing/expired, attempting refresh`);
      try {
        if (!refreshPromise) {
          refreshPromise = performRefresh().finally(() => { refreshPromise = null; });
        }
        const newToken = await refreshPromise;
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return http.request(original);
      } catch (refreshErr) {
        console.error('[api] refresh failed - session cannot be recovered, redirecting to login', refreshErr);
        handleSessionExpired();
        return Promise.reject(new ApiError('Your session has expired. Please sign in again.', 401));
      }
    }

    const body = error.response.data;
    // Validation failures carry the useful detail in `errors` ({ field: ["Response
    // must be between 10 and 3000 characters"] }) - show those sentences, one per
    // line, instead of the bare "Validation failed" headline.
    const fieldErrors = body && body.errors && typeof body.errors === 'object'
      ? Object.values(body.errors).flat().filter((m) => typeof m === 'string' && m)
      : [];
    const message = fieldErrors.length > 0
      ? fieldErrors.join('\n')
      : (body && body.message) || `Request failed (${error.response.status})`;

    if (error.response.status === 401) {
      if (original?.noAuth) {
        // A real, expected auth failure on a public endpoint (e.g. wrong
        // password on /auth/login) - not a session expiring, so it's shown
        // inline by the caller (LoginPage), not redirected or toasted.
        console.warn(`[api] 401 on public endpoint ${original?.method?.toUpperCase()} ${original?.url}: ${message}`);
      } else {
        // Either the refreshed retry above still came back 401, or this
        // request couldn't be retried at all - either way the session is
        // unrecoverable, so treat it the same as a failed refresh instead
        // of leaking a raw "Request failed (401)" to whichever page happens
        // to be watching this call.
        console.error(`[api] 401 persisted after refresh attempt on ${original?.method?.toUpperCase()} ${original?.url} - session cannot be recovered, redirecting to login`);
        handleSessionExpired();
        return Promise.reject(new ApiError('Your session has expired. Please sign in again.', 401));
      }
    } else if (error.response.status === 403) {
      console.error(`[api] 403 Forbidden on ${original?.method?.toUpperCase()} ${original?.url}: ${message} - signed-in user is authenticated but lacks permission for this endpoint/action.`);
    } else {
      console.error(`[api] ${error.response.status} on ${original?.method?.toUpperCase()} ${original?.url}: ${message}`);
    }

    const apiError = new ApiError(message, error.response.status, body);
    // 429s (e.g. resending a verification code too soon) say how many seconds to wait.
    const retryAfter = Number(error.response.headers?.['retry-after']);
    if (Number.isFinite(retryAfter) && retryAfter > 0) apiError.retryAfter = retryAfter;
    return Promise.reject(apiError);
  },
);
