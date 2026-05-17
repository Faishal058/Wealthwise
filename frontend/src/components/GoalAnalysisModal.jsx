import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, AlertTriangle, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { formatINR } from '../lib/goalHelpers';

// ── Probability Ring ────────────────────────────────────────
function ProbabilityRing({ probability }) {
  const radius = 44;
  const stroke = 8;
  const circumference = 2 * Math.PI * radius;
  const filled = (probability / 100) * circumference;
  const color =
    probability >= 60 ? 'var(--ww-accent)' :
    probability >= 40 ? 'var(--ww-yellow)' :
    'var(--ww-negative)';

  return (
    <div className="gam-ring-row">
      <svg width="110" height="110" style={{ flexShrink: 0 }}>
        <circle cx="55" cy="55" r={radius} fill="none" stroke="var(--ww-border)" strokeWidth={stroke} />
        <circle cx="55" cy="55" r={radius} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={`${filled} ${circumference}`}
          strokeLinecap="round" transform="rotate(-90 55 55)"
        />
        <text x="55" y="50" textAnchor="middle" dominantBaseline="middle"
          fill={color} fontSize="18" fontWeight="800">
          {probability}%
        </text>
        <text x="55" y="68" textAnchor="middle" dominantBaseline="middle"
          fill="var(--ww-text-ghost)" fontSize="10">
          chance
        </text>
      </svg>
      <div>
        <div className="gam-ring-label" style={{ color }}>
          {probability >= 60 ? "You're likely on track 🎉"
            : probability >= 40 ? "There's a reasonable chance"
            : "This goal needs attention"}
        </div>
        <p className="gam-hint" style={{ marginTop: 6 }}>
          Based on 10,000 market scenarios,{' '}
          <strong style={{ color }}>{probability}%</strong> chance of reaching your target.
        </p>
      </div>
    </div>
  );
}

// ── Scenario Bars (replaces cramped OutcomeRangeBar) ────────
// Each scenario gets its own horizontal progress bar toward the target.
// No cramping — works even when outcomes << target.
function ScenarioBars({ pessimistic, likely, optimistic, target }) {
  if (!isFinite(pessimistic) || !isFinite(target) || target <= 0) return null;

  const scenarios = [
    { label: 'Bad Markets',          value: pessimistic, color: 'var(--ww-negative)',  bg: 'rgba(248,113,113,0.12)' },
    { label: 'Most Likely',          value: likely,      color: 'var(--ww-purple)',     bg: 'rgba(167,139,250,0.12)' },
    { label: 'Good Markets',         value: optimistic,  color: 'var(--ww-accent)',     bg: 'rgba(52,211,153,0.07)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
      <p style={{ fontSize: '0.72rem', color: 'var(--ww-text-muted)', fontWeight: 600, margin: 0 }}>
        RANGE OF OUTCOMES vs. TARGET OF {formatINR(target)}
      </p>
      {scenarios.map(({ label, value, color, bg }) => {
        const pct = Math.min((value / target) * 100, 100);
        const isOver = value >= target;
        return (
          <div key={label} style={{
            padding: '12px 14px',
            borderRadius: 14,
            background: bg,
            border: `1px solid ${color}30`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color }}>{label}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: isOver ? color : 'var(--ww-text-primary)' }}>
                {formatINR(value)}
              </span>
            </div>
            {/* Progress bar toward target */}
            <div style={{ height: 8, borderRadius: 99, background: 'var(--ww-border)', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
                style={{ height: '100%', borderRadius: 99, background: color }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: '0.68rem', color: 'var(--ww-text-ghost)' }}>
              <span>{pct.toFixed(1)}% of goal</span>
              {!isOver && (
                <span style={{ color: 'var(--ww-negative)' }}>
                  {formatINR(target - value)} short
                </span>
              )}
              {isOver && <span style={{ color }}>✓ Goal exceeded</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Modal ──────────────────────────────────────────────
export default function GoalAnalysisModal({ goal, onClose }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  // ── Derive all inputs automatically from goal ─────────────
  // Backend now always sends monthsRemaining (including 0 for past-due goals).
  // Fall back to JS date math only when field is completely absent.
  const rawMonths = goal.monthsRemaining != null
    ? Number(goal.monthsRemaining)
    : (goal.targetDate
        ? Math.round((new Date(goal.targetDate) - new Date()) / (365.25 * 86400000 / 12))
        : 120); // 10-year default when no date at all

  // If target is truly in the past (rawMonths <= 0), use 120 months so the simulation
  // still shows a meaningful projection — the user needs to see what COULD happen.
  const isPastDue      = rawMonths <= 0;
  const monthsRemaining = isPastDue ? 120 : Math.max(rawMonths, 1);

  // Flag when time horizon looks suspicious (< 12 months) for a large goal (> ₹10L)
  const targetAmt      = parseFloat(goal.targetAmount)  || 0;
  const isShortHorizon = rawMonths < 12 && !isPastDue;
  const isShortForGoal = isShortHorizon && targetAmt > 1_000_000;  // > ₹10L

  const yearsRemaining  = monthsRemaining / 12;
  const annualRate      = (parseFloat(goal.expectedReturn) || 12) / 100;
  const corpus          = Math.max(parseFloat(goal.currentCorpus)  || 0, 0);
  const inflationRate   = (parseFloat(goal.inflationRate) || 6) / 100;
  const r               = annualRate / 12;

  // Recommended SIP when monthlyNeed absent
  const recSip = r > 0 && monthsRemaining > 0
    ? (targetAmt * r) / ((Math.pow(1 + r, monthsRemaining) - 1) * (1 + r))
    : (monthsRemaining > 0 ? targetAmt / monthsRemaining : 0);

  const sip      = parseFloat(goal.monthlyNeed) > 0
    ? parseFloat(goal.monthlyNeed)
    : Math.round(recSip);
  const sipIsRec = !(parseFloat(goal.monthlyNeed) > 0);

  // ── Time label: show months when < 1 year ────────────────
  const timeLeftLabel = yearsRemaining >= 1
    ? `${yearsRemaining.toFixed(1)} yrs`
    : `${monthsRemaining} mo`;

  // ── Auto-run on mount (always — even short-horizon goals show correct 0% probability)
  useEffect(() => {
    if (targetAmt > 0) runAnalysis();
  }, [goal.id]);

  const runAnalysis = async () => {
    setLoading(true); setError(null);
    try {
      const payload = {
        initialPortfolio:    Math.max(corpus, 0.01),
        monthlyContribution: sip,
        monthlyMean:         annualRate / 12,
        monthlyStdDev:       0.045,
        months:              monthsRemaining,
        targetAmount:        targetAmt,
        annualInflationRate: inflationRate,
      };
      setAnalysis(await api.post('/api/learn/analyse', payload));
    } catch (err) {
      setError(err.message || 'Failed to run analysis.');
    } finally {
      setLoading(false);
    }
  };

  const goalLabel = goal.name || goal.goalType || 'Goal';

  return (
    <AnimatePresence>
      <motion.div
        className="gam-overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="gam-modal-wrap"
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', damping: 25 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ────────────────────────────────────── */}
          <div className="gw-header">
            <div>
              <h2 className="gw-title">Goal Analysis</h2>
              <span className="gw-step-label">{goalLabel}</span>
            </div>
            <button className="gw-close" onClick={onClose}><X size={18} /></button>
          </div>

          {/* ── Assumptions strip ─────────────────────────── */}
          <div className="gam-assumptions">
            <div className="gam-assum-item">
              <span className="gam-assum-label">Target</span>
              <span className="gam-assum-val">{formatINR(targetAmt)}</span>
            </div>
            <div className="gam-assum-item">
              <span className="gam-assum-label">Time Left</span>
              <span className="gam-assum-val" style={{ color: (rawMonths < 12 && !isPastDue) ? 'var(--ww-yellow)' : undefined }}>
                {isPastDue ? 'Past due ⚠' : timeLeftLabel}
              </span>
            </div>
            <div className="gam-assum-item">
              <span className="gam-assum-label">Current Corpus</span>
              <span className="gam-assum-val">{formatINR(corpus)}</span>
            </div>
            <div className="gam-assum-item">
              <span className="gam-assum-label">
                Monthly SIP {sipIsRec && <span className="gam-assum-badge">REC</span>}
              </span>
              <span className="gam-assum-val">{formatINR(sip)}</span>
            </div>
            <div className="gam-assum-item">
              <span className="gam-assum-label">Exp. Return</span>
              <span className="gam-assum-val">{(annualRate * 100).toFixed(0)}% p.a.</span>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <motion.button
                className="gam-refresh-btn"
                onClick={runAnalysis}
                disabled={loading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Re-run simulation"
              >
                <RefreshCw size={13} className={loading ? 'gam-spin' : ''} />
              </motion.button>
            </div>
          </div>

          {/* ── Body ──────────────────────────────────────── */}
          <div className="gw-body">

            {/* ── Past-due: date in the past — simulation uses fallback 10yr horizon ── */}
            {isPastDue && (
              <div className="gw-info-banner warn">
                <AlertTriangle size={14} />
                <div>
                  <strong>Target date has passed.</strong> Showing a 10-year projection so you can see
                  what's possible. Please update your goal's target date.
                </div>
              </div>
            )}

            {/* ── Short horizon for a large goal — values will look tiny ── */}
            {isShortForGoal && (
              <div className="gw-info-banner warn">
                <AlertTriangle size={14} />
                <div>
                  <strong>Target date is only {rawMonths} month{rawMonths !== 1 ? 's' : ''} away</strong>{' '}
                  for a {formatINR(targetAmt)} goal — projected values will be very small.
                  If your target <em>year</em> is wrong, edit the goal to fix it.
                </div>
              </div>
            )}

            {/* ── SIP auto-filled from recommendation ── */}
            {sipIsRec && (
              <div className="gw-info-banner accent">
                ℹ️ No monthly SIP saved — using recommended SIP of{' '}
                <strong>₹{Math.ceil(recSip).toLocaleString('en-IN')}/mo</strong> for this simulation.
              </div>
            )}


            {loading ? (
              <div className="gw-loading">
                <div className="gw-spinner" />
                <p className="gam-hint">Running 10,000 market simulations…</p>
              </div>
            ) : error ? (
              <div className="gw-info-banner danger"><AlertTriangle size={14} /> {error}</div>
            ) : analysis ? (
              <div className="gam-sections">

                {/* ── Section 1: Probability ── */}
                <div className="gam-section">
                  <h3 className="gw-step-title">Will I reach my goal?</h3>
                  <ProbabilityRing probability={analysis.monteCarlo.probability} />
                </div>

                {/* ── Section 2: Outcome Scenarios ── */}
                <div className="gam-section">
                  <h3 className="gw-step-title">Projected outcomes</h3>
                  <ScenarioBars
                    pessimistic={analysis.monteCarlo.pessimistic}
                    likely={analysis.monteCarlo.likely}
                    optimistic={analysis.monteCarlo.optimistic}
                    target={targetAmt}
                  />
                </div>

                {/* ── Section 3: Deterministic Baseline ── */}
                <div className="gam-section">
                  <h3 className="gw-step-title">Expected Baseline</h3>
                  <div className="gam-table">
                    <div className="gam-row">
                      <span>Growth on current savings</span>
                      <span>{formatINR(analysis.deterministic.fvCorpus)}</span>
                    </div>
                    <div className="gam-row">
                      <span>Growth from SIPs</span>
                      <span>{formatINR(analysis.deterministic.fvSip)}</span>
                    </div>
                    <div className="gam-row gam-row-total">
                      <span>Total Projected (real terms)</span>
                      <span>{formatINR(analysis.deterministic.totalProjected)}</span>
                    </div>
                  </div>
                  {analysis.deterministic.onTrack ? (
                    <div className="gw-info-banner success">
                      <Sparkles size={14} /> ✅ You're on track! Buffer: {formatINR(Math.abs(analysis.deterministic.gap))}
                    </div>
                  ) : (
                    <div className="gw-info-banner danger">
                      <AlertTriangle size={14} /> ❌ Currently <strong>{formatINR(Math.abs(analysis.deterministic.gap))}</strong> short.
                    </div>
                  )}
                </div>

                {/* ── Section 4: Sensitivity ── */}
                <div className="gam-section">
                  <h3 className="gw-step-title">What could go wrong?</h3>
                  <div className="gam-table">
                    <div className="gam-row gam-row-header">
                      <span>Scenario</span><span>Shortfall</span>
                    </div>
                    {analysis.deterministic.sensitivity.map((row, i) => (
                      <div key={i} className="gam-row">
                        <span>{row.scenario}</span>
                        <span style={{ color: row.gap <= 0 ? 'var(--ww-positive)' : 'var(--ww-negative)' }}>
                          {row.gap <= 0 ? '✓ On track' : formatINR(Math.abs(row.gap))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Section 5: Gap closing ── */}
                {!analysis.requiredSip.currentSipEnough ? (
                  <div className="gam-section">
                    <h3 className="gw-step-title">How to close the gap</h3>
                    <div className="gam-fixes">
                      <div className="gam-fix">
                        <div className="gam-fix-num">1</div>
                        <div>
                          <div className="gam-fix-title">
                            Increase SIP by <span className="gam-fix-accent">{formatINR(analysis.requiredSip.sipGap)}/mo</span>
                          </div>
                          <div className="gam-hint">
                            {formatINR(analysis.requiredSip.currentSip)} → {formatINR(analysis.requiredSip.requiredSip)}
                          </div>
                        </div>
                      </div>
                      <div className="gam-fix">
                        <div className="gam-fix-num">2</div>
                        <div>
                          <div className="gam-fix-title">
                            One-time top-up of{' '}
                            <span className="gam-fix-accent">{formatINR(analysis.requiredSip.lumpSumToday)}</span>
                          </div>
                          <div className="gam-hint">Invest this lump sum today to catch up instantly.</div>
                        </div>
                      </div>
                      {analysis.requiredSip.extraMonths > 0 && (
                        <div className="gam-fix">
                          <div className="gam-fix-num">3</div>
                          <div>
                            <div className="gam-fix-title">
                              Extend deadline by{' '}
                              <span className="gam-fix-accent">
                                {Math.floor(analysis.requiredSip.extraMonths / 12) > 0 &&
                                  `${Math.floor(analysis.requiredSip.extraMonths / 12)} yr `}
                                {analysis.requiredSip.extraMonths % 12 > 0 &&
                                  `${analysis.requiredSip.extraMonths % 12} mo`}
                              </span>
                            </div>
                            <div className="gam-hint">Keep current SIP, give markets more time.</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="gw-info-banner success">
                    <Sparkles size={14} /> Your current SIP is sufficient — keep it up!
                  </div>
                )}

              </div>
            ) : !isPastDue ? (
              <div className="gw-loading">
                <div className="gw-spinner" />
                <p className="gam-hint">Starting simulation…</p>
              </div>
            ) : null}
          </div>

          {/* ── Footer ────────────────────────────────────── */}
          <div className="gw-footer" style={{ justifyContent: 'flex-end' }}>
            <button className="gw-btn-back" onClick={onClose}>Close</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
