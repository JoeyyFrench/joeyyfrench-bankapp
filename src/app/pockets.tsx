import React from 'react';
import { Pressable, View } from 'react-native';
import { useApp } from '../store/AppStore';
import { DemoBanner, SyncPill } from '../components/common';
import {
  Banner, Btn, Card, Check, DateBadge, KV, List, ListRow, Meter, Row, Screen, Section, SplitBar, Sub, Tag, Tip, Txt,
} from '../ui/kit';
import { useColors } from '../ui/theme';
import {
  HOLD_HOURS, STATUS_LABEL, compute, completeWithdrawal, countPaydays, debtFreeEta, debtMins, debtsLeft, goalEta, goalPaid,
  goalPerPay, goalProgress, goalRemaining, goalStatus, goalTarget, goalsSum, nextOcc, nextPayday, previewPayday,
  moveBetween, simulatePayday as simulate, today, toggleGoalItem, total, yearSaved, yearly,
} from '../domain/engine';
import { dateFull, dateShort, dateTime, eur, hoursLeft, parseYmd, r2 } from '../domain/format';
import type { Goal } from '../domain/types';

export default function Pockets() {
  const { state, openSheet, update, tick } = useApp();
  const c = useColors();
  void tick;
  const s = state;
  const P = s.pockets;
  const k = compute(s);
  const pv = previewPayday(s);
  const covered = Math.min(1, P.bills / Math.max(k.need, 0.01));
  const pending = s.withdrawals.filter((w) => w.status === 'pending');
  const yl = yearly(s).sort((a, b) => nextOcc(a, k.t).getTime() - nextOcc(b, k.t).getTime());
  const yearTotal = r2(yl.reduce((a, c) => a + c.amount, 0));
  const hasDebts = debtsLeft(s) > 0;

  return (
    <Screen title="Pockets" right={<SyncPill />}>
      <DemoBanner />
      <Section title="Ton argent" meta={eur(total(s))}>
        <SplitBar
          parts={[
            { value: s.balance, color: 'accent' },
            { value: P.bills, color: 'bill' },
            { value: yearSaved(s), color: 'year' },
            { value: P.cushion, color: 'cushion' },
            { value: goalsSum(s), color: 'goal' },
            { value: P.debts, color: 'debt' },
            { value: P.savings, color: 'save' },
          ]}
        />
      </Section>

      <PocketCard color="accent" title="Compte courant" sub="Ta carte paie ici. Tout est dépensable." amount={s.balance}>
        {k.short > 0 ? <KV color="danger" label="Dont réservé pour combler Factures" value={eur(k.short)} /> : null}
      </PocketCard>

      <PocketCard color="bill" title="Factures" sub="Prélèvements mensuels et factures, payés depuis ici." amount={P.bills}>
        <Meter value={covered} color="bill" />
        <KV label={`À payer d'ici le ${dateShort(k.pay)}`} value={eur(k.need)} />
        <KV label="État" value={k.short > 0 ? <Tag color="danger">{`Manque ${eur(k.short)}`}</Tag> : <Tag color="ok">Couvert</Tag>} />
      </PocketCard>

      <PocketCard color="year" title="Annuelles lissées" sub="Un petit montant chaque mois pour les grosses factures de l'année." amount={yearSaved(s)}>
        {yl.length ? (
          yl.map((x) => (
            <View key={x.id} style={{ gap: 5 }}>
              <KV label={`${x.label} · ${dateShort(nextOcc(x, k.t))}`} value={`${eur(x.saved ?? 0)} / ${eur(x.amount)}`} />
              <Meter value={(x.saved ?? 0) / x.amount} color="year" height={6} />
            </View>
          ))
        ) : (
          <Tip>Ajoute une charge annuelle dans Charges pour la lisser.</Tip>
        )}
        {yl.length ? <KV label="Total par an" value={`${eur(yearTotal)}, soit ${eur(yearTotal / 12)} / mois`} /> : null}
      </PocketCard>

      <DebtsCard extra={pv.toDebtExtra} />

      <PocketCard color="cushion" title="Sécurité" sub="Pour un imprévu. Accessible quand tu veux." amount={P.cushion}>
        <Meter value={P.cushion / Math.max(s.settings.cushion, 0.01)} color="cushion" />
        <KV label="Objectif" value={eur(s.settings.cushion)} />
        <Row>
          <Btn small variant="ghost" title="Utiliser" disabled={P.cushion <= 0} onPress={() => openSheet({ kind: 'cushion' })} />
        </Row>
      </PocketCard>

      {s.goals.map((g) => (
        <GoalCard key={g.id} g={g} />
      ))}
      <Row>
        <Btn grow variant="ghost" title="Nouvel objectif" onPress={() => openSheet({ kind: 'goal' })} />
        <Btn grow variant="ghost" title="Préparer un déménagement" onPress={() => openSheet({ kind: 'move' })} />
      </Row>

      <PocketCard color="save" title="Épargne 🔒 bloquée" sub={`Retrait seulement avec une raison et ${HOLD_HOURS} h de délai.`} amount={P.savings}>
        <KV label="Versement automatique" value="Calculé à chaque paie" />
        <KV label="Prochain versement (estimé)" value={eur(pv.toSavings)} />
        <KV label="Dans 12 mois, à ce rythme" value={eur(P.savings + pv.toSavings * 12)} />
        {pending.map((w) => {
          const h = hoursLeft(w.release);
          return (
            <View key={w.id} style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: c.save, borderRadius: 12, padding: 12, gap: 8 }}>
              <KV bold label="Déblocage demandé" value={eur(w.amount)} />
              <Tag color="save">{w.reason}</Tag>
              <Txt muted style={{ fontStyle: 'italic', fontSize: 13.5 }}>« {w.note} »</Txt>
              <Sub>{h > 0 ? `Disponible ${dateTime(new Date(w.release))} (encore ${h} h)` : 'Délai terminé. Tu peux confirmer le retrait.'}</Sub>
              <Row>
                <Btn
                  small
                  variant="ghost"
                  title="Annuler la demande"
                  onPress={() => update((x) => { x.withdrawals.find((y) => y.id === w.id)!.status = 'cancelled'; }, "Demande annulée. L'épargne reste bloquée.")}
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
        <Row>
          <Btn small variant="ghost" title="Demander un déblocage" disabled={P.savings <= 0} onPress={() => openSheet({ kind: 'withdraw' })} />
        </Row>
      </PocketCard>

      <Section title="Le jour de paie" meta={dateShort(k.pay)}>
        <Txt muted style={{ fontSize: 14 }}>
          L’appli paie d’abord tout ce qui est obligatoire et garde ton budget de vie. Ce qui reste, c’est ta marge : une part va sur tes dettes et en épargne, le reste est un bonus libre.
        </Txt>
        <List>
          <Step n="1" label="Revenus reçus" sub={s.settings.otherIncome > 0 ? 'Salaire et autres revenus' : 'Salaire'} value={`+ ${eur(pv.income)}`} />
          <Step n="2" label="Factures" sub={`Charges et factures jusqu'au ${dateShort(pv.pay2)}`} value={`− ${eur(pv.toBills)}`} />
          <Step n="3" label="Annuelles lissées" sub="Selon le temps restant avant chaque échéance" value={`− ${eur(pv.toYear)}`} />
          <Step n="4" label="Mensualités de dettes" sub={`${s.debts.filter((d) => d.remaining > 0 && d.monthly > 0).length} en cours`} value={`− ${eur(pv.toDebtMin)}`} />
          <Step n="5" label="Objectifs" sub={`${s.goals.length} objectif${s.goals.length > 1 ? 's' : ''} en cours`} value={`− ${eur(pv.toGoals)}`} />
          <Step n="6" label="Sécurité" sub="Recomplétée jusqu'à l'objectif" value={`− ${eur(pv.toCushion)}`} />
          <Step n="7" label="Budget de vie" sub="Courses, essence, sorties : reste sur le courant" value={eur(pv.life)} />
          <Step
            n="="
            label="Marge du mois"
            tag={<Tag color={pv.status === 'tight' ? 'danger' : 'ok'}>{STATUS_LABEL[pv.status]}</Tag>}
            sub={pv.marge < 0 ? 'Tes sorties et ton budget de vie dépassent tes revenus' : 'Ce qui reste une fois tout prévu'}
            value={eur(pv.marge)}
            bold
          />
          <Step n="8" label="Dettes, en plus" sub={hasDebts ? `${s.settings.debtShare} % de ce qui est mis de côté` : 'Aucune dette en cours'} value={`− ${eur(pv.toDebtExtra)}`} />
          <Step n="9" label="Épargne bloquée" sub={`${s.settings.marginShare} % de la marge${hasDebts ? ', moins la part dettes' : ''}`} value={`− ${eur(pv.toSavings)}`} />
          <Step n="=" label="Ajouté au courant" sub={`Budget de vie et bonus libre. Le mois commence avec ${eur(pv.left)}`} value={eur(pv.gain)} bold />
        </List>
        {pv.marge < 0 ? (
          <Banner tone="danger">{`Pas d'épargne ce mois-ci : il manque ${eur(-pv.marge)} pour couvrir ton budget de vie. Allège un objectif, repousse sa date ou revois ton budget de vie.`}</Banner>
        ) : null}
        <Btn title="Simuler le jour de paie" onPress={() => update((x) => { simulate(x); }, 'Paie reçue et répartie')} />
        {s.allocations.length ? (
          <List>
            {s.allocations.map((a) => (
              <ListRow
                key={a.id}
                left={<DateBadge date={parseYmd(a.date)} />}
                title={`${eur(a.income || a.salary)} reçus et répartis`}
                amount={eur(a.left)}
                subtitle={
                  <>
                    {a.status ? <Tag color={a.status === 'tight' ? 'danger' : 'ok'}>{STATUS_LABEL[a.status]}</Tag> : null}
                    <Sub>
                      Marge {eur(a.marge)} · Épargne {eur(a.toSavings)} · Dettes {eur(r2((a.toDebtMin || 0) + (a.toDebtExtra || 0)))}
                    </Sub>
                    {a.toBills < a.wantBills || a.toYear < a.wantYear ? <Tag color="danger">Pas tout couvert</Tag> : null}
                  </>
                }
              />
            ))}
          </List>
        ) : null}
      </Section>
    </Screen>
  );
}

function PocketCard({ color, title, sub, amount, children }: { color: Parameters<typeof Meter>[0]['color']; title: string; sub: string; amount: number; children?: React.ReactNode }) {
  return (
    <Card accent={color}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt style={{ fontSize: 17, fontWeight: '700' }}>{title}</Txt>
          <Sub>{sub}</Sub>
        </View>
        <Txt style={{ fontSize: 24, fontWeight: '800', letterSpacing: -0.5, fontVariant: ['tabular-nums'] }}>{eur(amount)}</Txt>
      </View>
      {children}
    </Card>
  );
}

function Step({ n, label, sub, value, bold, tag }: { n: string; label: string; sub: string; value: string; bold?: boolean; tag?: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10 }}>
      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
        <Txt style={{ fontSize: 12, fontWeight: '800' }}>{n}</Txt>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <Txt style={{ fontSize: 14, fontWeight: bold ? '800' : '500' }}>{label}</Txt>
          {tag}
        </View>
        <Sub>{sub}</Sub>
      </View>
      <Txt style={{ fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{value}</Txt>
    </View>
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
  return (
    <Card accent="goal">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt style={{ fontSize: 17, fontWeight: '700' }}>{g.label}</Txt>
          <Sub>{isDate ? `Pour le ${dateFull(parseYmd(g.deadline!))}` : `${eur(g.monthly || 0)} à chaque paie`}</Sub>
        </View>
        <Txt style={{ fontSize: 24, fontWeight: '800', letterSpacing: -0.5, fontVariant: ['tabular-nums'] }}>{eur(g.balance)}</Txt>
      </View>
      <Meter value={goalProgress(g) / Math.max(tgt, 0.01)} color="goal" />
      <KV label={g.items ? 'Budget total' : 'Objectif'} value={eur(tgt)} />
      {paid > 0 ? <KV label="Déjà payé" value={eur(paid)} /> : null}
      {rem > 0 ? <KV label="Reste à mettre de côté" value={eur(rem)} /> : null}
      {rem > 0 && isDate && n > 0 ? <KV label={`À chaque paie (${n} restante${n > 1 ? 's' : ''})`} value={eur(per)} /> : null}
      {rem > 0 && !isDate ? <KV label="Atteint en" value={goalEta(state, g)} /> : null}
      {st ? <KV label="État" value={<Tag color={st.tone === 'late' ? 'danger' : 'ok'}>{st.text}</Tag>} /> : null}
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
            {`Touche un poste pour changer son montant. Coche-le quand tu le paies : il est pris sur cette pocket.${
              g.kind === 'move'
                ? " Regarde aussi l'avance Loca-Pass et la garantie Visale d'Action Logement : si tu y as droit, elles réduisent ce qu'il faut avancer."
                : ''
            }`}
          </Tip>
        </>
      ) : null}
      <Row>
        <Btn small variant="ghost" title="Ajouter" onPress={() => openSheet({ kind: 'goalMove', goalId: g.id, dir: 'in' })} />
        <Btn small variant="ghost" title="Utiliser" disabled={g.balance <= 0} onPress={() => openSheet({ kind: 'goalMove', goalId: g.id, dir: 'out' })} />
        <Btn small variant="ghost" title="Modifier" onPress={() => openSheet({ kind: 'goal', id: g.id })} />
      </Row>
    </Card>
  );
}

function DebtsCard({ extra }: { extra: number }) {
  const { state, openSheet, update } = useApp();
  const s = state;
  const left = debtsLeft(s);
  const active = s.debts.filter((d) => d.remaining > 0);
  const first = active.slice().sort((a, b) => a.remaining - b.remaining)[0];
  return (
    <Card accent="debt">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt style={{ fontSize: 17, fontWeight: '700' }}>Dettes</Txt>
          <Sub>Mis de côté pour rembourser ce que tu dois.</Sub>
        </View>
        <Txt style={{ fontSize: 24, fontWeight: '800', letterSpacing: -0.5, fontVariant: ['tabular-nums'] }}>{eur(s.pockets.debts)}</Txt>
      </View>
      {s.debts.length ? (
        <>
          <KV label="Total restant dû" value={eur(left)} />
          {left > 0 ? (
            <>
              <KV label="Mensualités à chaque paie" value={eur(debtMins(s))} />
              <KV label="En plus à la prochaine paie (estimé)" value={eur(extra)} />
              <KV label="Libre de dettes vers" value={debtFreeEta(s, extra)} />
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
            onPress={() =>
              update((x) => moveBetween(x, 'debts', 'savings', x.pockets.debts, 'Dettes vers Épargne'), 'Reste mis en épargne')
            }
          />
        ) : null}
      </Row>
    </Card>
  );
}
