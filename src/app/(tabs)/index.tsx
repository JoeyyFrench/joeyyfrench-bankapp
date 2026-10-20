import React from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../../store/AppStore';
import { DemoBanner, DetectionNotice, HeaderActions } from '../../components/common';
import { HeroCard } from '../../components/HeroCard';
import { envelopes } from '../../domain/stats';
import {
  Banner, Btn, Card, CategoryIcon, Empty, KV, LinkText, List, ListRow, Meter, Rise, Row, Screen, Section, Sub, Tag, Txt,
} from '../../ui/kit';
import { useColors } from '../../ui/theme';
import { WISH_HOURS, addTx, compute, paydayDue, today, wishReady } from '../../domain/engine';
import { DAY, dateLong, dateShort, dateTime, eur, eurShort, r2 } from '../../domain/format';
import type { Wish } from '../../domain/types';

export default function Home() {
  const { state, tick } = useApp();
  void tick;
  const k = compute(state);
  const waiting = state.wishes.filter((w) => w.status === 'waiting').sort((a, b) => a.added.localeCompare(b.added));
  const dropped = r2(state.wishes.filter((w) => w.status === 'dropped').reduce((a, w) => a + w.price, 0));
  const t = today(state);
  const hour = state.clock ? 12 : new Date().getHours();
  const hello = hour >= 5 && hour < 18 ? 'Bonjour' : 'Bonsoir';
  const name = state.settings.name?.trim();
  const day = dateLong(t);

  return (
    <Screen eyebrow={day.charAt(0).toUpperCase() + day.slice(1)} title={name ? `${hello} ${name}` : hello} right={<HeaderActions />}>
      <DemoBanner />
      <PaydayDue />
      <DetectionNotice />

      <HeroCard />

      <Rise order={3}>
        <Upcoming />
      </Rise>

      <Rise order={4}>
        <Envelopes />
      </Rise>

      {waiting.length || dropped > 0 ? (
        <Rise order={5}>
          <Section title="Envies" meta={`Règle des ${WISH_HOURS} h`}>
            <List>
              {waiting.length ? waiting.map((w) => <WishRow key={w.id} w={w} free={k.free} />) : <Empty>Aucune envie en attente.</Empty>}
            </List>
            {dropped > 0 ? <KV label="Économisé en renonçant à des envies" value={eur(dropped)} color="ok" /> : null}
          </Section>
        </Rise>
      ) : null}
    </Screen>
  );
}

/** Real use: the payday has come, ask to record it. */
function PaydayDue() {
  const { state } = useApp();
  const c = useColors();
  const due = paydayDue(state);
  if (!due) return null;
  return (
    <Rise>
      <Pressable accessibilityRole="button" onPress={() => router.push('/paie')} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
        <Card tint={c.ok}>
          <Txt color="ok" style={{ fontSize: 11.5, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}>{`Jour de paie · ${dateShort(due)}`}</Txt>
          <Txt style={{ fontSize: 18, fontWeight: '700' }}>Ta paie est arrivée ?</Txt>
          <Txt muted style={{ fontSize: 13.5 }}>Dis-moi combien tu as reçu : je remplis les pockets et je calcule ton nouveau reste à vivre.</Txt>
          <Btn title="Répartir ma paie" onPress={() => router.push('/paie')} />
        </Card>
      </Pressable>
    </Rise>
  );
}

/** Next three payments as cards: this week if there is something, otherwise what comes next. */
function Upcoming() {
  const { state, openSheet } = useApp();
  const c = useColors();
  const k = compute(state);
  const items = k.upcoming.slice(0, 3);
  const week = items.length > 0 && items.every((x) => (x.date.getTime() - k.t.getTime()) / DAY <= 7);
  return (
    <Section
      title={week ? 'Cette semaine' : 'À venir'}
      action={k.upcoming.length ? <LinkText onPress={() => router.navigate('/budget')}>{`Tout voir (${k.upcoming.length})`}</LinkText> : undefined}
    >
      {items.length ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {items.map((x, i) => {
            const days = Math.round((x.date.getTime() - k.t.getTime()) / DAY);
            const soon = days <= 2;
            const when = days < 0 ? 'En retard' : days === 0 ? 'Aujourd’hui' : days <= 3 ? `Dans ${days} j` : dateShort(x.date);
            return (
              <Pressable
                key={`${x.id}-${i}`}
                accessibilityRole="button"
                accessibilityLabel={`${x.label}, ${eur(x.amount)}, ${when}`}
                onPress={() => openSheet(x.kind === 'bill' ? { kind: 'bill', id: x.id } : { kind: 'charge', id: x.id })}
                style={({ pressed }) => ({ flex: 1, minWidth: 0, opacity: pressed ? 0.7 : 1 })}
              >
                <Card tint={soon ? (days < 0 ? c.danger : c.accent) : undefined} style={{ padding: 12, gap: 8, borderRadius: 18 }}>
                  <Txt
                    style={{ fontSize: 10.5, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: soon ? (days < 0 ? c.danger : '#FF8090') : c.muted }}
                    numberOfLines={1}
                  >
                    {when}
                  </Txt>
                  <Txt style={{ fontSize: 14, fontWeight: '600' }} numberOfLines={1}>{x.label}</Txt>
                  <Txt style={{ fontSize: 15, fontWeight: '700', letterSpacing: -0.3, fontVariant: ['tabular-nums'] }} numberOfLines={1} adjustsFontSizeToFit>
                    {`− ${eur(x.amount)}`}
                  </Txt>
                </Card>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Card>
          <Txt muted style={{ fontSize: 14 }}>Rien à payer avant ta prochaine paie.</Txt>
        </Card>
      )}
    </Section>
  );
}

/** Spending envelopes of this pay cycle, the most used first. */
function Envelopes() {
  const { state, openSheet } = useApp();
  const c = useColors();
  const list = envelopes(state);
  if (!list.length)
    return (
      <Pressable accessibilityRole="button" onPress={() => openSheet({ kind: 'envelope' })}>
        <Card>
          <Txt style={{ fontSize: 15, fontWeight: '600' }}>Fixe-toi des enveloppes</Txt>
          <Txt muted style={{ fontSize: 13 }}>Courses, sorties, essence : un plafond par mois, et l’appli te prévient avant que ça déborde.</Txt>
        </Card>
      </Pressable>
    );
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Voir les enveloppes" onPress={() => router.navigate('/budget')}>
      <Card style={{ gap: 16 }}>
        {list.slice(0, 3).map((e, i) => {
          const tone = e.state === 'over' ? c.danger : e.state === 'warn' ? c.warn : c.ok;
          return (
            <View key={e.key} style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <CategoryIcon category={e.key} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt style={{ fontSize: 15, fontWeight: '600' }}>{e.label}</Txt>
                  <Txt muted style={{ fontSize: 12 }} numberOfLines={1}>
                    {`${eurShort(e.spent)} sur ${eurShort(e.limit)}${e.state === 'warn' ? ' · à surveiller' : e.state === 'over' ? ' · dépassée' : ''}`}
                  </Txt>
                </View>
                <Txt style={{ fontSize: 14, fontWeight: '700', color: tone, fontVariant: ['tabular-nums'] }}>
                  {e.left < 0 ? `− ${eurShort(-e.left)}` : eurShort(e.left)}
                </Txt>
              </View>
              <Meter
                value={e.share}
                color={e.state === 'over' ? 'danger' : e.state === 'warn' ? 'warn' : 'ok'}
                to={e.state === 'over' ? '#C8102E' : e.state === 'warn' ? '#FF8A3D' : '#3FD0C0'}
                delay={400 + i * 120}
              />
            </View>
          );
        })}
      </Card>
    </Pressable>
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
