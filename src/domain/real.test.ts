import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { freshState } from './fresh';
import { catchUp, compute, paydayDue, receivePayday, total } from './engine';
import { r2, uid } from './format';
import type { Charge } from './types';

/** Runs `fn` as if the real date were `day` (local midnight + 10 h). */
function on<T>(day: string, fn: () => T): T {
  const [y, m, d] = day.split('-').map(Number);
  mock.timers.enable({ apis: ['Date'], now: new Date(y, m - 1, d, 10).getTime() });
  try {
    return fn();
  } finally {
    mock.timers.reset();
  }
}

const month = (label: string, amount: number, day: number): Charge => ({ id: uid(), label, amount, day, freq: 'month' });

test('fresh start: real mode, payday already received this cycle', () => {
  const s = on('2026-10-20', () => freshState({ name: ' Joey ', balance: 900, salary: 2000, payDay: 28, lifeBudget: 550 }));
  assert.equal(s.demo, false);
  assert.equal(s.clock, null);
  assert.equal(s.settings.name, 'Joey');
  assert.equal(s.lastPayday, '2026-09-28');
  assert.equal(s.settledTo, '2026-10-20');
  assert.equal(on('2026-10-20', () => paydayDue(s)), null);
});

test('catch-up pays each charge once, on its date, from the bills pocket first', () => {
  const s = on('2026-10-20', () => freshState({ name: '', balance: 900, salary: 2000, payDay: 28, lifeBudget: 550 }));
  s.pockets.bills = 30;
  s.charges.push(month('Box', 29.99, 22), month('Loyer', 500, 5));
  assert.equal(on('2026-10-21', () => catchUp(s)), true);
  assert.equal(s.tx.length, 0, 'nothing due yet');
  on('2026-10-23', () => catchUp(s));
  assert.equal(s.pockets.bills, 0.01);
  assert.equal(s.balance, 900);
  assert.deepEqual(s.tx.map((x) => [x.label, x.date, x.src]), [['Box', '2026-10-22', 'auto']]);
  assert.equal(on('2026-10-23', () => catchUp(s)), false, 'same day: nothing more');
  // Away for a while: rent of 5 Nov is paid partly from the pocket, the rest from the account
  on('2026-11-06', () => catchUp(s));
  assert.equal(s.pockets.bills, 0);
  assert.equal(s.balance, r2(900 - 499.99));
});

test('a charge due today is paid and no longer counted as upcoming', () => {
  const s = on('2026-10-20', () => freshState({ name: '', balance: 900, salary: 2000, payDay: 28, lifeBudget: 550 }));
  s.charges.push(month('Spotify', 11.12, 21));
  on('2026-10-21', () => {
    catchUp(s);
    assert.equal(compute(s).upcoming.length, 0);
  });
  assert.equal(s.balance, 888.88);
});

test('payday: due on the day, records the amount received, shares it out once', () => {
  const s = on('2026-10-20', () => freshState({ name: '', balance: 300, salary: 2000, payDay: 28, lifeBudget: 550 }));
  s.charges.push(month('Loyer', 500, 5));
  assert.equal(on('2026-10-27', () => paydayDue(s)), null);
  const before = total(s);
  const a = on('2026-10-28', () => {
    assert.ok(paydayDue(s));
    return receivePayday(s, 2050.5);
  });
  assert.ok(a);
  assert.equal(a!.salary, 2050.5);
  assert.equal(a!.date, '2026-10-28');
  assert.equal(a!.toBills, 500, 'rent of 5 Nov put aside');
  assert.equal(total(s), r2(before + 2050.5), 'money only moved between pockets');
  assert.equal(s.lastPayday, '2026-10-28');
  assert.equal(on('2026-10-28', () => receivePayday(s)), null, 'cannot be recorded twice');
});

test('payday recorded late: charges in between are paid once, not put aside again', () => {
  const s = on('2026-10-20', () => freshState({ name: '', balance: 300, salary: 2000, payDay: 28, lifeBudget: 550 }));
  s.charges.push(month('Box', 30, 30), month('Loyer', 500, 5));
  const a = on('2026-11-02', () => receivePayday(s));
  assert.ok(a);
  assert.equal(s.tx.filter((x) => x.label.startsWith('Box')).length, 1, 'Box of 30 Oct paid once');
  // Next cycle counted from 2 Nov to 28 Nov: only the rent of 5 Nov, not the Box of 30 Oct (already paid)
  assert.equal(a!.toBills, 500);
});

test('the demo never asks for a real payday', () => {
  const s = on('2026-10-20', () => freshState({ name: '', balance: 0, salary: 1, payDay: 28, lifeBudget: 0 }));
  s.lastPayday = undefined;
  assert.equal(on('2026-12-01', () => paydayDue(s)), null);
});
