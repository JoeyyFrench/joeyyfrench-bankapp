import { demoState } from './demo';
import type { State } from './types';

export class UnknownSaveError extends Error {}

/**
 * Upgrades saved data from older versions (the web prototype used v3 → v6).
 * Nothing saved → demo data. A save this version cannot read → throws, so the caller keeps it instead of overwriting it.
 */
export function migrate(raw: any): State {
  if (raw == null) return demoState();
  if (typeof raw !== 'object' || typeof raw.v !== 'number' || raw.v < 3 || raw.v > 7) throw new UnknownSaveError('Unknown save format');
  const st = raw;
  if (st.v === 3) {
    st.goals = (st.goals || []).map((g: object) => ({ mode: 'month', ...g }));
    st.v = 4;
  }
  if (st.v === 4) {
    const s = st.settings;
    s.otherIncome = s.otherIncome || 0;
    s.lifeBudget = s.lifeBudget || 600;
    s.marginShare = s.marginShare ?? 60;
    s.debtShare = s.debtShare ?? 70;
    delete s.savings;
    st.debts = st.debts || [];
    st.pockets.debts = st.pockets.debts || 0;
    st.v = 5;
  }
  if (st.v === 5) {
    st.settings.autoSubs = st.settings.autoSubs ?? true;
    st.ignoredRecurring = st.ignoredRecurring || [];
    st.notices = st.notices || [];
    st.v = 6;
  }
  if (st.v === 6) {
    // Money moved by the app between pockets was not flagged before v7
    st.tx = (st.tx || []).map((t: { src: string; label: string }) =>
      t.src === 'auto' && !/^(Mensualité|Remboursement)/.test(t.label) ? { ...t, transfer: true } : t,
    );
    st.history = st.history || [];
    st.v = 7;
  }
  // Fill anything an older or partial save may lack
  for (const k of ['charges', 'bills', 'goals', 'wishes', 'debts', 'tx', 'allocations', 'withdrawals', 'ignoredRecurring', 'notices', 'history'])
    st[k] = Array.isArray(st[k]) ? st[k] : [];
  st.clock = st.clock ?? null;
  st.balance = Number.isFinite(st.balance) ? st.balance : 0;
  st.lastSync = st.lastSync || new Date().toISOString();
  st.pockets = { bills: 0, cushion: 0, savings: 0, debts: 0, ...(st.pockets || {}) };
  const d = demoState().settings;
  st.settings = { ...d, envelopes: {}, ...(st.settings || {}) };
  st.demo = !!st.demo;
  return st as State;
}
