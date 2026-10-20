import React from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../../store/AppStore';
import { DemoBanner, DetectionNotice, HeaderActions } from '../../components/common';
import { HeroCard } from '../../components/HeroCard';
import { envelopes } from '../../domain/stats';
import {
  Banner, Btn, Card, CategoryIcon, DateBadge, Empty, KV, List, ListRow, Meter, Row, Screen, Section, Sub, Tag, Txt,
} from '../../ui/kit';
import { WISH_HOURS, addTx, compute, wishReady } from '../../domain/engine';
import { DAY, dateTime, eur, r2 } from '../../domain/format';
import type { Wish } from '../../domain/types';

export default function Home() {
  const { state, openSheet, tick } = useApp();
  void tick;
  const k = compute(state);
  const waiting = state.wishes.filter((w) => w.status === 'waiting').sort((a, b) => a.added.localeCompare(b.added));
  const dropped = r2(state.wishes.filter((w) => w.status === 'dropped').reduce((a, w) => a + w.price, 0));
  const upcoming = k.upcoming.slice(0, 4);

  return (
    <Screen title="Reste à vivre" right={<HeaderActions />}>
      <DemoBanner />
      <DetectionNotice />

      <HeroCard />
      <EnvelopeAlerts />

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

/** Envelopes at 80 % or more of their limit for this pay cycle. */
function EnvelopeAlerts() {
  const { state } = useApp();
  const hot = envelopes(state).filter((e) => e.state !== 'ok');
  if (!hot.length) return null;
  return (
    <Pressable accessibilityRole="button" onPress={() => router.navigate('/budget')}>
      <Card style={{ gap: 10 }}>
        {hot.map((e) => (
          <View key={e.key} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <CategoryIcon category={e.key} size={28} />
              <Txt style={{ flex: 1, fontSize: 14, fontWeight: '600' }}>{e.label}</Txt>
              <Txt color={e.state === 'over' ? 'danger' : 'warn'} style={{ fontSize: 13, fontWeight: '700' }}>
                {e.state === 'over' ? `Dépassé de ${eur(-e.left)}` : `Plus que ${eur(e.left)}`}
              </Txt>
            </View>
            <Meter value={e.share} color={e.state === 'over' ? 'danger' : 'warn'} height={6} />
          </View>
        ))}
      </Card>
    </Pressable>
  );
}
