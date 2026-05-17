import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Sparkles, AlertTriangle, CheckCircle } from 'lucide-react';
import { api } from '../lib/api';
import {
  GOAL_TYPES,
  getAllocationSuggestion,
  futureValue,
  yearsUntil,
  recommendedSIP,
  formatINR,
} from '../lib/goalHelpers';

const STEPS = ['Goal Type', 'Target Amount', 'Target Date', 'Priority', 'Monthly SIP', 'Review'];

const DEFAULT_FORM = {
  goalType: null,
  goalIcon: null,
  goalName: '',
  targetAmountToday: '',
  inflationRate: 0.06,
  isFutureValue: false,
  targetDate: '',
  priority: 'Medium',
  monthlySipAllocated: '',
  expectedReturnRate: 0.12,
};

// ─── Step 0 — Goal Type ────────────────────────────────────────────────────
function Step0({ form, set }) {
  return (
    <>
      <h3 className="gw-step-title">What are you saving for?</h3>
      <div className="gw-type-grid">
        {GOAL_TYPES.map((gt) => (
          <motion.button key={gt.type} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            className={`gw-type-card ${form.goalType === gt.type ? 'active' : ''}`}
            onClick={() => {
              set('goalType',           gt.type);
              set('goalIcon',           gt.icon);
              set('inflationRate',      gt.inflationRate);
              set('expectedReturnRate', gt.expectedReturn);
              if (!form.goalName) set('goalName', gt.label);
            }}
          >
            <span className="gw-type-icon">{gt.icon}</span>
            <span className="gw-type-label">{gt.label}</span>
          </motion.button>
        ))}
      </div>
      {form.goalType === 'CUSTOM' && (
        <input className="gw-input" placeholder="e.g. New Laptop, Home Renovation…"
          value={form.goalName} onChange={(e) => set('goalName', e.target.value)} />
      )}
    </>
  );
}

// ─── Step 1 — Target Amount ────────────────────────────────────────────────
// IMPORTANT: This component is defined at module level (not inside GoalWizard).
// Defining it inside GoalWizard would cause React to see a NEW function reference
// on every render, unmounting + remounting the input DOM node each keystroke,
// which resets focus and cursor position.
function Step1({ form, set, fv, years, selected }) {
  return (
    <>
      <h3 className="gw-step-title">How much do you need?</h3>
      <div className="gw-toggle-row">
        {[false, true].map((isFV) => (
          <button key={String(isFV)} onClick={() => set('isFutureValue', isFV)}
            className={`gw-toggle-btn ${form.isFutureValue === isFV ? 'active' : ''}`}>
            {isFV ? 'Future value (already adjusted)' : "Today's value"}
          </button>
        ))}
      </div>

      <label className="gw-label">
        {form.isFutureValue ? 'Future target (₹)' : "Amount in today's rupees (₹)"}
      </label>
      {/* Raw numeric input — NO formatting on keystroke, NO value transformation */}
      <input
        type="text"
        inputMode="numeric"
        className="gw-input"
        placeholder="e.g. 5000000"
        value={form.targetAmountToday}
        onChange={(e) => {
          // Strip everything except digits and one decimal point
          const raw = e.target.value.replace(/[^0-9.]/g, '');
          // Prevent multiple decimal points
          const parts = raw.split('.');
          const clean = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : raw;
          set('targetAmountToday', clean);
        }}
      />

      {!form.isFutureValue && (
        <div className="gw-slider-block">
          <label className="gw-label">
            Inflation: {(form.inflationRate * 100).toFixed(1)}%
            <span className="gw-hint"> — preset for {selected?.label}</span>
          </label>
          <input type="range" min="0.04" max="0.15" step="0.005"
            value={form.inflationRate}
            onChange={(e) => set('inflationRate', parseFloat(e.target.value))}
            className="gw-range" />
        </div>
      )}

      {form.targetAmountToday && form.targetDate && !form.isFutureValue && (
        <div className="gw-info-banner warn">
          <AlertTriangle size={14} />
          Inflation-adjusted: <strong>{formatINR(fv)}</strong> in {years.toFixed(1)} yrs
        </div>
      )}

      <label className="gw-label">Goal name</label>
      <input className="gw-input" value={form.goalName}
        onChange={(e) => set('goalName', e.target.value)} />
    </>
  );
}

// ─── Step 2 — Target Date ──────────────────────────────────────────────────
function Step2({ form, set, years, alloc }) {
  return (
    <>
      <h3 className="gw-step-title">When do you need it?</h3>
      <label className="gw-label">Target Date</label>
      <input type="date" min={new Date().toISOString().split('T')[0]} className="gw-input"
        value={form.targetDate} onChange={(e) => set('targetDate', e.target.value)} />
      {form.targetDate && <p className="gw-hint-sub">{years.toFixed(1)} years from today</p>}
      {form.targetDate && years > 0 && (
        <div className="gw-alloc-banner">
          <p className="gw-alloc-title"><Sparkles size={14} /> Suggested — {alloc.label}</p>
          <div className="gw-alloc-bar">
            <div className="gw-alloc-eq"   style={{ width: `${alloc.equity}%` }} />
            <div className="gw-alloc-debt" style={{ width: `${alloc.debt}%` }} />
          </div>
          <div className="gw-alloc-labels">
            <span>{alloc.equity}% Equity</span>
            <span>{alloc.debt}% Debt</span>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Step 3 — Priority ─────────────────────────────────────────────────────
function Step3({ form, set }) {
  return (
    <>
      <h3 className="gw-step-title">How important is this goal?</h3>
      {[
        { v: 'High',   color: 'var(--ww-negative)', label: 'HIGH — Non-negotiable', desc: 'Retirement, education — funded first' },
        { v: 'Medium', color: 'var(--ww-yellow)',   label: 'MEDIUM — Important',    desc: 'House, car — important but flexible' },
        { v: 'Low',    color: 'var(--ww-positive)', label: 'LOW — Nice to have',    desc: 'Vacation, luxury — after priorities' },
      ].map((p) => (
        <motion.button key={p.v} whileTap={{ scale: 0.98 }}
          className={`gw-priority-btn ${form.priority === p.v ? 'active' : ''}`}
          onClick={() => set('priority', p.v)}>
          <span className="gw-pri-dot" style={{ background: p.color }} />
          <div>
            <p className="gw-pri-label">{p.label}</p>
            <p className="gw-pri-desc">{p.desc}</p>
          </div>
        </motion.button>
      ))}
    </>
  );
}

// ─── Step 4 — Monthly SIP ──────────────────────────────────────────────────
function Step4({ form, set, sipRec, targetFV, years }) {
  const allocated  = parseFloat(form.monthlySipAllocated) || 0;
  const sufficient = allocated >= sipRec;
  return (
    <>
      <h3 className="gw-step-title">Monthly SIP towards this goal</h3>
      <div className="gw-info-banner accent">
        <Sparkles size={14} /> Recommended: <strong>{formatINR(Math.ceil(sipRec))}/mo</strong>
        <span className="gw-hint"> — to reach {formatINR(targetFV)} in {years.toFixed(1)} yrs @ {(form.expectedReturnRate * 100).toFixed(0)}% p.a.</span>
      </div>
      <label className="gw-label">Your monthly SIP (₹)</label>
      <input
        type="text"
        inputMode="numeric"
        className="gw-input"
        placeholder={`Recommended: ₹${Math.ceil(sipRec).toLocaleString('en-IN')}`}
        value={form.monthlySipAllocated}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9.]/g, '');
          const parts = raw.split('.');
          const clean = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : raw;
          set('monthlySipAllocated', clean);
        }}
      />
      {form.monthlySipAllocated && !sufficient && (
        <div className="gw-info-banner danger">
          <AlertTriangle size={14} /> {formatINR(sipRec - allocated)} short/month — goal may not be met on time.
        </div>
      )}
      {form.monthlySipAllocated && sufficient && (
        <div className="gw-info-banner success">
          <CheckCircle size={14} /> SIP is on track to reach your goal.
        </div>
      )}
      <div className="gw-slider-block">
        <label className="gw-label">Expected return: {(form.expectedReturnRate * 100).toFixed(0)}% p.a.</label>
        <input type="range" min="0.06" max="0.18" step="0.01"
          value={form.expectedReturnRate}
          onChange={(e) => set('expectedReturnRate', parseFloat(e.target.value))}
          className="gw-range" />
      </div>
    </>
  );
}

// ─── Step 5 — Review ───────────────────────────────────────────────────────
function Step5({ form, selected, targetFV, years, sipRec, error }) {
  const sip = parseFloat(form.monthlySipAllocated) || 0;
  const r = form.expectedReturnRate / 12;
  const n = Math.round(years * 12);
  const projected = sip > 0 && n > 0 ? (sip * (Math.pow(1 + r, n) - 1)) / r : 0;
  return (
    <>
      <h3 className="gw-step-title">Review your goal</h3>
      <div className="gam-table">
        {[
          ['Goal',            `${form.goalIcon || ''} ${form.goalName}`],
          ['Type',            selected?.label ?? form.goalType],
          ['Priority',        form.priority],
          ['Target (today)',  form.isFutureValue ? '—' : formatINR(parseFloat(form.targetAmountToday) || 0)],
          ['Target (future)', formatINR(targetFV)],
          ['Target date',     form.targetDate],
          ['Years',           years.toFixed(1)],
          ['Inflation',       `${(form.inflationRate * 100).toFixed(1)}%`],
          ['Monthly SIP',     formatINR(sip)],
          ['Expected return', `${(form.expectedReturnRate * 100).toFixed(0)}% p.a.`],
        ].map(([k, v]) => (
          <div key={k} className="gam-row">
            <span>{k}</span>
            <span style={{ color: 'var(--ww-text-primary)', fontWeight: 600 }}>{v}</span>
          </div>
        ))}
      </div>
      {sip > 0 && n > 0 && (
        <div className={`gw-info-banner ${projected >= targetFV ? 'success' : 'warn'}`}>
          <Sparkles size={14} /> Projected corpus: <strong>{formatINR(projected)}</strong>
          {projected >= targetFV ? ' — On track!' : ' — May fall short'}
        </div>
      )}
      {error && <div className="gw-info-banner danger">{error}</div>}
    </>
  );
}

// ─── Main Wizard ───────────────────────────────────────────────────────────
export default function GoalWizard({ onClose, onCreated }) {
  const [step,    setStep]    = useState(0);
  const [form,    setForm]    = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  // Single-key setter — stable, does NOT recreate step components
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const next = () => { setError(null); setStep((s) => s + 1); };
  const back = () => { setError(null); setStep((s) => s - 1); };

  // Derived values computed here (parent), passed down as props
  const selected = GOAL_TYPES.find((g) => g.type === form.goalType);
  const years    = yearsUntil(form.targetDate);
  const fv       = futureValue(parseFloat(form.targetAmountToday) || 0, form.inflationRate, years);
  const targetFV = form.isFutureValue ? (parseFloat(form.targetAmountToday) || 0) : fv;
  const alloc    = getAllocationSuggestion(years);
  const sipRec   = recommendedSIP(targetFV, form.expectedReturnRate, years);

  const canNext = () => {
    if (step === 0) return !!form.goalType;
    if (step === 1) return !!form.targetAmountToday && parseFloat(form.targetAmountToday) > 0;
    if (step === 2) return !!form.targetDate;
    return true;
  };

  const handleCreate = async () => {
    setLoading(true); setError(null);
    try {
      const yearsLeft   = yearsUntil(form.targetDate);
      const futureTarget = form.isFutureValue
        ? parseFloat(form.targetAmountToday)
        : futureValue(parseFloat(form.targetAmountToday) || 0, form.inflationRate, yearsLeft);

      await api.post('/api/goals', {
        name:           form.goalName || selected?.label || form.goalType,
        goalType:       form.goalType,
        priority:       form.priority,
        targetAmount:   Math.round(futureTarget),
        inflationRate:  parseFloat((form.inflationRate * 100).toFixed(2)),
        expectedReturn: parseFloat((form.expectedReturnRate * 100).toFixed(2)),
        targetDate:     form.targetDate,
        monthlyNeed:    parseFloat(form.monthlySipAllocated) || 0,
        currentCorpus:  0,
      });
      onCreated?.();
      onClose?.();
    } catch (e) {
      setError(e.message || 'Failed to create goal.');
    } finally {
      setLoading(false);
    }
  };

  // Step components are stable module-level functions — NOT defined inside render
  const stepProps = [
    { component: Step0, extra: {} },
    { component: Step1, extra: { fv, years, selected } },
    { component: Step2, extra: { years, alloc } },
    { component: Step3, extra: {} },
    { component: Step4, extra: { sipRec, targetFV, years } },
    { component: Step5, extra: { selected, targetFV, years, sipRec, error } },
  ];
  const { component: StepComponent, extra } = stepProps[step];

  return (
    <AnimatePresence>
      <motion.div className="gw-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
        <motion.div className="gw-modal"
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', damping: 25 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="gw-header">
            <div>
              <h2 className="gw-title">Create a Goal</h2>
              <span className="gw-step-label">Step {step + 1} of {STEPS.length}</span>
            </div>
            <button className="gw-close" onClick={onClose}><X size={18} /></button>
          </div>

          {/* Progress bar */}
          <div className="gw-progress-track">
            <motion.div className="gw-progress-fill"
              animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
              transition={{ duration: 0.3 }} />
          </div>

          {/* Step pills */}
          <div className="gw-step-pills">
            {STEPS.map((s, i) => (
              <span key={s} className={`gw-pill ${i === step ? 'current' : i < step ? 'done' : ''}`}>
                {i < step ? '✓ ' : ''}{s}
              </span>
            ))}
          </div>

          {/* Body */}
          <div className="gw-body">
            <AnimatePresence mode="wait">
              <motion.div key={step}
                initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}>
                <StepComponent form={form} set={set} {...extra} />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="gw-footer">
            <motion.button className="gw-btn-back" onClick={back} disabled={step === 0}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <ChevronLeft size={16} /> Back
            </motion.button>
            {step < STEPS.length - 1 ? (
              <motion.button className="gw-btn-next" onClick={next} disabled={!canNext()}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                Next <ChevronRight size={16} />
              </motion.button>
            ) : (
              <motion.button className="gw-btn-create" onClick={handleCreate} disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}>
                {loading ? 'Creating…' : 'Create Goal'}
              </motion.button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
