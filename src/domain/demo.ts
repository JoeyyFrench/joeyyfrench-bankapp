import { addDays, onDay, r2, realToday, uid, ymd } from './format';
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
  const moveItems = buildMoveItems({
    rent: 550, charges: 50, furnished: false, agency: true, surface: 30, zoneRate: 8, moveCost: 350, setup: 800, insurance: 120,
  });

  return {
    v: 7,
    demo: true,
    clock: null,
    settings: {
      payDay: 28, salary: 2000, otherIncome: 0, lifeBudget: 550, marginShare: 60, debtShare: 70, cushion: 300, wishMin: 80, autoSubs: true,
      envelopes: { courses: 250, sorties: 120, transport: 120, shopping: 60 },
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
    tx: history(),
    allocations: [],
    withdrawals: [],
    ignoredRecurring: [],
    notices: [],
    history: [5, 4, 3, 2, 1].map((k, i) => ({
      date: ymd(onDay(t.getFullYear(), t.getMonth() - k, 28)),
      savings: [180, 240, 300, 360, 420][i],
      debts: [2240, 2120, 1985, 1860, 1735][i],
    })),
  };

  /** Six months of bank history, so the stats and the subscription detector have something to work with. */
  function history(): Tx[] {
    let seed = 42;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const out: Tx[] = [];
    const cut = ymd(t);
    const add = (label: string, amount: number, d: Date, extra: Partial<Tx> = {}) => {
      const date = ymd(d);
      if (date <= cut) out.push({ ...tx(label, r2(amount), date), ...extra });
    };
    for (let k = 6; k >= 0; k--) {
      const at = (day: number) => onDay(t.getFullYear(), t.getMonth() - k, day);
      add('Salaire', 2000, at(28));
      add('PRLV LOYER', -520, at(5));
      add('PRLV ASSURANCE AUTO', -48.2, at(10));
      add('PRLV SEPA FREE MOBILE', -15.99, at(12));
      add('PRLV BOX INTERNET', -29.99, at(20));
      add('PRLV EDF', -62, at(25));
      add('PRLV SEPA BASIC FIT', -29.99, at(3));
      add('SPOTIFY STOCKHOLM', k >= 2 ? -10.99 : -11.12, at(22));
      if (k <= 1) add('NETFLIX.COM', -13.49, at(14));
      add('Mensualité Crédit conso', -85, at(28), { src: 'auto', category: 'dettes' });
      add('Mensualité Paiement en 4 fois', -60, at(28), { src: 'auto', category: 'dettes' });
      [2, 9, 16, 23].forEach((d, i) => add(i % 2 ? 'CB LIDL' : 'CB LECLERC', -(35 + rand() * 55), at(d)));
      [7, 21].forEach((d) => add('CB STATION ESSENCE', -(45 + rand() * 25), at(d)));
      [6, 13, 19, 27].forEach((d, i) => add(i % 2 ? 'CB BOULANGERIE' : 'CB RESTAURANT', -(i % 2 ? 4 + rand() * 6 : 18 + rand() * 30), at(d)));
      if (rand() > 0.4) add('CB AMAZON', -(15 + rand() * 60), at(17));
      if (rand() > 0.7) add('CB PHARMACIE', -(8 + rand() * 20), at(11));
      if (k === 2) add('Remboursement ami', 20, at(15));
    }
    return out;
  }
}
