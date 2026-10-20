import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { store } from './storage';
import * as Haptics from 'expo-haptics';
import { catchUp, clone } from '../domain/engine';
import { freshState, type StartParams } from '../domain/fresh';
import { runDetection } from '../domain/detection';
import { migrate } from '../domain/migrate';
import { demoState } from '../domain/demo';
import type { CategoryKey, State } from '../domain/types';

const KEY = 'reste-a-vivre/state';

export type SheetSpec =
  | { kind: 'tx'; id?: string }
  | { kind: 'wish'; label?: string; price?: number }
  | { kind: 'charge'; id?: string }
  | { kind: 'bill'; id?: string }
  | { kind: 'goal'; id?: string; label?: string; price?: number; fromWish?: string }
  | { kind: 'move' }
  | { kind: 'goalItem'; goalId: string; itemId?: string }
  | { kind: 'goalMove'; goalId: string; dir: 'in' | 'out' }
  | { kind: 'cushion' }
  | { kind: 'withdraw' }
  | { kind: 'debt'; id?: string }
  | { kind: 'debtPay'; debtId: string }
  | { kind: 'quick' }
  | { kind: 'envelope'; key?: CategoryKey }
  | { kind: 'start' }
  | { kind: 'balance' };

interface Store {
  state: State;
  /** Applies a change on a copy of the state, re-runs subscription detection and saves. */
  update: (fn: (s: State) => void, toastMessage?: string) => void;
  reset: () => void;
  /** Leaves the example data and starts with the user's own figures. */
  startFresh: (p: StartParams) => void;
  toast: (message: string) => void;
  toastMessage: string | null;
  sheet: SheetSpec | null;
  openSheet: (spec: SheetSpec) => void;
  closeSheet: () => void;
  /** Changes every minute so timers (48 h rule, withdrawals) refresh */
  tick: number;
  /** Current time in ms, refreshed every minute */
  now: number;
}

const Ctx = createContext<Store | null>(null);

function load(): State {
  let s: State;
  let raw: string | null = null;
  try {
    raw = store.get(KEY);
    s = migrate(raw ? JSON.parse(raw) : null);
  } catch {
    // Never lose a save we cannot read (e.g. written by a newer version): keep a copy before starting fresh
    try {
      if (raw) store.set(`${KEY}/backup-${Date.now()}`, raw);
    } catch {}
    s = demoState();
  }
  catchUp(s);
  runDetection(s);
  return s;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(load);
  const [sheet, setSheet] = useState<SheetSpec | null>(null);
  const [toastMessage, setToast] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    store.setAsync(KEY, JSON.stringify(state)).catch(() => {});
  }, [state]);

  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1);
      setNow(Date.now());
      // A new day: pay the charges that just came due
      setState((prev) => {
        const next = clone(prev);
        return catchUp(next) ? next : prev;
      });
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const toast = useCallback((message: string) => {
    setToast(message);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const update = useCallback(
    (fn: (s: State) => void, toastMessage?: string) => {
      setState((prev) => {
        const next = clone(prev);
        fn(next);
        runDetection(next);
        return next;
      });
      if (toastMessage) toast(toastMessage);
    },
    [toast],
  );

  const reset = useCallback(() => {
    const s = demoState();
    runDetection(s);
    setState(s);
    toast("Données d'exemple remises");
  }, [toast]);

  const startFresh = useCallback(
    (p: StartParams) => {
      setState(freshState(p));
      toast('C’est parti avec tes vraies données');
    },
    [toast],
  );

  const value = useMemo<Store>(
    () => ({
      state, update, reset, startFresh, toast, toastMessage, sheet, tick, now,
      openSheet: (spec) => setSheet(spec),
      closeSheet: () => setSheet(null),
    }),
    [state, update, reset, startFresh, toast, toastMessage, sheet, tick, now],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside AppProvider');
  return v;
}
