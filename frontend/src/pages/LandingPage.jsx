import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const trustMetrics = [
  { label: 'Tracked AUM', value: 'Rs 128Cr+' },
  { label: 'Investor goals mapped', value: '42K' },
  { label: 'Average monthly SIP', value: 'Rs 18,400' },
  { label: 'Alert response time', value: '< 5 min' },
];

const platformFeatures = [
  {
    title: 'See your whole money system',
    description: 'Bring portfolio value, active SIPs, upcoming alerts, and goal progress into one clear operating view.',
    points: ['Live dashboard summaries', 'Goal-linked investments', 'Transaction and tax visibility'],
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <path d="M14 17.5h7M17.5 14v7" />
      </svg>
    ),
    accent: 'rgba(52,211,153,0.14)',
    color: '#34d399',
  },
  {
    title: 'Move from guesswork to planning',
    description: 'Model monthly contributions, inflation, return expectations, and timeline tradeoffs before you commit capital.',
    points: ['Inflation-aware goal planning', 'SIP simulations', 'Scenario-based contribution planning'],
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 17 L8 11 L13 14 L19 6" />
        <circle cx="19" cy="6" r="2" fill="currentColor" stroke="none" opacity="0.7" />
        <path d="M3 20h18" />
      </svg>
    ),
    accent: 'rgba(96,165,250,0.18)',
    color: '#60a5fa',
  },
  {
    title: 'Act while the market is moving',
    description: 'Use market snapshots, fund search, and alert workflows to stay on top of opportunities instead of reacting late.',
    points: ['Fund master sync', 'Market pulse cards', 'Unread alert workflows'],
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    accent: 'rgba(167,139,250,0.18)',
    color: '#a78bfa',
  },
];

const workflowSteps = [
  { step: '01', title: 'Connect your investing routine', text: 'Create investments, import CSV history, and map every plan to a real-life goal.' },
  { step: '02', title: 'Track progress automatically', text: 'Watch growth, monthly needs, and milestone alerts update from one dashboard shell.' },
  { step: '03', title: 'Decide with confidence', text: 'Review analytics, compare snapshots, and export reports when it is time to act.' },
];

const stickyPanels = [
  { eyebrow: 'Overview', title: 'A dashboard that never loses the thread.', body: 'Portfolio value, SIP rhythm, goal readiness, and alerts all stay visually connected while you scroll through the product story.', metric: '18.42L tracked' },
  { eyebrow: 'Planning', title: 'Goals turn into measurable monthly decisions.', body: 'Inflation-aware planning and contribution targets help you see how each investment plan pushes a real outcome forward.', metric: '81% retirement readiness' },
  { eyebrow: 'Action', title: 'Alerts and analytics stay ready when timing matters.', body: 'Unread prompts, market pulse changes, and tax signals show up in one focused decision surface instead of scattered screens.', metric: '03 urgent prompts' },
];

const showcaseCards = [
  { badge: 'Goal heatmap', title: 'College fund is 62% funded', subtitle: 'Monthly gap down by Rs 4,200 after your latest SIP increase.' },
  { badge: 'Market pulse', title: 'NIFTY closed higher today', subtitle: 'Your diversified plans stayed ahead of inflation assumptions.' },
  { badge: 'Tax watch', title: 'Capital gains split is ready', subtitle: 'FIFO lots and summary exports are prepared before filing season.' },
];

const reveal = {
  hidden: { opacity: 0, y: 48, scale: 0.985 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
};

export default function LandingPage() {
  return (
    <main className="ww-home" style={{ background: 'var(--ww-bg)', color: '#fff' }}>
      {/* ─── HERO ─── */}
      <section style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid var(--ww-border)' }}>
        <div className="ww-aurora" aria-hidden="true" />
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', minHeight: '100vh', padding: '1.5rem 1.25rem 4rem' }}>
          {/* Header */}
          <header style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '9999px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', padding: '0.75rem 1.25rem', backdropFilter: 'blur(22px)' }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <img src="/logo.svg" alt="WealthWise Logo" style={{ width: 40, height: 40, objectFit: 'contain', filter: 'drop-shadow(0 0 8px #22c55e)', transition: 'transform 300ms' }} />
              <div style={{ lineHeight: 1.2 }}>
                <h1 style={{ color: '#fff', fontWeight: 600, fontSize: '1.125rem' }}>Wealth<span style={{ color: '#4ade80' }}>Wise</span></h1>
                <p style={{ color: 'rgba(255,255,255,0.48)', fontSize: '0.75rem' }}>Smart mutual fund cockpit</p>
              </div>
            </Link>
            <nav style={{ display: 'none', alignItems: 'center', gap: '2rem', fontSize: '0.875rem', color: 'rgba(255,255,255,0.70)' }} className="ww-desktop-nav">
              <a href="#platform" style={{ transition: 'color 200ms' }}>Platform</a>
              <a href="#workflow" style={{ transition: 'color 200ms' }}>How it works</a>
              <a href="#analytics" style={{ transition: 'color 200ms' }}>Analytics</a>
              <a href="#faq" style={{ transition: 'color 200ms' }}>FAQ</a>
            </nav>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Link to="/login" className="ww-btn-ghost" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>Sign in</Link>
              <Link to="/signup" className="ww-btn-primary" style={{ padding: '0.5rem 1.25rem' }}>Start free</Link>
            </div>
          </header>

          {/* Hero Content */}
          <div style={{ position: 'relative', zIndex: 10, display: 'grid', flex: 1, alignItems: 'center', gap: '3.5rem', padding: '4rem 0' }} className="ww-hero-grid">
            <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={reveal} style={{ maxWidth: '48rem' }}>
              <p className="ww-badge ww-badge--wide">Personal finance cockpit</p>
              <h1 className="ww-heading-xl" style={{ marginTop: '2rem', maxWidth: '64rem' }}>Investing that feels clear, fast, and completely in your control.</h1>
              <p className="ww-body" style={{ marginTop: '2rem', maxWidth: '40rem' }}>WealthWise helps you build mutual fund plans, connect them to real goals, track progress live, and act from one elegant dashboard.</p>
              <div style={{ marginTop: '2.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                <Link to="/signup" className="ww-btn-primary ww-btn-primary--lg">Get started</Link>
                <Link to="/login" className="ww-btn-ghost ww-btn-ghost--lg">View dashboard access</Link>
              </div>
              <div className="ww-grid-3 ww-gap-4" style={{ marginTop: '3rem' }}>
                <MetricCard value="Rs 12.8L" label="Live portfolio view" />
                <MetricCard value="8 goals" label="Mapped to actual plans" />
                <MetricCard value="+14.2%" label="Illustrative annual growth" />
              </div>
            </motion.section>

            <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={reveal} style={{ position: 'relative' }}>
              <div className="ww-grid-bg" aria-hidden="true" />
              <div className="ww-hero-grid" style={{ borderRadius: '36px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(6,27,20,0.55)', padding: '1.5rem', backdropFilter: 'blur(22px)', gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,0.9fr)' }}>
                <div className="ww-hero-stack">
                  <div className="ww-hero-card ww-float-two">
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                      <div>
                        <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.32em', color: 'var(--ww-text-faint)' }}>SIP velocity</p>
                        <h2 style={{ marginTop: '0.75rem', fontSize: '1.5rem', fontWeight: 600 }}>Rs 23,500 / month</h2>
                      </div>
                      <div style={{ borderRadius: '9999px', background: 'rgba(52,211,153,0.14)', padding: '0.25rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--ww-accent-muted)' }}>+12.6%</div>
                    </div>
                    <AnimatedBars />
                  </div>
                  <div className="ww-hero-card">
                    <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.32em', color: 'var(--ww-text-faint)' }}>Today</p>
                    <div className="ww-space-y-4" style={{ marginTop: '1rem' }}>
                      <PulseItem title="Top up suggested" value="Large cap SIP due tomorrow" />
                      <PulseItem title="Goal milestone" value="Education fund crossed 60%" />
                      <PulseItem title="Market snapshot" value="NIFTY closed +0.84%" />
                    </div>
                  </div>
                </div>
                <div className="ww-hero-phone ww-float-one">
                  <div className="ww-phone-top">
                    <span className="ww-phone-dot" />
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.35em', color: 'var(--ww-text-faint)' }}>Goal sync</span>
                  </div>
                  <div style={{ marginTop: '1.5rem' }}>
                    <p style={{ fontSize: '0.875rem', color: 'var(--ww-text-muted)' }}>Total portfolio</p>
                    <p style={{ marginTop: '0.5rem', fontSize: '3rem', fontWeight: 600, letterSpacing: '-0.05em' }}>Rs 18.42L</p>
                    <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--ww-accent)' }}>+Rs 1.92L this year</p>
                  </div>
                  <AnimatedLineChart />
                  <div className="ww-space-y-3" style={{ marginTop: '2rem' }}>
                    <InsightRow title="Retirement 2045" value="81% on track" accent="var(--ww-accent)" />
                    <InsightRow title="Home down payment" value="Needs Rs 9,000/mo" accent="#22d3ee" />
                    <InsightRow title="Tax summary" value="Updated today" accent="#d946ef" />
                  </div>
                </div>
              </div>
            </motion.section>
          </div>
        </div>
      </section>

      {/* ─── TICKER ─── */}
      <div className="ww-ticker-wrap">
        <div className="ww-ticker">
          {[...trustMetrics, ...trustMetrics].map((item, index) => (
            <div key={`${item.label}-${index}`} className="ww-ticker-item">
              <span style={{ color: 'rgba(255,255,255,0.42)' }}>{item.label}</span>
              <strong style={{ marginLeft: '0.75rem', fontSize: '1.25rem', fontWeight: 600, color: '#fff' }}>{item.value}</strong>
            </div>
          ))}
        </div>
      </div>

      {/* ─── PLATFORM ─── */}
      <section id="platform" style={{ maxWidth: '1400px', margin: '0 auto', padding: '6rem 1.25rem' }}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={reveal} style={{ maxWidth: '40rem' }}>
          <p className="ww-eyebrow">Platform</p>
          <h2 className="ww-heading-lg" style={{ marginTop: '1.25rem' }}>One investing surface for planning, execution, and review.</h2>
        </motion.div>
        <div className="ww-grid-3 ww-gap-6" style={{ marginTop: '3.5rem' }}>
          {platformFeatures.map((feature, index) => (
            <motion.article key={feature.title} className="ww-feature-panel" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={reveal} transition={{ delay: index * 0.12 }}>
              <div style={{
                height: '3.5rem', width: '3.5rem', borderRadius: '1rem',
                border: `1px solid ${feature.color}40`,
                background: feature.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: feature.color,
                boxShadow: `0 0 18px ${feature.color}30`,
              }}>
                {feature.icon}
              </div>
              <h3 style={{ marginTop: '2rem', fontSize: '1.5rem', fontWeight: 600, color: '#fff' }}>{feature.title}</h3>
              <p className="ww-body-sm" style={{ marginTop: '1rem' }}>{feature.description}</p>
              <div className="ww-space-y-3" style={{ marginTop: '2rem' }}>
                {feature.points.map((point) => (
                  <div key={point} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', color: 'rgba(255,255,255,0.78)' }}>
                    <span style={{ height: 10, width: 10, borderRadius: '50%', background: 'var(--ww-accent)' }} />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      {/* ─── WORKFLOW ─── */}
      <section id="workflow" style={{ borderTop: '1px solid var(--ww-border)', borderBottom: '1px solid var(--ww-border)', background: '#071e17' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '6rem 1.25rem' }}>
          <div style={{ display: 'grid', gap: '3rem' }} className="ww-workflow-grid">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={reveal}>
              <p className="ww-eyebrow">How it works</p>
              <h2 className="ww-heading-lg" style={{ marginTop: '1.25rem' }}>Built to move from intention to action without friction.</h2>
              <p className="ww-body" style={{ marginTop: '1.5rem', maxWidth: '36rem' }}>Whether you are organizing your first SIP or coordinating multiple long-term goals, WealthWise keeps the next move obvious.</p>
            </motion.div>
            <div className="ww-space-y-5">
              {workflowSteps.map((item, index) => (
                <motion.div key={item.step} className="ww-timeline-card" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={reveal} transition={{ delay: index * 0.12 }}>
                  <div className="ww-timeline-step">{item.step}</div>
                  <div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#fff' }}>{item.title}</h3>
                    <p className="ww-body-sm" style={{ marginTop: '0.75rem' }}>{item.text}</p>
                  </div>
                </motion.div>
              ))}
              <div className="ww-space-y-5" style={{ paddingTop: '1.5rem' }}>
                {stickyPanels.map((panel, index) => (
                  <motion.article key={panel.title} className="ww-feature-panel" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={reveal} transition={{ delay: index * 0.12 }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.32em', color: 'var(--ww-accent-soft)' }}>{panel.eyebrow}</p>
                    <h3 style={{ marginTop: '1rem', fontSize: '1.875rem', fontWeight: 600, color: '#fff' }}>{panel.title}</h3>
                    <p className="ww-body-sm" style={{ marginTop: '1rem', maxWidth: '40rem' }}>{panel.body}</p>
                    <div style={{ marginTop: '1.5rem', display: 'inline-flex', borderRadius: '9999px', border: '1px solid rgba(52,211,153,0.18)', background: 'rgba(52,211,153,0.08)', padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--ww-accent-muted)' }}>{panel.metric}</div>
                  </motion.article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── ANALYTICS ─── */}
      <section id="analytics" style={{ maxWidth: '1400px', margin: '0 auto', padding: '6rem 1.25rem' }}>
        <div style={{ display: 'grid', gap: '2.5rem', alignItems: 'center' }} className="ww-analytics-grid">
          <motion.div className="ww-analytics-frame" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={reveal}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <p style={{ fontSize: '0.875rem', color: 'var(--ww-text-faint)' }}>Analytics canvas</p>
                <h3 style={{ marginTop: '0.5rem', fontSize: '1.875rem', fontWeight: 600, color: '#fff' }}>Measure what matters</h3>
              </div>
              <div style={{ borderRadius: '9999px', border: '1px solid var(--ww-border)', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', fontSize: '0.875rem', color: 'rgba(255,255,255,0.72)' }}>Updated live</div>
            </div>
            <div style={{ marginTop: '2rem', display: 'grid', gap: '1rem' }} className="ww-analytics-inner-grid">
              <div style={{ borderRadius: '28px', border: '1px solid var(--ww-border-subtle)', background: '#081611', padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: '0.875rem', color: 'var(--ww-text-faint)' }}>Growth projection</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--ww-accent)' }}>+18.4%</p>
                </div>
                <AnimatedAreaChart />
              </div>
              <div className="ww-space-y-4">
                {showcaseCards.map((card, index) => (
                  <motion.div key={card.title} style={{ borderRadius: '24px', border: '1px solid var(--ww-border-subtle)', background: 'rgba(255,255,255,0.05)', padding: '1.25rem' }} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={reveal} transition={{ delay: index * 0.12 }}>
                    <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.24em', color: 'var(--ww-text-faint)' }}>{card.badge}</p>
                    <h4 style={{ marginTop: '0.75rem', fontSize: '1.25rem', fontWeight: 600, color: '#fff' }}>{card.title}</h4>
                    <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', lineHeight: '1.5', color: 'rgba(255,255,255,0.62)' }}>{card.subtitle}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={reveal}>
            <p className="ww-eyebrow">Analytics</p>
            <h2 className="ww-heading-lg" style={{ marginTop: '1.25rem' }}>Turn scattered numbers into one confident decision surface.</h2>
            <p className="ww-body" style={{ marginTop: '1.5rem', maxWidth: '36rem' }}>Review fund behavior, goal readiness, alert backlog, and tax posture inside one system designed to feel calm under pressure.</p>
            <div className="ww-grid-2 ww-gap-4" style={{ marginTop: '2rem' }}>
              <StatPanel label="Active SIP plans" value="24" />
              <StatPanel label="Goal completion rate" value="78%" />
              <StatPanel label="Unread action alerts" value="03" />
              <StatPanel label="Export-ready reports" value="12" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section style={{ borderTop: '1px solid var(--ww-border)', borderBottom: '1px solid var(--ww-border)', background: 'radial-gradient(circle at top, rgba(52,211,153,0.06), transparent 45%), #081711' }}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={reveal} style={{ maxWidth: '52rem', margin: '0 auto', padding: '6rem 1.25rem', textAlign: 'center' }}>
          <p className="ww-eyebrow">Ready to begin</p>
          <h2 className="ww-heading-lg" style={{ marginTop: '1.25rem' }}>Build your WealthWise workspace and make your next move with context.</h2>
          <p className="ww-body" style={{ marginTop: '1.5rem', maxWidth: '40rem', margin: '1.5rem auto 0' }}>Sign in to your dashboard, start a new plan, import history, and let your goals drive the rest of the workflow.</p>
          <div style={{ marginTop: '2.5rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
            <Link to="/signup" className="ww-btn-primary ww-btn-primary--lg">Create your account</Link>
            <a href="#faq" className="ww-btn-ghost ww-btn-ghost--lg">Read FAQs</a>
          </div>
        </motion.div>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" style={{ maxWidth: '1200px', margin: '0 auto', padding: '6rem 1.25rem' }}>
        <div className="ww-grid-2 ww-gap-6">
          <FaqCard question="What does WealthWise help me do?" answer="It combines portfolio tracking, goal planning, market snapshots, alerts, reports, and tax visibility in one connected workflow." />
          <FaqCard question="Can I use it for mutual fund planning?" answer="Yes. The current product flow is built around investment plans, SIP tracking, goal mapping, fund lookup, and performance-oriented review." />
          <FaqCard question="Does it support action-oriented alerts?" answer="Yes. The dashboard includes alert generation for goals, investment activity, and unread status tracking inside the shell." />
          <FaqCard question="How do I get started?" answer="Create an account, add your first investment plan or import transactions, then connect those plans to your financial goals." />
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ borderTop: '1px solid var(--ww-border)', background: '#06120e' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem', padding: '2.5rem 1.25rem', fontSize: '0.875rem', color: 'var(--ww-text-muted)' }}>
          <div>
            <p style={{ fontSize: '1rem', fontWeight: 600, color: '#fff' }}>WealthWise</p>
            <p style={{ marginTop: '0.5rem', maxWidth: '28rem' }}>A modern investing workspace for mutual fund planning, analytics, alerts, and long-term goal execution.</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', color: 'rgba(255,255,255,0.70)' }}>
            <Link to="/login" style={{ transition: 'color 200ms' }}>Login</Link>
            <Link to="/signup" style={{ transition: 'color 200ms' }}>Signup</Link>
            <Link to="/dashboard" style={{ transition: 'color 200ms' }}>Dashboard</Link>
          </div>
        </div>
      </footer>

      {/* Desktop nav visibility (CSS-in-JS workaround) */}
      <style>{`.ww-desktop-nav { display: none !important; } @media (min-width: 768px) { .ww-desktop-nav { display: flex !important; } } .ww-workflow-grid { grid-template-columns: 1fr; } @media (min-width: 1280px) { .ww-workflow-grid { grid-template-columns: 0.85fr 1.15fr; } } .ww-analytics-grid { grid-template-columns: 1fr; } @media (min-width: 1024px) { .ww-analytics-grid { grid-template-columns: 0.95fr 1.05fr; } } .ww-analytics-inner-grid { grid-template-columns: 1fr; } @media (min-width: 768px) { .ww-analytics-inner-grid { grid-template-columns: 1.2fr 0.8fr; } }`}</style>
    </main>
  );
}

/* ─── SUB-COMPONENTS ─── */
function AnimatedLineChart() {
  return (
    <div className="ww-hero-chart" style={{ marginTop: '2rem' }}>
      <svg viewBox="0 0 420 170" style={{ height: '100%', width: '100%' }} fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="heroLine" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(52,211,153,0.95)" /><stop offset="100%" stopColor="rgba(52,211,153,0.15)" /></linearGradient>
          <linearGradient id="heroArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(52,211,153,0.22)" /><stop offset="100%" stopColor="rgba(52,211,153,0)" /></linearGradient>
        </defs>
        <path d="M10 150 C55 142 72 138 105 110 C132 88 160 94 190 76 C218 58 252 24 284 40 C314 56 336 28 410 14" stroke="url(#heroLine)" strokeWidth="5" strokeLinecap="round" className="ww-svg-path" />
        <path d="M10 150 C55 142 72 138 105 110 C132 88 160 94 190 76 C218 58 252 24 284 40 C314 56 336 28 410 14 L410 170 L10 170 Z" fill="url(#heroArea)" className="ww-svg-area" />
        <circle cx="284" cy="40" r="6" fill="#d7ff96" className="ww-chart-dot" />
        <circle cx="410" cy="14" r="5" fill="#d7ff96" className="ww-chart-dot ww-chart-dot--late" />
      </svg>
    </div>
  );
}

function AnimatedBars() {
  return (
    <div style={{ marginTop: '1.5rem', borderRadius: '28px', background: 'linear-gradient(180deg, rgba(52,211,153,0.10), rgba(52,211,153,0.01))', padding: '0.75rem' }}>
      <svg viewBox="0 0 300 96" style={{ height: '6rem', width: '100%' }} fill="none" aria-hidden="true">
        <defs><linearGradient id="barGlow" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d7ff96" /><stop offset="100%" stopColor="#54d8a1" /></linearGradient></defs>
        {[36, 58, 48, 74, 64, 88].map((height, index) => { const x = 14 + index * 46; const y = 94 - height; return <rect key={x} x={x} y={y} width="28" height={height} rx="14" className="ww-svg-bar" style={{ animationDelay: `${index * 0.14}s` }} />; })}
      </svg>
    </div>
  );
}

function AnimatedAreaChart() {
  return (
    <div style={{ marginTop: '1.5rem', overflow: 'hidden', borderRadius: '26px', border: '1px solid rgba(255,255,255,0.06)', background: 'radial-gradient(circle at top, rgba(52,211,153,0.06), transparent 45%), #091712', padding: '1rem' }}>
      <svg viewBox="0 0 520 240" style={{ height: 220, width: '100%' }} fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="analyticsArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(52,211,153,0.20)" /><stop offset="100%" stopColor="rgba(52,211,153,0)" /></linearGradient>
          <linearGradient id="analyticsLine" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#7dfab4" /><stop offset="100%" stopColor="#d7ff96" /></linearGradient>
        </defs>
        <g className="ww-svg-grid">{[30,78,126,174,222].map(y => <line key={y} x1="0" y1={y} x2="520" y2={y} />)}{[40,120,200,280,360,440].map(x => <line key={x} x1={x} y1="0" x2={x} y2="240" />)}</g>
        <path d="M0 190 C60 174 92 182 130 150 C174 116 208 118 248 96 C294 70 326 90 368 62 C410 34 448 46 520 16 L520 240 L0 240 Z" fill="url(#analyticsArea)" className="ww-svg-area" />
        <path d="M0 190 C60 174 92 182 130 150 C174 116 208 118 248 96 C294 70 326 90 368 62 C410 34 448 46 520 16" stroke="url(#analyticsLine)" strokeWidth="6" strokeLinecap="round" className="ww-svg-path" />
      </svg>
    </div>
  );
}

function MetricCard({ value, label }) {
  return (
    <div className="ww-metric">
      <p style={{ fontSize: '1.875rem', fontWeight: 600, letterSpacing: '-0.04em', color: '#fff' }}>{value}</p>
      <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'rgba(255,255,255,0.56)' }}>{label}</p>
    </div>
  );
}

function InsightRow({ title, value, accent }) {
  return (
    <div className="ww-insight-row">
      <div className="ww-insight-row__left">
        <span className="ww-insight-dot" style={{ background: accent }} />
        <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.72)' }}>{title}</span>
      </div>
      <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#fff' }}>{value}</span>
    </div>
  );
}

function PulseItem({ title, value }) {
  return (
    <div className="ww-pulse-item">
      <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#fff' }}>{title}</p>
      <p style={{ marginTop: '0.25rem', fontSize: '0.875rem', color: 'rgba(255,255,255,0.52)' }}>{value}</p>
    </div>
  );
}

function StatPanel({ label, value }) {
  return (
    <div style={{ borderRadius: '24px', border: '1px solid var(--ww-border)', background: 'rgba(255,255,255,0.05)', padding: '1.25rem' }}>
      <p style={{ fontSize: '0.875rem', color: 'var(--ww-text-faint)' }}>{label}</p>
      <p style={{ marginTop: '0.75rem', fontSize: '1.875rem', fontWeight: 600, letterSpacing: '-0.04em', color: '#fff' }}>{value}</p>
    </div>
  );
}

function FaqCard({ question, answer }) {
  return (
    <motion.article className="ww-faq-card" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={reveal}>
      <h3 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#fff' }}>{question}</h3>
      <p className="ww-body-sm" style={{ marginTop: '1rem' }}>{answer}</p>
    </motion.article>
  );
}
