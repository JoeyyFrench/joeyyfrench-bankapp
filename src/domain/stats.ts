/**
 * Statistics built from the transaction history: spending by category, monthly income vs outflows,
 * savings and debts over time. Transfers between the user's own pockets are never counted.
 */
import { category as subscriptionCategory, merchantKey, isSubscription } from './detection';
import { debtsLeft, today } from './engine';
import { onDay, r2, ymd } from './format';
import type { CategoryKey, State, Tx } from './types';

export const CATEGORY_LABEL: Record<CategoryKey, string> = {
  logement: 'Logement',
  courses: 'Courses',
  transport: 'Transport et carburant',
  sorties: 'Restos et sorties',
  abonnements: 'Abonnements',
  factures: 'Factures et assurances',
  sante: 'Santé',
  shopping: 'Shopping et loisirs',
  dettes: 'Remboursements',
  autre: 'Autre',
};
export const CATEGORY_KEYS = Object.keys(CATEGORY_LABEL) as CategoryKey[];

const RULES: [RegExp, CategoryKey][] = [
  [/loyer|\bcaf\b|syndic/, 'logement'],
  [/mensualite|remboursement|credit|\b4x\b|paiement en/, 'dettes'],
  [/supermarche|leclerc|carrefour|lidl|auchan|intermarche|super u|monoprix|franprix|aldi|casino|courses|picard/, 'courses'],
  [/essence|station|carburant|esso|\bbp\b|sncf|peage|parking|uber|train|blablacar|tisseo|navigo/, 'transport'],
  [/restaurant|boulangerie|mcdo|burger|\bbar\b|cafe|kebab|pizza|cinema|resto|deliveroo|uber eats|sushi/, 'sorties'],
  [/pharmacie|medecin|docteur|dentiste|sante|mutuelle|opticien/, 'sante'],
  [/amazon|fnac|zara|decathlon|steam|playstation|nintendo|shopping|darty|ikea/, 'shopping'],
  [/assurance|edf|engie|electricite|\beau\b|impot|amende|controle|revision|garage|chaudiere/, 'factures'],
];

const normalize = (label: string) =>
  label.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Category of a spending: user's choice, then known charges/subscriptions, then keywords. */
export function categorize(s: State, tx: Pick<Tx, 'label' | 'category'>): CategoryKey {
  if (tx.category) return tx.category;
  const label = normalize(tx.label);
  const key = merchantKey(tx.label);
  const charge = s.charges.find((c) => c.detectKey === key || merchantKey(c.label) === key);
  if (charge) {
    if (/loyer/.test(normalize(charge.label))) return 'logement';
    if (isSubscription(charge)) {
      const sub = subscriptionCategory(charge.detectKey || merchantKey(charge.label));
      return sub === 'Énergie' || sub === 'Assurance' ? 'factures' : 'abonnements';
    }
    return 'factures';
  }
  for (const [re, cat] of RULES) if (re.test(label)) return cat;
  return 'autre';
}

export const isSpending = (t: Tx) => t.amount < 0 && !t.transfer;
export const isIncome = (t: Tx) => t.amount > 0 && !t.transfer;

export interface MonthRange {
  key: string; // YYYY-MM
  label: string;
  from: string;
  to: string;
}

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/** Last payday on or before `t`. */
export function previousPayday(t: Date, payDay: number) {
  const m = onDay(t.getFullYear(), t.getMonth(), payDay);
  return m <= t ? m : onDay(t.getFullYear(), t.getMonth() - 1, payDay);
}

/**
 * The last `n` pay cycles (payday → day before the next payday), oldest first, the current one included.
 * A cycle is named after the month it mostly pays for, e.g. 28 Sept → 27 Oct is "oct.".
 */
export function lastMonths(s: State, n: number): MonthRange[] {
  const start = previousPayday(today(s), s.settings.payDay);
  const out: MonthRange[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const from = onDay(start.getFullYear(), start.getMonth() - i, s.settings.payDay);
    const next = onDay(from.getFullYear(), from.getMonth() + 1, s.settings.payDay);
    const to = new Date(next.getFullYear(), next.getMonth(), next.getDate() - 1);
    const named = s.settings.payDay > 15 ? to : from;
    out.push({ key: ymd(from), label: MONTHS[named.getMonth()], from: ymd(from), to: ymd(to) });
  }
  return out;
}

export interface CategorySlice {
  key: CategoryKey;
  label: string;
  amount: number;
  share: number;
}

export function spendingByCategory(s: State, from: string, to: string): { total: number; slices: CategorySlice[] } {
  const sums = new Map<CategoryKey, number>();
  s.tx.forEach((t) => {
    if (!isSpending(t) || t.date < from || t.date > to) return;
    const c = categorize(s, t);
    sums.set(c, r2((sums.get(c) ?? 0) - t.amount));
  });
  const total = r2([...sums.values()].reduce((a, b) => a + b, 0));
  const slices = [...sums.entries()]
    .map(([key, amount]) => ({ key, label: CATEGORY_LABEL[key], amount, share: total > 0 ? amount / total : 0 }))
    .sort((a, b) => b.amount - a.amount);
  return { total, slices };
}

export interface MonthFlow {
  key: string;
  label: string;
  income: number;
  spending: number;
  /** income − spending: what was left to save that month */
  net: number;
}

export function monthlyFlows(s: State, n = 6): MonthFlow[] {
  return lastMonths(s, n).map((m) => {
    let income = 0;
    let spending = 0;
    s.tx.forEach((t) => {
      if (t.date < m.from || t.date > m.to) return;
      if (isIncome(t)) income += t.amount;
      else if (isSpending(t)) spending -= t.amount;
    });
    income = r2(income);
    spending = r2(spending);
    return { key: m.key, label: m.label, income, spending, net: r2(income - spending) };
  });
}

/** Savings and remaining debts at each payday, plus today. */
export function savingsDebtSeries(s: State) {
  const points = s.history.map((h) => ({ date: h.date, savings: h.savings, debts: h.debts }));
  const now = ymd(today(s));
  const last = points[points.length - 1];
  if (!last || last.date !== now) points.push({ date: now, savings: s.pockets.savings, debts: debtsLeft(s) });
  return points.slice(-12);
}
