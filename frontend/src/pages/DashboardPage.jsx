import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, animate, useMotionValue, useTransform } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, CartesianGrid,
  Legend, ReferenceLine,
} from 'recharts';
import {
  TrendingUp, TrendingDown, RefreshCw, Activity, Target, AlertCircle,
  Wifi, Settings,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useNavigate } from 'react-router-dom';
import { getNavHistory } from '../lib/mfApi';
import './DashboardPage.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// ─── Auth helper ────────────────────────────────────────────────────────────
function getAuthToken() {
  return localStorage.getItem('ww_token') || '';
}

async function apiFetch(path) {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${getAuthToken()}` },
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || json.message || `Server error ${res.status}`);
  }
  return res.json();
}

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════
function formatINR(val) {
  if (val === null || val === undefined) return '—';
  const num = parseFloat(val);
  if (isNaN(num)) return '—';
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatCurrency(val) {
  if (val === null || val === undefined) return '—';
  const num = parseFloat(val);
  if (isNaN(num)) return '—';
  if (Math.abs(num) >= 10000000) return '₹' + (num / 10000000).toFixed(2) + ' Cr';
  if (Math.abs(num) >= 100000)   return '₹' + (num / 100000).toFixed(2) + ' L';
  if (Math.abs(num) >= 1000)     return '₹' + (num / 1000).toFixed(1) + 'K';
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPct(val) {
  if (val === null || val === undefined) return '—';
  const num = parseFloat(val);
  if (isNaN(num)) return '—';
  return num.toFixed(2) + '%';
}

function formatPctSigned(val) {
  if (val === null || val === undefined) return '—';
  const num = parseFloat(val);
  if (isNaN(num)) return '—';
  return (num >= 0 ? '+' : '') + num.toFixed(2) + '%';
}

const MONTH_MAP = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, SEPT: 8, OCT: 9, NOV: 10, DEC: 11,
};

function parseDate(str) {
  if (!str) return null;
  // ISO date: yyyy-MM-dd
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const d = new Date(str);
    return isNaN(d) ? null : d;
  }
  // DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    const [dd, mm, yyyy] = str.split('-');
    return new Date(yyyy, mm - 1, dd);
  }
  // "APR '23" style
  const tickMatch = str.match(/^([A-Za-z]+)\s*['\u2018\u2019](\d{2})$/);
  if (tickMatch) {
    const mon = MONTH_MAP[tickMatch[1].toUpperCase()];
    const year = 2000 + parseInt(tickMatch[2], 10);
    if (mon !== undefined) return new Date(year, mon, 1);
  }
  const d = new Date(str);
  return isNaN(d) ? null : d;
}

function shortMonth(dateStr) {
  if (!dateStr) return '';
  const d = parseDate(dateStr);
  if (!d || isNaN(d)) return dateStr;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const yr = String(d.getFullYear()).slice(-2);
  return `${months[d.getMonth()]} '${yr}`;
}

const CHART_COLORS = [
  '#34d399', '#a78bfa', '#22d3ee', '#f87171', '#fb923c',
  '#e63946', '#A8DADC', '#457B9D', '#F4A261', '#264653',
];

const CATEGORY_COLORS = {
  EQUITY: '#34d399', Equity: '#34d399',
  DEBT: '#fb923c',   Debt: '#fb923c',
  HYBRID: '#60a5fa', Hybrid: '#60a5fa',
  SOLUTION: '#a78bfa', Solution: '#a78bfa',
  OTHER: '#888',    Other: '#888',
  Commodity: '#fbbf24',
};

// ═══════════════════════════════════════════════════════════════
//  ANIMATED COUNTER
// ═══════════════════════════════════════════════════════════════
function AnimatedCounter({ value }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => formatINR(latest));
  useEffect(() => {
    const numValue = parseFloat(value) || 0;
    const animation = animate(count, numValue, { duration: 1.2, ease: 'easeOut' });
    return animation.stop;
  }, [value, count]);
  return <motion.span>{rounded}</motion.span>;
}

// ═══════════════════════════════════════════════════════════════
//  INFO TOOLTIP
// ═══════════════════════════════════════════════════════════════
const CHART_INFO = {
  portfolioGrowth: {
    title: 'Portfolio Growth',
    desc: 'Tracks the total market value of your portfolio over time. Rises indicate market gains or new investments.',
    metric: 'Total Current Value = Σ (Units × NAV) for all funds',
  },
  investedVsCurrent: {
    title: 'Invested vs Current Value',
    desc: 'Compares total amount deposited against current market value month by month. The gap represents your profit or loss.',
    metric: 'Green = Current Value, Purple = Capital Deployed',
  },
  fundAllocation: {
    title: 'Fund Allocation',
    desc: 'How your total portfolio is distributed across individual schemes. Helps identify concentration risk.',
    metric: 'Fund Weight = (Fund Value / Total Portfolio Value) × 100',
  },
  assetCategory: {
    title: 'Asset Category Allocation',
    desc: 'Portfolio breakdown into Equity, Debt, and Hybrid asset classes.',
    metric: 'Category Weight = (Category Value / Total Value) × 100',
  },
  fundPerformance: {
    title: 'Fund Performance Comparison',
    desc: 'Compares absolute returns across all your fund holdings. Green = profit, Red = loss.',
    metric: 'Absolute Return % = ((Current Value − Invested) / Invested) × 100',
  },
  monthlyInvestments: {
    title: 'Monthly Investments',
    desc: 'Net new money added to your portfolio each month (SIPs, lump sums).',
    metric: 'Monthly Flow = Invested(Month N) − Invested(Month N−1)',
  },
  navTrend: {
    title: 'Funds NAV Trend',
    desc: 'Daily NAV history of your top holdings. Data is fetched live from MFAPI.',
    metric: 'NAV = Net Asset Value per unit (api.mfapi.in)',
  },
  cagrTrend: {
    title: 'Portfolio CAGR Trend',
    desc: 'Compound Annual Growth Rate of your portfolio over time.',
    metric: 'CAGR = ((Current Value / Invested)^(1/Years) − 1) × 100',
  },
  rollingReturns: {
    title: 'Rolling Returns',
    desc: '3-month rolling returns — gain/loss over every consecutive 3-month window.',
    metric: 'Rolling Return = ((Value[t] − Value[t−3]) / Value[t−3]) × 100',
  },
  drawdownTrend: {
    title: 'Drawdown Trend',
    desc: 'How far your portfolio has fallen from its all-time peak at any point in time.',
    metric: 'Drawdown % = ((Current Value − Peak Value) / Peak Value) × 100',
  },
};

function InfoTooltip({ chartId }) {
  const [open, setOpen] = useState(false);
  const info = CHART_INFO[chartId];
  if (!info) return null;
  return (
    <span
      className="info-tooltip-wrap"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={() => setOpen((o) => !o)}
    >
      <span className="info-tooltip-icon">?</span>
      <AnimatePresence>
        {open && (
          <motion.div
            className="info-tooltip-popup"
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <div className="info-tooltip-title">{info.title}</div>
            <div className="info-tooltip-desc">{info.desc}</div>
            <div className="info-tooltip-metric">
              <span className="info-tooltip-metric-label">Metric: </span>{info.metric}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
//  CUSTOM TOOLTIPS
// ═══════════════════════════════════════════════════════════════
const CustomTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="ctip-label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="ctip-value" style={{ color: p.color || p.stroke }}>
          {p.name}: {formatter ? formatter(p.value) : formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
};

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="chart-tooltip">
      <p className="ctip-label">{d.name}</p>
      <p className="ctip-value" style={{ color: d.payload.fill }}>{formatCurrency(d.value)}</p>
      {d.payload.pct != null && <p className="ctip-value">{formatPct(d.payload.pct)}</p>}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
//  TIME RANGE FILTER
// ═══════════════════════════════════════════════════════════════
const RANGES = ['1M', '6M', '1Y', 'ALL'];

function RangePills({ value, onChange }) {
  return (
    <div className="range-pills">
      {RANGES.map((r) => (
        <button key={r} className={`range-pill ${value === r ? 'active' : ''}`} onClick={() => onChange(r)}>
          {r}
        </button>
      ))}
    </div>
  );
}

function filterByRange(data, range, dateKey = 'month') {
  if (range === 'ALL' || !data?.length) return data;
  const now = new Date();
  const months = range === '1M' ? 1 : range === '6M' ? 6 : 12;
  const cutoff = new Date(now.getFullYear(), now.getMonth() - months, 1);
  const filtered = data.filter((d) => {
    const dt = parseDate(d[dateKey]);
    return dt && dt >= cutoff;
  });
  return filtered.length > 0 ? filtered : data;
}

// ═══════════════════════════════════════════════════════════════
//  CHART DEFINITIONS + CONFIG MODAL
// ═══════════════════════════════════════════════════════════════
const ALL_CHARTS = [
  { id: 'portfolioGrowth',    label: 'Portfolio Growth' },
  { id: 'investedVsCurrent',  label: 'Invested vs Current Value' },
  { id: 'fundAllocation',     label: 'Fund Allocation' },
  { id: 'monthlyInvestments', label: 'Monthly Investments' },
  { id: 'navTrend',           label: 'Funds NAV Trend' },
  { id: 'cagrTrend',          label: 'Portfolio CAGR Trend' },
  { id: 'rollingReturns',     label: 'Rolling Returns' },
  { id: 'drawdownTrend',      label: 'Drawdown Trend' },
];

const DEFAULT_VISIBLE = [
  'portfolioGrowth', 'investedVsCurrent', 'fundAllocation', 'monthlyInvestments',
];

function loadVisibleCharts() {
  try {
    const stored = localStorage.getItem('ww_dashboard_charts');
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return DEFAULT_VISIBLE;
}
function saveVisibleCharts(ids) {
  localStorage.setItem('ww_dashboard_charts', JSON.stringify(ids));
}

function ConfigureModal({ onClose, visibleCharts, setVisibleCharts }) {
  const toggle = (id) => {
    setVisibleCharts((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      saveVisibleCharts(next);
      return next;
    });
  };
  return (
    <motion.div className="config-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className="config-modal"
        initial={{ scale: 0.92, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="config-modal-close" onClick={onClose}>×</button>
        <p className="config-modal-tag">Chart Layout</p>
        <h2>Configure Dashboard</h2>
        <p className="config-modal-desc">Choose which charts appear. Changes are saved automatically.</p>
        <div className="config-grid">
          {ALL_CHARTS.map((c) => (
            <label key={c.id} className={`config-item ${visibleCharts.includes(c.id) ? 'active' : ''}`}>
              <input type="checkbox" checked={visibleCharts.includes(c.id)} onChange={() => toggle(c.id)} />
              <span className="config-item-label">{c.label}</span>
            </label>
          ))}
        </div>
        <p className="config-count">{visibleCharts.length} charts visible</p>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  CHART: PORTFOLIO GROWTH
// ═══════════════════════════════════════════════════════════════
function PortfolioGrowthChart({ growthData }) {
  const [range, setRange] = useState('ALL');
  const chartData = useMemo(() => {
    const filtered = filterByRange(growthData, range);
    if (!filtered?.length) return [];
    // backend: { month, value, invested, gain }
    return filtered.map((d) => ({ ...d, currentValue: d.value, investedValue: d.invested, label: shortMonth(d.month || d.date) }));
  }, [growthData, range]);

  if (!chartData.length) return <div className="chart-empty">Add transactions to see growth chart</div>;
  return (
    <>
      <div className="chart-card-header">
        <div>
          <h3 className="chart-title">Portfolio Growth <InfoTooltip chartId="portfolioGrowth" /></h3>
          <span className="chart-subtitle">Portfolio value over the selected horizon</span>
        </div>
        <RangePills value={range} onChange={setRange} />
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="valueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#34d399" stopOpacity={0.30} />
              <stop offset="95%" stopColor="#34d399" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B6B7B' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#6B6B7B' }} axisLine={false} tickLine={false} tickFormatter={formatCurrency} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="currentValue" stroke="#34d399" strokeWidth={2} fill="url(#valueGrad)" name="Current Value" />
        </AreaChart>
      </ResponsiveContainer>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
//  CHART: INVESTED VS CURRENT VALUE
// ═══════════════════════════════════════════════════════════════
function InvestedVsCurrentChart({ growthData }) {
  const [range, setRange] = useState('ALL');
  const filtered = useMemo(() => {
    const f = filterByRange(growthData, range);
    // backend: { month, value, invested, gain }
    return (f || []).map((d) => ({ ...d, currentValue: d.value, investedValue: d.invested, label: shortMonth(d.month || d.date) }));
  }, [growthData, range]);

  if (!filtered.length) return <div className="chart-empty">No growth data available</div>;
  return (
    <>
      <div className="chart-card-header">
        <div>
          <h3 className="chart-title">Invested vs Current Value <InfoTooltip chartId="investedVsCurrent" /></h3>
          <span className="chart-subtitle">Capital deployed versus current market value</span>
        </div>
        <RangePills value={range} onChange={setRange} />
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={filtered} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="invGrad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#a78bfa" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="valGrad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#34d399" stopOpacity={0.22} />
              <stop offset="95%" stopColor="#34d399" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6B6B7B' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#6B6B7B' }} axisLine={false} tickLine={false} tickFormatter={formatCurrency} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="investedValue" stroke="#a78bfa" strokeWidth={2} fill="url(#invGrad2)" name="Invested" />
          <Area type="monotone" dataKey="currentValue"  stroke="#34d399" strokeWidth={2} fill="url(#valGrad2)" name="Current Value" />
        </AreaChart>
      </ResponsiveContainer>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
//  CHART: FUND ALLOCATION (DONUT)
// ═══════════════════════════════════════════════════════════════
function FundAllocationChart({ holdings }) {
  const pieData = useMemo(() => {
    if (!holdings?.length) return [];
    const total = holdings.reduce((s, h) => s + (parseFloat(h.currentValue) || parseFloat(h.investedValue) || 0), 0);
    return holdings
      .filter((h) => parseFloat(h.currentValue) > 0 || parseFloat(h.investedValue) > 0 || parseFloat(h.investedValue) > 0)
      .map((h, i) => {
        // backend field: investedValue (from HoldingsService.Holding)
        const val = parseFloat(h.currentValue) || parseFloat(h.investedValue) || 0;
        return {
          name: (h.fundName || h.schemeCode || 'Fund').substring(0, 28),
          value: val,
          pct: total > 0 ? (val / total) * 100 : 0,
          fill: CHART_COLORS[i % CHART_COLORS.length],
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [holdings]);

  if (!pieData.length) return <div className="chart-empty">No fund allocation data</div>;
  return (
    <>
      <div className="chart-card-header">
        <div>
          <h3 className="chart-title">Fund Allocation <InfoTooltip chartId="fundAllocation" /></h3>
          <span className="chart-subtitle">Current fund-wise value distribution</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
            {pieData.map((e, i) => <Cell key={i} fill={e.fill} stroke="transparent" />)}
          </Pie>
          <Tooltip content={<PieTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="chart-legend-custom">
        {pieData.slice(0, 6).map((d, i) => (
          <div key={i} className="chart-legend-item">
            <div className="chart-legend-left">
              <span className="chart-legend-dot" style={{ backgroundColor: d.fill }} />
              <span className="chart-legend-name">{d.name}</span>
            </div>
            <span className="chart-legend-pct">{formatPct(d.pct)}</span>
          </div>
        ))}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
//  CHART: ASSET CATEGORY ALLOCATION
// ═══════════════════════════════════════════════════════════════
function AssetCategoryChart({ allocation, holdings }) {
  // allocation comes from /api/holdings/summary as { Equity: 120000, Debt: 50000, ... }
  const pieData = useMemo(() => {
    if (allocation && Object.keys(allocation).length > 0) {
      const total = Object.values(allocation).reduce((s, v) => s + parseFloat(v || 0), 0);
      return Object.entries(allocation)
        .filter(([, v]) => parseFloat(v) > 0)
        .map(([cat, val]) => ({
          name: cat,
          value: parseFloat(val),
          pct: total > 0 ? (parseFloat(val) / total) * 100 : 0,
          fill: CATEGORY_COLORS[cat] || '#888',
        }))
        .sort((a, b) => b.value - a.value);
    }
    // Fallback: group holdings by category
    if (!holdings?.length) return [];
    const groups = {};
    holdings.forEach((h) => {
      const cat = categorizeBroad(h.category);
      const val = parseFloat(h.currentValue) || parseFloat(h.investedValue) || 0;
      groups[cat] = (groups[cat] || 0) + val;
    });
    const total = Object.values(groups).reduce((s, v) => s + v, 0);
    return Object.entries(groups).map(([cat, val]) => ({
      name: cat,
      value: val,
      pct: total > 0 ? (val / total) * 100 : 0,
      fill: CATEGORY_COLORS[cat] || '#888',
    }));
  }, [allocation, holdings]);

  if (!pieData.length) return <div className="chart-empty">No category data available</div>;
  return (
    <>
      <div className="chart-card-header">
        <div>
          <h3 className="chart-title">Asset Category Allocation <InfoTooltip chartId="assetCategory" /></h3>
          <span className="chart-subtitle">Equity, debt, and hybrid exposure</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
            {pieData.map((e, i) => <Cell key={i} fill={e.fill} stroke="transparent" />)}
          </Pie>
          <Tooltip content={<PieTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="chart-legend-custom">
        {pieData.map((d, i) => (
          <div key={i} className="chart-legend-item">
            <div className="chart-legend-left">
              <span className="chart-legend-dot" style={{ backgroundColor: d.fill }} />
              <span className="chart-legend-name">{d.name}</span>
            </div>
            <span className="chart-legend-pct">{formatPct(d.pct)}</span>
          </div>
        ))}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
//  CHART: FUND PERFORMANCE COMPARISON (BAR)
// ═══════════════════════════════════════════════════════════════
function FundPerformanceChart({ holdings }) {
  const barData = useMemo(() => {
    if (!holdings?.length) return [];
    return holdings
      .filter((h) => h.gainLossPct != null && !isNaN(parseFloat(h.gainLossPct)) && parseFloat(h.currentValue) > 0)
      .map((h) => ({
        name: (h.fundName || h.schemeCode || 'Fund').substring(0, 20),
        return: parseFloat(h.gainLossPct),
      }))
      .sort((a, b) => b.return - a.return);
  }, [holdings]);

  if (!barData.length) return <div className="chart-empty">No performance data available</div>;
  return (
    <>
      <div className="chart-card-header">
        <div>
          <h3 className="chart-title">Fund Performance Comparison <InfoTooltip chartId="fundPerformance" /></h3>
          <span className="chart-subtitle">Absolute returns by fund</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
          <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#6B6B7B', angle: -30, textAnchor: 'end' }} axisLine={false} tickLine={false} interval={0} height={60} />
          <YAxis tick={{ fontSize: 10, fill: '#6B6B7B' }} axisLine={false} tickLine={false} tickFormatter={(v) => v.toFixed(0) + '%'} />
          <Tooltip content={<CustomTooltip formatter={(v) => v.toFixed(2) + '%'} />} />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
          <Bar dataKey="return" name="Return %" radius={[4, 4, 0, 0]}>
            {barData.map((entry, i) => <Cell key={i} fill={entry.return >= 0 ? '#34d399' : '#f87171'} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
//  CHART: MONTHLY INVESTMENTS (BAR)
// ═══════════════════════════════════════════════════════════════
function MonthlyInvestmentsChart({ growthData }) {
  const [range, setRange] = useState('ALL');
  const barData = useMemo(() => {
    if (!growthData?.length) return [];
    const filtered = filterByRange(growthData, range);
    if (!filtered?.length) return [];
    return filtered.map((d, i) => {
      // backend uses 'invested' field
      const inv = parseFloat(d.invested) || 0;
      const prevInv = i > 0 ? parseFloat(filtered[i - 1].invested) || 0 : 0;
      return {
        label: shortMonth(d.month || d.date),
        amount: i === 0 ? inv : Math.max(0, inv - prevInv),
      };
    });
  }, [growthData, range]);

  if (!barData.length) return <div className="chart-empty">No investment flow data</div>;
  return (
    <>
      <div className="chart-card-header">
        <div>
          <h3 className="chart-title">Monthly Investments <InfoTooltip chartId="monthlyInvestments" /></h3>
          <span className="chart-subtitle">SIP and top-up flow by month</span>
        </div>
        <RangePills value={range} onChange={setRange} />
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6B6B7B' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#6B6B7B' }} axisLine={false} tickLine={false} tickFormatter={formatCurrency} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="amount" name="Investment" fill="#fb923c" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
//  CHART: FUNDS NAV TREND (MULTI-LINE, live MFAPI)
// ═══════════════════════════════════════════════════════════════
function FundsNavTrendChart({ holdings }) {
  const [range, setRange] = useState('ALL');
  const [navData, setNavData] = useState(null);
  const [navLoading, setNavLoading] = useState(false);

  useEffect(() => {
    if (!holdings?.length) return;
    const topFunds = holdings
      .filter((h) => h.schemeCode && (parseFloat(h.currentValue) > 0 || parseFloat(h.investedValue) > 0))
      .slice(0, 5);
    if (!topFunds.length) return;

    setNavLoading(true);
    Promise.allSettled(
      topFunds.map(async (h) => {
        try {
          const history = await getNavHistory(h.schemeCode);
          return { code: h.schemeCode, name: (h.fundName || h.schemeCode).substring(0, 25), history };
        } catch { return null; }
      })
    ).then((results) => {
      const valid = results.filter((r) => r.status === 'fulfilled' && r.value?.history?.length).map((r) => r.value);
      setNavData(valid);
      setNavLoading(false);
    });
  }, [holdings]);

  const chartData = useMemo(() => {
    if (!navData?.length) return [];
    const allDates = new Set();
    navData.forEach((f) => f.history.forEach((d) => allDates.add(d.date)));
    const sortedDates = [...allDates].sort((a, b) => parseDate(a) - parseDate(b));

    let dates = sortedDates;
    if (range !== 'ALL') {
      const now = new Date();
      const months = range === '1M' ? 1 : range === '6M' ? 6 : 12;
      const cutoff = new Date(now.getFullYear(), now.getMonth() - months, 1);
      const f = sortedDates.filter((d) => parseDate(d) >= cutoff);
      if (f.length > 0) dates = f;
    }
    const step = Math.max(1, Math.floor(dates.length / 60));
    const sampled = dates.filter((_, i) => i % step === 0 || i === dates.length - 1);
    return sampled.map((date) => {
      const point = { date: shortMonth(date) };
      navData.forEach((fund) => {
        const match = fund.history.find((d) => d.date === date);
        point[fund.code] = match ? match.nav : null;
      });
      return point;
    });
  }, [navData, range]);

  if (navLoading) return <div className="chart-empty">Loading NAV history…</div>;
  if (!navData?.length || !chartData.length) return <div className="chart-empty">No NAV trend data available</div>;
  return (
    <>
      <div className="chart-card-header">
        <div>
          <h3 className="chart-title">Funds NAV Trend <InfoTooltip chartId="navTrend" /></h3>
          <span className="chart-subtitle">Multi-fund NAV progression over time</span>
        </div>
        <RangePills value={range} onChange={setRange} />
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6B6B7B' }} axisLine={false} tickLine={false} />
          <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#6B6B7B' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip formatter={(v) => v?.toFixed(2)} />} />
          {navData.map((fund, i) => (
            <Line key={fund.code} type="monotone" dataKey={fund.code} name={fund.name}
              stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={1.5} dot={false} connectNulls />
          ))}
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#A0A0B0', marginTop: 8 }} />
        </LineChart>
      </ResponsiveContainer>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
//  CHART: PORTFOLIO CAGR TREND
// ═══════════════════════════════════════════════════════════════
function CagrTrendChart({ growthData }) {
  const [range, setRange] = useState('ALL');
  const chartData = useMemo(() => {
    if (!growthData?.length || growthData.length < 2) return [];
    const filtered = filterByRange(growthData, range);
    if (!filtered?.length || filtered.length < 2) return [];
    const firstDate = parseDate(filtered[0].month || filtered[0].date) || new Date();
    return filtered.map((d) => {
      // backend: value, invested
      const val = parseFloat(d.value) || 0;
      const inv = parseFloat(d.invested) || 1;
      const dt = parseDate(d.month || d.date) || new Date();
      const years = (dt - firstDate) / (365.25 * 24 * 60 * 60 * 1000);
      if (years < 0.25 || inv <= 0) return null;
      const cagr = (Math.pow(val / inv, 1 / years) - 1) * 100;
      return { label: shortMonth(d.month || d.date), cagr: isFinite(cagr) ? cagr : 0 };
    }).filter(Boolean);
  }, [growthData, range]);

  if (!chartData.length) return <div className="chart-empty">Insufficient data for CAGR trend</div>;
  return (
    <>
      <div className="chart-card-header">
        <div>
          <h3 className="chart-title">Portfolio CAGR Trend <InfoTooltip chartId="cagrTrend" /></h3>
          <span className="chart-subtitle">Annualized performance trend</span>
        </div>
        <RangePills value={range} onChange={setRange} />
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6B6B7B' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#6B6B7B' }} axisLine={false} tickLine={false} tickFormatter={(v) => v.toFixed(1) + '%'} />
          <Tooltip content={<CustomTooltip formatter={(v) => v.toFixed(2) + '%'} />} />
          <Line type="monotone" dataKey="cagr" name="CAGR %" stroke="#60a5fa" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
//  CHART: ROLLING RETURNS
// ═══════════════════════════════════════════════════════════════
function RollingReturnsChart({ growthData }) {
  const [range, setRange] = useState('ALL');
  const chartData = useMemo(() => {
    if (!growthData?.length) return [];
    const filtered = filterByRange(growthData, range);
    if (!filtered?.length || filtered.length < 4) return [];
    const WINDOW = 3;
    const result = [];
    for (let i = WINDOW; i < filtered.length; i++) {
      // backend: value, invested
      const prevInv = parseFloat(filtered[i - WINDOW].invested) || 1;
      const prevVal = parseFloat(filtered[i - WINDOW].value) || 0;
      const currInv = parseFloat(filtered[i].invested) || 1;
      const currVal = parseFloat(filtered[i].value) || 0;
      const prevRatio = prevVal / prevInv;
      const currRatio = currVal / currInv;
      const rolling = prevRatio > 0 ? ((currRatio - prevRatio) / prevRatio) * 100 : 0;
      result.push({ label: shortMonth(filtered[i].month || filtered[i].date), rolling });
    }
    return result;
  }, [growthData, range]);

  if (!chartData.length) return <div className="chart-empty">Insufficient data for rolling returns</div>;
  return (
    <>
      <div className="chart-card-header">
        <div>
          <h3 className="chart-title">Rolling Returns <InfoTooltip chartId="rollingReturns" /></h3>
          <span className="chart-subtitle">3-month rolling return snapshots</span>
        </div>
        <RangePills value={range} onChange={setRange} />
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6B6B7B' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#6B6B7B' }} axisLine={false} tickLine={false} tickFormatter={(v) => v.toFixed(1) + '%'} />
          <Tooltip content={<CustomTooltip formatter={(v) => v.toFixed(2) + '%'} />} />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
          <Line type="monotone" dataKey="rolling" name="Rolling Return %" stroke="#a78bfa" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
//  CHART: DRAWDOWN TREND
// ═══════════════════════════════════════════════════════════════
function DrawdownTrendChart({ growthData }) {
  const [range, setRange] = useState('ALL');
  const chartData = useMemo(() => {
    if (!growthData?.length) return [];
    const filtered = filterByRange(growthData, range);
    if (!filtered?.length) return [];
    let peak = 0;
    return filtered.map((d) => {
      // backend: value field
      const val = parseFloat(d.value) || 0;
      if (val > peak) peak = val;
      const dd = peak > 0 ? ((val - peak) / peak) * 100 : 0;
      return { label: shortMonth(d.month || d.date), drawdown: dd };
    });
  }, [growthData, range]);

  if (!chartData.length) return <div className="chart-empty">Insufficient data for drawdown analysis</div>;
  const maxDD = Math.min(...chartData.map((d) => d.drawdown));
  return (
    <>
      <div className="chart-card-header">
        <div>
          <h3 className="chart-title">Drawdown Trend <InfoTooltip chartId="drawdownTrend" /></h3>
          <span className="chart-subtitle">
            Decline from rolling peak
            {maxDD < 0 && (
              <span style={{ marginLeft: 8, color: '#f87171', fontWeight: 700, fontSize: 11 }}>
                Max: {maxDD.toFixed(2)}%
              </span>
            )}
          </span>
        </div>
        <RangePills value={range} onChange={setRange} />
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#f87171" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f87171" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6B6B7B' }} axisLine={false} tickLine={false} />
          <YAxis domain={['auto', 0]} tick={{ fontSize: 10, fill: '#6B6B7B' }} axisLine={false} tickLine={false} tickFormatter={(v) => v.toFixed(1) + '%'} />
          <Tooltip content={<CustomTooltip formatter={(v) => v.toFixed(2) + '%'} />} />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
          <Area type="monotone" dataKey="drawdown" name="Drawdown %" stroke="#f87171" strokeWidth={2} fill="url(#ddGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
//  UTILITY — broad category classifier (mirrors backend logic)
// ═══════════════════════════════════════════════════════════════
function categorizeBroad(category) {
  if (!category) return 'Other';
  const c = category.toLowerCase();
  if (c.includes('equity') || c.includes('large') || c.includes('mid') || c.includes('small') || c.includes('flexi') || c.includes('thematic') || c.includes('elss') || c.includes('index')) return 'Equity';
  if (c.includes('debt') || c.includes('liquid') || c.includes('bond') || c.includes('duration') || c.includes('credit')) return 'Debt';
  if (c.includes('hybrid') || c.includes('balanced') || c.includes('asset allocation')) return 'Hybrid';
  if (c.includes('gold') || c.includes('silver') || c.includes('commodity')) return 'Commodity';
  return 'Other';
}

// ═══════════════════════════════════════════════════════════════
//  MAIN DASHBOARD PAGE
// ═══════════════════════════════════════════════════════════════
export default function DashboardPage() {
  useAuth(); // ensures auth context is available
  const navigate = useNavigate();

  const [summary,       setSummary]       = useState(null);
  const [holdings,      setHoldings]      = useState([]);
  const [growthData,    setGrowthData]    = useState([]);
  const [txnCount,      setTxnCount]      = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [refreshing,    setRefreshing]    = useState(false);
  const [configOpen,    setConfigOpen]    = useState(false);
  const [visibleCharts, setVisibleCharts] = useState(loadVisibleCharts);

  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    setError('');
    try {
      const [sum, hld, txns, growth] = await Promise.allSettled([
        apiFetch('/api/holdings/summary'),
        apiFetch('/api/holdings'),
        apiFetch('/api/transactions'),
        apiFetch('/api/holdings/growth'),
      ]);

      if (sum.status === 'fulfilled')    setSummary(sum.value);
      if (hld.status === 'fulfilled')    setHoldings(Array.isArray(hld.value) ? hld.value : []);
      if (txns.status === 'fulfilled')   setTxnCount(Array.isArray(txns.value) ? txns.value.length : 0);
      if (growth.status === 'fulfilled') setGrowthData(Array.isArray(growth.value) ? growth.value : []);

      // Surface first meaningful error
      const firstErr = [sum, hld, txns, growth].find((r) => r.status === 'rejected');
      if (firstErr && !sum.value && !hld.value) setError(firstErr.reason?.message || 'Failed to load data');
    } catch (e) {
      setError(e.message || 'Failed to load portfolio data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Derived values ─────────────────────────────────────────────
  const totalInvested  = parseFloat(summary?.totalInvested  || 0);
  const totalCurrent   = parseFloat(summary?.currentValue   || 0);
  const totalGain      = parseFloat(summary?.totalGain      || 0);
  const gainPct        = parseFloat(summary?.gainPct        || 0);
  const xirrPct        = summary?.portfolioXirr;
  const allocation     = summary?.allocation || {};
  const isUp           = totalGain >= 0;
  const hasData        = txnCount > 0 || holdings.length > 0;

  const isChartVisible = (id) => visibleCharts.includes(id);

  // ── Error full screen ────────────────────────────────────────
  if (error && !summary && !loading) {
    return (
      <div className="dashboard-page">
        <div className="dash-error-full">
          <AlertCircle size={48} color="#f87171" />
          <h2>Could not load portfolio</h2>
          <p>{error}</p>
          <motion.button className="refresh-btn" onClick={fetchAll} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <RefreshCw size={14} /> Try Again
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">

      {/* ─── HEADER ─── */}
      <div className="dash-header">
        <div>
          <div className="page-tag"><Activity size={12} /> Mutual Fund Intelligence</div>
          <h1 className="page-title">
            Portfolio <span className="text-gradient">Dashboard</span>
          </h1>
          <p className="page-subtitle">
            Track growth, allocations, SIP cadence, and fund-level quality across your portfolio.
          </p>
        </div>
        <motion.button
          className="refresh-btn"
          onClick={fetchAll}
          disabled={refreshing}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <RefreshCw size={14} className={refreshing ? 'spin' : ''} /> Refresh
        </motion.button>
      </div>

      {error && (summary || holdings.length > 0) && (
        <div className="dash-error"><AlertCircle size={14} /> {error}</div>
      )}

      {!hasData && !loading ? (
        /* ─── EMPTY STATE ─── */
        <div className="dash-empty">
          <motion.div
            className="empty-card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, type: 'spring' }}
          >
            <motion.div className="empty-icon" animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}>
              <Target size={54} color="var(--ww-accent,#34d399)" />
            </motion.div>
            <h2>No Investments Yet</h2>
            <p>Start logging transactions to generate portfolio analytics and wealth projections.</p>
            <motion.button
              className="btn-goto-txns"
              onClick={() => navigate('/dashboard/transactions')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
            >
              + Add First Transaction
            </motion.button>
          </motion.div>
        </div>
      ) : (
        <>
          {/* ─── PORTFOLIO OVERVIEW HERO ─── */}
          <motion.div className="portfolio-overview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <p className="po-label">Portfolio Overview</p>

            {loading ? (
              <div className="kpi-skeleton" style={{ height: 42, maxWidth: 260 }} />
            ) : (
              <div className="po-value">
                <AnimatedCounter value={totalCurrent} />
              </div>
            )}

            <div className="po-delta-row">
              <span className="po-delta-label">Net {isUp ? 'profit' : 'loss'}</span>
              {loading ? (
                <div className="kpi-skeleton" style={{ height: 20, width: 120 }} />
              ) : (
                <>
                  <span className={`po-delta ${isUp ? 'positive' : 'negative'}`}>
                    {isUp ? '▲' : '▼'} {formatINR(Math.abs(totalGain))}
                  </span>
                  <span className={`po-delta-pct ${isUp ? 'positive' : 'negative'}`}>
                    {isUp ? '▲' : '▼'} {formatPct(Math.abs(gainPct))}
                  </span>
                </>
              )}
            </div>
            <p className="po-note">Marked to market as of the latest NAV cycle</p>

            <div className="po-stats">
              <div className="po-stat">
                <span className="po-stat-label">Total Invested</span>
                {loading ? <div className="kpi-skeleton" style={{ height: 24 }} /> : (
                  <span className="po-stat-value">{formatINR(totalInvested)}</span>
                )}
              </div>
              <div className="po-stat">
                <span className="po-stat-label">XIRR</span>
                {loading ? <div className="kpi-skeleton" style={{ height: 24 }} /> : (
                  <span className="po-stat-value">{xirrPct != null ? formatPct(xirrPct) : '—'}</span>
                )}
              </div>
              <div className="po-stat">
                <span className="po-stat-label">
                  {isUp
                    ? <TrendingUp size={12} style={{ marginRight: 4, verticalAlign: -2 }} />
                    : <TrendingDown size={12} style={{ marginRight: 4, verticalAlign: -2 }} />}
                  Total Gain / Loss
                </span>
                {loading ? <div className="kpi-skeleton" style={{ height: 24 }} /> : (
                  <>
                    <span className={`po-stat-value ${isUp ? 'green' : 'red'}`}>
                      {isUp ? '+' : '-'}{formatINR(Math.abs(totalGain))}
                    </span>
                    <span className={`po-stat-sub ${isUp ? 'green' : 'red'}`}>
                      {formatPctSigned(gainPct)} absolute return
                    </span>
                  </>
                )}
              </div>
            </div>
          </motion.div>

          {/* ─── CONFIGURE BUTTON ─── */}
          <div className="configure-row">
            <button className="configure-btn" onClick={() => setConfigOpen(true)}>
              <Settings size={14} /> Configure
            </button>
          </div>

          {/* ─── CHARTS GRID ─── */}
          <div className="charts-grid">
            {isChartVisible('portfolioGrowth') && (
              <motion.div className="chart-card full-width" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <PortfolioGrowthChart growthData={growthData} />
              </motion.div>
            )}
            {isChartVisible('fundAllocation') && (
              <motion.div className="chart-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <FundAllocationChart holdings={holdings} />
              </motion.div>
            )}
            {isChartVisible('investedVsCurrent') && (
              <motion.div className="chart-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <InvestedVsCurrentChart growthData={growthData} />
              </motion.div>
            )}

            {isChartVisible('monthlyInvestments') && (
              <motion.div className="chart-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <MonthlyInvestmentsChart growthData={growthData} />
              </motion.div>
            )}
            {isChartVisible('navTrend') && (
              <motion.div className="chart-card full-width" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <FundsNavTrendChart holdings={holdings} />
              </motion.div>
            )}
            {isChartVisible('cagrTrend') && (
              <motion.div className="chart-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <CagrTrendChart growthData={growthData} />
              </motion.div>
            )}
            {isChartVisible('rollingReturns') && (
              <motion.div className="chart-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <RollingReturnsChart growthData={growthData} />
              </motion.div>
            )}
            {isChartVisible('drawdownTrend') && (
              <motion.div className="chart-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                <DrawdownTrendChart growthData={growthData} />
              </motion.div>
            )}
          </div>

          {/* ─── HOLDINGS TABLE ─── */}
          {holdings.length > 0 && (
            <motion.div className="holdings-section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <div className="holdings-header">
                <h3 className="chart-title">
                  Fund-wise Returns <span className="badge-m09">LIVE</span>
                </h3>
                <span className="chart-subtitle">Per-fund absolute return and XIRR from your investment lots</span>
              </div>
              <div className="holdings-table-wrap">
                <table className="holdings-table">
                  <thead>
                    <tr>
                      <th>Fund</th>
                      <th>Category</th>
                      <th>Invested</th>
                      <th>Units</th>
                      <th>Current Value</th>
                      <th>Gain / Loss</th>
                      <th>Abs. Return</th>
                      <th>XIRR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdings
                      .filter((h) => parseFloat(h.totalUnits) > 0 || parseFloat(h.currentValue) > 0 || parseFloat(h.investedValue) > 0)
                      .map((h, i) => {
                        const gain    = parseFloat(h.gainLoss) || 0;
                        const pctRet  = parseFloat(h.gainLossPct);
                        const currVal = parseFloat(h.currentValue) || 0;
                        const noNav   = currVal === 0 && parseFloat(h.totalUnits) > 0;
                        const broadCat = categorizeBroad(h.category);
                        return (
                          <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.03 * i }}>
                            <td>
                              <div className="h-fund-name">
                                {h.fundName || h.schemeCode}
                                {h.planType?.toLowerCase().includes('direct') && <span className="plan-badge direct">DIRECT</span>}
                                {h.planType?.toLowerCase().includes('regular') && <span className="plan-badge regular">REGULAR</span>}
                              </div>
                            </td>
                            <td>
                              <span className={`cat-badge ${broadCat.toLowerCase()}`}>{broadCat}</span>
                            </td>
                            <td className="h-num">{formatCurrency(h.investedValue)}</td>
                            <td className="h-num units-col">{parseFloat(h.totalUnits)?.toFixed(3) || '—'}</td>
                            <td className="h-num">
                              {noNav ? (
                                <span className="nav-pending-badge" title="NAV not yet synced">NAV Pending</span>
                              ) : formatCurrency(currVal)}
                            </td>
                            <td className={`h-num ${gain >= 0 ? 'green' : 'red'}`}>
                              {noNav ? '—' : (gain >= 0 ? '+' : '') + formatCurrency(gain)}
                            </td>
                            <td className={`h-num bold ${!isNaN(pctRet) && pctRet >= 0 ? 'green' : 'red'}`}>
                              {noNav ? '—' : !isNaN(pctRet) ? formatPctSigned(pctRet) : '—'}
                            </td>
                            <td className={`h-num ${h.xirr != null ? (h.xirr >= 0 ? 'green' : 'red') : ''}`}>
                              {h.xirr != null ? formatPctSigned(h.xirr) : '—'}
                            </td>
                          </motion.tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
              {holdings.some((h) => parseFloat(h.totalUnits) > 0 && parseFloat(h.currentValue) === 0) && (
                <div className="nav-sync-hint">
                  <Wifi size={13} />
                  <span>
                    Some funds show "NAV Pending" — NAV data not yet available.
                    They will auto-refresh from AMFI on the next page load.
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </>
      )}

      {/* ─── CONFIGURE MODAL ─── */}
      <AnimatePresence>
        {configOpen && (
          <ConfigureModal
            onClose={() => setConfigOpen(false)}
            visibleCharts={visibleCharts}
            setVisibleCharts={setVisibleCharts}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
