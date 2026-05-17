import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Sparkles, Link, AlertTriangle, Microscope, CheckCircle, Trophy, RotateCcw, Plus, Trash2, Wallet } from 'lucide-react';
import { api } from '../lib/api';
import { GOAL_TYPES, formatINR } from '../lib/goalHelpers';
import GoalWizard from '../components/GoalWizard';
import GoalAnalysisModal from '../components/GoalAnalysisModal';
import GoalLinkModal from '../components/GoalLinkModal';
import './GoalsPage.css';

// ── helpers ──────────────────────────────────────────────────
const priorityOrder  = { High: 0, Medium: 1, Low: 2 };
const statusColor    = { Active: 'active', Achieved: 'achieved', Completed: 'achieved', Paused: '' };
const priorityClass  = { High: 'high', Medium: 'medium', Low: 'low' };

function goalIcon(g) {
  const gt = GOAL_TYPES.find((t) => t.type?.toLowerCase() === g.goalType?.toLowerCase()
    || t.label?.toLowerCase().includes(g.goalType?.toLowerCase()));
  return gt?.icon ?? <Wallet size={18} />;
}

export default function GoalsPage() {
  const [goals,         setGoals]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [showWizard,    setShowWizard]    = useState(false);
  const [analysisGoal,  setAnalysisGoal]  = useState(null);
  const [linkGoal,      setLinkGoal]      = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setGoals(await api.get('/api/goals')); }
    catch (e) { console.error('Failed to load goals:', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markAchieved = async (id) => {
    try {
      await api.patch(`/api/goals/${id}/status`, { status: 'Achieved' });
      await load();
    } catch (e) { console.error(e); }
  };

  const reactivateGoal = async (id) => {
    try {
      await api.patch(`/api/goals/${id}/status`, { status: 'Active' });
      await load();
    } catch (e) { console.error(e); }
  };

  const deleteGoal = async (id) => {
    if (!window.confirm('Delete this goal? This cannot be undone.')) return;
    try {
      await api.delete(`/api/goals/${id}`);
      await load();
    } catch (e) { console.error(e); }
  };

  const sorted = [...goals].sort((a, b) => {
    const pa = priorityOrder[a.priority] ?? 1;
    const pb = priorityOrder[b.priority] ?? 1;
    return pa !== pb ? pa - pb : (a.name || '').localeCompare(b.name || '');
  });

  return (
    <div className="goals-page">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="goals-header">
        <div>
          <p className="ww-overline">PLANNING</p>
          <h1 className="ww-page-title">Goal Based Investing</h1>
          <p style={{ color: 'var(--ww-text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            Monte Carlo projections · Deterministic FV · Progress tracking
          </p>
        </div>
        <motion.button
          className="goals-new-btn"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={() => setShowWizard(true)}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
        >
          <Plus size={16} /> New Goal
        </motion.button>
      </div>

      {/* ── Goals Grid ─────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--ww-text-muted)' }}>
          <div className="gw-spinner" style={{ margin: '0 auto 16px' }} />
          Loading goals…
        </div>
      ) : (
        <div className="goals-grid">
          {sorted.map((g, idx) => {
            const targetAmt  = parseFloat(g.targetAmount)  || 0;
            const corpus     = parseFloat(g.currentCorpus) || 0;
            const projected  = parseFloat(g.projectedValue)|| 0;
            const gap        = parseFloat(g.gap)           ?? null;
            const onTrack    = g.onTrack;
            const pctDone    = targetAmt > 0 ? Math.min(100, (corpus / targetAmt) * 100) : 0;
            const icon       = goalIcon(g);

            return (
              <motion.div
                key={g.id}
                className="goal-card"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                {/* Top row */}
                <div className="goal-card-top">
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span className="goal-card-icon">{icon}</span>
                    <div>
                      <p className="goal-card-name">{g.name || g.goalType}</p>
                      <p className="goal-card-meta">
                        {g.goalType}
                        {g.targetDate && ` · ${g.targetDate}`}
                        {g.monthsRemaining != null && ` · ${Math.round(g.monthsRemaining / 12 * 10) / 10} yrs left`}
                      </p>
                    </div>
                  </div>
                  <div className="goal-card-badges">
                    {/* Priority badge */}
                    <span className={`goal-badge ${priorityClass[g.priority] || ''}`}>
                      {g.priority}
                    </span>
                    {/* Link investments button */}
                    <motion.button
                      className="goal-link-badge"
                      onClick={() => setLinkGoal(g)}
                      whileHover={{ scale: 1.06 }}
                      whileTap={{ scale: 0.95 }}
                      title="Link investments to this goal"
                    >
                      <Link size={10} /> Link
                    </motion.button>
                  </div>
                </div>

                {/* Progress */}
                <div className="goal-progress-bar-wrap">
                  <div className="goal-progress-labels">
                    <span>{formatINR(corpus)} of {formatINR(targetAmt)}</span>
                    <span className="goal-progress-pct" style={{ color: onTrack ? 'var(--ww-accent)' : 'var(--ww-yellow)' }}>
                      {pctDone.toFixed(1)}%
                    </span>
                  </div>
                  <div className="goal-progress-bar">
                    <div className="goal-progress-fill"
                      style={{ width: `${pctDone}%`, background: onTrack ? 'var(--ww-accent)' : 'var(--ww-yellow)' }} />
                  </div>
                </div>

                {/* Stats row */}
                <div className="goal-stats">
                  {[
                    { label: 'Monthly SIP',  value: formatINR(g.monthlyNeed),   color: 'var(--ww-text-primary)' },
                    { label: 'Projected',    value: formatINR(projected),        color: onTrack ? 'var(--ww-accent)' : 'var(--ww-yellow)' },
                    { label: 'Gap',          value: gap != null ? (gap > 0 ? '−' + formatINR(gap) : '+' + formatINR(Math.abs(gap))) : '—',
                                             color: gap == null ? 'var(--ww-text-muted)' : gap > 0 ? 'var(--ww-negative)' : 'var(--ww-positive)' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="goal-stat">
                      <p className="goal-stat-label">{label}</p>
                      <p className="goal-stat-value" style={{ color }}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* On-track badge */}
                <div className={`gw-info-banner ${onTrack ? 'success' : 'warn'}`} style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {onTrack
                    ? <><Sparkles size={14} /> On track — surplus of {formatINR(Math.abs(gap || 0))}</>
                    : <><AlertTriangle size={14} color="var(--ww-yellow)" /> Shortfall of {formatINR(Math.abs(gap || 0))}</>}
                </div>

                {/* ── Actions: Active goal ── */}
                {(g.status === 'Active' || !g.status) && (
                  <div className="goal-actions">
                    <button className="goal-action-btn analyse" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }} onClick={() => setAnalysisGoal(g)}>
                      <Microscope size={14} /> Deep Analyse
                    </button>
                    <button className="goal-action-btn achieve" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }} onClick={() => markAchieved(g.id)}>
                      <CheckCircle size={14} /> Achieved
                    </button>
                    <button className="goal-action-btn delete" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }} onClick={() => deleteGoal(g.id)}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                )}

                {/* ── Actions: Achieved goal ── */}
                {(g.status === 'Achieved' || g.status === 'Completed') && (
                  <div className="goal-achieved-banner">
                    <span className="goal-achieved-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Trophy size={16} color="#fbbf24" /> Goal Achieved!</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <motion.button
                        className="goal-action-btn analyse"
                        style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
                        onClick={() => reactivateGoal(g.id)}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <RotateCcw size={14} /> Reactivate
                      </motion.button>
                      <button className="goal-action-btn delete" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => deleteGoal(g.id)}>
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}

          {sorted.length === 0 && !loading && (
            <div className="goals-empty">
              <Target size={40} color="var(--ww-text-ghost)" />
              <p>No goals yet. Create your first financial goal!</p>
            </div>
          )}
        </div>
      )}

      {/* ── Goal Wizard Modal ───────────────────────────────── */}
      <AnimatePresence>
        {showWizard && (
          <GoalWizard
            onClose={() => setShowWizard(false)}
            onCreated={() => { setShowWizard(false); load(); }}
          />
        )}
      </AnimatePresence>

      {/* ── Goal Link Modal ──────────────────────────────────── */}
      <AnimatePresence>
        {linkGoal && (
          <GoalLinkModal
            goal={linkGoal}
            onClose={() => setLinkGoal(null)}
            onLinked={() => load()}
          />
        )}
      </AnimatePresence>

      {/* ── Goal Analysis Modal ─────────────────────────────── */}
      <AnimatePresence>
        {analysisGoal && (
          <GoalAnalysisModal
            goal={analysisGoal}
            onClose={() => setAnalysisGoal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
