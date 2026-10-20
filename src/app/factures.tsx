import React from 'react';
import { Pressable, View } from 'react-native';
import { useApp } from '../store/AppStore';
import { DemoBanner, SyncPill } from '../components/common';
import { Btn, Check, Empty, List, Screen, Section, Sub, Tag, Tip, Txt, Money } from '../ui/kit';
import { today, toggleBill } from '../domain/engine';
import { DAY, dateShort, eur, parseYmd } from '../domain/format';
import type { Bill } from '../domain/types';
import { useColors } from '../ui/theme';

export default function Factures() {
  const { state, openSheet } = useApp();
  const open = state.bills.filter((b) => !b.paid).sort((a, b) => a.due.localeCompare(b.due));
  const done = state.bills.filter((b) => b.paid).sort((a, b) => b.due.localeCompare(a.due));
  return (
    <Screen title="Factures" right={<SyncPill />}>
      <DemoBanner />
      <Section title="À payer" meta={eur(open.reduce((a, b) => a + b.amount, 0))}>
        <Tip>Factures ponctuelles. Coche quand tu paies : c’est pris sur la pocket Factures.</Tip>
        <List>{open.length ? open.map((b) => <BillRow key={b.id} b={b} />) : <Empty>Aucune facture en attente.</Empty>}</List>
        <Btn title="Ajouter une facture" onPress={() => openSheet({ kind: 'bill' })} />
      </Section>
      {done.length ? (
        <Section title="Payées">
          <List>
            {done.map((b) => (
              <BillRow key={b.id} b={b} />
            ))}
          </List>
        </Section>
      ) : null}
    </Screen>
  );
}

function BillRow({ b }: { b: Bill }) {
  const { state, update, openSheet } = useApp();
  const c = useColors();
  const d = parseYmd(b.due);
  const days = Math.round((d.getTime() - today(state).getTime()) / DAY);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 }}>
      <Check
        on={b.paid}
        label={`${b.label} ${b.paid ? 'payée' : 'à payer'}`}
        onPress={() => update((s) => { toggleBill(s, b.id); }, b.paid ? 'Facture remise à payer' : 'Payée depuis la pocket Factures')}
      />
      <Pressable accessibilityRole="button" style={{ flex: 1, gap: 3 }} onPress={() => openSheet({ kind: 'bill', id: b.id })}>
        <Txt numberOfLines={1} style={{ fontWeight: '600', color: b.paid ? c.muted : c.ink, textDecorationLine: b.paid ? 'line-through' : 'none' }}>
          {b.label}
        </Txt>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <Sub>Échéance {dateShort(d)}</Sub>
          {!b.paid ? (
            <Tag color={days < 0 ? 'danger' : days === 0 ? 'bill' : 'muted'}>{days < 0 ? 'En retard' : days === 0 ? "Aujourd'hui" : `J-${days}`}</Tag>
          ) : null}
        </View>
      </Pressable>
      <Money color={b.paid ? 'muted' : undefined} style={b.paid ? { textDecorationLine: 'line-through' } : null}>
        {eur(b.amount)}
      </Money>
    </View>
  );
}
