import * as Sentry from '@sentry/react';

// No-op without a configured DSN (e.g. local dev) rather than erroring or
// silently sending events to nobody. VITE_SENTRY_DSN isn't a secret - it's
// the public write key Sentry's own docs say is safe to ship in client code
// - so it lives in the same .env as VITE_API_BASE_URL.
const dsn = import.meta.env.VITE_SENTRY_DSN;

export function initSentry() {
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [
      // Adds the floating "Report a Bug" button so users can attach a
      // screenshot/description to whatever error (or nothing) is on screen -
      // the same mechanism that surfaced the bug reports this session started
      // from, but from inside the app instead of a separate document.
      Sentry.feedbackIntegration({
        colorScheme: 'system',
        showBranding: false,
      }),
    ],
    tracesSampleRate: 0.2,
  });
}
