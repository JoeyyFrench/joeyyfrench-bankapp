import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../../store/AppStore';
import { DemoBanner, DetectionNotice, HeaderActions } from '../../components/common';
import {
  Banner, Btn, Card, DateBadge, Empty, Eyebrow, KV, List, ListRow, Meter, Pill, Row, Screen, Section, Sub, Tag, Txt, tap,
} from '../../ui/kit';
import { useColors } from '../../ui/theme';
import { WISH_HOURS, addTx, compute, wishReady } from '../../domain/engine';
import { DAY, dateShort, dateTime, eur, r2 } from '../../domain/format';
import type { Wish } from '../../domain/types';

export default function Home() {
  const { state, openSheet, tick } = useApp();
  const c = useColors();
  const [showCalc, setShowCalc] = useState(false);
  void tick;
  const k = compute(state);
  const waiting = state.wishes.filter((w) => w.status === 'waiting').sort((a, b) => a.added.localeCompare(b.added));
  const dropped = r2(state.wishes.filter((w) => w.status === 'dropped').reduce((a, w) => a + w.price, 0));
  const upcoming = k.upcoming.slice(0, 4);
  // How much of the living budget until payday is covered by what is spendable
  const coverage = k.lifeNeed > 0 ? Math.max(0, k.free) / k.lifeNeed : 1;

  return (
    <Screen title="Reste à vivre" right={<HeaderActions />}>
      <DemoBanner />
      <DetectionNotice />

      <Card style={{ padding: 20, gap: 14 }}>
        <Eyebrow>{`Dépensable d’ici le ${dateShort(k.pay)} · ${k.days} jour${k.days > 1 ? 's' : ''}`}</Eyebrow>
        <Txt
          style={{ fontSize: 56, lineHeight: 60, fontWeight: '800', letterSpacing: -1.5, fontVariant: ['tabular-nums'], color: k.free < 0 ? c.danger : c.ink }}
          adjustsFontSizeToFit
          numberOfLines={1}
          accessibilityLabel={`Reste à vivre ${eur(k.free)}`}
        >
          {eur(k.free)}
        </Txt>
        <Txt muted>
          soit <Txt style={{ fontWeight: '700' }}>{eur(Math.max(0, k.perDay))}</Txt> par jour
        </Txt>
        <Pill tone={k.status.tone}>{k.status.text}</Pill>
        <View style={{ gap: 6 }}>
          <Meter value={Math.min(1, coverage)} color={k.status.tone === 'bad' ? 'danger' : k.status.tone === 'warn' ? 'warn' : 'ok'} />
          <Sub>{`Budget de vie prévu d’ici la paie : ${eur(k.lifeNeed)}`}</Sub>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showCalc }}
          onPress={() => {
            tap();
            setShowCalc((v) => !v);
          }}
        >
          <Txt color="accent" style={{ fontSize: 14, fontWeight: '700' }}>{showCalc ? 'Masquer le calcul' : 'Voir le calcul'}</Txt>
        </Pressable>
        {showCalc ? (
          <View style={{ gap: 10, borderTopWidth: 1, borderTopColor: c.line, paddingTop: 12 }}>
            <KV label="Compte courant" value={eur(state.balance)} />
            <KV label="À payer d’ici la paie" value={`− ${eur(k.need)}`} />
            <KV label="Déjà mis de côté (pocket Factures)" value={`+ ${eur(Math.min(k.need, state.pockets.bills))}`} />
            <View style={{ borderTopWidth: 1, borderTopColor: c.line, paddingTop: 10 }}>
              <KV bold label="Reste à vivre" value={eur(k.free)} />
            </View>
            {k.short > 0 ? (
              <Banner tone="danger">{`La pocket Factures ne couvre pas tout : ${eur(k.short)} sont pris sur le courant.`}</Banner>
            ) : null}
          </View>
        ) : null}

        <Row wrap={false}>
          <Btn grow title="Noter une dépense" onPress={() => openSheet({ kind: 'tx' })} />
          <Btn grow variant="ghost" title="Une envie ?" onPress={() => openSheet({ kind: 'wish' })} />
        </Row>
      </Card>

      <Section
        title="À venir"
        action={
          k.upcoming.length > upcoming.length ? (
            <Pressable onPress={() => router.navigate('/budget')} accessibilityRole="link">
              <Txt color="accent" style={{ fontSize: 14, fontWeight: '700' }}>{`Tout voir (${k.upcoming.length})`}</Txt>
            </Pressable>
          ) : undefined
        }
      >
        <List>
          {upcoming.length ? (
            upcoming.map((x, i) => {
              const days = Math.round((x.date.getTime() - k.t.getTime()) / DAY);
              return (
                <ListRow
                  key={`${x.id}-${i}`}
                  left={<DateBadge date={x.date} />}
                  title={x.label}
                  amount={`− ${eur(x.amount)}`}
                  onPress={() => openSheet(x.kind === 'bill' ? { kind: 'bill', id: x.id } : { kind: 'charge', id: x.id })}
                  subtitle={
                    <>
                      <Tag color={x.kind === 'bill' ? 'bill' : x.kind === 'year' ? 'year' : 'charge'}>
                        {x.kind === 'bill' ? 'Facture' : x.kind === 'year' ? 'Annuelle' : 'Prélèvement'}
                      </Tag>
                      <Tag color={days < 0 ? 'danger' : days === 0 ? 'warn' : 'muted'}>
                        {days < 0 ? 'En retard' : days === 0 ? 'Aujourd’hui' : `J-${days}`}
                      </Tag>
                    </>
                  }
                />
              );
            })
          ) : (
            <Empty>Rien à payer avant ta prochaine paie.</Empty>
          )}
        </List>
      </Section>

      {waiting.length || dropped > 0 ? (
        <Section title="Envies" meta={`Règle des ${WISH_HOURS} h`}>
          <List>
            {waiting.length ? waiting.map((w) => <WishRow key={w.id} w={w} free={k.free} />) : <Empty>Aucune envie en attente.</Empty>}
          </List>
          {dropped > 0 ? <KV label="Économisé en renonçant à des envies" value={eur(dropped)} color="ok" /> : null}
        </Section>
      ) : null}
    </Screen>
  );
}

function WishRow({ w, free }: { w: Wish; free: number }) {
  const { state, update, openSheet } = useApp();
  const ready = wishReady(w.added);
  const releaseAt = new Date(new Date(w.added).getTime() + WISH_HOURS * 36e5);
  const over = r2(w.price - free);
  const set = (status: Wish['status'], msg: string, buy = false) =>
    update((s) => {
      const x = s.wishes.find((y) => y.id === w.id)!;
      x.status = status;
      if (buy) {
        s.balance = r2(s.balance - w.price);
        addTx(s, w.label, -w.price, 'courant', 'manuel');
      }
    }, msg);

  if (!ready)
    return (
      <ListRow title={w.label} amount={eur(w.price)} subtitle={<><Tag>Réflexion</Tag><Sub>{`Décision possible ${dateTime(releaseAt)}`}</Sub></>}>
        <Row>
          <Btn small variant="ghost" title="J’abandonne déjà" onPress={() => set('dropped', `Bien joué, ${eur(w.price)} gardés.`)} />
          {state.demo ? (
            <Btn
              small
              variant="ghost"
              title="Passer le délai (démo)"
              onPress={() => update((s) => { s.wishes.find((y) => y.id === w.id)!.added = new Date(Date.now() - WISH_HOURS * 36e5 - 1000).toISOString(); })}
            />
          ) : null}
        </Row>
      </ListRow>
    );
  return (
    <ListRow title={w.label} amount={eur(w.price)} subtitle={<><Tag color="goal">48 h passées</Tag><Sub>Tu le veux toujours ?</Sub></>}>
      {over > 0 ? <Banner tone="danger">{`Ça dépasse ton reste à vivre de ${eur(over)}. Fais-en plutôt un objectif.`}</Banner> : null}
      <Row>
        <Btn small variant={over > 0 ? 'ghost' : 'primary'} title={over > 0 ? 'Acheter quand même' : 'Oui, je l’achète'} onPress={() => set('bought', 'Achat noté, reste à vivre mis à jour', true)} />
        <Btn small variant="ghost" title="En faire un objectif" onPress={() => openSheet({ kind: 'goal', label: w.label, price: w.price, fromWish: w.id })} />
        <Btn small variant="ghost" title="Laisser tomber" onPress={() => set('dropped', `Bien joué, ${eur(w.price)} gardés.`)} />
      </Row>
    </ListRow>
  );
}
