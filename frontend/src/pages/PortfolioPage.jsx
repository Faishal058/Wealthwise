import { useState, useEffect, useCallback, useRef } from 'react';
import { BarChart3, ListFilter, BrainCircuit, Wrench, RefreshCw, DollarSign, CreditCard, TrendingUp, TrendingDown, Zap, Calendar, Scale, Activity, CheckCircle2, AlertTriangle, XCircle, Target, Puzzle } from 'lucide-react';
import { api } from '../lib/api';

const T = {
  textPrimary:  'var(--ww-text-primary)',
  textSec:      'var(--ww-text-secondary)',
  textMuted:    'var(--ww-text-muted)',
  textGhost:    'var(--ww-text-ghost)',
  surface:      'var(--ww-surface)',
  surfaceHover: 'var(--ww-surface-hover)',
  border:       'var(--ww-border)',
  borderSubtle: 'var(--ww-border-subtle)',
  borderAccent: 'var(--ww-border-accent)',
  accent:       'var(--ww-accent)',
  accentDark:   'var(--ww-accent-dark)',
  positive:     'var(--ww-positive)',
  negative:     'var(--ww-negative)',
  blue:         'var(--ww-blue)',
  orange:       'var(--ww-orange)',
  purple:       'var(--ww-purple)',
};

/* ─── helpers ─────────────────────────────────────────────── */
const fmt = (n, dec = 0) =>
  n != null ? '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: dec, minimumFractionDigits: dec }) : '—';
const fmtPct = (n, dec = 2) =>
  n != null ? (n >= 0 ? '+' : '') + Number(n).toFixed(dec) + '%' : '—';
const fmtNum = (n, dec = 2) =>
  n != null ? Number(n).toFixed(dec) : '—';

const COLORS = {
  Equity: '#a3e635', Debt: '#38bdf8', Hybrid: '#fb923c',
  Commodity: '#fbbf24', Other: '#8b5cf6',
};
const CAT_COLORS = [
  '#a3e635','#38bdf8','#fb923c','#fbbf24','#8b5cf6',
  '#f87171','#34d399','#e879f9','#67e8f9','#a78bfa',
];
const RISK_COLORS = { 1:'#22c55e',2:'#a3e635',3:'#eab308',4:'#f97316',5:'#ef4444',6:'#dc2626' };

/* CAGR formula */
function calcCagr(invested, current, years) {
  if (!invested || invested <= 0 || years <= 0 || current <= 0) return null;
  return (Math.pow(current / invested, 1 / years) - 1) * 100;
}

/* Animated counter hook */
function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(0);
  const raf = useRef();
  useEffect(() => {
    if (target == null || target === 0) { setVal(0); return; }
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(target * eased);
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return val;
}

/* Mini donut SVG */
function DonutChart({ data, size = 140 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return null;
  const r = 44, cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const slices = data.map((d, i) => {
    const pct = d.value / total;
    const dash = circ * pct;
    const slice = (
      <circle key={i} r={r} cx={cx} cy={cy}
        fill="none" stroke={d.color} strokeWidth="16"
        strokeDasharray={`${dash - 1} ${circ - dash + 1}`}
        strokeDashoffset={-offset + circ * 0.25}
        style={{ transition: 'all 0.6s ease' }} />
    );
    offset += dash;
    return slice;
  });
  const top = data[0];
  const topPct = total > 0 ? (top.value / total * 100).toFixed(0) : 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle r={r} cx={cx} cy={cy} fill="none" stroke="var(--ww-border)" strokeWidth="16" />
      {slices}
      <text x={cx} y={cy - 5} textAnchor="middle" fill="var(--ww-text-primary)" fontSize="13" fontWeight="800">
        {top?.label?.slice(0, 3)}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="var(--ww-text-muted)" fontSize="10">
        {topPct}%
      </text>
    </svg>
  );
}

/* Sparkline SVG */
function Sparkline({ values, color = '#a3e635', h = 40, w = 100, style }) {
  if (!values || values.length < 2) return null;
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  });
  const pathD = `M ${pts.join(' L ')}`;
  const areaD = `M ${pts[0]} L ${pts.join(' L ')} L ${w},${h} L 0,${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible', ...style }}>
      <defs>
        <linearGradient id="spkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#spkGrad)" />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════ */
export default function PortfolioPage() {
  const [summary, setSummary]         = useState(null);
  const [holdings, setHoldings]       = useState([]);
  const [growth, setGrowth]           = useState([]);
  const [riskProfile, setRiskProfile] = useState(null);
  const [sipIntel, setSipIntel]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState('overview');
  const [sip, setSip]                 = useState({ amount: 5000, rate: 12, years: 10 });

  /* Animated hero values */
  const animCurrent  = useCountUp(Number(summary?.currentValue  ?? 0));
  const animInvested = useCountUp(Number(summary?.totalInvested ?? 0));
  const animGain     = useCountUp(Math.abs(Number(summary?.currentValue ?? 0) - Number(summary?.totalInvested ?? 0)));

  const load = useCallback(async () => {
    try {
      const [s, h] = await Promise.all([
        api.get('/api/holdings/summary'),
        api.get('/api/holdings'),
      ]);
      setSummary(s);
      setHoldings(Array.isArray(h) ? h : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const loadAnalytics = useCallback(async () => {
    try {
      const [gRes, rRes, sRes] = await Promise.allSettled([
        api.get('/api/holdings/growth'),
        api.get('/api/holdings/risk-profile'),
        api.get('/api/holdings/sip-intelligence'),
      ]);
      if (gRes.status === 'fulfilled' && Array.isArray(gRes.value)) setGrowth(gRes.value);
      if (rRes.status === 'fulfilled' && rRes.value)                 setRiskProfile(rRes.value);
      if (sRes.status === 'fulfilled' && Array.isArray(sRes.value)) setSipIntel(sRes.value);
    } catch (e) { console.error('analytics:', e); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadAnalytics(); }, [loadAnalytics]);

  /* Derived values */
  const alloc     = summary?.allocation || {};
  const totalVal  = Number(summary?.currentValue  ?? 0);
  const invested  = Number(summary?.totalInvested ?? 0);
  const gain      = totalVal - invested;
  const gainPct   = invested > 0 ? (gain / invested) * 100 : 0;
  const xirr      = summary?.portfolioXirr;
  const riskScore = Number(summary?.portfolioRiskScore ?? 3);
  const years     = Number(summary?.holdingYears ?? 2);
  const cagr      = calcCagr(invested, totalVal, years);
  const fundCount = holdings.length;
  const amcs      = new Set(holdings.map(h => h.amcName)).size;
  const cats      = new Set(holdings.map(h => h.category)).size;

  /* Diversification score */
  let divScore = 0;
  if (fundCount >= 3 && fundCount <= 8) divScore += 2; else if (fundCount >= 9) divScore += 1;
  if (amcs >= 3) divScore += 2; else if (amcs >= 2) divScore += 1;
  if (cats >= 3) divScore += 2; else if (cats >= 2) divScore += 1;
  const equityPct = alloc['Equity'] ? Number(alloc['Equity']) / totalVal * 100 : 0;
  const debtPct   = alloc['Debt']   ? Number(alloc['Debt'])   / totalVal * 100 : 0;
  if (equityPct > 0 && debtPct > 0) divScore += 2; else if (equityPct > 0 || debtPct > 0) divScore += 1;
  divScore = Math.min(10, divScore);
  const divColor = divScore >= 7 ? '#a3e635' : divScore >= 4 ? '#fbbf24' : '#f87171';

  /* SIP calculator */
  const sipFV = (() => {
    const r = sip.rate / 100 / 12, n = sip.years * 12;
    return r > 0 ? sip.amount * ((Math.pow(1 + r, n) - 1) / r) * (1 + r) : sip.amount * n;
  })();
  const sipInvested = sip.amount * sip.years * 12;
  const sipGain = sipFV - sipInvested;
  const sipGainPct = ((sipGain / sipInvested) * 100).toFixed(1);

  /* Alloc donut data */
  const donutData = Object.entries(alloc).map(([cat, val]) => ({
    label: cat, value: Number(val), color: COLORS[cat] || '#8b5cf6',
  }));

  /* Sparkline */
  const sparkVals = growth.length >= 2
    ? growth.map(p => Number(p.value))
    : [invested, invested + gain * 0.3, invested + gain * 0.6, totalVal];

  /* Fund-wise donut data for allocation tab */
  const fundDonutData = [...holdings]
    .sort((a, b) => Number(b.currentValue) - Number(a.currentValue))
    .slice(0, 10)
    .map((h, i) => ({
      label: (h.fundName || h.schemeCode).split(' ').slice(0, 2).join(' '),
      fullName: h.fundName || h.schemeCode,
      value: Number(h.currentValue || 0),
      color: CAT_COLORS[i % CAT_COLORS.length],
    }));

  const tabs = [
    { id: 'overview',   label: <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><BarChart3 size={16} /> Overview</span> },
    { id: 'holdings',   label: <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><ListFilter size={16} /> Holdings</span> },
    { id: 'analytics',  label: <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><BrainCircuit size={16} /> Analytics</span> },
    { id: 'tools',      label: <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Wrench size={16} /> Tools</span> },
  ];

  /* ──────────────────────────────────────────────────────── */
  return (
    <div style={{ padding: '1.5rem 1rem', width: '100%' }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p className="ww-overline">PORTFOLIO</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: T.textPrimary, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            Portfolio Analytics
          </h1>
          <button onClick={() => { load(); loadAnalytics(); }} style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            background: 'rgba(163,230,53,0.1)', border: '1px solid rgba(163,230,53,0.25)',
            borderRadius: '999px', padding: '0.45rem 1rem',
            color: '#a3e635', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
          }}><RefreshCw size={14} /> Refresh</button>
        </div>
      </div>

      {/* ── Hero metric strip ── */}
      {loading ? (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} className="ww-card" style={{ flex: '1 1 150px', height: '90px',
              background: 'rgba(255,255,255,0.03)', borderRadius: '16px', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Portfolio Value', icon: <DollarSign size={20} color="var(--ww-accent)" />, value: fmt(animCurrent), sub: fmtPct(gainPct), subColor: gainPct >= 0 ? T.positive : T.negative, accent: true },
            { label: 'Total Invested',  icon: <CreditCard size={20} color="var(--ww-text-muted)" />, value: fmt(animInvested), sub: `${fundCount} fund${fundCount !== 1 ? 's' : ''}`, subColor: T.textGhost },
            { label: 'Total Gain/Loss', icon: gain >= 0 ? <TrendingUp size={20} color={T.positive} /> : <TrendingDown size={20} color={T.negative} />, value: fmt(Math.abs(animGain)), sub: gain >= 0 ? 'Unrealized profit' : 'Unrealized loss', subColor: gain >= 0 ? T.positive : T.negative, valueColor: gain >= 0 ? T.positive : T.negative },
            { label: 'XIRR',           icon: <Zap size={20} color={xirr != null && xirr >= 12 ? T.positive : T.orange} />, value: xirr != null ? fmtNum(xirr) + '%' : '—', sub: 'Extended IRR', subColor: xirr != null && xirr >= 12 ? T.positive : T.orange, valueColor: xirr != null && xirr >= 0 ? T.positive : T.negative },
            { label: 'CAGR',           icon: <Calendar size={20} color="var(--ww-text-muted)" />, value: cagr != null ? fmtNum(cagr) + '%' : '—', sub: `${fmtNum(years, 1)} yr avg`, subColor: T.textGhost, valueColor: cagr != null && cagr >= 0 ? T.positive : T.negative },
          ].map(({ label, icon, value, sub, subColor, valueColor, accent }) => (
            <div key={label} className="ww-card" style={{
              padding: '1.1rem 1.25rem',
              background: accent ? 'linear-gradient(135deg, rgba(163,230,53,0.14), rgba(163,230,53,0.04))' : T.surface,
              border: accent ? `1px solid var(--ww-border-accent)` : `1px solid var(--ww-border)`,
              borderRadius: '16px', position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>{icon}</div>
              <p style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: T.textGhost, marginBottom: '0.3rem' }}>{label}</p>
              <p style={{ fontSize: '1.35rem', fontWeight: 800, color: valueColor || T.textPrimary, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '0.25rem' }}>{value}</p>
              <p style={{ fontSize: '0.72rem', fontWeight: 600, color: subColor }}>{sub}</p>
              {accent && <Sparkline values={sparkVals} color="var(--ww-accent)" w={80} h={28} style={{ position: 'absolute', bottom: 8, right: 8, opacity: 0.6 }} />}
            </div>
          ))}
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', background: T.surface, borderRadius: '12px', padding: '4px', border: `1px solid var(--ww-border)`, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            flex: '1 1 auto', padding: '0.55rem 1rem', borderRadius: '9px', border: 'none', cursor: 'pointer',
            fontWeight: 600, fontSize: '0.825rem',
            background: activeTab === t.id ? 'rgba(163,230,53,0.15)' : 'transparent',
            color: activeTab === t.id ? T.accent : T.textMuted,
            outline: activeTab === t.id ? '1px solid rgba(163,230,53,0.3)' : 'none',
            transition: 'all 0.2s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════
          TAB: OVERVIEW — P&L + Risk side by side (no benchmark, no rebalancing)
      ══════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Row 1: P&L + Risk */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>

            {/* P&L Card */}
            <div className="ww-card" style={{ padding: '1.75rem' }}>
              <p className="ww-label" style={{ marginBottom: '1.25rem' }}>Profit & Loss Breakdown</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.75rem' }}>
                <div style={{
                  width: '72px', height: '72px', borderRadius: '50%', flexShrink: 0,
                  background: gain >= 0 ? 'rgba(163,230,53,0.12)' : 'rgba(248,113,113,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `2px solid ${gain >= 0 ? 'rgba(163,230,53,0.4)' : 'rgba(248,113,113,0.4)'}`,
                  color: gain >= 0 ? '#a3e635' : '#f87171',
                }}>
                  {gain >= 0 ? <TrendingUp size={36} /> : <TrendingDown size={36} />}
                </div>
                <div>
                  <p style={{ fontSize: '2rem', fontWeight: 900, color: gain >= 0 ? '#a3e635' : '#f87171', letterSpacing: '-0.03em', lineHeight: 1 }}>
                    {gain >= 0 ? '+' : ''}{fmt(gain)}
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', marginTop: '0.2rem' }}>Unrealized gain/loss</p>
                </div>
              </div>

              {/* Invested vs Current visual bar */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>Invested</span>
                  <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>Current Value</span>
                </div>
                <div style={{ height: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.07)', overflow: 'hidden', position: 'relative' }}>
                  <div style={{ height: '100%', width: totalVal > 0 ? `${Math.min((invested / Math.max(invested, totalVal)) * 100, 100)}%` : '0%', background: 'rgba(255,255,255,0.25)', borderRadius: '8px', position: 'absolute' }} />
                  <div style={{ height: '100%', width: totalVal > 0 ? `${Math.min((totalVal / Math.max(invested, totalVal)) * 100, 100)}%` : '0%', background: gain >= 0 ? '#a3e635' : '#f87171', borderRadius: '8px', transition: 'width 0.7s ease' }} />
                </div>
              </div>

              {[
                { l: 'Invested',        v: fmt(invested),                                        c: T.textPrimary },
                { l: 'Current Value',   v: fmt(totalVal),                                        c: T.textPrimary, fw: 700 },
                { l: 'Absolute Return', v: fmtPct(gainPct),                                      c: gainPct >= 0 ? T.positive : T.negative },
                { l: 'CAGR',           v: cagr != null ? (cagr >= 0 ? '+' : '') + fmtNum(cagr) + '%' : '—', c: cagr != null && cagr >= 0 ? T.positive : T.negative },
                { l: 'XIRR',           v: xirr != null ? (xirr >= 0 ? '+' : '') + fmtNum(xirr) + '%' : '—', c: T.blue },
                { l: 'Holding Period', v: `${fmtNum(years, 1)} years`,                           c: T.textMuted },
              ].map(({ l, v, c, fw }) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.55rem 0', borderBottom: `1px solid var(--ww-border)` }}>
                  <span style={{ fontSize: '0.82rem', color: T.textMuted }}>{l}</span>
                  <span style={{ fontSize: '0.92rem', fontWeight: fw || 700, color: c }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Risk Score Card */}
            <div className="ww-card" style={{ padding: '1.75rem' }}>
              <p className="ww-label" style={{ marginBottom: '1.25rem' }}>Portfolio Risk Profile</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.75rem' }}>
                <div style={{
                  width: '90px', height: '90px', borderRadius: '50%', flexShrink: 0,
                  background: `conic-gradient(${RISK_COLORS[Math.round(riskScore)] || '#fbbf24'} ${(riskScore / 6) * 360}deg, rgba(255,255,255,0.06) 0deg)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{ width: '66px', height: '66px', borderRadius: '50%', background: '#04140f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '1.4rem', fontWeight: 900, color: RISK_COLORS[Math.round(riskScore)] || '#fbbf24' }}>
                      {riskScore?.toFixed(1) ?? '—'}
                    </span>
                  </div>
                </div>
                <div>
                  <p style={{ fontWeight: 800, fontSize: '1.25rem', color: RISK_COLORS[Math.round(riskScore)] || '#fbbf24' }}>
                    {summary?.riskLabel || '—'}
                  </p>
                  <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.2rem' }}>SEBI Riskometer (1–6 scale)</p>
                </div>
              </div>

              {/* Risk bar */}
              <div style={{ display: 'flex', gap: '4px', marginBottom: '0.4rem' }}>
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} style={{ flex: 1, height: '10px', borderRadius: '4px', background: i <= Math.round(riskScore || 0) ? RISK_COLORS[i] : 'var(--ww-surface)', transition: 'background 0.4s' }} />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.6rem', color: T.textGhost }}>Low</span>
                <span style={{ fontSize: '0.6rem', color: T.textGhost }}>Very High</span>
              </div>

              {/* Diversification */}
              <p className="ww-label" style={{ marginBottom: '0.75rem' }}>Diversification Score</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                <div style={{ flex: 1, height: '12px', borderRadius: '8px', background: T.surface, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${divScore * 10}%`, background: divColor, borderRadius: '8px', transition: 'width 0.8s ease' }} />
                </div>
                <span style={{ fontSize: '1.1rem', fontWeight: 900, color: divColor, minWidth: '42px', textAlign: 'right' }}>{divScore}/10</span>
              </div>
              <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: T.textGhost, marginBottom: '1.25rem' }}>
                {divScore >= 7 ? <><CheckCircle2 size={16} color="#a3e635" /> Well diversified</> : divScore >= 4 ? <><AlertTriangle size={16} color="#fbbf24" /> Moderately diversified</> : <><XCircle size={16} color="#f87171" /> Under-diversified</>}
              </p>

              {/* Diversification breakdown */}
              {[
                { l: 'Funds held',       v: `${fundCount}`,          ok: fundCount >= 3 && fundCount <= 8, note: 'Ideal: 3–8' },
                { l: 'AMCs',             v: `${amcs}`,               ok: amcs >= 3,                        note: 'Ideal: 3+' },
                { l: 'Asset categories', v: `${cats}`,               ok: cats >= 2,                        note: 'Ideal: 2+' },
                { l: 'Equity + Debt',    v: equityPct > 0 && debtPct > 0 ? 'Both' : 'Equity only', ok: equityPct > 0 && debtPct > 0, note: 'Balanced' },
              ].map(({ l, v, ok, note }) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: `1px solid var(--ww-border)` }}>
                  <div>
                    <p style={{ fontSize: '0.78rem', color: T.textMuted }}>{l}</p>
                    <p style={{ fontSize: '0.6rem', color: T.textGhost }}>{note}</p>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.18rem 0.55rem', borderRadius: '999px', background: ok ? 'rgba(163,230,53,0.1)' : 'rgba(251,191,36,0.1)', color: ok ? T.positive : T.orange }}>
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Row 2: Growth sparkline */}
          {sparkVals.length >= 2 && (
            <div className="ww-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <p className="ww-label">Portfolio Growth</p>
                <span style={{ fontSize: '0.72rem', color: T.textGhost }}>NAV-based monthly snapshot</span>
              </div>
              <Sparkline values={sparkVals} color="var(--ww-accent)" w={800} h={80} style={{ width: '100%', height: '80px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.65rem', color: T.textGhost }}>{growth[0]?.month || 'Earliest'}</span>
                <span style={{ fontSize: '0.65rem', color: T.textGhost }}>Today</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          TAB: HOLDINGS
      ══════════════════════════════════════════════ */}
      {activeTab === 'holdings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="ww-card" style={{ padding: '1.5rem', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <p className="ww-label">Fund-wise Holdings ({fundCount} funds)</p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '8px', background: 'rgba(163,230,53,0.1)', color: '#a3e635', fontWeight: 700 }}>
                  Invested {fmt(invested)}
                </span>
                <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '8px', background: gain >= 0 ? 'rgba(163,230,53,0.1)' : 'rgba(248,113,113,0.1)', color: gain >= 0 ? '#a3e635' : '#f87171', fontWeight: 700 }}>
                  {gain >= 0 ? '+' : ''}{fmt(gain)} ({fmtPct(gainPct)})
                </span>
              </div>
            </div>
            {holdings.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.35)', textAlign: 'center', padding: '3rem' }}>No holdings. Add transactions to see holdings.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                  <thead>
                    <tr>
                      {['Fund', 'Units', 'Avg NAV', 'Curr NAV', 'Invested', 'Curr Value', 'Gain/Loss', 'Return%', 'XIRR', 'Alloc%'].map(h => (
                        <th key={h} style={{
                          padding: '0.55rem 0.65rem', textAlign: h === 'Fund' ? 'left' : 'right',
                          fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase',
                          letterSpacing: '0.12em', color: T.textGhost,
                          borderBottom: `1px solid var(--ww-border)`, whiteSpace: 'nowrap',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...holdings].sort((a, b) => Number(b.currentValue || 0) - Number(a.currentValue || 0)).map((h, idx) => {
                      const gl     = Number(h.gainLoss    ?? (Number(h.currentValue || 0) - Number(h.investedValue || 0)));
                      const glPct  = Number(h.gainLossPct ?? (Number(h.investedValue || 0) > 0 ? (gl / Number(h.investedValue)) * 100 : 0));
                      const xirr2  = h.xirr;
                      const cv     = Number(h.currentValue  || 0);
                      const iv     = Number(h.investedValue || 0);
                      const units  = Number(h.totalUnits   || 0);
                      const avgNav = Number(h.avgCostNav   || (units > 0 ? iv / units : 0));
                      const curNav = Number(h.currentNav   || (units > 0 ? cv / units : 0));
                      const allocP = totalVal > 0 ? (cv / totalVal * 100) : 0;
                      const catKey = (h.category || 'Other').split(' ')[0];
                      return (
                        <tr key={h.schemeCode}
                          style={{ background: idx % 2 === 0 ? 'transparent' : T.surface, transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(163,230,53,0.04)'}
                          onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : T.surface}>
                          <td style={{ padding: '0.75rem 0.65rem', borderBottom: `1px solid var(--ww-border)` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0, background: COLORS[catKey] || '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: '#04140f' }}>
                                {(h.fundName || h.schemeCode || '?').slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p style={{ fontSize: '0.8rem', fontWeight: 600, color: T.textPrimary, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={h.fundName}>
                                  {h.fundName || h.schemeCode}
                                </p>
                                <p style={{ fontSize: '0.62rem', color: T.textGhost }}>
                                  {h.category || '—'} · {h.amcName || '—'}
                                </p>
                              </div>
                            </div>
                          </td>
                          {[
                            { v: units > 0 ? fmtNum(units, 3) : '—',             c: T.textPrimary },
                            { v: avgNav > 0 ? '₹' + fmtNum(avgNav, 2) : '—',     c: T.textMuted },
                            { v: curNav > 0 ? '₹' + fmtNum(curNav, 2) : '—',     c: T.textPrimary },
                            { v: iv  > 0 ? fmt(iv)  : '—',                        c: T.textSec },
                            { v: cv  > 0 ? fmt(cv)  : '—',                        c: T.textPrimary, fw: 700 },
                            { v: iv  > 0 ? (gl >= 0 ? '+' : '') + fmt(gl) : '—', c: gl >= 0 ? T.positive : T.negative, fw: 700 },
                            { v: iv  > 0 ? fmtPct(glPct) : '—',                  c: glPct >= 0 ? T.positive : T.negative, fw: 600 },
                            { v: xirr2 != null ? (xirr2 >= 0 ? '+' : '') + fmtNum(xirr2) + '%' : '—', c: T.blue, fw: 600 },
                            { v: cv > 0 ? allocP.toFixed(1) + '%' : '—',          c: T.textMuted },
                          ].map((cell, ci) => (
                            <td key={ci} style={{ padding: '0.75rem 0.65rem', textAlign: 'right', borderBottom: `1px solid var(--ww-border)`, fontSize: '0.79rem', fontWeight: cell.fw || 500, color: cell.c, whiteSpace: 'nowrap' }}>
                              {cell.v}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'rgba(163,230,53,0.04)' }}>
                      <td colSpan={4} style={{ padding: '0.85rem 0.65rem', fontSize: '0.78rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>TOTAL</td>
                      <td style={{ padding: '0.85rem 0.65rem', textAlign: 'right', fontSize: '0.88rem', fontWeight: 800, color: '#fff' }}>{fmt(invested)}</td>
                      <td style={{ padding: '0.85rem 0.65rem', textAlign: 'right', fontSize: '0.88rem', fontWeight: 800, color: '#fff' }}>{fmt(totalVal)}</td>
                      <td style={{ padding: '0.85rem 0.65rem', textAlign: 'right', fontSize: '0.88rem', fontWeight: 800, color: gain >= 0 ? '#a3e635' : '#f87171' }}>{(gain >= 0 ? '+' : '') + fmt(gain)}</td>
                      <td style={{ padding: '0.85rem 0.65rem', textAlign: 'right', fontSize: '0.88rem', fontWeight: 800, color: gainPct >= 0 ? '#a3e635' : '#f87171' }}>{fmtPct(gainPct)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}


      {/* ══════════════════════════════════════════════
          TAB: ANALYTICS — 6 metrics only
      ══════════════════════════════════════════════ */}
      {!loading && activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {riskProfile ? (
            <>
              {/* 6 metric cards in 2-3 col grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem' }}>
                {[
                  { label: 'Sharpe Ratio',    val: fmtNum(riskProfile.sharpeRatio),           icon: <Scale size={24} color={riskProfile.sharpeRatio > 1 ? '#a3e635' : '#fbbf24'} />,  color: riskProfile.sharpeRatio > 1 ? '#a3e635' : riskProfile.sharpeRatio > 0.5 ? '#fbbf24' : '#f87171', hint: '> 1 = excellent risk-adjusted return' },
                  { label: 'Volatility',      val: fmtNum(riskProfile.volatility) + '%',       icon: <Activity size={24} color="#38bdf8" />, color: '#38bdf8', hint: 'Annualised portfolio standard deviation' },
                  { label: 'Max Drawdown',    val: '-' + fmtNum(riskProfile.maxDrawdown) + '%', icon: <TrendingDown size={24} color="#f87171" />, color: '#f87171', hint: 'Estimated worst peak-to-trough decline' },
                  { label: 'Annual Return',   val: fmtNum(riskProfile.annualReturn) + '%',      icon: <TrendingUp size={24} color="#a3e635" />, color: riskProfile.annualReturn > 12 ? '#a3e635' : '#fbbf24', hint: 'Estimated annualised return' },
                  { label: 'Diversification', val: riskProfile.diversificationScore + '/10',    icon: <Puzzle size={24} color={riskProfile.diversificationScore >= 7 ? '#a3e635' : '#fbbf24'} />, color: riskProfile.diversificationScore >= 7 ? '#a3e635' : riskProfile.diversificationScore >= 4 ? '#fbbf24' : '#f87171', hint: 'Spread across funds, AMCs, categories' },
                  { label: 'Risk Appetite',   val: riskProfile.derivedRiskAppetite,             icon: <Target size={24} color="#a78bfa" />, color: riskProfile.derivedRiskAppetite === 'AGGRESSIVE' ? '#f87171' : riskProfile.derivedRiskAppetite === 'CONSERVATIVE' ? '#22d3ee' : '#fbbf24', hint: 'Derived from your asset allocation mix' },
                ].map(m => (
                  <div key={m.label} className="ww-card" style={{ padding: '1.5rem' }} title={m.hint}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.6rem' }}>{m.icon}</div>
                    <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.4rem', fontWeight: 700 }}>{m.label}</p>
                    <p style={{ fontSize: '1.65rem', fontWeight: 900, color: m.color, letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>{m.val}</p>
                    <p style={{ fontSize: '0.63rem', color: 'rgba(255,255,255,0.28)', lineHeight: 1.5 }}>{m.hint}</p>
                  </div>
                ))}
              </div>

              {/* Visual gauge row */}
              <div className="ww-card" style={{ padding: '1.5rem' }}>
                <p className="ww-label" style={{ marginBottom: '1rem' }}>Risk vs Return Gauge</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                  {[
                    { label: 'Sharpe Ratio', val: riskProfile.sharpeRatio, max: 3, color: '#a3e635', format: v => fmtNum(v) },
                    { label: 'Volatility',   val: riskProfile.volatility,  max: 40, color: '#38bdf8', format: v => fmtNum(v) + '%' },
                    { label: 'Max Drawdown', val: riskProfile.maxDrawdown, max: 50, color: '#f87171', format: v => '-' + fmtNum(v) + '%' },
                    { label: 'Annual Return',val: riskProfile.annualReturn,max: 40, color: '#fbbf24', format: v => fmtNum(v) + '%' },
                  ].map(g => {
                    const pct = g.max > 0 ? Math.min((Math.abs(g.val || 0) / g.max) * 100, 100) : 0;
                    return (
                      <div key={g.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{g.label}</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: g.color }}>{g.format(g.val)}</span>
                        </div>
                        <div style={{ height: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: pct + '%', background: g.color, borderRadius: '8px', transition: 'width 0.8s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="ww-card" style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.35)' }}>
              No analytics data yet — add investments to see risk metrics.
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          TAB: TOOLS — SIP Simulator + Returns Analysis
          (no Day Change card)
      ══════════════════════════════════════════════ */}
      {activeTab === 'tools' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>

          {/* SIP Simulator */}
          <div className="ww-card" style={{ padding: '1.75rem' }}>
            <p className="ww-label" style={{ marginBottom: '0.25rem' }}>SIP Return Simulator</p>
            <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginBottom: '1.5rem' }}>What-if future value projection</p>

            {[
              { l: 'Monthly SIP Amount',      key: 'amount', min: 100,  max: 500000, step: 500,  display: fmt(sip.amount) },
              { l: 'Expected Return (% p.a.)', key: 'rate',   min: 1,    max: 30,     step: 0.5,  display: sip.rate + '%' },
              { l: 'Time Horizon',             key: 'years',  min: 1,    max: 40,     step: 1,    display: sip.years + ' yrs' },
            ].map(({ l, key, min, max, step, display }) => (
              <div key={key} style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)' }}>{l}</label>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>{display}</span>
                </div>
                <input type="range" min={min} max={max} step={step} value={sip[key]}
                  onChange={e => setSip(s => ({ ...s, [key]: Number(e.target.value) }))}
                  style={{ width: '100%', accentColor: '#a3e635', cursor: 'pointer' }} />
              </div>
            ))}

            <div style={{ background: 'linear-gradient(135deg, rgba(163,230,53,0.08), rgba(163,230,53,0.02))', borderRadius: '16px', padding: '1.5rem', border: '1px solid rgba(163,230,53,0.18)', marginTop: '0.5rem' }}>
              {[
                { l: 'Total Invested',     v: fmt(sipInvested), c: 'rgba(255,255,255,0.7)' },
                { l: 'Estimated Returns',  v: fmt(sipGain),     c: '#a3e635' },
                { l: 'Wealth Gain %',      v: sipGainPct + '%', c: '#a3e635' },
              ].map(({ l, v, c }) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.7rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{l}</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: c }}>{v}</span>
                </div>
              ))}
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '0.75rem 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>Future Value</span>
                <span style={{ fontSize: '1.65rem', fontWeight: 900, color: '#a3e635', letterSpacing: '-0.02em' }}>{fmt(sipFV)}</span>
              </div>
              <div style={{ height: '10px', borderRadius: '8px', overflow: 'hidden', background: 'rgba(255,255,255,0.07)', display: 'flex' }}>
                <div style={{ width: `${(sipInvested / sipFV) * 100}%`, background: 'rgba(255,255,255,0.25)', transition: 'width 0.5s' }} />
                <div style={{ flex: 1, background: '#a3e635', transition: 'flex 0.5s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem' }}>
                <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)' }}>Invested</span>
                <span style={{ fontSize: '0.62rem', color: '#a3e635' }}>Returns</span>
              </div>
            </div>
          </div>

          {/* Returns Analysis */}
          <div className="ww-card" style={{ padding: '1.75rem' }}>
            <p className="ww-label" style={{ marginBottom: '0.25rem' }}>Returns Analysis</p>
            <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginBottom: '1.5rem' }}>CAGR · XIRR · Absolute returns per fund</p>

            {/* Portfolio metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {[
                { l: 'Absolute',  v: fmtPct(gainPct), c: gainPct >= 0 ? '#a3e635' : '#f87171' },
                { l: 'CAGR',      v: cagr != null ? (cagr >= 0 ? '+' : '') + fmtNum(cagr) + '%' : '—', c: cagr != null && cagr >= 0 ? '#a3e635' : '#f87171' },
                { l: 'XIRR',      v: xirr != null ? (xirr >= 0 ? '+' : '') + fmtNum(xirr) + '%' : '—', c: '#38bdf8' },
              ].map(({ l, v, c }) => (
                <div key={l} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '0.875rem', textAlign: 'center', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem', fontWeight: 700 }}>{l}</p>
                  <p style={{ fontSize: '1.1rem', fontWeight: 900, color: c }}>{v}</p>
                </div>
              ))}
            </div>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', marginBottom: '1rem' }} />
            <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)', marginBottom: '0.75rem' }}>Per-fund XIRR & Return</p>

            {holdings.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>No holdings found.</p>
            ) : (
              <div>
                {[...holdings].sort((a, b) => (b.xirr ?? -999) - (a.xirr ?? -999)).map(h => {
                  const iv   = Number(h.investedValue || 0);
                  const cv   = Number(h.currentValue  || 0);
                  const gl   = cv - iv;
                  const glP  = iv > 0 ? (gl / iv * 100) : 0;
                  const xirrH = h.xirr;
                  return (
                    <div key={h.schemeCode} style={{ padding: '0.65rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <p style={{ fontSize: '0.76rem', color: '#fff', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={h.fundName}>
                          {h.fundName || h.schemeCode}
                        </p>
                        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.12rem 0.4rem', borderRadius: '5px', background: glP >= 0 ? 'rgba(163,230,53,0.1)' : 'rgba(248,113,113,0.1)', color: glP >= 0 ? '#a3e635' : '#f87171' }}>
                            {iv > 0 ? fmtPct(glP) : '—'}
                          </span>
                          {xirrH != null && (
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.12rem 0.4rem', borderRadius: '5px', background: 'rgba(56,189,248,0.1)', color: '#38bdf8' }}>
                              {(xirrH >= 0 ? '+' : '') + fmtNum(xirrH)}% XIRR
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.2rem' }}>
                        <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)' }}>
                          {iv > 0 ? fmt(iv) : '—'} → {cv > 0 ? fmt(cv) : '—'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: '1.25rem 0' }} />
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '0.875rem', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginBottom: '0.5rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Formula reference</p>
              <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.28)', lineHeight: 1.7 }}>
                <b style={{ color: 'rgba(255,255,255,0.5)' }}>CAGR:</b> (Current/Invested)^(1/years) − 1<br/>
                <b style={{ color: 'rgba(255,255,255,0.5)' }}>XIRR:</b> Newton-Raphson on all lot cash flows<br/>
                <b style={{ color: 'rgba(255,255,255,0.5)' }}>Absolute:</b> (Current − Invested) / Invested × 100
              </p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
