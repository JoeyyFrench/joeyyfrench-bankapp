/**
 * Money engine: every calculation of the app lives here, as plain functions over `State`.
 * Mutating helpers (`simulatePayday`, `toggleBill`, …) change the state they are given;
 * the store always passes them a fresh copy.
 */
import {
  DAY, r2, uid, eur, ymd, parseYmd, realToday, onDay, addDays, hoursLeft, monthYear,
} from './format';
import type {
  Allocation, Bill, Charge, Debt, Goal, GoalItem, MonthStatus, PocketKey, State, Tx, TxSource,
} from './types';

export const HOLD_HOURS = 48;
export const WISH_HOURS = 48;
export const WITHDRAW_REASONS = [
  'Urgence santé',
  'Réparation voiture ou moto',
  'Réparation logement',
  'Perte de revenus',
  'Facture imprévue importante',
  'Autre urgence',
];
export const STATUS_LABEL: Record<MonthStatus, string> = { large: 'Large', ok: 'Correct', tight: 'Serré' };

export const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

/* ------------------------------------------------------------------ dates */

export const today = (s: State) => (s.clock ? parseYmd(s.clock) : realToday());

export function nextPayday(t: Date, payDay: number) {
  const m = onDay(t.getFullYear(), t.getMonth(), payDay);
  return t < m ? m : onDay(t.getFullYear(), t.getMonth() + 1, payDay);
}

/** First occurrence of a charge strictly after `t`. */
export function nextOcc(c: Pick<Charge, 'freq' | 'day' | 'month'>, t: Date) {
  if (c.freq === 'year') {
    const d = onDay(t.getFullYear(), (c.month ?? 1) - 1, c.day);
    return d > t ? d : onDay(t.getFullYear() + 1, (c.month ?? 1) - 1, c.day);
  }
  const d = onDay(t.getFullYear(), t.getMonth(), c.day);
  return d > t ? d : onDay(t.getFullYear(), t.getMonth() + 1, c.day);
}

/** Occurrences of a charge in (from, to]. */
export function occIn(c: Charge, from: Date, to: Date) {
  const out: Date[] = [];
  let d = nextOcc(c, from);
  while (d <= to) {
    out.push(d);
    d = nextOcc(c, d);
  }
  return out;
}

/** Number of paydays from `pay` (included) strictly before `due`, at least 1. */
export function paydaysUntil(s: State, pay: Date, due: Date) {
  let k = 0;
  let p = pay;
  while (p < due) {
    k++;
    p = nextPayday(p, s.settings.payDay);
  }
  return Math.max(1, k);
}

/** Number of paydays from `first` (included) up to `deadline` (included). */
export function countPaydays(s: State, first: Date, deadline: Date) {
  let k = 0;
  let p = first;
  while (p <= deadline && k < 600) {
    k++;
    p = nextPayday(p, s.settings.payDay);
  }
  return k;
}

/* ------------------------------------------------------------ aggregates */

export const yearly = (s: State) => s.charges.filter((c) => c.freq === 'year');
export const monthly = (s: State) => s.charges.filter((c) => c.freq !== 'year');
export const yearSaved = (s: State) => r2(yearly(s).reduce((a, c) => a + (c.saved ?? 0), 0));
export const goalsSum = (s: State) => r2(s.goals.reduce((a, g) => a + g.balance, 0));
export const debtsLeft = (s: State) => r2(s.debts.reduce((a, d) => a + Math.max(0, d.remaining), 0));
export const debtMins = (s: State) =>
  r2(s.debts.reduce((a, d) => a + Math.min(d.monthly || 0, Math.max(0, d.remaining)), 0));
export const total = (s: State) =>
  r2(s.balance + s.pockets.bills + s.pockets.cushion + s.pockets.savings + s.pockets.debts + yearSaved(s) + goalsSum(s));

/* -------------------------------------------------------- reste à vivre */

export interface UpcomingItem {
  id: string;
  label: string;
  amount: number;
  /** Part not yet provisioned (yearly charges) */
  portion: number;
  date: Date;
  kind: 'charge' | 'year' | 'bill';
}

export type HomeStatus = { tone: 'ok' | 'warn' | 'bad'; text: string };

export function compute(s: State) {
  const t = today(s);
  const pay = nextPayday(t, s.settings.payDay);
  const days = Math.max(1, Math.round((pay.getTime() - t.getTime()) / DAY));
  const upcoming: UpcomingItem[] = [
    ...s.charges.flatMap((c) =>
      occIn(c, t, pay).map((date) => ({
        id: c.id,
        label: c.label,
        amount: c.amount,
        portion: c.freq === 'year' ? r2(Math.max(0, c.amount - (c.saved ?? 0))) : c.amount,
        date,
        kind: (c.freq === 'year' ? 'year' : 'charge') as UpcomingItem['kind'],
      })),
    ),
    ...s.bills
      .filter((b) => !b.paid && parseYmd(b.due) <= pay)
      .map((b) => ({ id: b.id, label: b.label, amount: b.amount, portion: b.amount, date: parseYmd(b.due), kind: 'bill' as const })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());
  const need = r2(upcoming.reduce((a, x) => a + x.portion, 0));
  const short = r2(Math.max(0, need - s.pockets.bills));
  const free = r2(s.balance - short);
  // The living budget is per pay cycle: what is needed until payday is the share of the cycle that remains
  const prevPay = onDay(pay.getFullYear(), pay.getMonth() - 1, s.settings.payDay);
  const cycleDays = Math.max(1, Math.round((pay.getTime() - prevPay.getTime()) / DAY));
  const lifeNeed = r2(((s.settings.lifeBudget || 0) * Math.min(days, cycleDays)) / cycleDays);
  let status: HomeStatus;
  if (free < 0) status = { tone: 'bad', text: `Ça ne passe pas : il manque ${eur(-free)}` };
  else if (free < lifeNeed) status = { tone: 'warn', text: `Serré : ${eur(lifeNeed - free)} de moins que ton budget de vie` };
  else if (free < lifeNeed * 1.25) status = { tone: 'ok', text: 'Ça passe, sans plus' };
  else status = { tone: 'ok', text: `Tu es large : ${eur(free - lifeNeed)} de marge` };
  return { t, pay, days, cycleDays, upcoming, need, short, free, perDay: free / days, lifeNeed, status };
}

/** Monthly charges + unpaid bills for a cycle (yearly ones are provisioned separately). */
export function needFor(s: State, from: Date, to: Date) {
  let sum = 0;
  monthly(s).forEach((c) => {
    sum += occIn(c, from, to).length * c.amount;
  });
  s.bills.forEach((b) => {
    if (!b.paid && parseYmd(b.due) <= to) sum += b.amount;
  });
  return r2(sum);
}

/* ---------------------------------------------------------- transactions */

export function addTx(
  s: State, label: string, amount: number, pocket: PocketKey, src: TxSource = 'manuel', date?: string, extra?: Partial<Tx>,
): Tx {
  const tx: Tx = { id: uid(), label, amount: r2(amount), date: date ?? ymd(today(s)), src, pocket, ...extra };
  s.tx.push(tx);
  return tx;
}

/** Pays from the bills pocket first, the rest from the current account. */
export function payFromBills(s: State, label: string, amount: number, date?: string) {
  const fromPocket = Math.min(amount, Math.max(0, s.pockets.bills));
  if (fromPocket > 0) {
    s.pockets.bills = r2(s.pockets.bills - fromPocket);
    addTx(s, label, -fromPocket, 'bills', 'bunq', date);
  }
  const rest = r2(amount - fromPocket);
  if (rest > 0) {
    s.balance = r2(s.balance - rest);
    addTx(s, `${label} (complément)`, -rest, 'courant', 'bunq', date);
  }
}

export function payCharge(s: State, c: Charge, date: string) {
  if (c.freq === 'year') {
    const fromYear = Math.min(c.amount, c.saved ?? 0);
    if (fromYear > 0) {
      c.saved = r2((c.saved ?? 0) - fromYear);
      addTx(s, c.label, -fromYear, 'year', 'bunq', date);
    }
    const rest = r2(c.amount - fromYear);
    if (rest > 0) payFromBills(s, c.label, rest, date);
  } else payFromBills(s, c.label, c.amount, date);
}

/* ----------------------------------------------------------------- goals */

export const sumItems = (items: GoalItem[]) => r2(items.reduce((a, i) => a + i.amount, 0));
export const goalTarget = (g: Goal) => (g.items ? sumItems(g.items) : g.target);
export const goalPaid = (g: Goal) => (g.items ? r2(g.items.filter((i) => i.paid).reduce((a, i) => a + i.amount, 0)) : 0);
export const goalProgress = (g: Goal) => r2(g.balance + goalPaid(g));
export const goalRemaining = (g: Goal) => r2(Math.max(0, goalTarget(g) - goalProgress(g)));

export function goalPerPay(s: State, g: Goal, firstPay: Date) {
  if (g.mode !== 'date' || !g.deadline) return g.monthly || 0;
  const n = countPaydays(s, firstPay, parseYmd(g.deadline));
  // deadline before the next payday: catch up in one go
  if (n <= 0) return goalRemaining(g);
  // work in whole cents so float noise never adds a cent
  return Math.ceil(Math.round(goalRemaining(g) * 100) / n) / 100;
}

export type GoalStatus = { tone: 'ok' | 'late'; text: string; overdue?: boolean } | null;

export function goalStatus(s: State, g: Goal): GoalStatus {
  if (goalRemaining(g) <= 0) return { tone: 'ok', text: 'Objectif atteint' };
  if (g.mode !== 'date' || !g.deadline) return null;
  const t = today(s);
  const dl = parseYmd(g.deadline);
  if (dl < t) return { tone: 'late', text: 'Date dépassée', overdue: true };
  const first = nextPayday(parseYmd(g.created ?? ymd(t)), s.settings.payDay);
  const totalPays = countPaydays(s, first, dl);
  if (!totalPays) return null;
  const elapsed = first <= t ? countPaydays(s, first, t) : 0;
  const tgt = goalTarget(g);
  const start = g.startProgress ?? 0;
  const diff = r2(goalProgress(g) - (start + (tgt - start) * Math.min(1, elapsed / totalPays)));
  if (diff < -1) return { tone: 'late', text: `En retard de ${eur(-diff)}` };
  if (diff > 1) return { tone: 'ok', text: `En avance de ${eur(diff)}` };
  return { tone: 'ok', text: 'Dans les temps' };
}

export function goalEta(s: State, g: Goal) {
  const left = goalRemaining(g);
  if (left <= 0) return 'Atteint';
  if (!(g.monthly > 0)) return 'Pas de versement prévu';
  const n = Math.ceil(left / g.monthly);
  const p = nextPayday(today(s), s.settings.payDay);
  return monthYear(onDay(p.getFullYear(), p.getMonth() + n - 1, s.settings.payDay));
}

export interface MoveParams {
  rent: number;
  charges: number;
  furnished: boolean;
  agency: boolean;
  surface: number;
  /** €/m² legal cap for visit + file + lease (8, 10 or 12 depending on the zone) */
  zoneRate: number;
  moveCost: number;
  setup: number;
  insurance: number;
}

/** Budget for a move, with French legal caps (deposit, agency fees). */
export function buildMoveItems(p: MoveParams): GoalItem[] {
  const it = (label: string, amount: number): GoalItem => ({ id: uid(), label, amount: r2(amount), paid: false });
  const items = [it('Dépôt de garantie', p.rent * (p.furnished ? 2 : 1)), it('Premier loyer et charges', p.rent + p.charges)];
  // Agency fees: legal cap per m² for visit/file/lease, plus 3 €/m² for the inventory of fixtures
  if (p.agency && p.surface > 0) items.push(it("Frais d'agence (plafond légal)", p.surface * (p.zoneRate + 3)));
  items.push(
    it('Déménagement', p.moveCost),
    it('Assurance habitation', p.insurance),
    it('Installation et meubles', p.setup),
    it('Mise en service électricité et box', 60),
  );
  const sub = items.reduce((a, i) => a + i.amount, 0);
  items.push(it('Marge imprévus (10 %)', Math.ceil(sub * 0.1)));
  return items.filter((i) => i.amount > 0);
}

/* ----------------------------------------------------------------- payday */

/** Settles the current cycle, cashes the salary and splits it across pockets. */
export function simulatePayday(s: State) {
  const set = s.settings;
  const t = today(s);
  const pay = nextPayday(t, set.payDay);
  s.charges.forEach((c) => occIn(c, t, pay).forEach((d) => payCharge(s, c, ymd(d))));
  s.bills.forEach((b) => {
    if (!b.paid && parseYmd(b.due) <= pay) {
      b.paid = true;
      const before = s.tx.length;
      payFromBills(s, b.label, b.amount, b.due <= ymd(t) ? ymd(t) : b.due);
      b.txIds = s.tx.slice(before).map((x) => x.id);
    }
  });
  s.clock = ymd(pay);

  const income = r2(set.salary + (set.otherIncome || 0));
  s.balance = r2(s.balance + set.salary);
  addTx(s, 'Salaire', set.salary, 'courant', 'bunq');
  if (set.otherIncome > 0) {
    s.balance = r2(s.balance + set.otherIncome);
    addTx(s, 'Autres revenus', set.otherIncome, 'courant', 'bunq');
  }

  const take = (want: number, label: string, pocket: PocketKey) => {
    const a = r2(Math.max(0, Math.min(want, s.balance)));
    if (a > 0) {
      s.balance = r2(s.balance - a);
      addTx(s, label, -a, 'courant', 'auto', undefined, { transfer: true });
      addTx(s, label, a, pocket, 'auto', undefined, { transfer: true });
    }
    return a;
  };

  // 1. Bills pocket: exactly what the next cycle needs
  const pay2 = nextPayday(pay, set.payDay);
  const wantBills = r2(Math.max(0, needFor(s, pay, pay2) - s.pockets.bills));
  const toBills = take(wantBills, 'Vers Factures', 'bills');
  s.pockets.bills = r2(s.pockets.bills + toBills);

  // 2. Yearly charges, smoothed over the paydays left before each due date
  let toYear = 0;
  let wantYear = 0;
  yearly(s).forEach((c) => {
    const due = nextOcc(c, pay);
    const want = r2(Math.max(0, c.amount - (c.saved ?? 0)) / paydaysUntil(s, pay, due));
    wantYear += want;
    const a = take(want, `Provision ${c.label}`, 'year');
    c.saved = r2((c.saved ?? 0) + a);
    toYear += a;
  });

  // 3. Mandatory debt payments
  let toDebtMin = 0;
  let wantDebtMin = 0;
  s.debts.forEach((d) => {
    const want = Math.min(d.monthly || 0, Math.max(0, d.remaining));
    wantDebtMin += want;
    const a = r2(Math.max(0, Math.min(want, s.balance)));
    if (a > 0) {
      s.balance = r2(s.balance - a);
      d.remaining = r2(d.remaining - a);
      addTx(s, `Mensualité ${d.label}`, -a, 'courant', 'auto', undefined, { category: 'dettes' });
      toDebtMin += a;
    }
  });

  // 4. Goals
  let toGoals = 0;
  let wantGoals = 0;
  s.goals.forEach((g) => {
    const want = Math.min(goalPerPay(s, g, pay), goalRemaining(g));
    wantGoals += want;
    const a = take(want, `Objectif ${g.label}`, 'goal');
    g.balance = r2(g.balance + a);
    toGoals += a;
  });

  // 5. Safety cushion back to its target
  const wantCushion = r2(Math.max(0, set.cushion - s.pockets.cushion));
  const toCushion = take(wantCushion, 'Vers Sécurité', 'cushion');
  s.pockets.cushion = r2(s.pockets.cushion + toCushion);

  // 6. Automatic savings: a share of what is left once every obligation (what was needed, not what could be
  //    moved) and the living budget are covered — and never more than what the account really has beyond
  //    the living budget, so savings never eat into the money needed to live until the next payday.
  const life = set.lifeBudget || 0;
  const committed = r2(wantBills + wantYear + wantDebtMin + wantGoals + wantCushion);
  const marge = r2(income - committed - life);
  const room = r2(Math.max(0, s.balance - life));
  const target = marge > 0 ? Math.min(r2((marge * (set.marginShare || 0)) / 100), room) : 0;
  const wantDebt =
    debtsLeft(s) > 0 ? r2(Math.min((target * (set.debtShare || 0)) / 100, Math.max(0, debtsLeft(s) - s.pockets.debts))) : 0;
  const toDebtExtra = take(wantDebt, 'Vers Dettes', 'debts');
  s.pockets.debts = r2(s.pockets.debts + toDebtExtra);
  const toSavings = take(r2(target - toDebtExtra), 'Vers Épargne', 'savings');
  s.pockets.savings = r2(s.pockets.savings + toSavings);
  const setAside = r2(toDebtExtra + toSavings);

  const livingCovered = s.balance >= life;
  const status: MonthStatus = marge < 0 || !livingCovered ? 'tight' : marge >= income * 0.15 ? 'large' : 'ok';
  const alloc: Allocation = {
    id: uid(), date: ymd(pay), income, salary: set.salary, toBills, wantBills,
    toYear: r2(toYear), wantYear: r2(wantYear), toDebtMin: r2(toDebtMin), toGoals: r2(toGoals), toCushion,
    life, marge, setAside, toDebtExtra, toSavings, status, left: s.balance,
  };
  s.allocations.unshift(alloc);
  s.allocations = s.allocations.slice(0, 6);
  s.history.push({ date: ymd(pay), savings: s.pockets.savings, debts: debtsLeft(s) });
  s.history = s.history.slice(-24);
  return alloc;
}

/** What the next payday would do, without changing anything. */
export function previewPayday(s: State) {
  const copy = clone(s);
  const before = copy.balance;
  const alloc = simulatePayday(copy);
  return { ...alloc, pay2: nextPayday(today(s), s.settings.payDay), gain: r2(copy.balance - before) };
}

/** Estimated month when all debts are paid off. */
export function debtFreeEta(s: State, extraPerPay: number) {
  const left = debtsLeft(s);
  const perMonth = r2(debtMins(s) + extraPerPay);
  if (left <= 0) return 'Plus aucune dette';
  if (perMonth <= 0) return 'Pas de remboursement prévu';
  const n = Math.ceil(Math.max(0, left - s.pockets.debts) / perMonth);
  if (n <= 0) return 'Dès maintenant';
  const p = nextPayday(today(s), s.settings.payDay);
  return monthYear(onDay(p.getFullYear(), p.getMonth() + n - 1, s.settings.payDay));
}

/* ------------------------------------------------- user actions (mutating) */

export const canUnpayBill = (b: Bill) => !b.paid || !!b.txIds;

export function toggleBill(s: State, id: string) {
  const b = s.bills.find((x) => x.id === id);
  if (!b) return null;
  // A bill marked paid without its transactions (paid outside the app) cannot be undone safely
  if (b.paid && !b.txIds) return null;
  b.paid = !b.paid;
  if (b.paid) {
    const before = s.tx.length;
    payFromBills(s, b.label, b.amount);
    b.txIds = s.tx.slice(before).map((x) => x.id);
  } else if (b.txIds) {
    revertTx(s, b.txIds);
    delete b.txIds;
  }
  return b;
}

function revertTx(s: State, ids: string[], goal?: Goal) {
  s.tx
    .filter((x) => ids.includes(x.id))
    .forEach((x) => {
      if (x.pocket === 'bills') s.pockets.bills = r2(s.pockets.bills - x.amount);
      else if (x.pocket === 'goal' && goal) goal.balance = r2(goal.balance - x.amount);
      else s.balance = r2(s.balance - x.amount);
    });
  s.tx = s.tx.filter((x) => !ids.includes(x.id));
}

/** Marks a goal item (e.g. the deposit) as paid from the goal pocket, completing from the current account. */
export function toggleGoalItem(s: State, goalId: string, itemId: string) {
  const g = s.goals.find((x) => x.id === goalId);
  const i = g?.items?.find((x) => x.id === itemId);
  if (!g || !i) return null;
  if (!i.paid) {
    const before = s.tx.length;
    const fromGoal = Math.min(i.amount, Math.max(0, g.balance));
    if (fromGoal > 0) {
      g.balance = r2(g.balance - fromGoal);
      addTx(s, i.label, -fromGoal, 'goal', 'auto');
    }
    const rest = r2(i.amount - fromGoal);
    if (rest > 0) {
      s.balance = r2(s.balance - rest);
      addTx(s, `${i.label} (complément)`, -rest, 'courant', 'auto');
    }
    i.paid = true;
    i.txIds = s.tx.slice(before).map((x) => x.id);
    return { paid: true, fromGoal, rest };
  }
  revertTx(s, i.txIds ?? [], g);
  i.paid = false;
  delete i.txIds;
  return { paid: false, fromGoal: 0, rest: 0 };
}

export function moveBetween(s: State, from: PocketKey, to: PocketKey, amount: number, label: string, goal?: Goal) {
  const read = (k: PocketKey) => (k === 'courant' ? s.balance : k === 'goal' ? goal!.balance : s.pockets[k as keyof State['pockets']]);
  const write = (k: PocketKey, v: number) => {
    if (k === 'courant') s.balance = r2(v);
    else if (k === 'goal') goal!.balance = r2(v);
    else s.pockets[k as keyof State['pockets']] = r2(v);
  };
  write(from, read(from) - amount);
  write(to, read(to) + amount);
  addTx(s, label, -amount, from, 'auto', undefined, { transfer: true });
  addTx(s, label, amount, to, 'auto', undefined, { transfer: true });
}

export function requestWithdrawal(s: State, amount: number, reason: string, note: string) {
  s.withdrawals.push({
    id: uid(), amount, reason, note,
    requested: new Date().toISOString(),
    release: new Date(Date.now() + HOLD_HOURS * 36e5).toISOString(),
    status: 'pending',
  });
}

export function completeWithdrawal(s: State, id: string) {
  const w = s.withdrawals.find((x) => x.id === id);
  if (!w || w.status !== 'pending' || hoursLeft(w.release) > 0) return 0;
  const a = Math.min(w.amount, s.pockets.savings);
  moveBetween(s, 'savings', 'courant', a, 'Déblocage épargne');
  w.status = 'done';
  w.amount = a;
  return a;
}

export const wishReady = (addedIso: string) => Date.now() - new Date(addedIso).getTime() >= WISH_HOURS * 36e5;

export function repayDebt(s: State, debt: Debt, amount: number) {
  const a = r2(Math.min(amount, debt.remaining, s.pockets.debts));
  s.pockets.debts = r2(s.pockets.debts - a);
  debt.remaining = r2(debt.remaining - a);
  addTx(s, `Remboursement ${debt.label}`, -a, 'debts', 'auto', undefined, { category: 'dettes' });
  return a;
}

/** Deleting a goal or a yearly provision gives its money back to the current account. */
export function deleteGoal(s: State, id: string) {
  const g = s.goals.find((x) => x.id === id);
  if (g && g.balance > 0) {
    s.balance = r2(s.balance + g.balance);
    addTx(s, `Objectif supprimé : ${g.label}`, g.balance, 'courant', 'auto', undefined, { transfer: true });
  }
  s.goals = s.goals.filter((x) => x.id !== id);
}

export function deleteCharge(s: State, id: string) {
  const c = s.charges.find((x) => x.id === id);
  if (!c) return;
  if (c.detectKey && !s.ignoredRecurring.includes(c.detectKey)) s.ignoredRecurring.push(c.detectKey);
  if (c.freq === 'year' && (c.saved ?? 0) > 0) {
    s.balance = r2(s.balance + (c.saved ?? 0));
    addTx(s, `Provision rendue : ${c.label}`, c.saved ?? 0, 'courant', 'auto', undefined, { transfer: true });
  }
  s.charges = s.charges.filter((x) => x.id !== id);
}

export function deleteTx(s: State, id: string) {
  const t = s.tx.find((x) => x.id === id);
  if (t && t.pocket === 'courant') s.balance = r2(s.balance - t.amount);
  s.tx = s.tx.filter((x) => x.id !== id);
}

export type { Bill };
export { hoursLeft, addDays };
