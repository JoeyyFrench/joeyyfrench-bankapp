import { addDays, onDay, realToday, uid, ymd } from './format';
import { buildMoveItems, sumItems } from './engine';
import type { Charge, State, Tx } from './types';

/** Example data shaped like a bunq sandbox account. Nothing here is the user's. */
export function demoState(): State {
  const t = realToday();
  const rel = (n: number) => ymd(addDays(t, n));
  const hoursAgo = (h: number) => new Date(Date.now() - h * 36e5).toISOString();
  const m = (c: Omit<Charge, 'id' | 'freq'>): Charge => ({ id: uid(), freq: 'month', ...c });
  const y = (c: Omit<Charge, 'id' | 'freq'>): Charge => ({ id: uid(), freq: 'year', ...c });
  const tx = (label: string, amount: number, date: string, pocket: Tx['pocket'] = 'courant'): Tx => ({
    id: uid(), label, amount, date, src: 'bunq', pocket,
  });
  /** Bank history: one debit per month on `day`, oldest first. */
  const past = (label: string, amounts: number[], day: number) => {
    const base = onDay(t.getFullYear(), t.getMonth(), day) <= t ? 0 : 1;
    const n = amounts.length;
    return amounts.map((a, i) => tx(label, -a, ymd(onDay(t.getFullYear(), t.getMonth() - base - (n - 1 - i), day))));
  };
  const moveItems = buildMoveItems({
    rent: 550, charges: 50, furnished: false, agency: true, surface: 30, zoneRate: 8, moveCost: 350, setup: 800, insurance: 120,
  });

  return {
    v: 6,
    demo: true,
    clock: null,
    settings: {
      payDay: 28, salary: 2000, otherIncome: 0, lifeBudget: 550, marginShare: 60, debtShare: 70, cushion: 300, wishMin: 80, autoSubs: true,
    },
    balance: 612.45,
    pockets: { bills: 360, cushion: 300, savings: 450, debts: 40 },
    lastSync: new Date().toISOString(),
    charges: [
      m({ label: 'Loyer', amount: 520, day: 5 }),
      m({ label: 'Assurance auto', amount: 48.2, day: 10 }),
      m({ label: 'Forfait mobile', amount: 15.99, day: 12 }),
      m({ label: 'Box internet', amount: 29.99, day: 20 }),
      m({ label: 'Électricité', amount: 62, day: 25 }),
      y({ label: 'Assurance habitation', amount: 132, month: 11, day: 11, saved: 110 }),
      y({ label: 'Entretien chaudière', amount: 110, month: 2, day: 3, saved: 50 }),
      y({ label: 'Assurance moto', amount: 280, month: 3, day: 15, saved: 115 }),
    ],
    bills: [
      { id: uid(), label: 'Contrôle technique', amount: 78, due: rel(6), paid: false },
      { id: uid(), label: 'Révision moto', amount: 145, due: rel(9), paid: false },
      { id: uid(), label: 'Amende stationnement', amount: 35, due: rel(-3), paid: true },
    ],
    goals: [
      {
        id: uid(), label: 'Appartement', kind: 'move', items: moveItems, target: sumItems(moveItems), balance: 250, monthly: 0,
        mode: 'date', deadline: rel(300), created: rel(-35), startProgress: 0,
      },
      { id: uid(), label: "Vacances d'été", target: 800, balance: 220, monthly: 60, mode: 'month' },
    ],
    wishes: [
      { id: uid(), label: 'Sweat à capuche', price: 65, added: hoursAgo(50), status: 'waiting' },
      { id: uid(), label: 'Casque audio sans fil', price: 149, added: hoursAgo(10), status: 'waiting' },
      { id: uid(), label: 'Jeu vidéo en précommande', price: 79.99, added: hoursAgo(200), status: 'dropped' },
    ],
    debts: [
      { id: uid(), label: 'Crédit conso', initial: 2000, remaining: 1200, monthly: 85 },
      { id: uid(), label: 'Paiement en 4 fois', initial: 240, remaining: 180, monthly: 60 },
      { id: uid(), label: "Prêt d'un ami", initial: 300, remaining: 300, monthly: 0 },
    ],
    tx: [
      tx('Supermarché', -46.82, rel(0)),
      tx('Boulangerie', -4.6, rel(-1)),
      tx('Station essence', -58.4, rel(-2)),
      tx('Amende stationnement', -35, rel(-3), 'bills'),
      tx('Remboursement ami', 20, rel(-4)),
      tx('Restaurant', -23.5, rel(-6)),
      tx('CB LECLERC', -62.3, rel(-40)),
      tx('CB LECLERC', -48.1, rel(-26)),
      tx('CB LECLERC', -91.7, rel(-9)),
      ...past('PRLV SEPA BASIC FIT', [29.99, 29.99, 29.99], 3),
      ...past('SPOTIFY STOCKHOLM', [10.99, 10.99, 11.12], 22),
      ...past('NETFLIX.COM', [13.49, 13.49], 14),
      ...past('PRLV SEPA FREE MOBILE', [15.99, 15.99, 15.99], 12),
    ],
    allocations: [],
    withdrawals: [],
    ignoredRecurring: [],
    notices: [],
  };
}
