/**
 * Audit of the money engine. Tests named "fixed:" reproduce calculation errors found during the audit
 * and now guard against regressions; the others pin edge cases. States are built from scratch with a
 * fixed `clock`; `npm test` runs with TZ=Europe/Paris to cover the March and October DST changes.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  compute, simulatePayday, previewPayday, toggleBill, goalPerPay, needFor, nextPayday, nextOcc, occIn,
  countPaydays, paydaysUntil, today, total,
} from './engine';
import { detectRecurring, runDetection } from './detection';
import { migrate } from './migrate';
import { parseAmount, parseYmd, r2, ymd } from './format';
import type { Charge, Goal, State, Tx } from './types';

function base(over: Partial<State> = {}): State {
  return {
    v: 7,
    demo: false,
    clock: '2026-01-10',
    settings: {
      payDay: 28, salary: 2000, otherIncome: 0, lifeBudget: 550, marginShare: 60, debtShare: 70, cushion: 0, wishMin: 80, autoSubs: true,
    },
    balance: 1000,
    pockets: { bills: 0, cushion: 0, savings: 0, debts: 0 },
    lastSync: '',
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
    ...over,
  } as unknown as State;
}
const month = (label: string, amount: number, day: number): Charge => ({ id: label, label, amount, day, freq: 'month' });
const year = (label: string, amount: number, m: number, day: number, saved = 0): Charge =>
  ({ id: label, label, amount, day, month: m, freq: 'year', saved });
const bank = (label: string, amount: number, date: string): Tx => ({ id: `${label}${date}`, label, amount, date, src: 'bunq', pocket: 'courant' });
const d = (s: string) => parseYmd(s);
const cents = (n: number) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;

/* ================================================================ confirmed bugs */

test('fixed: un-ticking a bill that the payday settled gives the money back', () => {
  const s = base({ settings: { ...base().settings, salary: 0, lifeBudget: 0, marginShare: 0 } });
  s.bills = [{ id: 'b', label: 'Garage', amount: 100, due: '2026-01-20', paid: false }];
  simulatePayday(s); // pays the bill from the current account: 1000 -> 900
  assert.equal(total(s), 900);
  toggleBill(s, 'b'); // user un-ticks it: paid=false, but no txIds were recorded, so nothing is refunded
  assert.equal(s.bills[0].paid, false);
  assert.equal(total(s), 1000, 'un-ticking should refund like for a manually ticked bill');
});

test('fixed: re-ticking a bill that was paid without txIds charges it a second time', () => {
  const s = base();
  s.bills = [{ id: 'b', label: 'Amende', amount: 35, due: '2026-01-05', paid: true }]; // e.g. demo / migrated data, or settled by a payday
  toggleBill(s, 'b'); // off: nothing refunded
  toggleBill(s, 'b'); // on: pays 35 again
  assert.equal(total(s), 1000, 'the bill was already paid once, off+on must be neutral');
});

test('fixed: payday puts money in locked savings while the living budget is not covered', () => {
  // 500 rent due before payday with an empty bills pocket and 0 on the account -> account at -500 at settlement
  const s = base({ balance: 0, charges: [month('Loyer', 500, 5)], clock: '2026-01-01' });
  const a = simulatePayday(s);
  // income 2000, toBills 500 (next rent), marge = 2000 - 500 - 550 = 950, 60% = 570 locked
  // but the account was at -500 before the salary: 2000 - 500 - 500 - 570 = 430 left for a 550 living budget
  assert.ok(
    s.balance >= s.settings.lifeBudget || a.toSavings === 0,
    `left ${s.balance} € for a ${s.settings.lifeBudget} € living budget, yet ${a.toSavings} € were locked in savings`,
  );
  assert.notEqual(compute(s).status.tone, 'warn');
});

test('fixed: allocation reports a large margin and a set-aside that never happened when the account cannot cover commitments', () => {
  const s = base({ balance: -3000, settings: { ...base().settings, cushion: 1000 } });
  const a = simulatePayday(s);
  // nothing could be taken (account still at -1000 after the salary) so `committed` is 0 and the margin looks huge
  assert.equal(s.balance, -1000);
  assert.notEqual(a.status, 'large');
  assert.equal(r2(a.toSavings + a.toDebtExtra), a.setAside);
});

test('fixed: per-payday goal amount overshoots by a cent because of float ceil', () => {
  const s = base({ clock: '2026-01-10' });
  const g: Goal = { id: 'g', label: 'Test', target: 4.4, balance: 0, monthly: 0, mode: 'date', deadline: '2026-02-28' };
  const pay = nextPayday(today(s), 28);
  assert.equal(countPaydays(s, pay, d('2026-02-28')), 2);
  assert.equal(goalPerPay(s, g, pay), 2.2); // 4.4 / 2 * 100 = 220.00000000000003 -> ceil -> 2.21
});

test('fixed: a dated goal whose deadline falls before the next payday is never funded', () => {
  const s = base({ clock: '2026-01-10' });
  const g: Goal = { id: 'g', label: 'Caution', target: 300, balance: 0, monthly: 0, mode: 'date', deadline: '2026-01-20', created: '2025-12-01' };
  s.goals = [g];
  assert.ok(goalPerPay(s, g, nextPayday(today(s), 28)) > 0, 'goalPerPay returns 0 when no payday is left before the deadline');
});

test('fixed: r2 rounds half-cents down and is not symmetric for negatives', () => {
  assert.equal(r2(1.005), 1.01); // 1.005 * 100 = 100.49999999999999
  assert.equal(r2(-0.125), -r2(0.125)); // Math.round(-12.5) = -12, Math.round(12.5) = 13
});

test('fixed: parseAmount misreads a French thousands separator', () => {
  assert.equal(parseAmount('1 234,56'), 1234.56); // fine
  assert.equal(parseAmount('1.234,56'), 1234.56); // returns 1.23
});

test('fixed: fuzzy charge matching lets a new subscription hijack an unrelated manual charge', () => {
  const s = base({ clock: '2026-10-20', charges: [month('Assurance auto', 48.2, 10)] });
  s.tx = [
    bank('PRLV SEPA KEEPCOOL', -47.9, '2026-08-09'),
    bank('PRLV SEPA KEEPCOOL', -47.9, '2026-09-09'),
    bank('PRLV SEPA KEEPCOOL', -47.9, '2026-10-09'),
    bank('PRLV ASSURANCE AUTO', -48.2, '2026-08-10'),
    bank('PRLV ASSURANCE AUTO', -48.2, '2026-09-10'),
    bank('PRLV ASSURANCE AUTO', -48.2, '2026-10-10'),
  ];
  runDetection(s);
  assert.equal(s.charges.find((c) => c.label === 'Assurance auto')?.detectKey, 'assurance auto');
  assert.ok(s.charges.some((c) => c.detectKey === 'keepcool'), 'the gym should be added as its own charge');
});

test('an unknown (newer) save version is refused instead of being replaced by demo data', () => {
  const saved = { ...base(), v: 8, balance: 1234 };
  // the store catches this, keeps a backup of the raw save and never writes the demo over it silently
  assert.throws(() => migrate(JSON.parse(JSON.stringify(saved))));
});

test('fixed: migrating the minimal v4 fixture yields a state the engine cannot compute', () => {
  const v4 = {
    v: 4,
    settings: { payDay: 28, salary: 1850, cushion: 300, savings: 150, wishMin: 80 },
    pockets: { bills: 10, cushion: 0, savings: 99 },
    goals: [],
  };
  const m = migrate(v4);
  m.clock = '2026-01-10';
  assert.doesNotThrow(() => compute(m)); // charges / bills / tx / allocations… are never defaulted
});

/* ===================================================== edge cases that are fine */

test('payday on the 31st clamps in short months and in leap years', () => {
  const seq = (start: string, n: number, pd: number) => {
    const out: string[] = [];
    let p = d(start);
    for (let i = 0; i < n; i++) out.push(ymd((p = nextPayday(p, pd))));
    return out;
  };
  assert.deepEqual(seq('2026-01-30', 4, 31), ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  assert.deepEqual(seq('2028-01-31', 2, 30), ['2028-02-29', '2028-03-30']);
  assert.deepEqual(seq('2026-12-29', 1, 28), ['2027-01-28']);
});

test('a monthly charge on the 29/30/31 is counted exactly once per month over a year, whatever the payday', () => {
  for (const pd of [1, 15, 28, 29, 30, 31]) {
    for (const day of [1, 28, 29, 30, 31]) {
      const s = base({ settings: { ...base().settings, payDay: pd } });
      const c = month('X', 10, day);
      let p = nextPayday(d('2026-12-31'), pd);
      let n = 0;
      for (let i = 0; i < 12; i++) {
        const p2 = nextPayday(p, pd);
        n += occIn(c, p, p2).length;
        assert.equal(needFor({ ...s, charges: [c] }, p, p2) >= 0, true);
        p = p2;
      }
      assert.equal(n, 12, `payDay ${pd}, charge day ${day}`);
    }
  }
});

test('yearly Feb 29 charge falls on Feb 28 in normal years', () => {
  const c = year('Leap', 100, 2, 29);
  assert.equal(ymd(nextOcc(c, d('2027-01-01'))), '2027-02-28');
  assert.equal(ymd(nextOcc(c, d('2027-02-28'))), '2028-02-29');
});

test('charge due today is not in upcoming, charge due on payday is, and it is not counted again next cycle', () => {
  const s = base({ clock: '2026-01-10', charges: [month('Today', 30, 10), month('OnPay', 40, 28)] });
  const c = compute(s);
  assert.deepEqual(c.upcoming.map((u) => u.label), ['OnPay']);
  simulatePayday(s); // settles OnPay on 2026-01-28 and funds the next cycle
  const c2 = compute(s);
  assert.deepEqual(c2.upcoming.map((u) => `${u.label}@${ymd(u.date)}`), ['Today@2026-02-10', 'OnPay@2026-02-28']);
});

test('after a payday the bills pocket exactly covers the cycle: no double counting between compute and needFor', () => {
  const s = base({
    clock: '2026-01-10',
    charges: [month('Loyer', 520, 5), month('Box', 29.99, 20), month('Fin', 15.5, 31)],
    bills: [{ id: 'b', label: 'CT', amount: 78, due: '2026-02-15', paid: false }],
  });
  simulatePayday(s);
  const c = compute(s);
  // the day-31 charge happens twice in (Jan 28, Feb 28]: Jan 31 and Feb 28 (clamped), none in (Feb 28, Mar 28]
  assert.equal(c.need, r2(520 + 29.99 + 15.5 * 2 + 78));
  assert.equal(s.pockets.bills, c.need);
  assert.equal(c.short, 0);
  assert.equal(c.free, s.balance);
});

test('yearly charge due exactly on payday is fully provisioned the payday before and paid from its provision', () => {
  const s = base({ clock: '2026-01-29', charges: [year('Assurance', 132, 2, 28, 20)] });
  const pay = nextPayday(today(s), 28);
  assert.equal(ymd(pay), '2026-02-28');
  const c = compute(s);
  assert.equal(c.upcoming[0].portion, 112);
  // previous cycle: provisioning at Jan 28 for a Feb 28 due date takes the whole remainder
  const s0 = base({ clock: '2026-01-10', charges: [year('Assurance', 132, 2, 28, 20)] });
  simulatePayday(s0);
  assert.equal(s0.charges[0].saved, 132);
  assert.equal(paydaysUntil(s0, d('2026-01-28'), d('2026-02-28')), 1);
  const bills = s0.pockets.bills;
  simulatePayday(s0); // pays it on Feb 28
  assert.equal(s0.charges[0].saved, r2(132 / 12)); // next year smoothed over 12 paydays, nothing left from this year
  assert.ok(s0.pockets.bills >= 0 && bills >= 0);
});

test('compute day count survives DST changes (Europe/Paris)', () => {
  assert.equal(compute(base({ clock: '2026-03-20' })).days, 8); // spring forward on 2026-03-29... payday 28 before it
  assert.equal(compute(base({ clock: '2026-03-27', settings: { ...base().settings, payDay: 31 } })).days, 4);
  assert.equal(compute(base({ clock: '2026-10-20', settings: { ...base().settings, payDay: 30 } })).days, 10);
});

test('year boundary: charges in January are settled by a December simulated payday', () => {
  const s = base({ clock: '2026-12-29', charges: [month('Loyer', 500, 5)] });
  const c = compute(s);
  assert.equal(ymd(c.pay), '2027-01-28');
  assert.deepEqual(c.upcoming.map((u) => ymd(u.date)), ['2027-01-05']);
});

test('money is conserved to the cent over 10 years of paydays with awkward amounts', () => {
  const s = base({
    clock: '2026-01-10',
    balance: 123.45,
    settings: { ...base().settings, payDay: 31, salary: 1733.33, otherIncome: 0.1, lifeBudget: 333.33, marginShare: 33, debtShare: 67, cushion: 200.01 },
    charges: [month('A', 33.33, 31), month('B', 0.1, 29), year('Y', 100, 7, 31, 0), year('Z', 77.77, 2, 29, 3.33)],
    debts: [{ id: 'd', label: 'Prêt', initial: 999.99, remaining: 999.99, monthly: 33.33 }],
    goals: [
      { id: 'g', label: 'Goal', target: 1000.01, balance: 0, monthly: 0, mode: 'date', deadline: '2027-06-15', created: '2026-01-10' },
      { id: 'h', label: 'Monthly', target: 250, balance: 0, monthly: 7.77, mode: 'month' },
    ],
  });
  const before = total(s);
  let flows = 0;
  for (let i = 0; i < 120; i++) {
    const n = s.tx.length;
    simulatePayday(s);
    // Money entering or leaving: everything except moves between the user's own pockets
    flows += s.tx.slice(n).filter((x) => !x.transfer).reduce((a, x) => a + x.amount, 0);
    assert.equal(total(s), r2(before + flows), `payday ${i}`);
  }
  const values = [s.balance, ...Object.values(s.pockets), ...s.charges.map((c) => c.saved ?? 0), ...s.goals.map((g) => g.balance)];
  values.forEach((v) => assert.ok(cents(v), `${v} has more than 2 decimals`));
  assert.ok(s.tx.every((x) => cents(x.amount)));
  assert.equal(s.goals[0].balance, 1000.01);
  assert.equal(s.debts[0].remaining, 0);
});

test('goal with deadline exactly on the next payday gets the whole remainder', () => {
  const s = base({ clock: '2026-01-10' });
  const g: Goal = { id: 'g', label: 'G', target: 333.33, balance: 0, monthly: 0, mode: 'date', deadline: '2026-01-28' };
  s.goals = [g];
  assert.equal(goalPerPay(s, g, nextPayday(today(s), 28)), 333.33);
  simulatePayday(s);
  assert.equal(g.balance, 333.33);
});

test('zero salary, zero living budget and negative balance do not divide by zero or produce NaN', () => {
  const s = base({ balance: -200, settings: { ...base().settings, salary: 0, lifeBudget: 0, marginShare: 0 } });
  const c = compute(s);
  assert.equal(c.status.tone, 'bad');
  assert.ok(Number.isFinite(c.perDay));
  const a = simulatePayday(s);
  Object.values(a).forEach((v) => typeof v === 'number' && assert.ok(Number.isFinite(v)));
});

test('preview leaves the state untouched (history included)', () => {
  const s = base({ charges: [month('Loyer', 500, 5)] });
  const snap = JSON.stringify(s);
  previewPayday(s);
  assert.equal(JSON.stringify(s), snap);
});

test('detection: monthly run across DST is found, split payments count once, and it is idempotent', () => {
  const s = base({ clock: '2026-04-20' });
  s.tx = [
    bank('PRLV SEPA BASIC FIT', -29.99, '2026-02-03'),
    bank('PRLV SEPA BASIC FIT', -29.99, '2026-03-03'),
    { ...bank('PRLV SEPA BASIC FIT', -20, '2026-04-03'), pocket: 'bills' },
    { ...bank('PRLV SEPA BASIC FIT (complément)', -9.99, '2026-04-03'), id: 'x' },
    bank('CB LECLERC', -50, '2026-03-01'),
    bank('CB LECLERC', -95, '2026-04-01'),
  ];
  const found = detectRecurring(s);
  assert.deepEqual(found.map((f) => [f.key, f.count, f.amount, f.day]), [['basic fit', 3, 29.99, 3]]);
  runDetection(s);
  const snap = JSON.stringify(s);
  runDetection(s);
  assert.equal(JSON.stringify(s), snap);
});

test('compute treats overdue unpaid bills as due now and ignores bills after payday', () => {
  const s = base({ clock: '2026-01-10', pockets: { bills: 50, cushion: 0, savings: 0, debts: 0 } });
  s.bills = [
    { id: 'a', label: 'Late', amount: 80, due: '2025-12-01', paid: false },
    { id: 'b', label: 'Later', amount: 999, due: '2026-02-01', paid: false },
  ];
  const c = compute(s);
  assert.equal(c.need, 80);
  assert.equal(c.short, 30);
  assert.equal(c.free, 970);
});
