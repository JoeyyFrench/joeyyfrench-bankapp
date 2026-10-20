import React from 'react';
import { View } from 'react-native';
import { useApp } from '../store/AppStore';
import { DemoBanner, DetectionNotice, SyncPill } from '../components/common';
import {
  Banner, Btn, Card, DateBadge, Empty, Eyebrow, KV, List, ListRow, Pill, Row, Screen, Section, Sub, Tag, Txt,
} from '../ui/kit';
import { useColors } from '../ui/theme';
import { WISH_HOURS, addTx, compute, wishReady } from '../domain/engine';
import { DAY, dateLong, dateShort, dateTime, eur, r2 } from '../domain/format';
import type { Wish } from '../domain/types';

export default function Home() {
  const { state, openSheet, tick } = useApp();
  const c = useColors();
  void tick;
  const k = compute(state);
  const waiting = state.wishes.filter((w) => w.status === 'waiting').sort((a, b) => a.added.localeCompare(b.added));
  const dropped = r2(state.wishes.filter((w) => w.status === 'dropped').reduce((a, w) => a + w.price, 0));

  return (
    <Screen title="Reste à vivre" right={<SyncPill />}>
      <DemoBanner />
      <DetectionNotice />

      <Card style={{ padding: 20, gap: 14 }}>
        <Eyebrow>Dépensable d’ici le {dateShort(k.pay)}</Eyebrow>
        <Txt
          style={{ fontSize: 56, lineHeight: 60, fontWeight: '800', letterSpacing: -1.5, fontVariant: ['tabular-nums'], color: k.free < 0 ? c.danger : c.ink }}
          adjustsFontSizeToFit
          numberOfLines={1}
          accessibilityLabel={`Reste à vivre ${eur(k.free)}`}
        >
          {eur(k.free)}
        </Txt>
        <Txt muted>
          soit <Txt style={{ fontWeight: '700' }}>{eur(Math.max(0, k.perDay))}</Txt> par jour pendant{' '}
          <Txt style={{ fontWeight: '700' }}>{k.days} jour{k.days > 1 ? 's' : ''}</Txt>
        </Txt>
        <Pill tone={k.status.tone}>{k.status.text}</Pill>
        <View style={{ gap: 10, borderTopWidth: 1, borderTopColor: c.line, paddingTop: 12 }}>
          <KV swatch="accent" label="Compte courant" value={eur(state.balance)} />
          <KV swatch="bill" label="À payer d'ici la paie" value={eur(k.need)} />
          <KV label="Déjà mis de côté dans Factures" value={eur(state.pockets.bills)} />
          {k.short > 0 ? (
            <KV color="danger" label="Manque pris sur le courant" value={`− ${eur(k.short)}`} />
          ) : (
            <Txt muted style={{ fontSize: 12.5 }}>Tout est couvert par tes pockets : ton compte courant est entièrement dépensable.</Txt>
          )}
          <View style={{ borderTopWidth: 1, borderTopColor: c.line, paddingTop: 10, gap: 10 }}>
            <KV bold label="Reste à vivre" value={eur(k.free)} />
            <KV label="Ton budget de vie d'ici là" value={eur(k.lifeNeed)} />
          </View>
        </View>
        <Row wrap={false}>
          <Btn grow title="Noter une dépense" onPress={() => openSheet({ kind: 'tx' })} />
          <Btn grow variant="ghost" title="Une envie ?" onPress={() => openSheet({ kind: 'wish' })} />
        </Row>
      </Card>

      <Section title="Envies" meta={`Règle des ${WISH_HOURS} h`}>
        <Txt muted style={{ fontSize: 14 }}>
          Un achat plaisir de plus de {eur(state.settings.wishMin)} ? Mets-le ici. Dans {WISH_HOURS} h, tu décides à froid.
        </Txt>
        <List>
          {waiting.length ? waiting.map((w) => <WishRow key={w.id} w={w} free={k.free} />) : <Empty>Aucune envie en attente.</Empty>}
        </List>
        {dropped > 0 ? <KV label="Économisé en renonçant à des envies" value={eur(dropped)} color="ok" /> : null}
      </Section>

      <Section title="Avant la paie" meta={dateLong(k.pay)}>
        <List>
          {k.upcoming.length ? (
            k.upcoming.map((x, i) => {
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
                      <Tag color={days < 0 ? 'danger' : days === 0 ? 'bill' : 'muted'}>
                        {days < 0 ? 'En retard' : days === 0 ? "Aujourd'hui" : `J-${days}`}
                      </Tag>
                      {x.kind === 'year' && x.portion < x.amount ? <Sub>Provisionnée à {Math.round(((x.amount - x.portion) / x.amount) * 100)} %</Sub> : null}
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
      <ListRow title={w.label} amount={eur(w.price)} subtitle={<><Tag>Réflexion</Tag><Sub>Décision possible {dateTime(releaseAt)}</Sub></>}>
        <Row>
          <Btn small variant="ghost" title="J'abandonne déjà" onPress={() => set('dropped', `Bien joué, ${eur(w.price)} gardés.`)} />
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
        <Btn small variant={over > 0 ? 'ghost' : 'primary'} title={over > 0 ? 'Acheter quand même' : "Oui, je l'achète"} onPress={() => set('bought', 'Achat noté, reste à vivre mis à jour', true)} />
        <Btn small variant="ghost" title="En faire un objectif" onPress={() => openSheet({ kind: 'goal', label: w.label, price: w.price, fromWish: w.id })} />
        <Btn small variant="ghost" title="Non, laisse tomber" onPress={() => set('dropped', `Bien joué, ${eur(w.price)} gardés.`)} />
      </Row>
    </ListRow>
  );
}
