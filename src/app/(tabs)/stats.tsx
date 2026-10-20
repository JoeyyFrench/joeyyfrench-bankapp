import React, { useState } from 'react';
import { View } from 'react-native';
import { useApp } from '../../store/AppStore';
import { DemoBanner, HeaderActions } from '../../components/common';
import { Card, CategoryIcon, Eyebrow, KV, Meter, PillTabs, Rise, Screen, Section, StatTile, Txt, Tip, useTween } from '../../ui/kit';
import { BarPairs, Donut, Lines } from '../../ui/charts';
import { CATEGORY_COLOR, useColors } from '../../ui/theme';
import { debtFreeEta, debtsLeft, previewPayday } from '../../domain/engine';
import { lastMonths, monthlyFlows, savingsDebtSeries, spendingByCategory } from '../../domain/stats';
import { isSubscription } from '../../domain/detection';
import { eur, eurShort, monthAbbr, parseYmd, r2 } from '../../domain/format';

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
    <Screen eyebrow="Tes chiffres" title="Stats" right={<HeaderActions />}>
      <DemoBanner />

      <Rise order={1} style={{ gap: 10 }}>
        <PillTabs
          options={cycles.map((m, i) => ({ value: i, label: i === cycles.length - 1 ? 'Ce mois-ci' : m.label }))}
          value={selected}
          onChange={setSelected}
        />
        <Tip>{`Du ${shortDate(cycle.from)} au ${shortDate(cycle.to)} : un mois va d’une paie à la suivante.`}</Tip>
      </Rise>

      <Rise order={2} style={{ flexDirection: 'row', gap: 10 }}>
        <StatTile label="Revenus" value={eurShort(flow.income)} color="ok" />
        <StatTile label="Dépenses" value={eurShort(flow.spending)} sub={isCurrent ? 'jusqu’ici' : undefined} />
        <StatTile
          label="Épargné"
          value={`${rate} %`}
          color={rate >= 10 ? 'ok' : rate < 0 ? 'danger' : 'warn'}
          sub={`${flow.net < 0 ? '− ' : ''}${eurShort(Math.abs(flow.net))} gardés`}
        />
      </Rise>

      <Rise order={3}>
        <Section title="Dépenses par catégorie" meta={eur(spend.total)}>
          <Card style={{ gap: 18 }}>
            {spend.slices.length ? (
              <>
                <Donut
                  key={cycle.key}
                  slices={spend.slices.map((x) => ({ value: x.amount, color: CATEGORY_COLOR[x.key] }))}
                  center={eur(spend.total)}
                  centerSub={isCurrent ? 'ce mois-ci' : cycle.label}
                />
                <View style={{ gap: 14 }}>
                  {spend.slices.map((x, i) => (
                    <View key={x.key} style={{ gap: 7 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <CategoryIcon category={x.key} size={30} />
                        <Txt style={{ flex: 1, fontSize: 14, fontWeight: '500' }}>{x.label}</Txt>
                        <Txt muted style={{ fontSize: 12.5, fontVariant: ['tabular-nums'] }}>{`${Math.round(x.share * 100)} %`}</Txt>
                        <Txt style={{ fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'], minWidth: 80, textAlign: 'right' }}>{eur(x.amount)}</Txt>
                      </View>
                      <BarLine key={cycle.key} share={x.share} color={CATEGORY_COLOR[x.key]} delay={300 + i * 80} />
                    </View>
                  ))}
                </View>
                <Tip>Une catégorie se trompe ? Ouvre l’opération dans Compte et choisis la bonne.</Tip>
              </>
            ) : (
              <Txt muted style={{ fontSize: 14 }}>Aucune dépense sur cette période.</Txt>
            )}
          </Card>
        </Section>
      </Rise>

      <Rise order={4}>
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
      </Rise>

      <Rise order={5}>
        <Section title="Épargne et dettes">
          {debtsLeft(state) > 0 || firstDebt > 0 ? (
            <Card tint={c.debt}>
              <Eyebrow color="debt">Libre de dettes</Eyebrow>
              <Txt style={{ fontSize: 26, fontWeight: '800', letterSpacing: -0.8 }}>{debtsLeft(state) > 0 ? debtFreeEta(state, pv.toDebtExtra) : 'C’est fait'}</Txt>
              {firstDebt > 0 && lastPoint ? (
                <>
                  <Txt muted style={{ fontSize: 13 }}>{`Déjà remboursé ${eur(Math.max(0, firstDebt - lastPoint.debts))} · reste ${eur(debtsLeft(state))}`}</Txt>
                  <Meter value={1 - lastPoint.debts / firstDebt} color="debt" to="#FFD08A" />
                </>
              ) : (
                <Txt muted style={{ fontSize: 13 }}>{`Reste ${eur(debtsLeft(state))}`}</Txt>
              )}
            </Card>
          ) : null}
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
          </Card>
        </Section>
      </Rise>
    </Screen>
  );
}

/** Thin bar that grows to its share. */
function BarLine({ share, color, delay }: { share: number; color: string; delay: number }) {
  const v = useTween(share, 900, delay);
  return (
    <View style={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
      <View style={{ width: `${v * 100}%`, height: '100%', borderRadius: 2, backgroundColor: color }} />
    </View>
  );
}

const shortDate = (s: string) => {
  const d = parseYmd(s);
  return `${d.getDate()} ${monthAbbr(d)}`;
};
