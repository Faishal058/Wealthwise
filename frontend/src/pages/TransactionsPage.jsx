import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FileSpreadsheet, PlusCircle, FileText, UploadCloud, CheckCircle2, XCircle, AlertCircle, Download, FilePlus } from 'lucide-react';
import { api } from '../lib/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081';

// ── Portal dropdown — escapes backdrop-filter stacking context ──────────────
function FundDropdown({ results, anchorRef, onPick, textGhost, textPrimary }) {
  const [rect, setRect] = useState(null);

  useEffect(() => {
    function updateRect() {
      if (anchorRef.current) {
        setRect(anchorRef.current.getBoundingClientRect());
      }
    }
    updateRect();
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);
    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [anchorRef, results]);

  if (!results.length || !rect) return null;

  return createPortal(
    <div style={{
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 999999,
      borderRadius: '14px',
      background: '#0d2518',
      border: '1px solid rgba(163,230,53,0.25)',
      boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(163,230,53,0.1)',
      maxHeight: '280px',
      overflowY: 'auto',
    }}>
      {results.map(s => (
        <button
          key={s.amfiCode}
          type="button"
          onMouseDown={e => { e.preventDefault(); onPick(s); }}
          style={{
            display: 'block', width: '100%', textAlign: 'left',
            padding: '0.75rem 1rem', background: 'none', border: 'none',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            cursor: 'pointer', color: '#ffffff', transition: 'background 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(163,230,53,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <p style={{ fontSize: '0.8375rem', fontWeight: 600, marginBottom: '0.15rem', color: '#ffffff' }}>{s.schemeName}</p>
          <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)' }}>{s.amcName} · {s.amfiCode} · {s.category}</p>
        </button>
      ))}
    </div>,
    document.body
  );
}

const T = {
  textPrimary:  'var(--ww-text-primary)',
  textSec:      'var(--ww-text-secondary)',
  textMuted:    'var(--ww-text-muted)',
  textGhost:    'var(--ww-text-ghost)',
  surface:      'var(--ww-surface)',
  surfaceHover: 'var(--ww-surface-hover)',
  border:       'var(--ww-border)',
  borderSubtle: 'var(--ww-border-subtle)',
  accent:       'var(--ww-accent)',
  positive:     'var(--ww-positive)',
  negative:     'var(--ww-negative)',
};

const TX_TYPES = [
  'PURCHASE_SIP','PURCHASE_LUMPSUM','REDEMPTION',
  'SWITCH_IN','SWITCH_OUT','STP_IN','STP_OUT','SWP','DIVIDEND_REINVEST',
];

// ── Risk & Category badge helpers ──────────────────────────────────────────
const RISK_META = {
  1: { label: 'Low',           color: '#22d3ee', bg: 'rgba(34,211,238,0.12)'  },
  2: { label: 'Low-Mod',       color: '#34d399', bg: 'rgba(52,211,153,0.12)'  },
  3: { label: 'Moderate',      color: '#a3e635', bg: 'rgba(163,230,53,0.12)'  },
  4: { label: 'Mod-High',      color: '#fb923c', bg: 'rgba(251,146,60,0.12)'  },
  5: { label: 'High',          color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  6: { label: 'Very High',     color: '#e879f9', bg: 'rgba(232,121,249,0.12)' },
};

function RiskBadge({ level }) {
  const meta = RISK_META[Math.min(6, Math.max(1, level || 3))] || RISK_META[3];
  return (
    <span title={`Risk Level ${level}/6 — ${meta.label}`} style={{
      display: 'inline-flex', alignItems: 'center', gap: '2px',
      fontSize: '0.65rem', fontWeight: 800, padding: '0.15rem 0.45rem',
      borderRadius: '5px', background: meta.bg, color: meta.color,
      whiteSpace: 'nowrap',
    }}>
      <span>{'\u25cf'.repeat(level || 3)}</span>
      <span style={{ opacity: 0.25 }}>{'\u25cf'.repeat(6 - (level || 3))}</span>
      <span style={{ marginLeft: '3px' }}>{meta.label}</span>
    </span>
  );
}

function CategoryBadge({ category }) {
  if (!category) return <span style={{ color: T.textGhost, fontSize: '0.72rem' }}>—</span>;
  const c = category.toLowerCase();
  let color = '#a3e635', bg = 'rgba(163,230,53,0.1)';
  if (c.includes('debt') || c.includes('liquid') || c.includes('bond'))      { color = '#38bdf8'; bg = 'rgba(56,189,248,0.1)'; }
  else if (c.includes('hybrid') || c.includes('balanced'))                   { color = '#fb923c'; bg = 'rgba(251,146,60,0.1)'; }
  else if (c.includes('gold') || c.includes('commodity'))                    { color = '#fbbf24'; bg = 'rgba(251,191,36,0.1)'; }
  else if (c.includes('international') || c.includes('fof'))                 { color = '#e879f9'; bg = 'rgba(232,121,249,0.1)'; }
  else if (c.includes('index') || c.includes('nifty') || c.includes('sensex')) { color = '#67e8f9'; bg = 'rgba(103,232,249,0.1)'; }
  else if (c.includes('elss'))                                                { color = '#a78bfa'; bg = 'rgba(167,139,250,0.1)'; }
  return (
    <span style={{
      fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.45rem',
      borderRadius: '5px', background: bg, color, whiteSpace: 'nowrap',
      maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block',
    }} title={category}>{category}</span>
  );
}

// ── CSV template ────────────────────────────────────────────────────────────
const CSV_TPL_HEADERS = 'date,scheme_code,fund_name,transaction_type,amount,nav,units,folio_number,note';
const CSV_TPL_SAMPLE  = '2024-01-15,119551,Axis Bluechip Fund Direct Growth,PURCHASE_SIP,5000,52.3456,,ABC123,Monthly SIP';

function downloadTemplate() {
  const blob = new Blob([CSV_TPL_HEADERS + '\n' + CSV_TPL_SAMPLE], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'wealthwise_transactions_template.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ── Tab bar ─────────────────────────────────────────────────────────────────
function TabBar({ tab, setTab }) {
  return (
    <div style={{
      display: 'flex', gap: '0.35rem', marginBottom: '1.5rem',
      background: T.surface, borderRadius: '12px',
      padding: '4px', border: `1px solid var(--ww-border)`, width: 'fit-content',
    }}>
      {[
        { id: 'manual', label: <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><PlusCircle size={16} /> Manual Entry</span> },
        { id: 'csv', label: <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FileSpreadsheet size={16} /> Import CSV</span> }
      ].map(t => (
        <button key={t.id} onClick={() => setTab(t.id)} style={{
          padding: '0.45rem 1.25rem', borderRadius: '9px', border: 'none', cursor: 'pointer',
          fontWeight: 700, fontSize: '0.825rem',
          background: tab === t.id ? 'rgba(163,230,53,0.15)' : 'transparent',
          color:      tab === t.id ? 'var(--ww-accent)' : T.textMuted,
          outline:    tab === t.id ? '1px solid rgba(163,230,53,0.3)' : 'none',
          transition: 'all 0.18s',
        }}>{t.label}</button>
      ))}
    </div>
  );
}

// ── CSV Import Panel ─────────────────────────────────────────────────────────
function CsvImportPanel({ onImported }) {
  const [file, setFile]         = useState(null);
  const [preview, setPreview]   = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult]     = useState(null);
  const [err, setErr]           = useState('');
  const inputRef = useRef();

  const parsePreview = (f) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const lines = e.target.result.split('\n').filter(l => l.trim());
      if (lines.length < 1) { setPreview(null); return; }
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const rows    = lines.slice(1, 6).map(l => l.split(',').map(c => c.trim().replace(/^"|"$/g, '')));
      setPreview({ headers, rows, total: lines.length - 1 });
    };
    reader.readAsText(f);
  };

  const handleFile = (f) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.csv')) { setErr('Please upload a .csv file.'); return; }
    setErr(''); setResult(null); setFile(f); parsePreview(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true); setErr(''); setResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const token = localStorage.getItem('ww_token');
      const res = await fetch(`${API_URL}/api/transactions/import-csv`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Import failed');
      setResult(data);
      if (data.imported > 0) onImported();
    } catch (e) { setErr(e.message || 'Upload failed'); }
    finally { setUploading(false); }
  };

  const reset = () => { setFile(null); setPreview(null); setResult(null); setErr(''); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Guide */}
      <div style={{ padding: '1rem 1.25rem', borderRadius: '14px', background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.875rem', color: '#38bdf8', marginBottom: '0.25rem' }}><FileText size={16} /> CSV Format Guide</p>
            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
              Required: <b style={{ color: '#fff' }}>date</b>, <b style={{ color: '#fff' }}>scheme_code</b>, <b style={{ color: '#fff' }}>transaction_type</b>, <b style={{ color: '#fff' }}>amount</b><br/>
              Optional: fund_name, nav, units, folio_number, note
            </p>
          </div>
          <button onClick={downloadTemplate} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: '10px', background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <Download size={14} /> Download Template
          </button>
        </div>
      </div>

      {/* Drop zone */}
      {!file && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? '#a3e635' : 'rgba(255,255,255,0.14)'}`,
            borderRadius: '18px', padding: '3rem 2rem', textAlign: 'center', cursor: 'pointer',
            background: dragging ? 'rgba(163,230,53,0.05)' : 'rgba(255,255,255,0.02)', transition: 'all 0.18s',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem', color: 'var(--ww-accent)' }}><UploadCloud size={40} /></div>
          <p style={{ fontWeight: 700, color: T.textPrimary, marginBottom: '0.35rem' }}>{dragging ? 'Drop it!' : 'Drag & drop your CSV here'}</p>
          <p style={{ fontSize: '0.8rem', color: T.textGhost }}>or click to browse — .csv files only</p>
          <input ref={inputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
        </div>
      )}

      {err && <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', fontSize: '0.85rem' }}><AlertCircle size={16} /> {err}</div>}

      {file && !result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1.125rem', borderRadius: '14px', background: 'rgba(163,230,53,0.06)', border: '1px solid rgba(163,230,53,0.18)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ color: 'var(--ww-accent)' }}><FileSpreadsheet size={24} /></div>
              <div>
                <p style={{ fontWeight: 700, color: T.textPrimary, fontSize: '0.875rem' }}>{file.name}</p>
                <p style={{ fontSize: '0.72rem', color: T.textGhost }}>
                  {(file.size / 1024).toFixed(1)} KB{preview && <span> · {preview.total} rows detected</span>}
                </p>
              </div>
            </div>
            <button onClick={reset} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
          </div>

          {preview && (
            <div>
              <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Preview (first {Math.min(5, preview.rows.length)} of {preview.total} rows)
              </p>
              <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                      {preview.headers.map((h, i) => (
                        <th key={i} style={{ padding: '0.6rem 0.875rem', textAlign: 'left', whiteSpace: 'nowrap', color: T.textMuted, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.1em', borderBottom: `1px solid var(--ww-border)` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row, ri) => (
                      <tr key={ri} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        {row.map((cell, ci) => (
                          <td key={ci} style={{ padding: '0.55rem 0.875rem', color: T.textSec, whiteSpace: 'nowrap', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cell || '—'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <button onClick={handleUpload} disabled={uploading} style={{ padding: '0.875rem', borderRadius: '12px', background: uploading ? 'rgba(163,230,53,0.4)' : '#a3e635', color: '#062415', border: 'none', fontWeight: 800, fontSize: '0.9375rem', cursor: uploading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.18s' }}>
            {uploading ? (<><span style={{ width: '16px', height: '16px', border: '2px solid rgba(6,36,21,0.3)', borderTop: '2px solid #062415', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }}/> Importing…</>) : <><FilePlus size={18} /> Import {preview?.total ?? ''} Transactions</>}
          </button>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem' }}>
            {[
              { label: 'Imported', value: result.imported, color: '#a3e635', icon: <CheckCircle2 size={24} color="#a3e635" /> },
              { label: 'Failed',   value: result.failed,   color: '#f87171', icon: <XCircle size={24} color="#f87171" /> },
              { label: 'Skipped',  value: result.skipped,  color: '#fbbf24', icon: <AlertCircle size={24} color="#fbbf24" /> },
            ].map(s => (
              <div key={s.label} style={{ padding: '1rem', borderRadius: '14px', background: `${s.color}10`, border: `1px solid ${s.color}30`, textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.4rem' }}>{s.icon}</div>
                <p style={{ fontSize: '1.5rem', fontWeight: 900, color: s.color }}>{s.value}</p>
                <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</p>
              </div>
            ))}
          </div>

          <div style={{ borderRadius: '14px', border: `1px solid ${T.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '0.875rem 1.125rem', background: T.surfaceHover, borderBottom: `1px solid ${T.border}` }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 700, color: T.textPrimary }}>Row-by-Row Results</p>
            </div>
            <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
              {result.rows.map((r, i) => {
                const ok = r.status === 'OK';
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.6rem 1.125rem', borderBottom: i < result.rows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', background: ok ? 'transparent' : 'rgba(248,113,113,0.04)' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '5px', flexShrink: 0, background: ok ? 'rgba(163,230,53,0.12)' : 'rgba(248,113,113,0.12)', color: ok ? '#a3e635' : '#f87171' }}>{ok ? 'OK' : 'FAIL'}</span>
                    <span style={{ fontSize: '0.72rem', color: T.textGhost, flexShrink: 0 }}>Row {r.row}</span>
                    <span style={{ flex: 1, fontSize: '0.8rem', color: ok ? T.textSec : '#f87171' }}>
                      {ok ? `${r.fundName || r.txId} — ${r.date} — ₹${Number(r.amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : r.message}
                    </span>
                    {ok && <span style={{ fontSize: '0.72rem', color: T.textGhost, flexShrink: 0 }}>{r.message}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          <button onClick={reset} style={{ padding: '0.625rem 1.25rem', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', width: 'fit-content' }}>
            ← Import Another File
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function TransactionsPage() {
  const [tab, setTab]           = useState('manual');
  const [txns, setTxns]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState('');
  const [filterType, setFilterType] = useState('All');

  const [query, setQuery]                   = useState('');
  const [results, setResults]               = useState([]);
  const [searching, setSearching]           = useState(false);
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [navLoading, setNavLoading]         = useState(false);
  const [autoNav, setAutoNav]               = useState('');
  const [autoFolio, setAutoFolio]           = useState('');
  const [autoFolioList, setAutoFolioList]   = useState([]);
  const [txType, setTxType]   = useState('PURCHASE_SIP');
  const [txDate, setTxDate]   = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount]   = useState('');
  const [note, setNote]       = useState('');

  const units    = autoNav && amount ? (Number(amount) / Number(autoNav)).toFixed(4) : null;
  const dropRef  = useRef(null);
  const inputRef = useRef(null);

  const load = useCallback(async () => {
    try { setTxns(await api.get('/api/transactions')); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try { const r = await api.get(`/api/schemes/search?q=${encodeURIComponent(query)}&limit=10`); setResults(Array.isArray(r) ? r : []); }
      catch { setResults([]); }
      finally { setSearching(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const handler = e => { if (dropRef.current && !dropRef.current.contains(e.target)) setResults([]); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const pickScheme = async (s) => {
    setResults([]); setQuery(s.schemeName); setSelectedScheme(s);
    setNavLoading(true); setAutoNav(s.lastNav ? String(s.lastNav) : '');
    try {
      const navRes = await api.get(`/api/nav/${s.amfiCode}/latest`);
      const lNav = navRes?.navValue ?? navRes?.nav_value ?? navRes?.lastNav ?? s.lastNav ?? '';
      setAutoNav(lNav ? String(lNav) : '');
      const holdings = await api.get('/api/holdings');
      const folios = new Set();
      if (Array.isArray(holdings)) holdings.filter(h => h.schemeCode === s.amfiCode).forEach(h => { if (h.folioNumber && h.folioNumber !== 'DEFAULT') folios.add(h.folioNumber); });
      txns.filter(t => t.schemeCode === s.amfiCode && t.folioNumber && t.folioNumber !== 'DEFAULT').forEach(t => folios.add(t.folioNumber));
      const arr = [...folios]; setAutoFolioList(arr); setAutoFolio(arr.length > 0 ? arr[0] : '');
    } catch (e) { console.error(e); }
    finally { setNavLoading(false); }
  };

  const resetForm = () => {
    setShowForm(false); setQuery(''); setResults([]); setSelectedScheme(null);
    setAutoNav(''); setAutoFolio(''); setAutoFolioList([]);
    setTxType('PURCHASE_SIP'); setTxDate(new Date().toISOString().slice(0, 10));
    setAmount(''); setNote(''); setErr('');
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!selectedScheme) { setErr('Please select a fund from the search.'); return; }
    if (!amount)         { setErr('Please enter an amount.'); return; }
    setErr(''); setSaving(true);
    try {
      await api.post('/api/transactions', {
        schemeCode: selectedScheme.amfiCode, fundName: selectedScheme.schemeName,
        folioNumber: autoFolio || '', transactionType: txType,
        transactionDate: txDate, amount: Number(amount),
        nav: autoNav ? Number(autoNav) : null, units: units ? Number(units) : null, note,
      });
      await load(); resetForm();
    } catch (e) { setErr(e.message || 'Failed to save transaction.'); }
    finally { setSaving(false); }
  };

  const fmt = n => n != null ? '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—';
  const isBuy = t => t?.startsWith('PURCHASE') || ['SWITCH_IN','STP_IN','DIVIDEND_REINVEST'].includes(t);
  const typeColor = t => isBuy(t) ? '#a3e635' : '#f87171';
  const filtered = filterType === 'All' ? txns : txns.filter(t => t.transactionType === filterType);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '1.5rem 1rem', width: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="ww-overline">LEDGER</p>
          <h1 className="ww-page-title">Transactions</h1>
          <p style={{ color: T.textGhost, fontSize: '0.875rem' }}>Immutable · FIFO lots · Category & Risk auto-filled</p>
        </div>
        <button
          onClick={() => showForm ? resetForm() : setShowForm(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.25rem', borderRadius: '999px', border: showForm ? '1px solid rgba(248,113,113,0.35)' : '1px solid rgba(163,230,53,0.3)', background: showForm ? 'rgba(248,113,113,0.08)' : 'rgba(163,230,53,0.1)', color: showForm ? '#f87171' : '#a3e635', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.18s' }}
        >
          {showForm ? '✕ Cancel' : '+ Add Transaction'}
        </button>
      </div>

      <TabBar tab={tab} setTab={setTab} />

      {/* ── Manual Tab ── */}
      {tab === 'manual' && (
        <>
          {/* Add form */}
          {showForm && (
            <div className="ww-card" style={{ padding: '1.5rem', marginBottom: '1.5rem', overflow: 'visible' }}>
              <p style={{ fontWeight: 700, color: T.textPrimary, marginBottom: '1.25rem', fontSize: '0.9375rem' }}>New Transaction</p>
              {err && <div style={{ padding: '0.7rem 1rem', borderRadius: '10px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', fontSize: '0.85rem', marginBottom: '1rem' }}>{err}</div>}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'visible' }}>
                {/* Fund search */}
                <div ref={dropRef} style={{ position: 'relative' }}>
                  <label className="ww-input-label">Fund</label>
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={e => { setQuery(e.target.value); setSelectedScheme(null); }}
                    placeholder="Search by fund name or AMFI code…"
                    className="ww-input"
                    autoComplete="off"
                  />
                  {searching && <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.35rem' }}>Searching…</p>}
                  <FundDropdown
                    results={results}
                    anchorRef={inputRef}
                    onPick={pickScheme}
                    textGhost={T.textGhost}
                    textPrimary={T.textPrimary}
                  />
                </div>

                {/* Fund meta chips */}
                {selectedScheme && (
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', padding: '0.75rem 1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <CategoryBadge category={selectedScheme.category} />
                    <RiskBadge level={selectedScheme.riskLevel || 3} />
                    {navLoading
                      ? <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>Fetching NAV…</span>
                      : autoNav && <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Latest NAV: <span style={{ color: '#a3e635' }}>₹{autoNav}</span></span>
                    }
                  </div>
                )}

                {/* Type + Date */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="ww-input-label">Type</label>
                    <select value={txType} onChange={e => setTxType(e.target.value)} className="ww-input">
                      {TX_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="ww-input-label">Date</label>
                    <input type="date" value={txDate} onChange={e => setTxDate(e.target.value)} className="ww-input" />
                  </div>
                </div>

                {/* Amount + NAV */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="ww-input-label">Amount (₹)</label>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 5000" className="ww-input" />
                    {units && <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.3rem' }}>≈ {units} units</p>}
                  </div>
                  <div>
                    <label className="ww-input-label">NAV (₹) <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>auto-filled</span></label>
                    <input type="number" step="0.0001" value={autoNav} onChange={e => setAutoNav(e.target.value)} placeholder="Auto-filled" className="ww-input" />
                  </div>
                </div>

                {/* Folio */}
                <div>
                  <label className="ww-input-label">Folio Number <span style={{ fontWeight: 400, color: 'var(--ww-text-ghost)', fontSize: '0.68rem' }}>(auto-generated if blank)</span></label>
                  {autoFolioList.length > 0 ? (
                    <select value={autoFolio} onChange={e => setAutoFolio(e.target.value)} className="ww-input">
                      {autoFolioList.map(f => <option key={f} value={f}>{f}</option>)}
                      <option value="">Auto-generate new folio</option>
                    </select>
                  ) : (
                    <input value={autoFolio} onChange={e => setAutoFolio(e.target.value)} placeholder="Auto-generated (e.g. WW1A2B3C100119)" className="ww-input" />
                  )}
                </div>

                <div>
                  <label className="ww-input-label">Note (optional)</label>
                  <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Monthly SIP" className="ww-input" style={{ width: '100%' }} />
                </div>

                <button type="submit" disabled={saving || !selectedScheme || !amount} style={{ padding: '0.875rem', borderRadius: '12px', background: '#a3e635', color: '#062415', border: 'none', fontWeight: 800, fontSize: '0.9375rem', cursor: 'pointer', opacity: saving || !selectedScheme || !amount ? 0.55 : 1, transition: 'opacity 0.2s' }}>
                  {saving ? 'Saving…' : `Save ${txType.replace(/_/g, ' ')}`}
                </button>
              </form>
            </div>
          )}

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {['All','PURCHASE_SIP','PURCHASE_LUMPSUM','REDEMPTION','SWITCH_IN','SWITCH_OUT'].map(t => (
              <button key={t} onClick={() => setFilterType(t)} style={{ padding: '0.3rem 0.7rem', borderRadius: '8px', fontSize: '0.75rem', cursor: 'pointer', border: `1px solid ${filterType === t ? 'var(--ww-accent)' : 'var(--ww-border)'}`, background: filterType === t ? 'rgba(163,230,53,0.1)' : 'transparent', color: filterType === t ? 'var(--ww-accent)' : T.textMuted }}>
                {t === 'All' ? 'All' : t.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          {/* ── Ledger Table — all 10 columns ── */}
          {loading ? (
            <div className="ww-card" style={{ padding: '3rem', textAlign: 'center', color: T.textGhost }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="ww-card" style={{ padding: '3rem', textAlign: 'center', color: T.textMuted }}>
              No transactions yet. Click <b style={{ color: 'var(--ww-accent)' }}>+ Add Transaction</b> above, or{' '}
              <button onClick={() => setTab('csv')} style={{ background: 'none', border: 'none', color: 'var(--ww-blue)', cursor: 'pointer', fontWeight: 700, fontSize: 'inherit' }}>Import CSV</button>.
            </div>
          ) : (
            <div className="ww-card" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', fontSize: '0.74rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    {[
                      { h: 'Date',     style: { width: '84px'  } },
                      { h: 'Fund',     style: { minWidth: '160px' } },
                      { h: 'Category', style: { width: '130px' } },
                      { h: 'Risk',     style: { width: '108px' } },
                      { h: 'Type',     style: { width: '110px' } },
                      { h: 'Amount',   style: { width: '88px', textAlign: 'right' } },
                      { h: 'Units',    style: { width: '84px', textAlign: 'right' } },
                      { h: 'NAV',      style: { width: '80px', textAlign: 'right' } },
                      { h: 'Folio',    style: { width: '88px', textAlign: 'right' } },
                      { h: 'Src',      style: { width: '52px', textAlign: 'center' } },
                    ].map(col => (
                      <th key={col.h} style={{
                        padding: '0.55rem 0.6rem',
                        fontSize: '0.6rem', color: T.textGhost,
                        textTransform: 'uppercase', letterSpacing: '0.1em',
                        whiteSpace: 'nowrap', fontWeight: 700,
                        ...col.style,
                      }}>{col.h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => (
                    <tr key={t.id}
                      style={{ borderBottom: `1px solid var(--ww-border)`, transition: 'background 0.12s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--ww-surface)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                      {/* Date */}
                      <td style={{ padding: '0.5rem 0.6rem', color: T.textMuted, whiteSpace: 'nowrap' }}>
                        {t.transactionDate}
                      </td>

                      {/* Fund */}
                      <td style={{ padding: '0.5rem 0.6rem' }}>
                        <p style={{ fontWeight: 600, color: T.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }} title={t.fundName}>
                          {t.fundName || '—'}
                        </p>
                        <p style={{ fontSize: '0.6rem', color: T.textGhost, marginTop: '1px', whiteSpace: 'nowrap' }}>
                          {t.amcName || t.schemeCode}
                        </p>
                      </td>

                      {/* Category */}
                      <td style={{ padding: '0.5rem 0.6rem' }}>
                        <CategoryBadge category={t.category} />
                      </td>

                      {/* Risk */}
                      <td style={{ padding: '0.5rem 0.6rem' }}>
                        <RiskBadge level={t.riskLevel || 3} />
                      </td>

                      {/* Type */}
                      <td style={{ padding: '0.5rem 0.6rem' }}>
                        <span style={{
                          fontSize: '0.62rem', fontWeight: 800, padding: '0.14rem 0.42rem',
                          borderRadius: '5px', background: `${typeColor(t.transactionType)}18`,
                          color: typeColor(t.transactionType), whiteSpace: 'nowrap',
                        }}>{t.transactionType?.replace(/_/g, ' ')}</span>
                      </td>

                      {/* Amount */}
                      <td style={{ padding: '0.5rem 0.6rem', fontWeight: 700, color: typeColor(t.transactionType), textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {fmt(t.amount)}
                      </td>

                      {/* Units */}
                      <td style={{ padding: '0.5rem 0.6rem', color: T.textMuted, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {t.units ? Number(t.units).toFixed(3) : '—'}
                      </td>

                      {/* NAV */}
                      <td style={{ padding: '0.5rem 0.6rem', color: T.textMuted, textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {t.nav ? '₹' + Number(t.nav).toFixed(2) : '—'}
                      </td>

                      {/* Folio */}
                      <td style={{ padding: '0.5rem 0.6rem', color: T.textGhost, textAlign: 'right', fontSize: '0.68rem' }}>
                        {t.folioNumber && t.folioNumber !== 'DEFAULT' ? t.folioNumber : '—'}
                      </td>

                      {/* Source */}
                      <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center' }}>
                        <span style={{
                          fontSize: '0.55rem', fontWeight: 800, padding: '0.1rem 0.32rem',
                          borderRadius: '4px',
                          background: t.source === 'CSV' ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.05)',
                          color:      t.source === 'CSV' ? '#fbbf24'             : 'rgba(255,255,255,0.3)',
                        }}>{t.source === 'CSV' ? 'CSV' : 'MAN'}</span>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── CSV Tab ── */}
      {tab === 'csv' && (
        <div className="ww-card" style={{ padding: '2rem' }}>
          <p style={{ fontWeight: 700, color: T.textPrimary, fontSize: '0.9375rem', marginBottom: '0.25rem' }}>Bulk Import via CSV</p>
          <p style={{ fontSize: '0.78rem', color: T.textGhost, marginBottom: '1.5rem' }}>
            Import hundreds of transactions at once. NAV is auto-resolved from the database when not provided.
          </p>
          <CsvImportPanel onImported={() => { load(); setTab('manual'); }} />
        </div>
      )}
    </div>
  );
}
