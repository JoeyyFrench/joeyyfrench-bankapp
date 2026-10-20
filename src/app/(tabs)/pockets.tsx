import React, { useState } from 'react';
import { LayoutAnimation, Platform, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useApp } from '../../store/AppStore';
import { DemoBanner, HeaderActions } from '../../components/common';
import {
  Banner, Btn, Card, Check, Expandable, Eyebrow, KV, List, ListRow, Meter, Pill, Rise, Row, Screen, Section, SplitBar, Sub, Tag, Tip, Txt, tap,
} from '../../ui/kit';
import { alpha, useColors, type ColorName } from '../../ui/theme';
import {
  HOLD_HOURS, STATUS_LABEL, compute, completeWithdrawal, countPaydays, debtFreeEta, debtMins, debtsLeft, goalEta, goalPaid,
  goalPerPay, goalProgress, goalRemaining, goalStatus, goalTarget, goalsSum, moveBetween, nextOcc, nextPayday, previewPayday,
  today, toggleGoalItem, total, yearSaved, yearly,
} from '../../domain/engine';
import { dateFull, dateShort, dateTime, eur, eurShort, hoursLeft, parseYmd, r2 } from '../../domain/format';
import type { Goal } from '../../domain/types';

type PocketId = 'bills' | 'savings' | 'cushion' | 'debts' | 'year';

export default function Pockets() {
  const { state: s, openSheet, tick } = useApp();
  const c = useColors();
  void tick;
  const P = s.pockets;
  const k = compute(s);
  const pv = previewPayday(s);
  const [open, setOpen] = useState<PocketId | null>(null);
  const pending = s.withdrawals.filter((w) => w.status === 'pending');
  const yl = yearly(s);
  const yearTotal = r2(yl.reduce((a, x) => a + x.amount, 0));
  const debtLeft = debtsLeft(s);
  const debtInitial = s.debts.reduce((a, d) => a + Math.max(d.initial, d.remaining), 0);

  const parts = [
    { value: s.balance, color: c.accent },
    { value: P.bills, color: c.bill },
    { value: yearSaved(s), color: c.year },
    { value: P.cushion, color: c.cushion },
    { value: goalsSum(s), color: c.goal },
    { value: P.debts, color: c.debt },
    { value: P.savings, color: c.save },
  ];

  const toggle = (id: PocketId) => {
    tap();
    LayoutAnimation.configureNext(LayoutAnimation.create(240, 'easeInEaseOut', 'opacity'));
    setOpen((o) => (o === id ? null : id));
  };

  return (
    <Screen eyebrow="Tout ton argent" title={eur(total(s))} right={<HeaderActions />}>
      <DemoBanner />

      <Rise order={1}>
        <SplitBar parts={parts} />
      </Rise>

      <Rise order={2} style={{ gap: 10 }}>
        <Tile
          wide
          label="Courant"
          symbol="creditcard.fill"
          color="accent"
          amount={eur(s.balance)}
          sub={`Reste à vivre ${eur(k.free)}`}
          onPress={() => router.push('/compte')}
        />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Tile
            label="Factures"
            symbol="doc.text.fill"
            color="bill"
            amount={eur(P.bills)}
            sub={k.short > 0 ? `Manque ${eurShort(k.short)}` : 'Tout est couvert'}
            subColor={k.short > 0 ? 'danger' : undefined}
            progress={Math.min(1, P.bills / Math.max(k.need, 0.01))}
            selected={open === 'bills'}
            onPress={() => toggle('bills')}
          />
          <Tile
            label="Épargne"
            symbol="lock.fill"
            color="save"
            amount={eur(P.savings)}
            sub={pending.length ? 'Déblocage en cours' : `+ ${eurShort(pv.toSavings)} à la paie`}
            selected={open === 'savings'}
            onPress={() => toggle('savings')}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Tile
            label="Sécurité"
            symbol="shield.fill"
            color="cushion"
            amount={eur(P.cushion)}
            sub={`Objectif ${eurShort(s.settings.cushion)}`}
            progress={P.cushion / Math.max(s.settings.cushion, 0.01)}
            selected={open === 'cushion'}
            onPress={() => toggle('cushion')}
          />
          <Tile
            label="Dettes"
            symbol="arrow.down.right"
            color="debt"
            amount={eur(P.debts)}
            sub={debtLeft > 0 ? `${eurShort(debtLeft)} à rembourser` : 'Aucune dette'}
            progress={debtInitial > 0 ? 1 - debtLeft / debtInitial : undefined}
            selected={open === 'debts'}
            onPress={() => toggle('debts')}
          />
        </View>
        <Tile
          wide
          label="Annuelles lissées"
          symbol="calendar"
          color="year"
          amount={eur(yearSaved(s))}
          sub={yl.length ? `${eurShort(yearTotal / 12)} mis de côté par mois en moyenne` : 'Aucune charge annuelle'}
          selected={open === 'year'}
          onPress={() => toggle('year')}
        />
      </Rise>

      {open ? (
        <Card style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Txt style={{ fontSize: 17, fontWeight: '700' }}>{POCKET_TITLE[open]}</Txt>
            <Pressable accessibilityRole="button" accessibilityLabel="Fermer" hitSlop={10} onPress={() => toggle(open)}>
              <Txt muted style={{ fontSize: 13, fontWeight: '600' }}>Fermer</Txt>
            </Pressable>
          </View>
          {open === 'bills' ? <BillsBody /> : null}
          {open === 'savings' ? <SavingsBody /> : null}
          {open === 'cushion' ? (
            <>
              <Meter value={P.cushion / Math.max(s.settings.cushion, 0.01)} color="cushion" />
              <KV label="Objectif" value={eur(s.settings.cushion)} />
              <Tip>Pour un imprévu. Elle est recomplétée automatiquement à chaque paie.</Tip>
              <Row>
                <Btn small variant="ghost" title="Utiliser" disabled={P.cushion <= 0} onPress={() => openSheet({ kind: 'cushion' })} />
              </Row>
            </>
          ) : null}
          {open === 'debts' ? <DebtsBody extra={pv.toDebtExtra} /> : null}
          {open === 'year' ? <YearBody /> : null}
        </Card>
      ) : null}

      <Rise order={3}>
        <Section title="Objectifs" meta={s.goals.length ? eur(goalsSum(s)) : undefined}>
          {s.goals.map((g) => (
            <GoalCard key={g.id} g={g} />
          ))}
          <Row wrap={false}>
            <Btn grow small variant="ghost" title="Nouvel objectif" onPress={() => openSheet({ kind: 'goal' })} />
            <Btn grow small variant="ghost" title="Déménagement" onPress={() => openSheet({ kind: 'move' })} />
          </Row>
        </Section>
      </Rise>

      <Rise order={4}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voir le jour de paie" onPress={() => router.push('/paie')} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
          <Card tint={c.ok}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1, gap: 3 }}>
                <Eyebrow color="ok">{`Prochaine paie · ${dateShort(k.pay)}`}</Eyebrow>
                <Txt style={{ fontSize: 26, fontWeight: '800', letterSpacing: -0.8, fontVariant: ['tabular-nums'] }}>{eur(pv.marge)}</Txt>
                <Txt muted style={{ fontSize: 13 }}>de marge prévue · voir où ira chaque euro</Txt>
              </View>
              <Pill tone={pv.status === 'tight' ? 'bad' : 'ok'}>{STATUS_LABEL[pv.status]}</Pill>
            </View>
          </Card>
        </Pressable>
      </Rise>
    </Screen>
  );
}

const POCKET_TITLE: Record<PocketId, string> = {
  bills: 'Factures', savings: 'Épargne bloquée', cushion: 'Sécurité', debts: 'Dettes', year: 'Annuelles lissées',
};

/** One pocket in the bento grid. */
function Tile({
  label, symbol, color, amount, sub, subColor, progress, wide, selected, onPress,
}: {
  label: string; symbol: SFSymbol; color: ColorName; amount: string; sub: string; subColor?: ColorName;
  progress?: number; wide?: boolean; selected?: boolean; onPress: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: selected }}
      accessibilityLabel={`${label}, ${amount}`}
      onPress={onPress}
      style={({ pressed }) => ({ flex: wide ? undefined : 1, minWidth: 0, opacity: pressed ? 0.75 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}
    >
      <Card
        tint={selected ? c[color] : undefined}
        style={[{ padding: 14, gap: 10, borderRadius: 20, flexGrow: 1 }, wide ? { flexDirection: 'row', alignItems: 'center' } : null]}
      >
        <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: alpha(c[color], 0.16), alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' }}>
          {Platform.OS === 'ios' ? (
            <SymbolView name={symbol} size={16} tintColor={c[color]} weight="semibold" />
          ) : (
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: c[color] }} />
          )}
        </View>
        <View style={{ gap: 2, flex: wide ? 1 : undefined, minWidth: 0 }}>
          <Txt muted style={{ fontSize: 12.5, fontWeight: '600' }} numberOfLines={1}>{label}</Txt>
          <Txt style={{ fontSize: wide ? 22 : 19, fontWeight: '700', letterSpacing: -0.5, fontVariant: ['tabular-nums'] }} numberOfLines={1} adjustsFontSizeToFit>
            {amount}
          </Txt>
          <Txt color={subColor} muted={!subColor} style={{ fontSize: 11.5 }} numberOfLines={wide ? 1 : 2}>{sub}</Txt>
        </View>
        {progress !== undefined && !wide ? <Meter value={progress} color={color} height={4} delay={500} /> : null}
      </Card>
    </Pressable>
  );
}

function BillsBody() {
  const { state: s } = useApp();
  const k = compute(s);
  return (
    <>
      <Meter value={Math.min(1, s.pockets.bills / Math.max(k.need, 0.01))} color="bill" />
      <KV label={`À payer d’ici le ${dateShort(k.pay)}`} value={eur(k.need)} />
      <KV label="Dans la pocket" value={eur(s.pockets.bills)} />
      {k.short > 0 ? <Banner tone="danger">{`Il manque ${eur(k.short)} : ils sont pris sur le courant.`}</Banner> : null}
      <Tip>Prélèvements mensuels et factures sont payés depuis ici. À chaque paie, l’appli remet pile ce qu’il faut pour le mois suivant.</Tip>
    </>
  );
}

function YearBody() {
  const { state: s } = useApp();
  const t = today(s);
  const yl = yearly(s).sort((a, b) => nextOcc(a, t).getTime() - nextOcc(b, t).getTime());
  const yearTotal = r2(yl.reduce((a, x) => a + x.amount, 0));
  if (!yl.length) return <Tip>Ajoute une charge « Une fois par an » dans Budget pour la lisser.</Tip>;
  return (
    <>
      {yl.map((x) => (
        <View key={x.id} style={{ gap: 6 }}>
          <KV label={`${x.label} · ${dateShort(nextOcc(x, t))}`} value={`${eur(x.saved ?? 0)} / ${eur(x.amount)}`} />
          <Meter value={(x.saved ?? 0) / x.amount} color="year" height={5} />
        </View>
      ))}
      <KV label="Total par an" value={eur(yearTotal)} bold />
    </>
  );
}

function SavingsBody() {
  const { state: s, openSheet, update } = useApp();
  const c = useColors();
  const pv = previewPayday(s);
  const pending = s.withdrawals.filter((w) => w.status === 'pending');
  return (
    <>
      <KV label="Versement automatique" value="Calculé à chaque paie" />
      <KV label="Prochain versement (estimé)" value={eur(pv.toSavings)} />
      <KV label="Dans 12 mois, à ce rythme" value={eur(s.pockets.savings + pv.toSavings * 12)} />
      {pending.map((w) => {
        const h = hoursLeft(w.release);
        return (
          <View key={w.id} style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: c.save, borderRadius: 14, padding: 12, gap: 8 }}>
            <KV bold label="Déblocage demandé" value={eur(w.amount)} />
            <Tag color="save">{w.reason}</Tag>
            <Txt muted style={{ fontStyle: 'italic', fontSize: 13.5 }}>{`« ${w.note} »`}</Txt>
            <Sub>{h > 0 ? `Disponible ${dateTime(new Date(w.release))} (encore ${h} h)` : 'Délai terminé. Tu peux confirmer le retrait.'}</Sub>
            <Row>
              <Btn
                small
                variant="ghost"
                title="Annuler la demande"
                onPress={() => update((x) => { x.withdrawals.find((y) => y.id === w.id)!.status = 'cancelled'; }, 'Demande annulée. L’épargne reste bloquée.')}
              />
              {h > 0 ? (
                s.demo ? (
                  <Btn small variant="ghost" title="Passer le délai (démo)" onPress={() => update((x) => { x.withdrawals.find((y) => y.id === w.id)!.release = new Date().toISOString(); })} />
                ) : null
              ) : (
                <Btn small variant="save" title="Virer sur le courant" onPress={() => update((x) => { completeWithdrawal(x, w.id); }, 'Viré sur le courant')} />
              )}
            </Row>
          </View>
        );
      })}
      <Tip>{`Retrait seulement avec une raison et ${HOLD_HOURS} h de délai.`}</Tip>
      <Row>
        <Btn small variant="ghost" title="Demander un déblocage" disabled={s.pockets.savings <= 0} onPress={() => openSheet({ kind: 'withdraw' })} />
      </Row>
    </>
  );
}

function GoalCard({ g }: { g: Goal }) {
  const { state, update, openSheet } = useApp();
  const c = useColors();
  const tgt = goalTarget(g);
  const rem = goalRemaining(g);
  const paid = goalPaid(g);
  const first = nextPayday(today(state), state.settings.payDay);
  const isDate = g.mode === 'date' && !!g.deadline;
  const n = isDate ? countPaydays(state, first, parseYmd(g.deadline!)) : 0;
  const per = goalPerPay(state, g, first);
  const st = goalStatus(state, g);
  const pct = Math.round((goalProgress(g) / Math.max(tgt, 0.01)) * 100);
  return (
    <Expandable
      color="goal"
      title={g.label}
      amount={eur(g.balance)}
      summary={`${pct} % de ${eur(tgt)}`}
      footer={
        <View style={{ gap: 8 }}>
          <Meter value={goalProgress(g) / Math.max(tgt, 0.01)} color="goal" to="#5AA9FF" delay={500} />
          {st ? <Txt color={st.tone === 'late' ? 'warn' : 'ok'} style={{ fontSize: 12, fontWeight: '600' }}>{st.text}</Txt> : null}
        </View>
      }
    >
      <KV label={isDate ? 'Pour le' : 'Versement'} value={isDate ? dateFull(parseYmd(g.deadline!)) : `${eur(g.monthly || 0)} à chaque paie`} />
      {paid > 0 ? <KV label="Déjà payé" value={eur(paid)} /> : null}
      {rem > 0 ? <KV label="Reste à mettre de côté" value={eur(rem)} /> : null}
      {rem > 0 && isDate && n > 0 ? <KV label={`À chaque paie (${n} restante${n > 1 ? 's' : ''})`} value={eur(per)} bold /> : null}
      {rem > 0 && !isDate ? <KV label="Atteint en" value={goalEta(state, g)} /> : null}
      {st?.overdue ? <Banner tone="danger">La date est passée. Choisis une nouvelle date avec « Modifier ».</Banner> : null}
      {g.items ? (
        <>
          <View style={{ borderWidth: 1, borderColor: c.line, borderRadius: 12, overflow: 'hidden' }}>
            {g.items.map((i, idx) => (
              <View key={i.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 9, borderTopWidth: idx ? 1 : 0, borderTopColor: c.line }}>
                <Check
                  on={i.paid}
                  color="goal"
                  label={`${i.label} ${i.paid ? 'payé' : 'à payer'}`}
                  onPress={() => {
                    const fromGoal = Math.min(i.amount, Math.max(0, g.balance));
                    const rest = r2(i.amount - fromGoal);
                    const msg = i.paid
                      ? 'Poste remis à payer'
                      : rest > 0
                        ? `Payé : ${eur(fromGoal)} depuis la pocket, ${eur(rest)} depuis le courant`
                        : 'Payé depuis la pocket';
                    update((x) => { toggleGoalItem(x, g.id, i.id); }, msg);
                  }}
                />
                <Pressable
                  disabled={i.paid}
                  accessibilityRole="button"
                  onPress={() => openSheet({ kind: 'goalItem', goalId: g.id, itemId: i.id })}
                  style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}
                >
                  <Txt numberOfLines={1} style={{ flexShrink: 1, fontSize: 14, color: i.paid ? c.muted : c.ink, textDecorationLine: i.paid ? 'line-through' : 'none' }}>
                    {i.label}
                  </Txt>
                  <Txt style={{ fontSize: 14, fontWeight: '500', fontVariant: ['tabular-nums'], color: i.paid ? c.muted : c.ink }}>{eur(i.amount)}</Txt>
                </Pressable>
              </View>
            ))}
          </View>
          <Row>
            <Btn small variant="ghost" title="Ajouter un poste" onPress={() => openSheet({ kind: 'goalItem', goalId: g.id })} />
          </Row>
          <Tip>
            {`Touche un poste pour changer son montant, coche-le quand tu le paies.${
              g.kind === 'move' ? ' Regarde aussi l’avance Loca-Pass et la garantie Visale d’Action Logement : si tu y as droit, elles réduisent ce qu’il faut avancer.' : ''
            }`}
          </Tip>
        </>
      ) : null}
      <Row>
        <Btn small variant="ghost" title="Ajouter" onPress={() => openSheet({ kind: 'goalMove', goalId: g.id, dir: 'in' })} />
        <Btn small variant="ghost" title="Utiliser" disabled={g.balance <= 0} onPress={() => openSheet({ kind: 'goalMove', goalId: g.id, dir: 'out' })} />
        <Btn small variant="ghost" title="Modifier" onPress={() => openSheet({ kind: 'goal', id: g.id })} />
      </Row>
    </Expandable>
  );
}

function DebtsBody({ extra }: { extra: number }) {
  const { state: s, openSheet, update } = useApp();
  const left = debtsLeft(s);
  const active = s.debts.filter((d) => d.remaining > 0);
  const first = active.slice().sort((a, b) => a.remaining - b.remaining)[0];
  return (
    <>
      {s.debts.length ? (
        <>
          <KV label="Total restant dû" value={eur(left)} />
          {left > 0 ? (
            <>
              <KV label="Mensualités à chaque paie" value={eur(debtMins(s))} />
              <KV label="En plus à la prochaine paie (estimé)" value={eur(extra)} />
              <KV label="Libre de dettes vers" value={debtFreeEta(s, extra)} bold />
            </>
          ) : (
            <KV label="État" value={<Tag color="ok">Plus aucune dette</Tag>} />
          )}
          <List>
            {s.debts.map((d) => {
              const done = d.remaining <= 0;
              return (
                <ListRow
                  key={d.id}
                  title={d.label}
                  amount={done ? 'Remboursée' : eur(d.remaining)}
                  onPress={() => openSheet({ kind: 'debt', id: d.id })}
                  subtitle={
                    <>
                      {d === first && active.length > 1 ? <Tag color="debt">En premier</Tag> : null}
                      <Sub>{d.monthly > 0 ? `${eur(d.monthly)} par mois, payé à la paie` : 'Pas de mensualité : rembourse avec la pocket'}</Sub>
                    </>
                  }
                >
                  <Meter value={d.initial > 0 ? (d.initial - d.remaining) / d.initial : 0} color="debt" height={6} />
                  {!done ? (
                    <Row>
                      <Btn small variant="ghost" title="Rembourser" disabled={s.pockets.debts <= 0} onPress={() => openSheet({ kind: 'debtPay', debtId: d.id })} />
                    </Row>
                  ) : null}
                </ListRow>
              );
            })}
          </List>
          {active.length > 1 ? <Tip>Conseil : rembourse d’abord la plus petite dette. Chaque dette soldée te libère de la place pour la suivante.</Tip> : null}
        </>
      ) : (
        <Tip>Aucune dette enregistrée. Ajoute-en une pour planifier son remboursement.</Tip>
      )}
      <Row>
        <Btn small variant="ghost" title="Ajouter une dette" onPress={() => openSheet({ kind: 'debt' })} />
        {left <= 0 && s.pockets.debts > 0 ? (
          <Btn
            small
            variant="ghost"
            title="Mettre le reste en épargne"
            onPress={() => update((x) => moveBetween(x, 'debts', 'savings', x.pockets.debts, 'Dettes vers Épargne'), 'Reste mis en épargne')}
          />
        ) : null}
      </Row>
    </>
  );
}
