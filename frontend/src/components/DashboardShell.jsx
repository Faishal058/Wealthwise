import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sun, Moon, Bell, ChevronDown } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';

const NAV_ITEMS = [
  { href: '/dashboard',              label: 'Dashboard' },
  { href: '/dashboard/investments',  label: 'Investments' },
  { href: '/dashboard/transactions', label: 'Transactions' },
  { href: '/dashboard/portfolio',    label: 'Portfolio' },
  { href: '/dashboard/goals',        label: 'Goal Based' },
];

export function DashboardShell({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <div className="ww-app-shell">
      <div className="ww-aurora" aria-hidden="true" />
      <div className="ww-app-layout">

        {/* ── Sidebar ── */}
        <aside className="ww-sidebar">
          {/* Logo */}
          <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 0.5rem' }}>
            <div style={{
              height: '2.5rem', width: '2.5rem', flexShrink: 0,
              borderRadius: '12px', overflow: 'hidden',
            }}>
              <img src="/logo.svg" alt="WealthWise" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--ww-text-primary)', letterSpacing: '-0.02em' }}>
                Wealth<span style={{ color: 'var(--ww-accent)' }}>Wise</span>
              </p>
              <p style={{ fontSize: '0.7rem', color: 'var(--ww-text-ghost)', marginTop: '0.1rem' }}>Smart fund cockpit</p>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1 }}>
            <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.22em', color: 'var(--ww-text-ghost)', marginBottom: '0.5rem', padding: '0 0.75rem' }}>Menu</p>
            <div className="ww-space-y-1">
              {NAV_ITEMS.map((item) => {
                const active = location.pathname === item.href ||
                  (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
                return (
                  <Link key={item.href} to={item.href}
                    className={`ww-nav-link ${active ? 'ww-nav-link--active' : ''}`}>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* User card at bottom */}
          <div style={{
            marginTop: '2rem', padding: '1rem', borderRadius: '18px',
            background: 'var(--ww-surface)', border: '1px solid var(--ww-border-subtle)',
          }}>
            <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.22em', color: 'var(--ww-text-ghost)' }}>Signed in as</p>
            <p style={{ marginTop: '0.4rem', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--ww-text-primary)', wordBreak: 'break-all' }}>
              {user?.fullName || user?.email || 'Investor'}
            </p>
            <button onClick={handleSignOut} style={{
              marginTop: '0.75rem', width: '100%', padding: '0.5rem',
              borderRadius: '10px', border: '1px solid var(--ww-border)',
              background: 'transparent', color: 'var(--ww-text-muted)',
              fontSize: '0.8125rem', cursor: 'pointer', transition: 'all 0.18s',
            }}
              onMouseEnter={e => { e.target.style.borderColor = '#e05252'; e.target.style.color = '#e05252'; }}
              onMouseLeave={e => { e.target.style.borderColor = 'var(--ww-border)'; e.target.style.color = 'var(--ww-text-muted)'; }}>
              Sign out
            </button>
          </div>
        </aside>

        {/* ── Main content area ── */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>

          {/* ── Top header bar ── */}
          <header style={{
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            padding: '0 2rem', height: '64px', flexShrink: 0,
          }}>
            {/* Alerts + Profile only */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>

              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  height: '2.25rem', width: '2.25rem', borderRadius: '10px',
                  background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                  border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)'}`,
                  fontSize: '1rem', cursor: 'pointer', color: theme === 'dark' ? '#fff' : '#0d1f14',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = theme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'; }}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.35s ease', transform: theme === 'light' ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  {theme === 'dark' ? <Sun size={15} strokeWidth={2} /> : <Moon size={15} strokeWidth={2} />}
                </span>
              </button>

              {/* Alerts bell — navigates to notifications page */}
              <Link to="/dashboard/notifications" title="Notifications" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: '2.25rem', width: '2.25rem', borderRadius: '10px',
                background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)'}`,
                textDecoration: 'none', color: theme === 'dark' ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.6)',
              }}><Bell size={15} strokeWidth={2} /></Link>

              {/* Profile dropdown */}
              <div style={{ position: 'relative' }}>
                <button onClick={() => setProfileOpen(o => !o)} style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.375rem 0.75rem', borderRadius: '10px',
                  background: 'var(--ww-surface)', border: '1px solid var(--ww-border)',
                  cursor: 'pointer', color: 'var(--ww-text-primary)',
                }}>
                  <span style={{
                    height: '1.75rem', width: '1.75rem', borderRadius: '50%',
                    background: 'var(--ww-accent)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--ww-accent-dark)',
                  }}>
                    {(user?.fullName || user?.email || 'U')[0].toUpperCase()}
                  </span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{user?.fullName?.split(' ')[0] || 'Me'}</span>
                  <ChevronDown size={13} strokeWidth={2} style={{ color: 'var(--ww-text-muted)' }} />
                </button>

                {profileOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 0.5rem)', right: 0,
                    width: '200px', borderRadius: '16px', overflow: 'hidden',
                    background: theme === 'dark' ? '#0a1f12' : '#ffffff',
                    border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)'}`,
                    boxShadow: theme === 'dark' ? '0 16px 48px rgba(0,0,0,0.6)' : '0 16px 48px rgba(0,0,0,0.14)',
                    zIndex: 50,
                  }}>
                    <div style={{ padding: '0.875rem 1rem', borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: theme === 'dark' ? '#fff' : '#0d1f14' }}>{user?.fullName || 'Investor'}</p>
                      <p style={{ fontSize: '0.75rem', color: theme === 'dark' ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)', marginTop: '0.2rem', wordBreak: 'break-all' }}>{user?.email}</p>
                    </div>
                    {[
                      { label: 'Profile', href: '/profile' },
                      { label: 'Settings', href: '/dashboard/settings' },
                    ].map(item => (
                      <Link key={item.href} to={item.href}
                        onClick={() => setProfileOpen(false)}
                        style={{ display: 'block', padding: '0.75rem 1rem', fontSize: '0.875rem', color: theme === 'dark' ? 'rgba(255,255,255,0.78)' : 'rgba(0,0,0,0.75)', textDecoration: 'none', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.target.style.background = theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}
                        onMouseLeave={e => e.target.style.background = 'transparent'}>
                        {item.label}
                      </Link>
                    ))}
                    <div style={{ borderTop: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}>
                      <button onClick={handleSignOut} style={{
                        width: '100%', padding: '0.75rem 1rem', textAlign: 'left',
                        fontSize: '0.875rem', color: '#e05252', background: 'transparent',
                        border: 'none', cursor: 'pointer',
                      }}>Sign out</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* ── Page content ── */}
          <main className="ww-main" onClick={() => profileOpen && setProfileOpen(false)}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
