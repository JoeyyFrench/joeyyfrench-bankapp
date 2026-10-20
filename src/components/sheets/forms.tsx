import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useApp } from '../../store/AppStore';
import { SheetFrame } from './SheetFrame';
import { AmountField, Banner, Btn, DateField, Field, KV, Segmented, Txt, Tip } from '../../ui/kit';
import { CATEGORY_COLOR, useColors } from '../../ui/theme';
import {
  HOLD_HOURS, WISH_HOURS, WITHDRAW_REASONS, addTx, buildMoveItems, countPaydays, deleteCharge, deleteGoal, deleteTx,
  goalProgress, goalTarget, moveBetween, nextOcc, nextPayday, repayDebt, requestWithdrawal, sumItems, today,
  type MoveParams,
} from '../../domain/engine';
import { addDays, amountInput, dateShort, eur, onDay, parseAmount, parseYmd, r2, uid, ymd } from '../../domain/format';
import type { CategoryKey, State } from '../../domain/types';
import { CATEGORY_KEYS, CATEGORY_LABEL, categorize } from '../../domain/stats';

const AMOUNT_ERROR = 'Entre un montant supérieur à 0, par ex. 12,50.';
const futureDate = (s: State, v: string) => !!v && parseYmd(v) > today(s);

/* ------------------------------------------------------------ operation */

export function TxForm({ id }: { id?: string }) {
  const { state, update, closeSheet, openSheet } = useApp();
  const it = id ? state.tx.find((x) => x.id === id) : undefined;
  const [type, setType] = useState<'out' | 'in'>(it && it.amount > 0 ? 'in' : 'out');
  const [label, setLabel] = useState(it?.label ?? '');
  const [amount, setAmount] = useState(it ? amountInput(Math.abs(it.amount)) : '');
  const [date, setDate] = useState(it?.date ?? ymd(today(state)));
  const [cat, setCat] = useState<CategoryKey | undefined>(it?.category);
  const a = parseAmount(amount);
  const guessed = categorize(state, { label: label || ' ' });
  const nudge = !it && type === 'out' && a >= state.settings.wishMin;

  return (
    <SheetFrame
      title={it ? "Modifier l'opération" : 'Nouvelle opération'}
      submitLabel={it ? 'Enregistrer' : 'Ajouter'}
      onSubmit={() => {
        if (!label.trim()) return 'Donne un libellé.';
        if (!(a > 0)) return AMOUNT_ERROR;
        const signed = type === 'in' ? a : -a;
        update((s) => {
          const prev = id ? s.tx.find((x) => x.id === id) : undefined;
          s.balance = r2(s.balance - (prev?.amount ?? 0) + signed);
          const category = type === 'out' ? cat : undefined;
          if (prev) {
            Object.assign(prev, { label: label.trim(), amount: signed, date, category });
            if (!category) delete prev.category;
          } else addTx(s, label.trim(), signed, 'courant', 'manuel', date, category ? { category } : undefined);
        }, it ? 'Modifié' : 'Ajouté');
        closeSheet();
      }}
      onDelete={it ? () => { update((s) => deleteTx(s, it.id), 'Supprimé'); closeSheet(); } : undefined}
    >
      <Segmented options={[{ value: 'out', label: 'Dépense' }, { value: 'in', label: 'Rentrée' }]} value={type} onChange={setType} />
      <Field label="Libellé" value={label} onChangeText={setLabel} placeholder="ex. Courses" autoFocus={!it} />
      <AmountField label="Montant (€)" value={amount} onChangeText={setAmount} />
      <DateField label="Date" value={date} onChange={setDate} />
      {type === 'out' ? <CategoryPicker value={cat} guessed={guessed} onChange={setCat} /> : null}
      {nudge ? (
        <Banner tone="goal">
          <View style={{ gap: 8 }}>
            <Txt style={{ fontSize: 13.5 }}>Gros achat plaisir ? Mets-le dans tes Envies et décide dans {WISH_HOURS} h.</Txt>
            <Btn small title="Mettre dans mes Envies" onPress={() => openSheet({ kind: 'wish', label: label.trim(), price: a })} />
          </View>
        </Banner>
      ) : null}
    </SheetFrame>
  );
}

function CategoryPicker({ value, guessed, onChange }: { value?: CategoryKey; guessed: CategoryKey; onChange: (v?: CategoryKey) => void }) {
  const c = useColors();
  const chip = (key: CategoryKey | undefined, text: string) => {
    const on = value === key;
    return (
      <Pressable
        key={key ?? 'auto'}
        accessibilityRole="radio"
        accessibilityState={{ checked: on }}
        onPress={() => onChange(key)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: on ? c.accent : c.line, backgroundColor: on ? c.accentSoft : 'transparent', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 }}
      >
        {key ? <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: CATEGORY_COLOR[key] }} /> : null}
        <Text style={{ color: on ? c.ink : c.muted, fontSize: 13.5, fontWeight: '600' }}>{text}</Text>
      </Pressable>
    );
  };
  return (
    <View style={{ gap: 6 }}>
      <Txt muted style={{ fontSize: 13, fontWeight: '600' }}>Catégorie</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {chip(undefined, `Auto · ${CATEGORY_LABEL[guessed]}`)}
        {CATEGORY_KEYS.map((k) => chip(k, CATEGORY_LABEL[k]))}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ wish */

export function WishForm({ label: l0, price: p0 }: { label?: string; price?: number }) {
  const { update, closeSheet } = useApp();
  const [label, setLabel] = useState(l0 ?? '');
  const [price, setPrice] = useState(p0 ? amountInput(p0) : '');
  return (
    <SheetFrame
      title="Nouvelle envie"
      submitLabel={`Attendre ${WISH_HOURS} h`}
      onSubmit={() => {
        const p = parseAmount(price);
        if (!label.trim()) return 'Donne un nom.';
        if (!(p > 0)) return AMOUNT_ERROR;
        update((s) => { s.wishes.push({ id: uid(), label: label.trim(), price: p, added: new Date().toISOString(), status: 'waiting' }); },
          `Envie notée. Tu décides dans ${WISH_HOURS} h.`);
        closeSheet();
      }}
    >
      <Banner>{`L'envie reste ici ${WISH_HOURS} h. Ensuite, tu choisis : l'acheter, en faire un objectif ou laisser tomber.`}</Banner>
      <Field label="Quoi ?" value={label} onChangeText={setLabel} placeholder="ex. Baskets" autoFocus={!l0} />
      <AmountField label="Prix (€)" value={price} onChangeText={setPrice} />
    </SheetFrame>
  );
}

/* ---------------------------------------------------------------- charge */

export function ChargeForm({ id }: { id?: string }) {
  const { state, update, closeSheet } = useApp();
  const it = id ? state.charges.find((x) => x.id === id) : undefined;
  const t = today(state);
  const [freq, setFreq] = useState<'month' | 'year'>(it?.freq ?? 'month');
  const [label, setLabel] = useState(it?.label ?? '');
  const [amount, setAmount] = useState(it ? amountInput(it.amount) : '');
  const [day, setDay] = useState(it && it.freq !== 'year' ? String(it.day) : '');
  const [yDate, setYDate] = useState(it && it.freq === 'year' ? ymd(nextOcc(it, t)) : ymd(addDays(t, 30)));

  return (
    <SheetFrame
      title={it ? 'Modifier la charge' : 'Nouvelle charge'}
      submitLabel={it ? 'Enregistrer' : 'Ajouter'}
      onSubmit={() => {
        const a = parseAmount(amount);
        if (!label.trim()) return 'Donne un libellé.';
        if (!(a > 0)) return AMOUNT_ERROR;
        if (freq === 'month') {
          const d = parseInt(day, 10);
          if (!(d >= 1 && d <= 31)) return 'Le jour doit être entre 1 et 31.';
          update((s) => {
            const prev = id ? s.charges.find((x) => x.id === id) : undefined;
            if (prev && prev.freq === 'year' && (prev.saved ?? 0) > 0) s.balance = r2(s.balance + (prev.saved ?? 0));
            const data = { label: label.trim(), amount: a, freq: 'month' as const, day: d, month: undefined, saved: undefined };
            if (prev) Object.assign(prev, data);
            else s.charges.push({ id: uid(), ...data });
          }, it ? 'Modifié' : 'Ajouté');
        } else {
          if (!yDate) return 'Choisis la date de la prochaine échéance.';
          const dd = parseYmd(yDate);
          update((s) => {
            const prev = id ? s.charges.find((x) => x.id === id) : undefined;
            const data = {
              label: label.trim(), amount: a, freq: 'year' as const, month: dd.getMonth() + 1, day: dd.getDate(),
              saved: prev && prev.freq === 'year' ? Math.min(prev.saved ?? 0, a) : 0,
            };
            if (prev) Object.assign(prev, data);
            else s.charges.push({ id: uid(), ...data });
          }, it ? 'Modifié' : 'Ajouté');
        }
        closeSheet();
      }}
      onDelete={it ? () => { update((s) => deleteCharge(s, it.id), 'Supprimé'); closeSheet(); } : undefined}
    >
      <Segmented options={[{ value: 'month', label: 'Chaque mois' }, { value: 'year', label: 'Une fois par an' }]} value={freq} onChange={setFreq} />
      <Field label="Libellé" value={label} onChangeText={setLabel} placeholder="ex. Loyer" autoFocus={!it} />
      <AmountField label="Montant (€)" value={amount} onChangeText={setAmount} />
      {freq === 'month' ? (
        <Field label="Jour du prélèvement (1 à 31)" value={day} onChangeText={setDay} keyboardType="number-pad" placeholder="ex. 5" />
      ) : (
        <DateField label="Prochaine échéance" value={yDate} onChange={setYDate} />
      )}
      {it?.detectKey ? (
        <>
          <Banner>
            {`${it.auto ? 'Ajouté automatiquement' : 'Reconnu dans tes paiements'} à partir de ${it.hits ?? 2} paiements réguliers${
              it.seen ? `, le dernier le ${dateShort(parseYmd(it.seen))}` : ''
            }.`}
          </Banner>
          {it.auto ? (
            <Btn
              small
              variant="ghost"
              title="Ce n’est pas un abonnement"
              onPress={() => { update((s) => deleteCharge(s, it.id), 'Retiré. Il ne sera plus détecté.'); closeSheet(); }}
            />
          ) : null}
        </>
      ) : null}
    </SheetFrame>
  );
}

/* ------------------------------------------------------------------ bill */

export function BillForm({ id }: { id?: string }) {
  const { state, update, closeSheet } = useApp();
  const it = id ? state.bills.find((x) => x.id === id) : undefined;
  const [label, setLabel] = useState(it?.label ?? '');
  const [amount, setAmount] = useState(it ? amountInput(it.amount) : '');
  const [due, setDue] = useState(it?.due ?? ymd(addDays(today(state), 7)));
  return (
    <SheetFrame
      title={it ? 'Modifier la facture' : 'Nouvelle facture'}
      submitLabel={it ? 'Enregistrer' : 'Ajouter'}
      onSubmit={() => {
        const a = parseAmount(amount);
        if (!label.trim()) return 'Donne un libellé.';
        if (!(a > 0)) return AMOUNT_ERROR;
        if (!due) return "Choisis une date d'échéance.";
        update((s) => {
          const prev = id ? s.bills.find((x) => x.id === id) : undefined;
          if (prev) Object.assign(prev, { label: label.trim(), amount: a, due });
          else s.bills.push({ id: uid(), label: label.trim(), amount: a, due, paid: false });
        }, it ? 'Modifié' : 'Ajouté');
        closeSheet();
      }}
      onDelete={it ? () => { update((s) => { s.bills = s.bills.filter((x) => x.id !== it.id); }, 'Supprimé'); closeSheet(); } : undefined}
    >
      <Field label="Libellé" value={label} onChangeText={setLabel} placeholder="ex. Facture garage" autoFocus={!it} />
      <AmountField label="Montant (€)" value={amount} onChangeText={setAmount} />
      <DateField label="Échéance" value={due} onChange={setDue} />
    </SheetFrame>
  );
}

/* ------------------------------------------------------------------ goal */

export function GoalForm({ id, label: l0, price, fromWish }: { id?: string; label?: string; price?: number; fromWish?: string }) {
  const { state, update, closeSheet } = useApp();
  const it = id ? state.goals.find((x) => x.id === id) : undefined;
  const t = today(state);
  const [label, setLabel] = useState(it?.label ?? l0 ?? '');
  const [target, setTarget] = useState(it ? amountInput(it.target) : price ? amountInput(price) : '');
  const [mode, setMode] = useState<'date' | 'month'>(it ? it.mode : 'date');
  const [deadline, setDeadline] = useState(it?.deadline ?? ymd(onDay(t.getFullYear(), t.getMonth() + 6, t.getDate())));
  const [monthlyAmt, setMonthlyAmt] = useState(it ? amountInput(it.monthly || 0) : '');

  const tgt = it?.items ? goalTarget(it) : parseAmount(target);
  const n = deadline ? countPaydays(state, nextPayday(t, state.settings.payDay), parseYmd(deadline)) : 0;
  const perPay = n > 0 && tgt > 0 ? Math.ceil((Math.max(0, tgt - (it ? goalProgress(it) : 0)) / n) * 100) / 100 : 0;

  return (
    <SheetFrame
      title={it ? "Modifier l'objectif" : 'Nouvel objectif'}
      submitLabel={it ? 'Enregistrer' : 'Créer'}
      onSubmit={() => {
        if (!label.trim()) return 'Donne un nom.';
        if (!it?.items && !(tgt > 0)) return AMOUNT_ERROR;
        let monthlyVal = 0;
        if (mode === 'month') {
          monthlyVal = parseAmount(monthlyAmt || '0');
          if (!(monthlyVal >= 0)) return 'Indique un versement par paie (0 si aucun).';
        } else if (!futureDate(state, deadline)) return 'Choisis une date dans le futur.';
        update((s) => {
          const base = { label: label.trim(), mode, monthly: monthlyVal, deadline: mode === 'date' ? deadline : null, created: ymd(today(s)) };
          const prev = id ? s.goals.find((x) => x.id === id) : undefined;
          if (prev) {
            Object.assign(prev, base);
            if (!prev.items) prev.target = tgt;
            prev.startProgress = goalProgress(prev);
          } else {
            s.goals.push({ id: uid(), ...base, target: tgt, balance: 0, startProgress: 0 });
            const w = fromWish ? s.wishes.find((x) => x.id === fromWish) : undefined;
            if (w) w.status = 'goal';
          }
        }, it ? 'Objectif modifié' : 'Objectif créé');
        closeSheet();
      }}
      onDelete={it ? () => { update((s) => deleteGoal(s, it.id), 'Supprimé'); closeSheet(); } : undefined}
    >
      <Field label="Nom" value={label} onChangeText={setLabel} placeholder="ex. Vacances" autoFocus={!it && !l0} />
      {it?.items ? (
        <Banner>{`Budget total : ${eur(goalTarget(it))}. Il se calcule à partir des postes : modifie-les directement sur la carte.`}</Banner>
      ) : (
        <AmountField label="Montant à atteindre (€)" value={target} onChangeText={setTarget} />
      )}
      <Segmented options={[{ value: 'date', label: 'Pour une date' }, { value: 'month', label: 'Montant par mois' }]} value={mode} onChange={setMode} />
      {mode === 'date' ? (
        <>
          <DateField label="Date visée" value={deadline} onChange={setDeadline} />
          {tgt > 0 ? (
            <Banner>
              {n > 0
                ? `Il faudra mettre environ ${eur(perPay)} de côté à chaque paie (${n} paie${n > 1 ? 's' : ''} d'ici là).`
                : 'Cette date arrive avant ta prochaine paie : choisis une date plus lointaine.'}
            </Banner>
          ) : null}
        </>
      ) : (
        <AmountField label="Versement à chaque paie (€)" value={monthlyAmt} onChangeText={setMonthlyAmt} placeholder="ex. 50" />
      )}
      {it && it.balance > 0 ? <Tip>{`Si tu supprimes cet objectif, ses ${eur(it.balance)} reviennent sur le courant.`}</Tip> : null}
    </SheetFrame>
  );
}

/* ------------------------------------------------------------------ move */

const ZONES = [
  { rate: 8, label: 'Ailleurs en France' },
  { rate: 10, label: 'Zone tendue (grandes agglomérations)' },
  { rate: 12, label: 'Zone très tendue (Paris et proche banlieue)' },
];

export function MoveForm() {
  const { state, update, closeSheet } = useApp();
  const c = useColors();
  const t = today(state);
  const [label, setLabel] = useState('Appartement');
  const [deadline, setDeadline] = useState(ymd(onDay(t.getFullYear(), t.getMonth() + 8, 1)));
  const [rent, setRent] = useState('');
  const [chg, setChg] = useState('');
  const [furnished, setFurnished] = useState(false);
  const [agency, setAgency] = useState(false);
  const [surface, setSurface] = useState('');
  const [zoneRate, setZoneRate] = useState(8);
  const [moveCost, setMoveCost] = useState('350');
  const [setup, setSetup] = useState('800');
  const [insurance, setInsurance] = useState('120');
  const num = (v: string) => {
    const n = parseAmount(v);
    return n > 0 ? n : 0;
  };
  const params: MoveParams = {
    rent: num(rent), charges: num(chg), furnished, agency, surface: num(surface), zoneRate,
    moveCost: num(moveCost), setup: num(setup), insurance: num(insurance),
  };
  const items = buildMoveItems(params);
  const totalBudget = sumItems(items);
  const n = deadline ? countPaydays(state, nextPayday(t, state.settings.payDay), parseYmd(deadline)) : 0;

  return (
    <SheetFrame
      title="Préparer un déménagement"
      submitLabel="Créer l'objectif"
      onSubmit={() => {
        if (!label.trim()) return 'Donne un nom.';
        if (!(params.rent > 0)) return 'Indique le loyer visé.';
        if (!futureDate(state, deadline)) return 'Choisis une date de déménagement dans le futur.';
        if (agency && !(params.surface > 0)) return "Indique la surface pour estimer les frais d'agence.";
        update((s) => {
          const fresh = buildMoveItems(params);
          s.goals.push({
            id: uid(), label: label.trim(), kind: 'move', items: fresh, target: sumItems(fresh), balance: 0, monthly: 0,
            mode: 'date', deadline, created: ymd(today(s)), startProgress: 0,
          });
        }, 'Objectif déménagement créé');
        closeSheet();
      }}
    >
      <Banner>Remplis ce que tu sais. Tout reste modifiable ensuite, poste par poste.</Banner>
      <Field label="Nom" value={label} onChangeText={setLabel} />
      <DateField label="Date du déménagement" value={deadline} onChange={setDeadline} />
      <AmountField label="Loyer visé, hors charges (€)" value={rent} onChangeText={setRent} placeholder="ex. 550" />
      <AmountField label="Charges mensuelles (€)" value={chg} onChangeText={setChg} placeholder="ex. 50" />
      <Segmented
        options={[{ value: 'vide', label: 'Logement vide' }, { value: 'meuble', label: 'Meublé' }]}
        value={furnished ? 'meuble' : 'vide'}
        onChange={(v) => {
          const f = v === 'meuble';
          setFurnished(f);
          if (f && setup === '800') setSetup('250');
          if (!f && setup === '250') setSetup('800');
        }}
      />
      <Segmented options={[{ value: 'non', label: 'Sans agence' }, { value: 'oui', label: 'Avec agence' }]} value={agency ? 'oui' : 'non'} onChange={(v) => setAgency(v === 'oui')} />
      {agency ? (
        <>
          <Field label="Surface (m²)" value={surface} onChangeText={setSurface} keyboardType="number-pad" placeholder="ex. 30" />
          <View style={{ gap: 6 }}>
            <Txt muted style={{ fontSize: 13, fontWeight: '600' }}>Zone</Txt>
            {ZONES.map((z) => (
              <Pressable
                key={z.rate}
                accessibilityRole="radio"
                accessibilityState={{ checked: zoneRate === z.rate }}
                onPress={() => setZoneRate(z.rate)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}
              >
                <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: zoneRate === z.rate ? c.accent : c.line, alignItems: 'center', justifyContent: 'center' }}>
                  {zoneRate === z.rate ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.accent }} /> : null}
                </View>
                <Text style={{ color: c.ink, fontSize: 15 }}>{z.label}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
      <AmountField label="Déménagement : camion, essence… (€)" value={moveCost} onChangeText={setMoveCost} />
      <AmountField label="Installation : meubles, électroménager (€)" value={setup} onChangeText={setSetup} />
      <AmountField label="Assurance habitation, premier paiement (€)" value={insurance} onChangeText={setInsurance} />
      <View style={{ backgroundColor: c.bg, borderRadius: 12, padding: 12, gap: 6 }}>
        {params.rent > 0 ? (
          <>
            {items.map((i) => (
              <KV key={i.id} label={i.label} value={eur(i.amount)} />
            ))}
            <View style={{ borderTopWidth: 1, borderTopColor: c.line, paddingTop: 6 }}>
              <KV bold label="Budget total" value={eur(totalBudget)} />
            </View>
            {n > 0 ? (
              <KV bold label={`À chaque paie (${n} paie${n > 1 ? 's' : ''})`} value={eur(Math.ceil((totalBudget / n) * 100) / 100)} />
            ) : (
              <Txt color="danger" style={{ fontSize: 13.5 }}>Date trop proche : aucune paie d’ici là.</Txt>
            )}
          </>
        ) : (
          <Txt muted style={{ fontSize: 13.5 }}>Indique le loyer pour estimer le budget.</Txt>
        )}
      </View>
    </SheetFrame>
  );
}

/* -------------------------------------------------------- goal item/move */

export function GoalItemForm({ goalId, itemId }: { goalId: string; itemId?: string }) {
  const { state, update, closeSheet } = useApp();
  const g = state.goals.find((x) => x.id === goalId);
  const it = itemId ? g?.items?.find((x) => x.id === itemId) : undefined;
  const [label, setLabel] = useState(it?.label ?? '');
  const [amount, setAmount] = useState(it ? amountInput(it.amount) : '');
  if (!g) return null;
  return (
    <SheetFrame
      title={it ? 'Modifier le poste' : 'Nouveau poste'}
      submitLabel={it ? 'Enregistrer' : 'Ajouter'}
      onSubmit={() => {
        const a = parseAmount(amount);
        if (!label.trim()) return 'Donne un nom.';
        if (!(a > 0)) return AMOUNT_ERROR;
        update((s) => {
          const gg = s.goals.find((x) => x.id === goalId)!;
          gg.items = gg.items ?? [];
          const prev = itemId ? gg.items.find((x) => x.id === itemId) : undefined;
          if (prev) Object.assign(prev, { label: label.trim(), amount: a });
          else gg.items.push({ id: uid(), label: label.trim(), amount: a, paid: false });
          gg.target = sumItems(gg.items);
        }, it ? 'Poste modifié' : 'Poste ajouté');
        closeSheet();
      }}
      onDelete={
        it
          ? () => {
              update((s) => {
                const gg = s.goals.find((x) => x.id === goalId)!;
                gg.items = (gg.items ?? []).filter((x) => x.id !== itemId);
                gg.target = sumItems(gg.items);
              }, 'Poste supprimé');
              closeSheet();
            }
          : undefined
      }
    >
      <Field label="Poste" value={label} onChangeText={setLabel} placeholder="ex. Frigo" autoFocus={!it} />
      <AmountField label="Montant (€)" value={amount} onChangeText={setAmount} />
    </SheetFrame>
  );
}

export function GoalMoveForm({ goalId, dir }: { goalId: string; dir: 'in' | 'out' }) {
  const { state, update, closeSheet } = useApp();
  const g = state.goals.find((x) => x.id === goalId);
  const [amount, setAmount] = useState(dir === 'out' && g ? amountInput(g.balance) : '');
  if (!g) return null;
  return (
    <SheetFrame
      title={dir === 'in' ? `Ajouter à « ${g.label} »` : `Utiliser « ${g.label} »`}
      submitLabel={dir === 'in' ? 'Ajouter depuis le courant' : 'Virer sur le courant'}
      onSubmit={() => {
        const a = parseAmount(amount);
        if (!(a > 0)) return AMOUNT_ERROR;
        if (dir === 'in' && a > state.balance) return `Ton courant n'a que ${eur(state.balance)}.`;
        if (dir === 'out' && a > g.balance) return `Maximum ${eur(g.balance)}.`;
        update((s) => {
          const gg = s.goals.find((x) => x.id === goalId)!;
          if (dir === 'in') moveBetween(s, 'courant', 'goal', a, `Objectif ${gg.label}`, gg);
          else moveBetween(s, 'goal', 'courant', a, `Depuis ${gg.label}`, gg);
        }, dir === 'in' ? "Ajouté à l'objectif" : 'Viré sur le courant');
        closeSheet();
      }}
    >
      <Banner>{dir === 'in' ? `Pris sur ton compte courant (${eur(state.balance)}).` : `Disponible : ${eur(g.balance)}.`}</Banner>
      <AmountField label="Montant (€)" value={amount} onChangeText={setAmount} autoFocus />
    </SheetFrame>
  );
}

/* --------------------------------------------------- cushion / withdraw */

export function CushionForm() {
  const { state, update, closeSheet } = useApp();
  const [amount, setAmount] = useState('');
  return (
    <SheetFrame
      title="Utiliser la Sécurité"
      submitLabel="Virer sur le courant"
      onSubmit={() => {
        const a = parseAmount(amount);
        if (!(a > 0)) return AMOUNT_ERROR;
        if (a > state.pockets.cushion) return `Maximum ${eur(state.pockets.cushion)}.`;
        update((s) => moveBetween(s, 'cushion', 'courant', a, 'Depuis Sécurité'), 'Viré sur le courant');
        closeSheet();
      }}
    >
      <Banner>{`Disponible : ${eur(state.pockets.cushion)}. Elle sera recomplétée à la prochaine paie.`}</Banner>
      <AmountField label="Montant (€)" value={amount} onChangeText={setAmount} autoFocus />
    </SheetFrame>
  );
}

export function WithdrawForm() {
  const { state, update, closeSheet } = useApp();
  const c = useColors();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  return (
    <SheetFrame
      title="Débloquer de l'épargne"
      submitLabel="Envoyer la demande"
      onSubmit={() => {
        const a = parseAmount(amount);
        if (!(a > 0)) return AMOUNT_ERROR;
        if (a > state.pockets.savings) return `Tu ne peux pas demander plus que ${eur(state.pockets.savings)}.`;
        if (!reason) return 'Choisis une raison.';
        if (note.trim().length < 20)
          return "Explique un peu plus (20 caractères minimum). Si tu n'arrives pas à le justifier, ce n'est peut-être pas une urgence.";
        update((s) => requestWithdrawal(s, a, reason, note.trim()), `Demande envoyée. Disponible dans ${HOLD_HOURS} h.`);
        closeSheet();
      }}
    >
      <Banner>{`Disponible : ${eur(state.pockets.savings)}. Après ta demande, l'argent reste bloqué ${HOLD_HOURS} h. Si l'envie passe, tu annules et rien ne bouge.`}</Banner>
      <AmountField label="Montant (€)" value={amount} onChangeText={setAmount} />
      <View style={{ gap: 6 }}>
        <Txt muted style={{ fontSize: 13, fontWeight: '600' }}>Raison</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {WITHDRAW_REASONS.map((r) => {
            const on = r === reason;
            return (
              <Pressable
                key={r}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => setReason(r)}
                style={{ borderWidth: 1, borderColor: on ? c.save : c.line, backgroundColor: on ? c.save : 'transparent', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }}
              >
                <Text style={{ color: on ? c.surface : c.ink, fontSize: 14, fontWeight: '600' }}>{r}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Field
        label="Explique en une phrase (20 caractères min.)"
        value={note}
        onChangeText={setNote}
        multiline
        placeholder="ex. Le pneu arrière est crevé, remplacement chez le garagiste"
      />
    </SheetFrame>
  );
}

/* ----------------------------------------------------------------- debts */

export function DebtForm({ id }: { id?: string }) {
  const { state, update, closeSheet } = useApp();
  const it = id ? state.debts.find((x) => x.id === id) : undefined;
  const [label, setLabel] = useState(it?.label ?? '');
  const [remaining, setRemaining] = useState(it ? amountInput(it.remaining) : '');
  const [monthlyAmt, setMonthlyAmt] = useState(it ? amountInput(it.monthly) : '');
  return (
    <SheetFrame
      title={it ? 'Modifier la dette' : 'Nouvelle dette'}
      submitLabel={it ? 'Enregistrer' : 'Ajouter'}
      onSubmit={() => {
        const a = parseAmount(remaining);
        const m = parseAmount(monthlyAmt || '0');
        if (!label.trim()) return 'Indique à qui ou pour quoi.';
        if (!(a >= 0) || (!it && !(a > 0))) return AMOUNT_ERROR;
        if (!(m >= 0)) return 'Indique la mensualité (0 si aucune).';
        update((s) => {
          const prev = id ? s.debts.find((x) => x.id === id) : undefined;
          if (prev) Object.assign(prev, { label: label.trim(), remaining: a, monthly: m, initial: Math.max(prev.initial, a) });
          else s.debts.push({ id: uid(), label: label.trim(), initial: a, remaining: a, monthly: m });
        }, it ? 'Dette modifiée' : 'Dette ajoutée');
        closeSheet();
      }}
      onDelete={it ? () => { update((s) => { s.debts = s.debts.filter((x) => x.id !== it.id); }, 'Supprimé'); closeSheet(); } : undefined}
    >
      <Field label="À qui ou pour quoi" value={label} onChangeText={setLabel} placeholder="ex. Prêt d'un ami, crédit conso" autoFocus={!it} />
      <AmountField label="Montant restant dû (€)" value={remaining} onChangeText={setRemaining} />
      <AmountField label="Mensualité obligatoire (€, 0 si aucune)" value={monthlyAmt} onChangeText={setMonthlyAmt} placeholder="0" />
      <Banner>La mensualité est payée à chaque paie, avant l’épargne. En plus, une part de ta marge va dans la pocket Dettes pour rembourser plus vite.</Banner>
    </SheetFrame>
  );
}

export function DebtPayForm({ debtId }: { debtId: string }) {
  const { state, update, closeSheet } = useApp();
  const d = state.debts.find((x) => x.id === debtId);
  const [amount, setAmount] = useState(d ? amountInput(r2(Math.min(state.pockets.debts, d.remaining))) : '');
  if (!d) return null;
  return (
    <SheetFrame
      title={`Rembourser « ${d.label} »`}
      submitLabel="Rembourser"
      onSubmit={() => {
        const a = parseAmount(amount);
        if (!(a > 0)) return AMOUNT_ERROR;
        if (a > state.pockets.debts) return `La pocket Dettes contient ${eur(state.pockets.debts)}.`;
        const done = r2(d.remaining - Math.min(a, d.remaining)) <= 0;
        update((s) => { repayDebt(s, s.debts.find((x) => x.id === debtId)!, a); }, done ? `« ${d.label} » est remboursée` : `${eur(Math.min(a, d.remaining))} remboursés`);
        closeSheet();
      }}
    >
      <Banner>{`Pocket Dettes : ${eur(state.pockets.debts)}. Reste dû : ${eur(d.remaining)}.`}</Banner>
      <AmountField label="Montant (€)" value={amount} onChangeText={setAmount} autoFocus />
    </SheetFrame>
  );
}
