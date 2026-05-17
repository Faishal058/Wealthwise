import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(!token ? 'No reset token provided. Use the link from your email.' : '');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleReset(e) {
    e?.preventDefault();
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Reset failed'); setLoading(false); return; }
      setSuccess(true);
    } catch {
      setError('Could not connect to server.');
    }
    setLoading(false);
  }

  if (success) {
    return (
      <AuthShell eyebrow="Done" title="Password updated"
        footer={<p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--ww-text-muted)' }}><Link to="/login" style={{ fontWeight: 600, color: 'var(--ww-accent-muted)' }}>Sign in with your new password</Link></p>}>
        <div style={{ borderRadius: '30px', border: '1px solid rgba(52,211,153,0.18)', background: 'rgba(52,211,153,0.07)', padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ margin: '0 auto', display: 'flex', height: '4rem', width: '4rem', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'var(--ww-accent)', fontSize: '1.5rem', fontWeight: 900, color: 'var(--ww-accent-dark)' }}>✓</div>
          <h2 style={{ marginTop: '1.25rem', fontSize: '1.875rem', fontWeight: 600, color: '#fff' }}>All set!</h2>
          <p className="ww-body-sm" style={{ marginTop: '0.75rem' }}>Your password has been updated. You can now sign in.</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell eyebrow="Reset" title="Set a new password"
      footer={<p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--ww-text-muted)' }}><Link to="/login" style={{ fontWeight: 600, color: 'var(--ww-accent-muted)' }}>Back to login</Link></p>}>
      <div style={{ marginBottom: '2rem' }}>
        <p className="ww-eyebrow" style={{ letterSpacing: '0.32em' }}>New password</p>
        <h2 style={{ marginTop: '0.75rem', fontSize: '1.875rem', fontWeight: 600, color: '#fff' }}>Choose a strong password</h2>
      </div>
      {error && <div className="ww-alert ww-alert--error">{error}</div>}
      <form onSubmit={handleReset} className="ww-space-y-4">
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: 'rgba(255,255,255,0.72)' }}>New Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 8 characters" className="ww-input" />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: 'rgba(255,255,255,0.72)' }}>Confirm Password</label>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password" className="ww-input" />
        </div>
        <button type="submit" disabled={loading || !token} className="ww-auth-primary">{loading ? 'Updating...' : 'Update password'}</button>
      </form>
    </AuthShell>
  );
}
