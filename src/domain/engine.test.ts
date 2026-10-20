import { test } from 'node:test';
import assert from 'node:assert/strict';
import { demoState } from './demo';
import {
  compute, simulatePayday, previewPayday, goalStatus, goalRemaining, toggleGoalItem, toggleBill,
  buildMoveItems, sumItems, debtsLeft, nextPayday, today, total, repayDebt,
} from './engine';
import { detectRecurring, runDetection, merchantKey, detectSuggestions } from './detection';
import { migrate } from './migrate';
import { categorize, lastMonths, monthlyFlows, savingsDebtSeries, spendingByCategory } from './stats';
import { r2 } from './format';

test('merchant keys strip bank noise', () => {
  assert.equal(merchantKey('PRLV SEPA BASIC FIT'), 'basic fit');
  assert.equal(merchantKey('SPOTIFY STOCKHOLM'), 'spotify');
  assert.equal(merchantKey('NETFLIX.COM'), 'netflix');
  assert.equal(merchantKey('Loyer (complément)'), 'loyer');
});

test('reste à vivre takes what the bills pocket cannot cover from the current account', () => {
  const s = demoState();
  s.charges = s.charges.filter((c) => c.freq === 'year');
  s.bills = [{ id: 'b', label: 'Garage', amount: 500, due: '2099-01-01', paid: false }];
  const c = compute(s);
  assert.equal(c.short, 0); // bill is after payday
  s.bills[0].due = s.clock ?? new Date().toISOString().slice(0, 10);
  const c2 = compute(s);
  assert.equal(c2.short, r2(500 - s.pockets.bills));
  assert.equal(c2.free, r2(s.balance - c2.short));
});

test('detection adds gym and streaming, recognises the existing phone plan, ignores groceries', () => {
  const s = demoState();
  const keys = detectRecurring(s).map((f) => f.key).sort();
  assert.deepEqual(keys, ['assurance auto', 'basic fit', 'box internet', 'edf', 'free mobile', 'loyer', 'netflix', 'spotify']);
  runDetection(s);
  const auto = s.charges.filter((c) => c.auto).map((c) => c.label).sort();
  assert.deepEqual(auto, ['Basic Fit', 'Netflix', 'Spotify']);
  assert.equal(s.charges.find((c) => c.label === 'Forfait mobile')?.detectKey, 'free mobile');
  assert.equal(s.charges.find((c) => c.label === 'Électricité')?.detectKey, 'edf');
  assert.equal(s.charges.filter((c) => c.freq === 'month').length, 8);
  assert.equal(s.charges.find((c) => c.label === 'Spotify')?.amount, 11.12);
  assert.equal(s.notices.length, 1);
  // idempotent
  const n = s.charges.length;
  runDetection(s);
  assert.equal(s.charges.length, n);
  assert.equal(s.notices.length, 1);
});

test('detection follows a price change', () => {
  const s = demoState();
  runDetection(s);
  const last = s.tx.filter((x) => merchantKey(x.label) === 'spotify').map((x) => x.date).sort().pop()!;
  const [y, m] = last.split('-').map(Number);
  const next = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}-22`;
  s.tx.push({ id: 'p', label: 'SPOTIFY STOCKHOLM', amount: -12.14, date: next, src: 'bunq', pocket: 'courant' });
  runDetection(s);
  assert.equal(s.charges.find((c) => c.detectKey === 'spotify')?.amount, 12.14);
  assert.deepEqual(s.notices[0].priced, [{ label: 'Spotify', from: 11.12, to: 12.14 }]);
});

test('suggestions instead of auto-add when disabled, and ignored keys stay ignored', () => {
  const s = demoState();
  s.settings.autoSubs = false;
  runDetection(s);
  assert.equal(s.charges.filter((c) => c.auto).length, 0);
  assert.deepEqual(detectSuggestions(s).map((f) => f.key).sort(), ['basic fit', 'netflix', 'spotify']);
  s.ignoredRecurring.push('netflix');
  assert.deepEqual(detectSuggestions(s).map((f) => f.key).sort(), ['basic fit', 'spotify']);
});

test('payday keeps money conserved and pays obligations before savings', () => {
  const s = demoState();
  runDetection(s);
  const before = total(s);
  const outflowsBefore = s.tx.length;
  const a = simulatePayday(s);
  // every euro is either still in a pocket, or went out (charges, bills, debt payments)
  const out = s.tx.slice(outflowsBefore).filter((x) => x.src !== 'auto' || x.label.startsWith('Mensualité'));
  const net = r2(out.reduce((sum, x) => sum + x.amount, 0));
  assert.equal(r2(total(s)), r2(before + net));
  assert.ok(a.toDebtMin > 0);
  assert.equal(a.marge, r2(a.income - a.toBills - a.toYear - a.toDebtMin - a.toGoals - a.toCushion - a.life));
  assert.equal(r2(a.toSavings + a.toDebtExtra), a.setAside);
});

test('negative margin means no savings', () => {
  const s = demoState();
  s.settings.lifeBudget = 5000;
  const a = simulatePayday(s);
  assert.equal(a.status, 'tight');
  assert.equal(a.toSavings, 0);
  assert.equal(a.toDebtExtra, 0);
});

test('preview does not change the state', () => {
  const s = demoState();
  const snapshot = JSON.stringify(s);
  previewPayday(s);
  assert.equal(JSON.stringify(s), snapshot);
});

test('dated goal reaches its target by the deadline', () => {
  const s = demoState();
  const g = s.goals[0];
  assert.equal(goalStatus(s, g)?.tone, 'late');
  for (let i = 0; i < 14; i++) simulatePayday(s);
  assert.equal(goalRemaining(g), 0);
  assert.equal(goalStatus(s, g)?.text, 'Objectif atteint');
});

test('paying a move item uses the goal pocket then the current account, and can be undone', () => {
  const s = demoState();
  const g = s.goals[0];
  const deposit = g.items![0];
  const bal = s.balance;
  const res = toggleGoalItem(s, g.id, deposit.id)!;
  assert.equal(res.fromGoal, 250);
  assert.equal(s.balance, r2(bal - (deposit.amount - 250)));
  toggleGoalItem(s, g.id, deposit.id);
  assert.equal(g.balance, 250);
  assert.equal(s.balance, bal);
});

test('move budget applies legal deposit rules', () => {
  const base = { rent: 600, charges: 40, agency: false, surface: 0, zoneRate: 8, moveCost: 0, setup: 0, insurance: 0 };
  assert.equal(buildMoveItems({ ...base, furnished: false })[0].amount, 600);
  assert.equal(buildMoveItems({ ...base, furnished: true })[0].amount, 1200);
  const withAgency = buildMoveItems({ ...base, furnished: false, agency: true, surface: 30, zoneRate: 12 });
  assert.equal(withAgency.find((i) => i.label.startsWith("Frais d'agence"))?.amount, 450);
  assert.ok(sumItems(withAgency) > 0);
});

test('bills toggle back and forth without losing money', () => {
  const s = demoState();
  const b = s.bills[0];
  const before = total(s);
  toggleBill(s, b.id);
  assert.equal(r2(total(s)), r2(before - b.amount));
  toggleBill(s, b.id);
  assert.equal(r2(total(s)), before);
});

test('debt repayment is capped by the pocket and the debt', () => {
  const s = demoState();
  const d = s.debts[2];
  s.pockets.debts = 1000;
  const paid = repayDebt(s, d, 999);
  assert.equal(paid, 300);
  assert.equal(d.remaining, 0);
  assert.equal(debtsLeft(s), r2(1200 + 180));
});

test('next payday rolls to the next month on payday itself', () => {
  const s = demoState();
  const p = nextPayday(today(s), 28);
  const again = nextPayday(p, 28);
  assert.ok(again > p);
});

test('migration from the web prototype keeps data', () => {
  const v4 = {
    v: 4,
    settings: { payDay: 28, salary: 1850, cushion: 300, savings: 150, wishMin: 80 },
    pockets: { bills: 10, cushion: 0, savings: 99 },
    goals: [],
  };
  const m = migrate(v4);
  assert.equal(m.v, 7);
  assert.equal(m.pockets.savings, 99);
  assert.equal(m.settings.autoSubs, true);
  assert.deepEqual(m.debts, []);
  assert.equal(migrate(null).demo, true);
});

test('stats ignore transfers and split spending by category', () => {
  const s = demoState();
  runDetection(s);
  const months = lastMonths(s, 6);
  const flows = monthlyFlows(s, 6);
  assert.equal(flows.length, 6);
  assert.ok(flows.every((f) => f.income >= 2000));
  const spend = spendingByCategory(s, months[4].from, months[4].to);
  assert.equal(r2(spend.slices.reduce((a, x) => a + x.amount, 0)), spend.total);
  assert.equal(spend.slices.find((x) => x.key === 'logement')?.amount, 520);
  assert.ok(spend.slices.some((x) => x.key === 'abonnements'));
  // moving money between pockets is not spending
  const spendingBefore = monthlyFlows(s, 6)[5].spending;
  s.tx.push({ id: 't', label: 'Vers Épargne', amount: -100, date: months[5].from, src: 'auto', pocket: 'courant', transfer: true });
  assert.equal(monthlyFlows(s, 6)[5].spending, spendingBefore);
});

test('categories: user choice wins, then charges, then keywords', () => {
  const s = demoState();
  runDetection(s);
  assert.equal(categorize(s, { label: 'CB LECLERC' }), 'courses');
  assert.equal(categorize(s, { label: 'PRLV LOYER' }), 'logement');
  assert.equal(categorize(s, { label: 'SPOTIFY STOCKHOLM' }), 'abonnements');
  assert.equal(categorize(s, { label: 'PRLV EDF' }), 'factures');
  assert.equal(categorize(s, { label: 'CB LECLERC', category: 'sorties' }), 'sorties');
  assert.equal(categorize(s, { label: 'Truc inconnu' }), 'autre');
});

test('payday records a savings and debts snapshot', () => {
  const s = demoState();
  const n = s.history.length;
  simulatePayday(s);
  assert.equal(s.history.length, n + 1);
  assert.equal(s.history[n].savings, s.pockets.savings);
  assert.equal(s.history[n].debts, debtsLeft(s));
  assert.ok(savingsDebtSeries(s).length >= 2);
});
