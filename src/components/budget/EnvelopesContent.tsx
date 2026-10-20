import React from 'react';
import { Pressable, View } from 'react-native';
import { useApp } from '../../store/AppStore';
import { Btn, Card, CategoryIcon, Empty, KV, List, Meter, Section, Tip, Txt } from '../../ui/kit';
import { CATEGORY_LABEL, VARIABLE_CATEGORIES, averageSpending, envelopes } from '../../domain/stats';
import { eur, r2 } from '../../domain/format';

export function EnvelopesContent() {
  const { state, openSheet } = useApp();
  const list = envelopes(state);
  const totalLimit = r2(list.reduce((a, e) => a + e.limit, 0));
  const totalSpent = r2(list.reduce((a, e) => a + e.spent, 0));
  const missing = VARIABLE_CATEGORIES.filter((k) => !state.settings.envelopes?.[k])
    .map((k) => ({ key: k, avg: averageSpending(state, k) }))
    .filter((x) => x.avg > 0);

  return (
    <>
      {list.length ? (
        <Card>
          <KV label="Dépensé ce mois-ci" value={`${eur(totalSpent)} / ${eur(totalLimit)}`} bold />
          <Meter value={totalLimit > 0 ? totalSpent / totalLimit : 0} color={totalSpent > totalLimit ? 'danger' : totalSpent >= totalLimit * 0.8 ? 'warn' : 'ok'} />
        </Card>
      ) : null}
      <Section title="Enveloppes">
        <List>
          {list.length ? (
            list.map((e) => (
              <Pressable key={e.key} accessibilityRole="button" onPress={() => openSheet({ kind: 'envelope', key: e.key })} style={({ pressed }) => ({ padding: 14, gap: 8, opacity: pressed ? 0.6 : 1 })}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <CategoryIcon category={e.key} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt style={{ fontWeight: '600' }}>{e.label}</Txt>
                    <Txt muted style={{ fontSize: 12.5 }}>{`${eur(e.spent)} sur ${eur(e.limit)}`}</Txt>
                  </View>
                  <Txt color={e.state === 'over' ? 'danger' : e.state === 'warn' ? 'warn' : 'ok'} style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                    {e.left >= 0 ? `${eur(e.left)} restants` : `+ ${eur(-e.left)}`}
                  </Txt>
                </View>
                <Meter value={e.share} color={e.state === 'over' ? 'danger' : e.state === 'warn' ? 'warn' : 'ok'} height={6} />
              </Pressable>
            ))
          ) : (
            <Empty>Pas encore d’enveloppe. Fixe un plafond pour les courses ou les sorties, l’appli te prévient avant que ça déborde.</Empty>
          )}
        </List>
        <Btn title="Ajouter une enveloppe" onPress={() => openSheet({ kind: 'envelope' })} />
      </Section>
      {missing.length ? (
        <Section title="Suggestions">
          <List>
            {missing.map((m) => (
              <Pressable key={m.key} accessibilityRole="button" onPress={() => openSheet({ kind: 'envelope', key: m.key })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
                <CategoryIcon category={m.key} size={28} />
                <Txt style={{ flex: 1, fontSize: 14 }}>{CATEGORY_LABEL[m.key]}</Txt>
                <Txt muted style={{ fontSize: 13 }}>{`≈ ${eur(m.avg)} / mois`}</Txt>
              </Pressable>
            ))}
          </List>
          <Tip>Moyenne de tes 3 derniers mois, d’une paie à l’autre.</Tip>
        </Section>
      ) : null}
    </>
  );
}
