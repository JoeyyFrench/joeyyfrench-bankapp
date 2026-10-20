export type PocketKey = 'courant' | 'bills' | 'year' | 'cushion' | 'savings' | 'goal' | 'debts';
export type TxSource = 'bunq' | 'manuel' | 'auto';

export interface Tx {
  id: string;
  label: string;
  /** Negative = money out, positive = money in */
  amount: number;
  /** YYYY-MM-DD */
  date: string;
  src: TxSource;
  pocket: PocketKey;
}

export interface Charge {
  id: string;
  label: string;
  amount: number;
  freq: 'month' | 'year';
  /** Day of month the debit happens */
  day: number;
  /** 1-12, yearly charges only */
  month?: number;
  /** Amount already put aside, yearly charges only */
  saved?: number;
  /** Merchant key when linked to detected recurring payments */
  detectKey?: string;
  /** Added automatically by the recurring-payment detector */
  auto?: boolean;
  /** Date of the last payment seen for this charge */
  seen?: string;
  hits?: number;
}

export interface Bill {
  id: string;
  label: string;
  amount: number;
  due: string;
  paid: boolean;
  txIds?: string[];
}

export interface GoalItem {
  id: string;
  label: string;
  amount: number;
  paid: boolean;
  txIds?: string[];
}

export interface Goal {
  id: string;
  label: string;
  kind?: 'move';
  target: number;
  balance: number;
  monthly: number;
  mode: 'month' | 'date';
  deadline?: string | null;
  created?: string;
  startProgress?: number;
  items?: GoalItem[];
}

export interface Wish {
  id: string;
  label: string;
  price: number;
  /** ISO timestamp */
  added: string;
  status: 'waiting' | 'bought' | 'dropped' | 'goal';
}

export interface Debt {
  id: string;
  label: string;
  initial: number;
  remaining: number;
  /** Mandatory monthly payment, 0 if none */
  monthly: number;
}

export interface Withdrawal {
  id: string;
  amount: number;
  reason: string;
  note: string;
  requested: string;
  release: string;
  status: 'pending' | 'done' | 'cancelled';
}

export type MonthStatus = 'large' | 'ok' | 'tight';

export interface Allocation {
  id: string;
  date: string;
  income: number;
  salary: number;
  toBills: number;
  wantBills: number;
  toYear: number;
  wantYear: number;
  toDebtMin: number;
  toGoals: number;
  toCushion: number;
  life: number;
  marge: number;
  setAside: number;
  toDebtExtra: number;
  toSavings: number;
  status: MonthStatus;
  left: number;
}

export interface Notice {
  id: string;
  added: { label: string; amount: number }[];
  priced: { label: string; from: number; to: number }[];
}

export interface Settings {
  payDay: number;
  salary: number;
  otherIncome: number;
  lifeBudget: number;
  /** % of the monthly margin put aside */
  marginShare: number;
  /** % of what is put aside that goes to debts while debts remain */
  debtShare: number;
  /** Target for the safety cushion */
  cushion: number;
  /** Purchases above this amount are suggested for the 48 h rule */
  wishMin: number;
  autoSubs: boolean;
}

export interface Pockets {
  bills: number;
  cushion: number;
  savings: number;
  debts: number;
}

export interface State {
  v: 6;
  demo: boolean;
  /** Simulated "today" (YYYY-MM-DD) after a simulated payday, null = real date */
  clock: string | null;
  settings: Settings;
  /** Current account balance */
  balance: number;
  pockets: Pockets;
  lastSync: string;
  charges: Charge[];
  bills: Bill[];
  goals: Goal[];
  wishes: Wish[];
  debts: Debt[];
  tx: Tx[];
  allocations: Allocation[];
  withdrawals: Withdrawal[];
  ignoredRecurring: string[];
  notices: Notice[];
}
