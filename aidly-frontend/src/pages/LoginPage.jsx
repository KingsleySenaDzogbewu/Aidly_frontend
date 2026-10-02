import { useCallback, useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { AuthApi } from '../api/endpoints';
import { Button, Field, Input, Icons } from '../components/ui';
import RoadMotif from '../components/motion/RoadMotif';
import VerifyAccount from './VerifyAccount';
import loginHero from '../assets/images/login-hero.jpg';
import loginBg from '../assets/images/login-bg.jpg';
import './login.css';

export default function LoginPage() {
  const { login, isAuthenticated, initializing } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // Off by default: on a shared computer, closing the browser signs you out.
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  // Set when a new account's first login needs a one-time code instead of
  // returning tokens. Memory only - never persisted.
  const [challenge, setChallenge] = useState(null);

  // Stable so VerifyAccount's expiry timer isn't restarted on every render.
  const backToSignIn = useCallback((message) => {
    setChallenge(null);
    setPassword('');
    setError(message || '');
  }, []);

  if (!initializing && isAuthenticated) {
    return <Navigate to={location.state?.from?.pathname || '/'} replace />;
  }

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await login(email, password, keepSignedIn);
      if (result?.verificationRequired) {
        setChallenge(result.verification);
        return;
      }
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="login-page"
      style={{ backgroundImage: `linear-gradient(180deg, oklch(20% 0.03 260 / 0.55), oklch(15% 0.03 260 / 0.72)), url(${loginBg})` }}
    >
      <div className="login-split respo-login-split">
        <div className="login-hero respo-login-pane" style={{ backgroundImage: `linear-gradient(180deg, oklch(24% 0.05 155 / 0.55), oklch(20% 0.05 155 / 0.82)), url(${loginHero})` }}>
          <div className="login-hero-top">
            <div className="brand-mark" style={{ background: 'oklch(98% 0.01 150 / 0.16)' }}>
              <svg width="16" height="14" viewBox="0 0 16 14" fill="none">
                <rect y="0" width="16" height="3.4" rx="1.5" fill="currentColor" />
                <rect y="5.3" width="10" height="3.4" rx="1.5" fill="currentColor" opacity="0.65" />
                <rect y="10.6" width="13" height="3.4" rx="1.5" fill="currentColor" opacity="0.4" />
              </svg>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Aidly</div>
          </div>
          <div className="login-hero-body">
            <h1 className="login-hero-title">Run every lesson, quiz and question from one place.</h1>
            <p className="login-hero-copy">
              Sign in with your admin, instructor or student account to manage live sessions,
              courses, quizzes, bookings and lesson support — all built for how driving schools
              actually run.
            </p>
          </div>
          <div className="login-hero-road"><RoadMotif color="oklch(98% 0.01 150 / 0.75)" /></div>

          <div className="login-hero-foot">Connected to your driving school&rsquo;s live backend</div>
        </div>

        <div className="login-form-pane respo-login-pane">
          {challenge ? (
            <VerifyAccount challenge={challenge} onBack={backToSignIn} />
          ) : (
          <>
          <div className="login-form-eyebrow">Sign in</div>
          <h2 className="login-form-title">Welcome back</h2>

          <form onSubmit={submit}>
            <Field label="Email" className="login-field">
              <Input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.com"
              />
            </Field>

            <Field label="Password" className="login-field">
              <div style={{ position: 'relative' }}>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  className="login-eye-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((s) => !s)}
                >
                  {showPassword ? <Icons.IconEyeOff size={17} /> : <Icons.IconEye size={17} />}
                </button>
              </div>
            </Field>

            <label className="checkbox-row" style={{ cursor: 'pointer', marginTop: 2 }}>
              <input type="checkbox" checked={keepSignedIn} onChange={(e) => setKeepSignedIn(e.target.checked)} />
              <span>
                Keep me signed in
                <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)' }}>
                  Only on your own device. Otherwise you’re signed out when you close the browser or after 2 hours without activity.
                </span>
              </span>
            </label>

            {error && <div className="login-error">{error}</div>}

            <Button type="submit" block loading={busy} style={{ marginTop: 14 }}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <button type="button" className="login-link-btn" onClick={() => { setShowForgot((s) => !s); setForgotSent(false); }}>
            {showForgot ? 'Hide password reset' : 'Forgot your password?'}
          </button>

          {showForgot && (
            <div className="fade-in" style={{ marginTop: 12, padding: 14, borderRadius: 10, background: 'var(--accent-soft-bg)' }}>
              {forgotSent ? (
                <p style={{ fontSize: 13, color: 'var(--accent-soft-text)', margin: 0 }}>
                  If that email has an account, a reset link is on its way. Check your inbox.
                </p>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setForgotBusy(true);
                    try {
                      await AuthApi.forgotPassword(forgotEmail);
                      setForgotSent(true);
                    } catch {
                      setForgotSent(true); // backend intentionally never reveals whether it worked
                    } finally {
                      setForgotBusy(false);
                    }
                  }}
                  style={{ display: 'flex', gap: 8 }}
                >
                  <Input
                    type="email"
                    required
                    size="sm"
                    placeholder="you@school.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                  />
                  <Button type="submit" size="sm" loading={forgotBusy}>Send link</Button>
                </form>
              )}
            </div>
          )}

          <p className="login-footnote">
            Accounts are created by your school&rsquo;s admin or instructor — there&rsquo;s no
            public sign-up.
          </p>
          </>
          )}
        </div>
      </div>
    </div>
  );
}
