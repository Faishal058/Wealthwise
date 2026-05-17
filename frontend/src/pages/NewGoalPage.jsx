import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { EmptyNotice, PageHero, SurfacePanel } from '../components/DashboardSurface';

// Inlined from deleted lib/planning.js
function calculateMonthlyNeed(targetAmount, currentCorpus, targetDate, expectedReturnPct) {
  const r = expectedReturnPct / 100 / 12;
  const months = Math.max(1, Math.round((new Date(targetDate) - new Date()) / (1000 * 60 * 60 * 24 * 30.44)));
  const remaining = targetAmount - currentCorpus;
  if (r === 0) return remaining / months;
  return (remaining * r) / (Math.pow(1 + r, months) - 1);
}

// Inlined from deleted lib/format.js
function formatCompactCurrency(value) {
  if (value >= 1e7) return '₹' + (value / 1e7).toFixed(2) + ' Cr';
  if (value >= 1e5) return '₹' + (value / 1e5).toFixed(2) + ' L';
  return '₹' + Math.round(value).toLocaleString('en-IN');
}

export default function NewGoalPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', targetAmount: '', targetDate: '', priority: 'Important',
    category: 'Custom', inflationRate: '6', expectedReturn: '12'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(key, value) { setForm(f => ({ ...f, [key]: value })); }

  const monthlyNeedPreview = form.targetAmount && form.targetDate
    ? calculateMonthlyNeed(Number(form.targetAmount), 0, form.targetDate, Number(form.expectedReturn))
    : 0;

  async function handleSubmit(e) {
    e?.preventDefault();
    if (!form.name.trim()) { setError('Goal name is required'); return; }
    if (!form.targetAmount || Number(form.targetAmount) <= 0) { setError('Target amount must be greater than 0'); return; }
    if (!form.targetDate) { setError('Target date is required'); return; }
    setLoading(true); setError('');
    try {
      const monthlyNeed = calculateMonthlyNeed(Number(form.targetAmount), 0, form.targetDate, Number(form.expectedReturn));
      await api.post('/api/goals', {
        ...form,
        targetAmount: Number(form.targetAmount),
        inflationRate: Number(form.inflationRate),
        expectedReturn: Number(form.expectedReturn),
        monthlyNeed,
      });
      navigate('/dashboard/goals');
    } catch {
      setError('Failed to save. Make sure the backend is running.');
      setLoading(false);
    }
  }

  return (
    <section className="ww-space-y-6">
      <PageHero eyebrow="New Goal" title="Create a financial goal"
        description="Set a target, timeline, and expected return — WealthWise calculates your monthly need." />
      {error && <div className="ww-alert ww-alert--error">{error}</div>}
      <SurfacePanel>
        <form onSubmit={handleSubmit} className="ww-space-y-4" style={{ maxWidth: '36rem' }}>
          <Field label="Goal Name *" value={form.name} onChange={(v) => update('name', v)} placeholder="e.g. Retirement corpus" />
          <Field label="Target Amount (₹) *" type="number" value={form.targetAmount} onChange={(v) => update('targetAmount', v)} placeholder="5000000" />
          <Field label="Target Date *" type="date" value={form.targetDate} onChange={(v) => update('targetDate', v)} />
          <Select label="Priority" value={form.priority} onChange={(v) => update('priority', v)} options={['Essential','Important','Aspirational']} />
          <Select label="Category" value={form.category} onChange={(v) => update('category', v)} options={['Retirement','Education','Home','Car','Travel','Emergency','Custom']} />
          <Field label="Inflation Rate (%)" type="number" value={form.inflationRate} onChange={(v) => update('inflationRate', v)} placeholder="6" />
          <Field label="Expected Return (%)" type="number" value={form.expectedReturn} onChange={(v) => update('expectedReturn', v)} placeholder="12" />
          {monthlyNeedPreview > 0 && (
            <div style={{ padding: '1rem', borderRadius: '16px', background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.14)' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--ww-accent-muted)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Estimated monthly SIP needed</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginTop: '0.25rem' }}>{formatCompactCurrency(monthlyNeedPreview)}</p>
            </div>
          )}
          <button type="submit" disabled={loading} className="ww-btn-primary ww-btn-primary--lg">
            {loading ? 'Saving...' : 'Create goal'}
          </button>
        </form>
      </SurfacePanel>
    </section>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: 'rgba(255,255,255,0.72)' }}>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="ww-input" />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: 'rgba(255,255,255,0.72)' }}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="ww-input" style={{ color: '#fff' }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
