import { demoState } from './demo';
import type { State } from './types';

/** Upgrades saved data from older versions (the web prototype used v3 → v6) or falls back to the demo. */
export function migrate(raw: any): State {
  if (!raw || typeof raw !== 'object') return demoState();
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
  return st.v === 6 ? (st as State) : demoState();
}
