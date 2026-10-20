import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useApp } from '../store/AppStore';
import {
  AmountField, Banner, Breathe, Btn, Card, DateBadge, Expandable, Eyebrow, IconButton, KV, List, ListRow, Pill, Rise, Screen, Section, SplitBar, Sub, Tip, Txt,
} from '../ui/kit';
import { useColors } from '../ui/theme';
import { STATUS_LABEL, compute, paydayDue, previewPayday, receivePayday, simulatePayday } from '../domain/engine';
import { amountInput, dateLong, dateShort, eur, parseAmount, parseYmd, r2 } from '../domain/format';
import type { Allocation } from '../domain/types';

const LIFE_COLOR = '#4A4A55';
const DEBT_EXTRA_COLOR = '#FFD08A';

/** Payday: where each euro of the salary goes, as a cascade. Preview before, result after. */
export default function Paie() {
  const { state: s, update } = useApp();
  const c = useColors();
  const [done, setDone] = useState(false);
  const [received, setReceived] = useState(amountInput(s.settings.salary));
  const k = compute(s);
  const due = paydayDue(s);
  const salary = parseAmount(received);
  const pv = previewPayday(s, due && salary > 0 ? salary : undefined);
  const a: Allocation = done && s.allocations[0] ? s.allocations[0] : pv;
  const bonus = r2(Math.max(0, a.marge - a.setAside));
  const hasDebts = s.debts.some((d) => d.remaining > 0);
  const day = dateLong(done ? parseYmd(a.date) : (due ?? k.pay));
  const label = done ? 'paie reçue' : due ? 'jour de paie' : 'prochaine paie';

  const rows = [
    { label: 'Factures du mois', sub: 'Loyer, abonnements, énergie…', value: a.toBills, color: c.bill },
    { label: 'Annuelles lissées', sub: 'Selon le temps avant chaque échéance', value: a.toYear, color: c.year },
    { label: 'Mensualités', sub: `${s.debts.filter((d) => d.remaining > 0 && d.monthly > 0).length} dette(s) en cours`, value: a.toDebtMin, color: c.debt },
    { label: 'Objectifs', sub: s.goals.map((g) => g.label).join(', ') || 'Aucun objectif', value: a.toGoals, color: c.goal },
    { label: 'Sécurité', sub: 'Recomplétée jusqu’à l’objectif', value: a.toCushion, color: c.cushion },
    { label: 'Budget de vie', sub: 'Reste sur le courant', value: a.life, color: LIFE_COLOR },
  ].filter((r) => r.value > 0 || r.label === 'Budget de vie');

  const parts = [
    ...rows.map((r) => ({ value: r.value, color: r.color })),
    { value: a.toDebtExtra, color: DEBT_EXTRA_COLOR },
    { value: a.toSavings, color: c.save },
    { value: bonus, color: c.accent },
  ];

  return (
    <Screen
      modal
      title=""
      right={<IconButton symbol="xmark" fallback="✕" label="Fermer" onPress={() => router.back()} />}
      background={
        <Breathe style={{ position: 'absolute', top: -60, left: '50%', marginLeft: -170 }}>
          <Svg width={340} height={300}>
            <Defs>
              <RadialGradient id="g" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={c.ok} stopOpacity="0.2" />
                <Stop offset="1" stopColor={c.ok} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx={170} cy={150} r={150} fill="url(#g)" />
          </Svg>
        </Breathe>
      }
    >
      <Rise order={1} style={{ alignItems: 'center', gap: 6, marginTop: -8 }}>
        <Eyebrow color="ok">{`${day} · ${label}`}</Eyebrow>
        <Txt style={{ fontSize: 46, fontWeight: '800', letterSpacing: -2, fontVariant: ['tabular-nums'] }} adjustsFontSizeToFit numberOfLines={1}>
          {`+ ${eur(a.income)}`}
        </Txt>
        <Txt style={{ fontSize: 14, color: c.soft }}>{done ? 'Voici où est allé chaque euro' : 'Voici où ira chaque euro'}</Txt>
      </Rise>

      <SplitBar key={done ? 'done' : 'preview'} parts={parts} />

      <Card style={{ padding: 0, gap: 0 }}>
        {rows.map((r, i) => (
          <Rise
            key={r.label}
            order={3 + i}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: 'rgba(255,255,255,0.05)' }}
          >
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: r.color }} />
            <View style={{ flex: 1, gap: 1 }}>
              <Txt style={{ fontSize: 14, fontWeight: '600' }}>{r.label}</Txt>
              <Txt muted style={{ fontSize: 11.5 }} numberOfLines={1}>{r.sub}</Txt>
            </View>
            <Txt style={{ fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{eur(r.value)}</Txt>
          </Rise>
        ))}
      </Card>

      <Rise order={9}>
        <Card tint={a.marge < 0 ? c.danger : c.ok} style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ gap: 2 }}>
              <Eyebrow color={a.marge < 0 ? 'danger' : 'ok'}>Marge du mois</Eyebrow>
              <Txt style={{ fontSize: 28, fontWeight: '800', letterSpacing: -1, fontVariant: ['tabular-nums'] }}>{eur(a.marge)}</Txt>
            </View>
            <Pill tone={a.status === 'tight' ? 'bad' : 'ok'}>{STATUS_LABEL[a.status]}</Pill>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Split label="Dettes" value={a.toDebtExtra} color={DEBT_EXTRA_COLOR} />
            <Split label="Épargne" value={a.toSavings} color="#C9A6FF" />
            <Split label="Bonus libre" value={bonus} color="#FF8090" />
          </View>
          <Txt muted style={{ fontSize: 12.5, lineHeight: 17 }}>
            {a.marge < 0
              ? `Pas d’épargne ce mois-ci : il manque ${eur(-a.marge)} pour couvrir ton budget de vie. Allège un objectif, repousse sa date ou revois ton budget de vie.`
              : `${s.settings.marginShare} % de la marge est mis de côté${hasDebts ? `, dont ${s.settings.debtShare} % pour tes dettes` : ''}. Le reste est à toi, en plus de ton budget de vie.`}
          </Txt>
        </Card>
      </Rise>

      {done ? (
        <Btn variant="light" title="Voir mon nouveau reste à vivre" onPress={() => router.dismissTo('/')} />
      ) : due ? (
        <Card style={{ gap: 12 }}>
          <AmountField
            label="Montant reçu sur ton compte (€)"
            value={received}
            onChangeText={setReceived}
          />
          <Btn
            title="Répartir ma paie"
            disabled={!(salary > 0)}
            onPress={() => {
              update((x) => {
                receivePayday(x, salary);
              }, 'Paie reçue et répartie');
              setDone(true);
            }}
          />
          <Tip>L’appli met de côté ce qu’il faut dans chaque pocket. Fais les mêmes virements dans ta banque si tes sous-comptes y sont séparés.</Tip>
        </Card>
      ) : s.demo ? (
        <Btn
          title="Simuler le jour de paie"
          onPress={() => {
            update((x) => {
              simulatePayday(x);
            }, 'Paie reçue et répartie');
            setDone(true);
          }}
        />
      ) : (
        <Tip>{`Le ${dateShort(k.pay)}, l’appli te demandera combien tu as reçu et la répartira comme ci-dessus.`}</Tip>
      )}

      <Expandable color="ok" title="Le détail du calcul" summary="Étape par étape">
        <KV label="Revenus reçus" value={`+ ${eur(a.income)}`} />
        <KV label="Factures" value={`− ${eur(a.toBills)}`} />
        <KV label="Annuelles lissées" value={`− ${eur(a.toYear)}`} />
        <KV label="Mensualités de dettes" value={`− ${eur(a.toDebtMin)}`} />
        <KV label="Objectifs" value={`− ${eur(a.toGoals)}`} />
        <KV label="Sécurité" value={`− ${eur(a.toCushion)}`} />
        <KV label="Budget de vie (reste sur le courant)" value={eur(a.life)} />
        <KV bold label="= Marge du mois" value={eur(a.marge)} />
        <KV label="Dettes, en plus" value={`− ${eur(a.toDebtExtra)}`} />
        <KV label="Épargne bloquée" value={`− ${eur(a.toSavings)}`} />
        <KV bold label="Le mois commence avec" value={eur(a.left)} />
        {a.wantBills > a.toBills ? <Banner tone="danger">{`Il manquait ${eur(a.wantBills - a.toBills)} pour remplir la pocket Factures.`}</Banner> : null}
      </Expandable>

      {s.allocations.length ? (
        <Section title="Paies précédentes">
          <List>
            {s.allocations.map((x) => (
              <ListRow
                key={x.id}
                left={<DateBadge date={parseYmd(x.date)} />}
                title={`${eur(x.income || x.salary)} répartis`}
                amount={eur(x.left)}
                subtitle={<Sub>{`${STATUS_LABEL[x.status] ?? ''} · Épargne ${eur(x.toSavings)} · Dettes ${eur(r2((x.toDebtMin || 0) + (x.toDebtExtra || 0)))}`}</Sub>}
              />
            ))}
          </List>
        </Section>
      ) : null}
    </Screen>
  );
}

function Split({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={{ flex: 1, gap: 3, padding: 10, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.25)' }}>
      <Txt muted style={{ fontSize: 11, fontWeight: '600' }}>{label}</Txt>
      <Txt style={{ fontSize: 16, fontWeight: '700', color, fontVariant: ['tabular-nums'] }} adjustsFontSizeToFit numberOfLines={1}>
        {`+ ${eur(Math.max(0, value)).replace(/,00(?=\s?€)/, '')}`}
      </Txt>
    </View>
  );
}
