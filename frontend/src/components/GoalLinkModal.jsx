import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Link, CheckCircle, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { formatINR } from '../lib/goalHelpers';

export default function GoalLinkModal({ goal, onClose, onLinked }) {
  const [holdings,  setHoldings]  = useState([]);
  const [links,     setLinks]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(null); // schemeCode being saved
  const [allocs,    setAllocs]    = useState({});   // { schemeCode: pct string }

  useEffect(() => { fetchData(); }, [goal.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [h, l] = await Promise.all([
        api.get('/api/holdings'),
        api.get(`/api/goals/${goal.id}/links`),
      ]);
      setHoldings(h || []);
      setLinks(l || []);
      // Pre-fill allocation inputs from existing links
      const prefill = {};
      (l || []).forEach(lk => { prefill[lk.schemeCode] = String(lk.allocationPct ?? 100); });
      setAllocs(prefill);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const isLinked = (schemeCode) => links.some(l => l.schemeCode === schemeCode);

  const linkFund = async (holding) => {
    const pct = parseFloat(allocs[holding.schemeCode]) || 100;
    setSaving(holding.schemeCode);
    try {
      await api.post(`/api/goals/${goal.id}/link-fund`, {
        schemeCode:    holding.schemeCode,
        fundName:      holding.fundName,
        allocationPct: pct,
      });
      await fetchData();
      onLinked?.();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(null);
    }
  };

  const unlinkFund = async (schemeCode) => {
    setSaving(schemeCode + '_del');
    try {
      await api.delete(`/api/goals/${goal.id}/links/${schemeCode}`);
      await fetchData();
      onLinked?.();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(null);
    }
  };

  const goalLabel = goal.name || goal.goalType || 'Goal';
  const linkedValue = links.reduce((sum, lk) => {
    const h = holdings.find(h => h.schemeCode === lk.schemeCode);
    if (!h) return sum;
    return sum + (parseFloat(h.currentValue) * (parseFloat(lk.allocationPct) / 100));
  }, 0);

  return (
    <AnimatePresence>
      <motion.div className="gw-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
        <motion.div className="gw-modal"
          style={{ maxWidth: 580 }}
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', damping: 25 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="gw-header">
            <div>
              <h2 className="gw-title">Link Investments</h2>
              <span className="gw-step-label">{goalLabel}</span>
            </div>
            <button className="gw-close" onClick={onClose}><X size={18} /></button>
          </div>

          {/* Linked corpus summary */}
          {links.length > 0 && (
            <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--ww-border-subtle)' }}>
              <div className="gam-sim-meta">
                <span>🔗 {links.length} fund{links.length > 1 ? 's' : ''} linked</span>
                <span>Current corpus from links: <strong style={{ color: 'var(--ww-accent)' }}>{formatINR(linkedValue)}</strong></span>
              </div>
            </div>
          )}

          {/* Body */}
          <div className="gw-body">
            {loading ? (
              <div className="gw-loading">
                <div className="gw-spinner" />
                <p className="gam-hint">Loading your holdings…</p>
              </div>
            ) : holdings.length === 0 ? (
              <div className="gam-pre-run">
                <p>No investments found. Add transactions in the <strong>Investments</strong> page first.</p>
              </div>
            ) : (
              <>
                <p className="gam-hint" style={{ marginBottom: 4 }}>
                  Select which of your fund holdings contribute towards this goal,
                  and set what % of the holding should count.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {holdings.map(h => {
                    const linked  = isLinked(h.schemeCode);
                    const isSaving = saving === h.schemeCode;
                    const pct = allocs[h.schemeCode] ?? '100';
                    const contribution = parseFloat(h.currentValue) * (parseFloat(pct) / 100);

                    return (
                      <motion.div
                        key={h.schemeCode}
                        className="glm-holding-row"
                        style={{ borderColor: linked ? 'rgba(52,211,153,.25)' : 'var(--ww-border)' }}
                        layout
                      >
                        {/* Fund info */}
                        <div className="glm-fund-info">
                          <div className="glm-fund-name">{h.fundName || h.schemeCode}</div>
                          <div className="glm-fund-meta">
                            {h.category && <span className="glm-chip">{h.category}</span>}
                            <span>Value: <strong>{formatINR(h.currentValue)}</strong></span>
                            {h.gainLossPct != null && (
                              <span style={{ color: h.gainLossPct >= 0 ? 'var(--ww-positive)' : 'var(--ww-negative)' }}>
                                {h.gainLossPct >= 0 ? '+' : ''}{h.gainLossPct?.toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Allocation + Link/Update/Unlink buttons */}
                        <div className="glm-actions">
                          <div className="glm-alloc-wrap">
                            <input
                              type="text" inputMode="numeric"
                              className="glm-alloc-input"
                              value={pct}
                              onChange={e => setAllocs(a => ({ ...a, [h.schemeCode]: e.target.value.replace(/[^0-9.]/g, '') }))}
                            />
                            <span className="glm-pct-label">%</span>
                          </div>
                          <div className="glm-contribution">≈ {formatINR(contribution)}</div>

                          {/* Link / Update button */}
                          <motion.button
                            className={`glm-link-btn ${linked ? 'linked' : ''}`}
                            onClick={() => linkFund(h)}
                            disabled={isSaving}
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                          >
                            {saving === h.schemeCode ? (
                              <div className="gw-spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                            ) : linked ? (
                              <><CheckCircle size={13} /> Update</>
                            ) : (
                              <><Link size={13} /> Link</>
                            )}
                          </motion.button>

                          {/* Unlink (delete) button — only shown when already linked */}
                          {linked && (
                            <motion.button
                              className="glm-unlink-btn"
                              onClick={() => unlinkFund(h.schemeCode)}
                              disabled={!!saving}
                              whileHover={{ scale: 1.06 }}
                              whileTap={{ scale: 0.94 }}
                              title="Unlink this fund from goal"
                            >
                              {saving === h.schemeCode + '_del' ? (
                                <div className="gw-spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                              ) : (
                                <Trash2 size={13} />
                              )}
                            </motion.button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="gw-footer" style={{ justifyContent: 'flex-end' }}>
            <button className="gw-btn-back" onClick={onClose}>Done</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
