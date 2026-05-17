import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { EmptyNotice, PageHero, SurfacePanel } from '../components/DashboardSurface';

const PREFS = [
  { key: 'sipDueInApp', label: 'SIP due reminders', sub: 'In-app notification' },
  { key: 'sipDueEmail', label: 'SIP due reminders', sub: 'Email notification' },
  { key: 'goalMilestonesInApp', label: 'Goal milestones', sub: 'In-app notification' },
  { key: 'goalMilestonesEmail', label: 'Goal milestones', sub: 'Email notification' },
  { key: 'dailyDigestEmail', label: 'Daily digest', sub: 'Email summary every morning' },
  { key: 'marketAlertsInApp', label: 'Market alerts', sub: 'In-app notification' },
];

const DEFAULT_PREFS = PREFS.reduce((a, p) => ({ ...a, [p.key]: true }), {});

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    api.get('/api/settings')
      .then(data => setSettings(data || DEFAULT_PREFS))
      .catch(() => setSettings(DEFAULT_PREFS));
  }, []);

  async function save() {
    setSaving(true); setMsg({ text: '', type: '' });
    try {
      await api.put('/api/settings', settings);
      setMsg({ text: 'Preferences saved!', type: 'success' });
    } catch {
      setMsg({ text: 'Failed to save. Is the backend running?', type: 'error' });
    }
    setSaving(false);
  }

  function toggle(key) { setSettings(s => ({ ...s, [key]: !s[key] })); }

  return (
    <section className="ww-space-y-6">
      <PageHero eyebrow="Settings" title="Notification preferences"
        description="Control exactly how WealthWise notifies you about your portfolio." />

      {msg.text && (
        <div className={`ww-alert ${msg.type === 'error' ? 'ww-alert--error' : 'ww-alert--success'}`}>{msg.text}</div>
      )}

      <SurfacePanel title="Notification settings" subtitle="Toggle each channel on or off.">
        {!settings
          ? <EmptyNotice message="Loading..." />
          : (
            <div className="ww-space-y-3">
              {PREFS.map((p) => (
                <label key={p.key} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  borderRadius: '18px', border: `1px solid ${settings[p.key] ? 'rgba(52,211,153,0.16)' : 'var(--ww-border-subtle)'}`,
                  background: settings[p.key] ? 'rgba(52,211,153,0.05)' : 'rgba(13,22,18,0.85)',
                  padding: '1rem 1.25rem', cursor: 'pointer', transition: 'all 0.18s',
                }}>
                  <div>
                    <p style={{ fontSize: '0.9375rem', fontWeight: 500, color: '#fff' }}>{p.label}</p>
                    <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.48)', marginTop: '0.2rem' }}>{p.sub}</p>
                  </div>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <input type="checkbox" checked={!!settings[p.key]} onChange={() => toggle(p.key)}
                      style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
                    <div style={{
                      width: '44px', height: '24px', borderRadius: '12px',
                      background: settings[p.key] ? 'var(--ww-accent)' : 'rgba(255,255,255,0.15)',
                      transition: 'background 0.2s', position: 'relative',
                    }}>
                      <div style={{
                        position: 'absolute', top: '3px',
                        left: settings[p.key] ? '23px' : '3px',
                        width: '18px', height: '18px', borderRadius: '50%',
                        background: settings[p.key] ? '#062415' : '#fff',
                        transition: 'left 0.2s',
                      }} />
                    </div>
                  </div>
                </label>
              ))}
              <button onClick={save} disabled={saving} className="ww-btn-primary" style={{ marginTop: '0.5rem' }}>
                {saving ? 'Saving...' : 'Save preferences'}
              </button>
            </div>
          )}
      </SurfacePanel>
    </section>
  );
}
