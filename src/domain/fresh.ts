import { r2, realToday, ymd } from './format';
import { demoState } from './demo';
import { previousPaydayOf } from './engine';
import type { State } from './types';

export interface StartParams {
  name: string;
  /** Current account balance today, salary of this month already included if it was received */
  balance: number;
  salary: number;
  payDay: number;
  lifeBudget: number;
}

/** Empty state for real use: no example data, no simulated clock, today's balance as the starting point. */
export function freshState(p: StartParams): State {
  const d = demoState().settings;
  const t = realToday();
  return {
    v: 7,
    demo: false,
    clock: null,
    settings: {
      ...d,
      name: p.name.trim(),
      salary: r2(p.salary),
      payDay: p.payDay,
      lifeBudget: r2(p.lifeBudget),
      otherIncome: 0,
      // Without a bank connection there is nothing to detect: charges are entered by hand and paid automatically
      autoSubs: false,
      envelopes: {},
    },
    balance: r2(p.balance),
    pockets: { bills: 0, cushion: 0, savings: 0, debts: 0 },
    lastSync: new Date().toISOString(),
    charges: [],
    bills: [],
    goals: [],
    wishes: [],
    debts: [],
    tx: [],
    allocations: [],
    withdrawals: [],
    ignoredRecurring: [],
    notices: [],
    history: [],
    settledTo: ymd(t),
    lastPayday: ymd(previousPaydayOf(t, p.payDay)),
  };
}
