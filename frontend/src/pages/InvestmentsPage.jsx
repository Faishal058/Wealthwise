import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, AlertTriangle, Inbox, XCircle } from 'lucide-react';
import { api } from '../lib/api';

const T = {
  textPrimary: 'var(--ww-text-primary)',
  textMuted:   'var(--ww-text-muted)',
  textGhost:   'var(--ww-text-ghost)',
  surface:     'var(--ww-surface)',
  border:      'var(--ww-border)',
  accent:      'var(--ww-accent)',
  positive:    'var(--ww-positive)',
  negative:    'var(--ww-negative)',
};

export default function InvestmentsPage() {
  const navigate = useNavigate();
  const [holdings,     setHoldings]     = useState([]);
  const [summary,      setSummary]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [sortBy,       setSortBy]       = useState('currentValue');
  const [filterCat,    setFilterCat]    = useState('All');
  const [deleteTarget, setDeleteTarget] = useState(null); // holding object
  const [deleting,     setDeleting]     = useState(false);
  const [deleteError,  setDeleteError]  = useState('');

  const load = useCallback(async () => {
    try {
      const [h, s] = await Promise.all([api.get('/api/holdings'), api.get('/api/holdings/summary')]);
      setHoldings(Array.isArray(h) ? h : []);
      setSummary(s);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const fmt  = (n) => n != null ? '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '—';
  const pct  = (n) => n != null ? (n > 0 ? '+' : '') + Number(n).toFixed(2) + '%' : '—';
  const col  = (n) => n > 0 ? '#a3e635' : n < 0 ? '#f87171' : '#94a3b8';

  const cats = ['All', ...new Set(holdings.map(h => h.category || 'Other').filter(Boolean))];
  const filtered = holdings
    .filter(h => filterCat === 'All' || h.category === filterCat)
    .sort((a, b) => Number(b[sortBy] ?? 0) - Number(a[sortBy] ?? 0));

  const riskColors = { 1: '#22c55e', 2: '#a3e635', 3: '#eab308', 4: '#f97316', 5: '#ef4444', 6: '#dc2626' };
  const riskLabels = { 1: 'Low', 2: 'Low-Mod', 3: 'Moderate', 4: 'Mod-High', 5: 'High', 6: 'V.High' };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/api/holdings/${encodeURIComponent(deleteTarget.schemeCode)}`);
      setHoldings(prev => prev.filter(h => h.schemeCode !== deleteTarget.schemeCode));
      setDeleteTarget(null);
    } catch (e) {
      console.error('Delete failed:', e);
      setDeleteError(e.message || 'Delete failed. Make sure the backend is running and restarted.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>

      {/* Summary strip */}
      {summary && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {[
            { l: 'Current Value',  v: fmt(summary.currentValue) },
            { l: 'Total Invested', v: fmt(summary.totalInvested) },
            { l: 'Total Gain',     v: fmt(Number(summary.currentValue) - Number(summary.totalInvested)), c: col(Number(summary.currentValue) - Number(summary.totalInvested)) },
            { l: 'XIRR p.a.',      v: summary.portfolioXirr != null ? (summary.portfolioXirr >= 0 ? '+' : '') + Number(summary.portfolioXirr).toFixed(2) + '%' : '—', c: '#a3e635' },
            { l: 'Risk Score',     v: summary.riskLabel },
          ].map(({ l, v, c }) => (
            <div key={l} className="ww-card" style={{ padding: '1rem 1.25rem', flex: 1, minWidth: '120px' }}>
              <p style={{ fontSize: '0.68rem', color: T.textGhost, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{l}</p>
              <p style={{ fontSize: '1.1rem', fontWeight: 700, color: c || T.textPrimary, marginTop: '0.3rem' }}>{v}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {cats.map(c => (
            <button key={c} onClick={() => setFilterCat(c)} style={{
              padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.78rem', cursor: 'pointer',
            border: `1px solid ${filterCat === c ? 'var(--ww-accent)' : 'var(--ww-border)'}`,
              background: filterCat === c ? 'rgba(163,230,53,0.12)' : 'transparent',
              color: filterCat === c ? 'var(--ww-accent)' : T.textMuted,
            }}>{c}</button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: T.textGhost }}>Sort:</span>
          <select onChange={e => setSortBy(e.target.value)} value={sortBy} style={{
            background: T.surface, border: `1px solid var(--ww-border)`,
            color: T.textPrimary, borderRadius: '8px', padding: '0.3rem 0.6rem', fontSize: '0.78rem', cursor: 'pointer',
          }}>
            <option value="currentValue">Value</option>
            <option value="gainLossPct">Gain %</option>
            <option value="xirr">XIRR</option>
            <option value="totalUnits">Units</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="ww-card" style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>Loading holdings...</div>
      ) : filtered.length === 0 ? (
        <div className="ww-card" style={{ padding: '3.5rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ color: 'var(--ww-text-ghost)' }}><Inbox size={48} /></div>
          <p style={{ color: T.textPrimary, fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>No investments yet</p>
          <p style={{ color: T.textMuted, fontSize: '0.875rem', margin: 0 }}>
            Start by logging your first transaction to track your portfolio.
          </p>
          <button
            onClick={() => navigate('/dashboard/transactions')}
            style={{
              marginTop: '0.5rem',
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.65rem 1.5rem', borderRadius: '999px', cursor: 'pointer',
              background: 'linear-gradient(135deg, rgba(163,230,53,0.18), rgba(163,230,53,0.06))',
              border: '1px solid var(--ww-border-accent)',
              color: T.accent, fontWeight: 700, fontSize: '0.875rem',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(163,230,53,0.25)'}
            onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(163,230,53,0.18), rgba(163,230,53,0.06))'}
          >
            <Plus size={16} /> Add Investments <span style={{ fontSize: '1rem' }}>→</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map(h => (
            <div key={h.schemeCode} className="ww-card" style={{ padding: '1.25rem 1.5rem', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                    <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: T.textPrimary }}>{h.fundName}</p>
                    {h.planType && <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: '5px', background: h.planType === 'DIRECT' ? 'rgba(163,230,53,0.15)' : 'rgba(255,255,255,0.08)', color: h.planType === 'DIRECT' ? '#a3e635' : 'rgba(255,255,255,0.5)' }}>{h.planType}</span>}
                    {h.riskLevel && <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: '5px', background: `${riskColors[h.riskLevel]}22`, color: riskColors[h.riskLevel] }}>{riskLabels[h.riskLevel]}</span>}
                  </div>
                  <p style={{ fontSize: '0.75rem', color: T.textGhost }}>{h.amcName} · {h.category} · {h.totalUnits?.toFixed(4)} units</p>
                </div>

                {/* Metric columns */}
                <div style={{ display: 'flex', gap: '2rem', flexShrink: 0, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  {[
                    { l: 'Current Value', v: fmt(h.currentValue), c: '#fff' },
                    { l: 'Invested',      v: fmt(h.investedValue) },
                    { l: 'Gain/Loss',     v: fmt(h.gainLoss ?? (Number(h.currentValue || 0) - Number(h.investedValue || 0))), c: col(Number(h.currentValue || 0) - Number(h.investedValue || 0)) },
                    { l: 'Return',        v: pct(h.gainLossPct), c: col(h.gainLossPct) },
                    { l: 'XIRR p.a.',     v: h.xirr != null ? (h.xirr >= 0 ? '+' : '') + Number(h.xirr).toFixed(2) + '%' : '—', c: '#a3e635' },
                  ].map(({ l, v, c }) => (
                    <div key={l} style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '0.68rem', color: T.textGhost, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{l}</p>
                      <p style={{ fontSize: '0.9rem', fontWeight: 700, color: c || T.textMuted, marginTop: '0.2rem' }}>{v}</p>
                    </div>
                  ))}
                </div>

                {/* Bin icon */}
                <button
                  onClick={() => setDeleteTarget(h)}
                  title="Remove this holding"
                  style={{
                    flexShrink: 0,
                    width: '36px', height: '36px', borderRadius: '10px',
                    border: '1px solid rgba(248,113,113,0.25)',
                    background: 'rgba(248,113,113,0.07)',
                    color: '#f87171',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s', alignSelf: 'center',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.22)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.6)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.07)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.25)'; e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* NAV bar */}
              <div style={{ marginTop: '0.875rem', paddingTop: '0.875rem', borderTop: `1px solid var(--ww-border)`, display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', color: T.textGhost }}>Avg Cost: <b style={{ color: T.textPrimary }}>₹{Number(h.avgCostNav || 0).toFixed(4)}</b></span>
                <span style={{ fontSize: '0.75rem', color: T.textGhost }}>Current NAV: <b style={{ color: T.textPrimary }}>₹{Number(h.currentNav || 0).toFixed(4)}</b></span>
                {h.navDate && <span style={{ fontSize: '0.75rem', color: T.textGhost }}>As of {h.navDate}</span>}
                <span style={{ fontSize: '0.75rem', color: T.textGhost }}>Code: <b style={{ color: T.textPrimary }}>{h.schemeCode}</b></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Delete confirmation modal ── */}
      {deleteTarget && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#061a10', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '22px', padding: '2.25rem', maxWidth: '440px', width: '100%', boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}
          >
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', margin: '0 auto 1rem', background: 'rgba(248,113,113,0.12)', border: '2px solid rgba(248,113,113,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171' }}>
                <Trash2 size={28} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff', marginBottom: '0.5rem' }}>Remove Holding?</h3>
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.18)', borderRadius: '10px', margin: '0.75rem 0' }}>
                <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f87171' }}>{deleteTarget.fundName}</p>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', marginTop: '0.2rem' }}>
                  {deleteTarget.totalUnits?.toFixed(4)} units · {fmt(deleteTarget.currentValue)}
                </p>
              </div>
              <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center', fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.65 }}>
                <AlertTriangle size={14} color="#fbbf24" /> This will permanently delete all transactions and lots for this fund.
              </p>
              {deleteError && (
                <div style={{ marginTop: '0.75rem', padding: '0.65rem 0.875rem', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', textAlign: 'left' }}>
                  <XCircle size={16} color="#f87171" /> <p style={{ fontSize: '0.72rem', color: '#f87171', lineHeight: 1.5, margin: 0 }}>{deleteError}</p>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => { setDeleteTarget(null); setDeleteError(''); }}
                disabled={deleting}
                style={{ flex: 1, padding: '0.875rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
              >Cancel</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ flex: 1, padding: '0.875rem', borderRadius: '12px', background: '#ef4444', border: 'none', color: '#fff', fontWeight: 800, fontSize: '0.875rem', cursor: deleting ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', opacity: deleting ? 0.7 : 1 }}
              >
                {deleting
                  ? <><span style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> Deleting…</>
                  : <><Trash2 size={16} /> Yes, Remove</>}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
