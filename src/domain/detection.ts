/**
 * Recurring payment detection: finds subscriptions (gym, streaming, phone…) in the
 * transaction history and adds them to the monthly charges.
 */
import { DAY, parseYmd, r2, uid } from './format';
import type { Charge, State } from './types';

const STOP = new Set([
  'prlv', 'sepa', 'cb', 'carte', 'paiement', 'achat', 'vir', 'www', 'com', 'fr', 'sas', 'sa', 'stockholm', 'paris',
  'france', 'ltd', 'eu', 'europe', 'payment', 'payments', 'prelevement', 'facture', 'abonnement', 'de', 'du', 'la',
  'le', 'les', 'des',
]);

/** "PRLV SEPA BASIC FIT" → "basic fit", "NETFLIX.COM" → "netflix" */
export function merchantKey(label: string) {
  return String(label)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z ]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
    .slice(0, 2)
    .join(' ');
}

export const prettyName = (key: string) =>
  key
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

const CATEGORIES: [RegExp, string][] = [
  [/spotify|deezer|netflix|disney|prime video|amazon prime|youtube|canal|tidal|crunchyroll|twitch/, 'Streaming'],
  [/fit|sport|gym|salle|fitness|neoness|keepcool/, 'Sport'],
  [/\b(free|orange|sfr|bouygues|sosh|red|bbox)\b|mobile|internet|\bbox\b|forfait/, 'Téléphone et internet'],
  [/edf|engie|totalenergies|energie|electri|\bgaz\b|veolia/, 'Énergie'],
  [/assur|maif|macif|matmut|axa|allianz|groupama/, 'Assurance'],
  [/icloud|google|microsoft|adobe|dropbox|notion/, 'Logiciel'],
];
export function category(key: string | undefined) {
  const f = CATEGORIES.find(([re]) => re.test(key ?? ''));
  return f ? f[1] : '';
}

const dayDist = (a: number, b: number) => {
  const d = Math.abs(a - b);
  return Math.min(d, 31 - d);
};

export const chargeKey = (c: Charge) => c.detectKey || merchantKey(c.label);
export const isSubscription = (c: Charge) => c.freq !== 'year' && (!!c.auto || !!category(chargeKey(c)));

export interface Recurring {
  key: string;
  count: number;
  amount: number;
  day: number;
  last: string;
}

/** A merchant paid at least twice, about a month apart, for nearly the same amount. */
export function detectRecurring(s: State): Recurring[] {
  const groups: Record<string, { date: string; amount: number }[]> = {};
  s.tx.forEach((x) => {
    if (x.amount >= 0 || !(x.src === 'bunq' || x.src === 'manuel') || (x.pocket !== 'courant' && x.pocket !== 'bills')) return;
    const k = merchantKey(x.label);
    if (k) (groups[k] = groups[k] || []).push(x);
  });
  const out: Recurring[] = [];
  Object.entries(groups).forEach(([key, list]) => {
    // a payment split across pockets on the same day counts once
    const byDay: Record<string, number> = {};
    list.forEach((x) => {
      byDay[x.date] = r2((byDay[x.date] || 0) + x.amount);
    });
    const all = Object.keys(byDay).sort().map((date) => ({ date, amount: byDay[date] }));
    if (all.length < 2) return;
    // keep the most recent unbroken monthly run
    const run = [all[all.length - 1]];
    for (let i = all.length - 2; i >= 0; i--) {
      const gap = (parseYmd(run[0].date).getTime() - parseYmd(all[i].date).getTime()) / DAY;
      if (gap >= 25 && gap <= 36) run.unshift(all[i]);
      else break;
    }
    if (run.length < 2) return;
    const amounts = run.slice(-3).map((x) => -x.amount);
    if (Math.max(...amounts) / Math.min(...amounts) > 1.15) return; // tolerate a price change, not groceries
    const days = run.map((x) => parseYmd(x.date).getDate()).sort((a, b) => a - b);
    out.push({ key, count: run.length, amount: amounts[amounts.length - 1], day: days[Math.floor(days.length / 2)], last: run[run.length - 1].date });
  });
  return out;
}

export function matchCharge(s: State, f: Recurring) {
  return (
    s.charges.find((x) => x.detectKey === f.key) ||
    s.charges.find((x) => x.freq !== 'year' && merchantKey(x.label) === f.key) ||
    s.charges.find(
      (x) => x.freq !== 'year' && !x.detectKey && Math.abs(x.amount - f.amount) <= Math.max(0.5, x.amount * 0.05) && dayDist(x.day, f.day) <= 3,
    ) ||
    null
  );
}

export const detectSuggestions = (s: State) =>
  detectRecurring(s).filter((f) => !s.ignoredRecurring.includes(f.key) && !matchCharge(s, f));

export function addDetected(s: State, f: Recurring): Charge {
  const c: Charge = {
    id: uid(), label: prettyName(f.key), amount: f.amount, day: f.day, freq: 'month',
    detectKey: f.key, auto: true, seen: f.last, hits: f.count,
  };
  s.charges.push(c);
  return c;
}

/** Links known charges, follows price changes and (if enabled) adds new subscriptions. Returns true when the state changed. */
export function runDetection(s: State) {
  let changed = false;
  const added: Charge[] = [];
  const priced: { label: string; from: number; to: number }[] = [];
  detectRecurring(s).forEach((f) => {
    if (s.ignoredRecurring.includes(f.key)) return;
    const c = matchCharge(s, f);
    if (c) {
      if (!c.detectKey) {
        c.detectKey = f.key;
        c.seen = f.last;
        changed = true;
      }
      if (f.last > (c.seen ?? '')) {
        if (Math.abs(c.amount - f.amount) > 0.009) {
          priced.push({ label: c.label, from: c.amount, to: f.amount });
          c.amount = f.amount;
        }
        c.seen = f.last;
        changed = true;
      }
      if (c.hits !== f.count) {
        c.hits = f.count;
        changed = true;
      }
      return;
    }
    if (s.settings.autoSubs) {
      added.push(addDetected(s, f));
      changed = true;
    }
  });
  if (added.length || priced.length) {
    s.notices.unshift({ id: uid(), added: added.map((c) => ({ label: c.label, amount: c.amount })), priced });
    s.notices = s.notices.slice(0, 3);
  }
  return changed;
}
