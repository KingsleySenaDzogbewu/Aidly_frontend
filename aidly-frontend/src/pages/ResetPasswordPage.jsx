import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { AuthApi } from '../api/endpoints';
import { Button, Field, Input } from '../components/ui';
import './login.css';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await AuthApi.resetPassword(token, newPassword);
      setDone(true);
    } catch (err) {
      setError(err.message || 'Could not reset password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-split respo-login-split" style={{ gridTemplateColumns: '1fr', maxWidth: 440 }}>
        <div className="login-form-pane respo-login-pane">
          <div className="login-form-eyebrow">Password reset</div>
          <h2 className="login-form-title">Choose a new password</h2>

          {!token && (
            <p className="login-error">This reset link is missing its token. Please use the link from your email.</p>
          )}

          {done ? (
            <>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Your password has been updated. You can now sign in with your new password.
              </p>
              <Link to="/login"><Button style={{ marginTop: 10 }}>Go to sign in</Button></Link>
            </>
          ) : (
            <form onSubmit={submit}>
              <Field label="New password" className="login-field" hint="8–100 characters">
                <Input
                  type="password"
                  required
                  minLength={8}
                  maxLength={100}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </Field>
              {error && <div className="login-error">{error}</div>}
              <Button type="submit" block loading={busy} disabled={!token} style={{ marginTop: 14 }}>
                Reset password
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
