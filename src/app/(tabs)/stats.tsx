import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useApp } from '../../store/AppStore';
import { DemoBanner, HeaderActions } from '../../components/common';
import { Card, Empty, KV, Meter, Screen, Section, StatTile, Txt, Tip, tap } from '../../ui/kit';
import { BarPairs, Donut, Lines } from '../../ui/charts';
import { CATEGORY_COLOR, useColors } from '../../ui/theme';
import { debtFreeEta, debtsLeft, previewPayday } from '../../domain/engine';
import { lastMonths, monthlyFlows, savingsDebtSeries, spendingByCategory } from '../../domain/stats';
import { isSubscription } from '../../domain/detection';
import { eur, monthAbbr, parseYmd, r2 } from '../../domain/format';

export default function Stats() {
  const { state } = useApp();
  const c = useColors();
  const cycles = lastMonths(state, 6);
  const [selected, setSelected] = useState(cycles.length - 1);
  const cycle = cycles[Math.min(selected, cycles.length - 1)];
  const flows = monthlyFlows(state, 6);
  const flow = flows[Math.min(selected, flows.length - 1)];
  const spend = spendingByCategory(state, cycle.from, cycle.to);
  const rate = flow.income > 0 ? Math.round((flow.net / flow.income) * 100) : 0;
  const isCurrent = selected === cycles.length - 1;
  const avgNet = r2(flows.slice(0, -1).reduce((a, f) => a + f.net, 0) / Math.max(1, flows.length - 1));

  const series = savingsDebtSeries(state);
  const pv = previewPayday(state);
  const firstDebt = series[0]?.debts ?? 0;
  const lastPoint = series[series.length - 1];
  const subs = state.charges.filter(isSubscription);
  const subTotal = r2(subs.reduce((a, x) => a + x.amount, 0));

  return (
    <Screen title="Stats" right={<HeaderActions />}>
      <DemoBanner />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {cycles.map((m, i) => {
          const on = i === selected;
          return (
            <Pressable
              key={m.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => {
                tap();
                setSelected(i);
              }}
              style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: on ? c.accent : c.surface, borderWidth: 1, borderColor: on ? c.accent : c.line }}
            >
              <Text style={{ color: on ? c.accentInk : c.muted, fontWeight: '700', fontSize: 14 }}>
                {i === cycles.length - 1 ? 'Ce mois-ci' : m.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Tip>{`Du ${shortDate(cycle.from)} au ${shortDate(cycle.to)} : un mois va d’une paie à la suivante.`}</Tip>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <StatTile label="Revenus" value={eur(flow.income)} color="ok" />
        <StatTile label="Dépenses" value={eur(flow.spending)} sub={isCurrent ? 'jusqu’ici' : undefined} />
        <StatTile label="Reste" value={eur(flow.net)} color={flow.net < 0 ? 'danger' : undefined} sub="revenus − dépenses" />
        <StatTile label="Taux d’épargne" value={`${rate} %`} color={rate >= 10 ? 'ok' : rate < 0 ? 'danger' : 'warn'} sub="part des revenus gardée" />
      </View>

      <Section title="Dépenses par catégorie" meta={eur(spend.total)}>
        <Card>
          {spend.slices.length ? (
            <>
              <Donut
                slices={spend.slices.map((x) => ({ value: x.amount, color: CATEGORY_COLOR[x.key] }))}
                center={eur(spend.total)}
                centerSub={isCurrent ? 'ce mois-ci' : cycle.label}
              />
              <View style={{ gap: 12 }}>
                {spend.slices.map((x) => (
                  <View key={x.key} style={{ gap: 5 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: CATEGORY_COLOR[x.key] }} />
                      <Txt style={{ flex: 1, fontSize: 14 }}>{x.label}</Txt>
                      <Txt muted style={{ fontSize: 13, fontVariant: ['tabular-nums'] }}>{`${Math.round(x.share * 100)} %`}</Txt>
                      <Txt style={{ fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'], minWidth: 84, textAlign: 'right' }}>{eur(x.amount)}</Txt>
                    </View>
                    <View style={{ height: 4, borderRadius: 2, backgroundColor: c.surface2, overflow: 'hidden' }}>
                      <View style={{ width: `${x.share * 100}%`, height: '100%', backgroundColor: CATEGORY_COLOR[x.key] }} />
                    </View>
                  </View>
                ))}
              </View>
              <Tip>Une catégorie se trompe ? Ouvre l’opération dans Compte et choisis la bonne.</Tip>
            </>
          ) : (
            <Empty>Aucune dépense sur cette période.</Empty>
          )}
        </Card>
      </Section>

      <Section title="Revenus et dépenses" meta="6 mois">
        <Card>
          <BarPairs
            data={flows.map((f) => ({ label: f.label, a: f.income, b: f.spending }))}
            a={{ name: 'Revenus', color: c.ok }}
            b={{ name: 'Dépenses', color: c.accent }}
          />
          <KV label="Reste moyen par mois (mois terminés)" value={eur(avgNet)} color={avgNet < 0 ? 'danger' : 'ok'} />
          <KV label="Abonnements et contrats" value={`${eur(subTotal)} / mois · ${eur(subTotal * 12)} / an`} />
        </Card>
      </Section>

      <Section title="Épargne et dettes">
        <Card>
          {series.length >= 2 ? (
            <Lines
              labels={series.map((p, i) => (i === series.length - 1 ? 'auj.' : monthAbbr(parseYmd(p.date))))}
              series={[
                { name: 'Épargne bloquée', color: c.save, values: series.map((p) => p.savings) },
                { name: 'Dettes restantes', color: c.debt, values: series.map((p) => p.debts) },
              ]}
            />
          ) : (
            <Tip>Le graphique se remplit à chaque jour de paie.</Tip>
          )}
          <KV label="Épargne bloquée" value={eur(state.pockets.savings)} />
          <KV label="Prochain versement (estimé)" value={`+ ${eur(pv.toSavings)}`} color="ok" />
          <KV label="Dettes restantes" value={eur(debtsLeft(state))} />
          {firstDebt > 0 && lastPoint ? (
            <View style={{ gap: 6 }}>
              <KV label="Déjà remboursé depuis le début du suivi" value={eur(Math.max(0, firstDebt - lastPoint.debts))} />
              <Meter value={1 - lastPoint.debts / firstDebt} color="debt" />
            </View>
          ) : null}
          <KV label="Libre de dettes vers" value={debtFreeEta(state, pv.toDebtExtra)} bold />
        </Card>
      </Section>
    </Screen>
  );
}

const shortDate = (s: string) => {
  const d = parseYmd(s);
  return `${d.getDate()} ${monthAbbr(d)}`;
};
