import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { EmptyNotice, MetricTile, PageHero, SurfacePanel } from '../components/DashboardSurface';

// Inlined from deleted lib/format.js
const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const SEVERITY_STYLE = {
  Info: { badge: 'ww-badge--cyan', dot: '#bae6fd' },
  Watch: { badge: 'ww-badge--amber', dot: '#fde68a' },
  Action: { badge: 'ww-badge--rose', dot: '#fecdd3' },
};

export default function NotificationsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  async function loadAlerts() {
    try {
      const data = await api.get('/api/alerts');
      setAlerts(Array.isArray(data) ? data : []);
    } catch { /* backend may not be running */ }
    setLoading(false);
  }

  useEffect(() => { loadAlerts(); }, []);

  async function markReviewed(id) {
    await api.patch(`/api/alerts/${id}/read`);
    setAlerts(c => c.map(a => a.id === id ? { ...a, isRead: true } : a));
  }

  async function markAllRead() {
    const unread = alerts.filter(a => !a.isRead);
    await Promise.all(unread.map(a => api.patch(`/api/alerts/${a.id}/read`)));
    setAlerts(c => c.map(a => ({ ...a, isRead: true })));
  }

  async function deleteAlert(id) {
    await api.delete(`/api/alerts/${id}`);
    setAlerts(c => c.filter(a => a.id !== id));
  }

  const unreadCount = alerts.filter(a => !a.isRead).length;
  const filtered = filter === 'All' ? alerts : filter === 'Unread' ? alerts.filter(a => !a.isRead) : alerts.filter(a => a.severity === filter);

  return (
    <section className="ww-space-y-6">
      <PageHero eyebrow="Notifications" title="Portfolio alerts and reminders"
        description="Goal milestones, SIP reminders, and important portfolio signals."
        action={unreadCount > 0 && <button onClick={markAllRead} className="ww-btn-ghost" style={{ fontSize: '0.875rem' }}>Mark all read</button>} />

      <div className="ww-grid-3 ww-gap-4">
        <MetricTile label="Total alerts" value={String(alerts.length)} note="All notifications in feed" />
        <MetricTile label="Unread" value={String(unreadCount)} note="Requiring your attention" />
        <MetricTile label="Actions needed" value={String(alerts.filter(a => a.severity === 'Action' && !a.isRead).length)} note="High priority items" />
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {['All', 'Unread', 'Info', 'Watch', 'Action'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '0.375rem 1rem', borderRadius: '9999px', border: `1px solid ${filter === f ? 'var(--ww-accent)' : 'var(--ww-border-subtle)'}`,
            background: filter === f ? 'rgba(52,211,153,0.10)' : 'transparent',
            color: filter === f ? 'var(--ww-accent-muted)' : 'rgba(255,255,255,0.6)',
            fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer',
          }}>{f}</button>
        ))}
      </div>

      <SurfacePanel title="Alert feed" subtitle="Goal gaps, investment reminders, and portfolio prompts.">
        {loading && <EmptyNotice message="Loading..." />}
        {!loading && filtered.length === 0 && <EmptyNotice message="No alerts in this filter. New investments and goals will generate reminders here." />}
        <div className="ww-space-y-4">
          {filtered.map((alert) => {
            const style = SEVERITY_STYLE[alert.severity] || SEVERITY_STYLE.Info;
            return (
              <article key={alert.id} style={{
                borderRadius: '24px', border: `1px solid ${alert.isRead ? 'var(--ww-border-subtle)' : 'rgba(52,211,153,0.14)'}`,
                background: alert.isRead ? 'rgba(13,22,18,0.85)' : 'rgba(52,211,153,0.03)',
                padding: '1.25rem', opacity: alert.isRead ? 0.65 : 1,
                transition: 'opacity 0.2s',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span className={`ww-badge ${style.badge}`}>{alert.severity}</span>
                        {!alert.isRead && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: style.dot, display: 'inline-block' }} />}
                        <span style={{ fontSize: '0.75rem', color: 'var(--ww-text-faint)' }}>{formatDate(alert.createdAt)}</span>
                      </div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff' }}>{alert.title}</h3>
                      {alert.description && <p className="ww-body-sm" style={{ marginTop: '0.35rem' }}>{alert.description}</p>}
                    </div>
                    <button onClick={() => deleteAlert(alert.id)} style={{ flexShrink: 0, background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '1.1rem', padding: '0.25rem' }}>✕</button>
                  </div>
                  {!alert.isRead && (
                    <button onClick={() => markReviewed(alert.id)} className="ww-btn-ghost"
                      style={{ alignSelf: 'flex-start', padding: '0.375rem 0.875rem', fontSize: '0.8125rem' }}>
                      Mark reviewed
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </SurfacePanel>
    </section>
  );
}
