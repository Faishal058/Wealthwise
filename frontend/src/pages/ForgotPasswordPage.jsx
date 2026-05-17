import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Something went wrong'); setLoading(false); return; }
      setSuccess(true);
    } catch (err) {
      setError('Could not connect to server. Make sure the backend is running.');
    }
    setLoading(false);
  }

  if (success) {
    return (
      <AuthShell eyebrow="Email sent" title="Check your inbox" description="If an account with that email exists, we sent a password reset link."
        footer={<p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--ww-text-muted)' }}><Link to="/login" style={{ fontWeight: 600, color: 'var(--ww-accent-muted)' }}>Back to login</Link></p>}>
        <div style={{ borderRadius: '30px', border: '1px solid rgba(52,211,153,0.18)', background: 'rgba(52,211,153,0.07)', padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ margin: '0 auto', display: 'flex', height: '4rem', width: '4rem', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'var(--ww-accent)', fontSize: '1.5rem', fontWeight: 900, color: 'var(--ww-accent-dark)' }}>✓</div>
          <h2 style={{ marginTop: '1.25rem', fontSize: '1.875rem', fontWeight: 600, color: '#fff' }}>Reset link sent</h2>
          <p className="ww-body-sm" style={{ marginTop: '0.75rem' }}>We sent a password reset link to <span style={{ fontWeight: 600, color: '#fff' }}>{email}</span>. Check your inbox and spam folder.</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell eyebrow="Reset access" title="Forgot your password?" description="Enter your email and we'll send you a link to reset your password."
      footer={<p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--ww-text-muted)' }}>Remember your password?{' '}<Link to="/login" style={{ fontWeight: 600, color: 'var(--ww-accent-muted)' }}>Sign in</Link></p>}>
      <div style={{ marginBottom: '2rem' }}>
        <p className="ww-eyebrow" style={{ letterSpacing: '0.32em' }}>Reset</p>
        <h2 style={{ marginTop: '0.75rem', fontSize: '1.875rem', fontWeight: 600, color: '#fff' }}>Enter your email</h2>
        <p className="ww-body-sm" style={{ marginTop: '0.5rem' }}>We&apos;ll send a password reset link via email.</p>
      </div>
      {error && <div className="ww-alert ww-alert--error">{error}</div>}
      <div className="ww-space-y-4">
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: 'rgba(255,255,255,0.72)' }}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="ww-input" />
        </div>
        <button onClick={handleSubmit} disabled={loading} className="ww-auth-primary">{loading ? 'Sending...' : 'Send reset link'}</button>
      </div>
    </AuthShell>
  );
}
