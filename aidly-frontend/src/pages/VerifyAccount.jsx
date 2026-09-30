import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { AuthApi } from '../api/endpoints';
import { Button, Field, Input } from '../components/ui';

const CHANNEL_LABELS = { EMAIL: 'Email', WHATSAPP: 'WhatsApp' };
const DEFAULT_RESEND_WAIT = 60;

// The backend's wording for a dead/expired challenge - the only fix is a fresh login.
const needsFreshLogin = (err) => /log in again/i.test(err?.message || '');

// One-time account verification, shown in place of the login form when a new
// account's first login answers verificationRequired instead of tokens. The
// challenge lives only in memory (props/state), never in storage.
export default function VerifyAccount({ challenge, onBack }) {
  const { completeVerification } = useAuth();
  const channels = challenge.channels?.length ? challenge.channels : ['EMAIL'];

  const [channel, setChannel] = useState(channels.includes('EMAIL') ? 'EMAIL' : channels[0]);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const destination = (ch) => (ch === 'WHATSAPP' ? challenge.maskedPhone : challenge.maskedEmail);

  // The challenge itself expires (15 min by default) - after that only a new login works.
  useEffect(() => {
    const ms = (challenge.expiresInSeconds || 900) * 1000;
    const t = setTimeout(() => onBack('Your verification session expired. Please sign in again.'), ms);
    return () => clearTimeout(t);
  }, [challenge, onBack]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const send = async () => {
    setSending(true);
    setError('');
    setInfo('');
    try {
      await AuthApi.sendVerification(challenge.challengeId, channel);
      setSent(true);
      setCode('');
      setInfo(`We sent a 6-digit code to ${destination(channel) || `your ${CHANNEL_LABELS[channel]}`}.`);
      setCooldown(DEFAULT_RESEND_WAIT);
    } catch (err) {
      if (needsFreshLogin(err)) { onBack(err.message); return; }
      if (err.status === 429) {
        // A code went out less than a minute ago - it's still valid, so let them enter it.
        setSent(true);
        setCooldown(err.retryAfter || DEFAULT_RESEND_WAIT);
        setError(err.message || 'A code was sent recently — please wait before requesting another.');
      } else if (err.status === 503 && channels.length > 1) {
        setError(`${err.message} You can try again, or use ${CHANNEL_LABELS[channel === 'EMAIL' ? 'WHATSAPP' : 'EMAIL']} instead.`);
      } else {
        setError(err.message);
      }
    } finally {
      setSending(false);
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) { setError('Enter the 6-digit code.'); return; }
    setVerifying(true);
    setError('');
    try {
      // On success the session is set and the login page redirects into the app.
      await completeVerification(challenge.challengeId, code);
    } catch (err) {
      if (needsFreshLogin(err)) { onBack(err.message); return; }
      setError(err.message); // e.g. "Incorrect code - 4 attempts left" / "request a new one"
      setCode('');
      setVerifying(false);
    }
  };

  return (
    <div>
      <div className="login-form-eyebrow">Verify your account</div>
      <h2 className="login-form-title">Confirm it&rsquo;s you</h2>
      <p style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.6, margin: '-4px 0 18px' }}>
        This is a one-time step for new accounts. We&rsquo;ll send you a code to finish signing in.
      </p>

      {channels.length > 1 ? (
        <div className="login-field" role="radiogroup" aria-label="Where to send the code" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {channels.map((ch) => (
            <label
              key={ch}
              className="checkbox-row"
              style={{
                cursor: 'pointer', padding: '10px 12px', borderRadius: 10,
                border: `1px solid ${channel === ch ? 'var(--accent)' : 'var(--border)'}`,
                background: channel === ch ? 'var(--accent-soft-bg)' : 'var(--surface)',
              }}
            >
              <input type="radio" name="verify-channel" checked={channel === ch} onChange={() => setChannel(ch)} disabled={sending || verifying} />
              <span><strong>{CHANNEL_LABELS[ch] || ch}</strong>{destination(ch) ? ` · ${destination(ch)}` : ''}</span>
            </label>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 13.5, marginBottom: 16 }}>
          We&rsquo;ll send the code by <strong>{CHANNEL_LABELS[channel] || channel}</strong>
          {destination(channel) ? <> to <strong>{destination(channel)}</strong></> : null}.
        </p>
      )}

      {!sent ? (
        <Button block loading={sending} onClick={send}>Send code</Button>
      ) : (
        <form onSubmit={verify}>
          <Field label="6-digit code" className="login-field">
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              autoFocus
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••••"
              style={{ letterSpacing: '0.4em', fontSize: 18, fontWeight: 700, textAlign: 'center' }}
            />
          </Field>
          <Button type="submit" block loading={verifying} disabled={code.length !== 6}>Verify and sign in</Button>
          <Button
            variant="ghost"
            size="sm"
            block
            style={{ marginTop: 8 }}
            disabled={cooldown > 0 || sending || verifying}
            loading={sending}
            onClick={send}
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : `Resend code${channels.length > 1 ? ` by ${CHANNEL_LABELS[channel]}` : ''}`}
          </Button>
        </form>
      )}

      {info && !error && (
        <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, fontSize: 13, background: 'var(--accent-soft-bg)', color: 'var(--accent-soft-text)' }}>
          {info}
        </div>
      )}
      {error && <div className="login-error" style={{ marginTop: 12 }}>{error}</div>}

      <button type="button" className="login-link-btn" onClick={() => onBack('')}>
        &larr; Back to sign in
      </button>
    </div>
  );
}
