import React from 'react';
import { useApp } from '../store/AppStore';
import { DemoBanner, SyncPill } from '../components/common';
import { Btn, Card, DateBadge, Empty, KV, List, ListRow, Meter, Row, Screen, Section, Sub, Tag, Tip } from '../ui/kit';
import { monthly, nextOcc, nextPayday, paydaysUntil, today, yearly } from '../domain/engine';
import { addDetected, category, chargeKey, detectSuggestions, isSubscription, prettyName } from '../domain/detection';
import { eur, r2 } from '../domain/format';

export default function Charges() {
  const { state, openSheet, update } = useApp();
  const t = today(state);
  const pay = nextPayday(t, state.settings.payDay);
  const ml = monthly(state).sort((a, b) => a.day - b.day);
  const yl = yearly(state).sort((a, b) => nextOcc(a, t).getTime() - nextOcc(b, t).getTime());
  const subs = state.charges.filter(isSubscription);
  const subTotal = r2(subs.reduce((a, c) => a + c.amount, 0));
  const suggestions = state.settings.autoSubs ? [] : detectSuggestions(state);

  return (
    <Screen title="Charges" right={<SyncPill />}>
      <DemoBanner />

      <Section title="Abonnements et contrats" meta={`${eur(subTotal)} / mois`}>
        <Card style={{ gap: 10 }}>
          <KV label="Sur un an" value={eur(subTotal * 12)} />
          <KV label="Détectés automatiquement" value={String(subs.filter((c) => c.auto).length)} />
          <Tip>
            L’appli repère les paiements qui reviennent chaque mois avec le même montant et les ajoute à tes charges. Si un prix change, le montant se met à jour. Un abonnement que tu n’utilises plus ? Résilie-le, puis supprime-le ici.
          </Tip>
        </Card>
        {suggestions.length ? (
          <List>
            {suggestions.map((f) => (
              <ListRow
                key={f.key}
                title={prettyName(f.key)}
                amount={eur(f.amount)}
                subtitle={<Sub>{`${f.count} paiements · vers le ${f.day} du mois${category(f.key) ? ` · ${category(f.key)}` : ''}`}</Sub>}
              >
                <Row>
                  <Btn small title="Ajouter aux charges" onPress={() => update((s) => { addDetected(s, f); }, 'Ajouté à tes charges')} />
                  <Btn small variant="ghost" title="Ignorer" onPress={() => update((s) => { s.ignoredRecurring.push(f.key); }, 'Ignoré')} />
                </Row>
              </ListRow>
            ))}
          </List>
        ) : null}
      </Section>

      <Section title="Chaque mois" meta={`${eur(ml.reduce((a, c) => a + c.amount, 0))} / mois`}>
        <Tip>Payées depuis la pocket Factures. Dans la vraie version, domicilie-les sur son IBAN.</Tip>
        <List>
          {ml.length ? (
            ml.map((c) => (
              <ListRow
                key={c.id}
                left={<DateBadge top={String(c.day)} bottom="du mois" />}
                title={c.label}
                amount={eur(c.amount)}
                onPress={() => openSheet({ kind: 'charge', id: c.id })}
                subtitle={
                  <>
                    {c.day <= t.getDate() ? <Tag>Prélevé ce mois-ci</Tag> : <Tag color="charge">À venir</Tag>}
                    {c.auto ? <Tag color="goal">Détecté</Tag> : null}
                    {isSubscription(c) ? <Tag>{category(chargeKey(c)) || 'Abonnement'}</Tag> : null}
                  </>
                }
              />
            ))
          ) : (
            <Empty>Ajoute ton loyer, tes abonnements, tes assurances…</Empty>
          )}
        </List>
      </Section>

      <Section title="Une fois par an" meta={`${eur(yl.reduce((a, c) => a + c.amount, 0))} / an`}>
        <Tip>Lissées : l’appli met de côté un peu chaque mois pour que l’échéance ne fasse pas mal.</Tip>
        <List>
          {yl.length ? (
            yl.map((c) => {
              const due = nextOcc(c, t);
              const per = r2(Math.max(0, c.amount - (c.saved ?? 0)) / paydaysUntil(state, pay, due));
              return (
                <ListRow
                  key={c.id}
                  left={<DateBadge date={due} />}
                  title={c.label}
                  amount={eur(c.amount)}
                  onPress={() => openSheet({ kind: 'charge', id: c.id })}
                  subtitle={
                    <>
                      <Tag color="year">Annuelle</Tag>
                      {per > 0 ? <Sub>{`${eur(per)} / mois à mettre de côté`}</Sub> : <Tag color="ok">Entièrement provisionnée</Tag>}
                    </>
                  }
                >
                  <Meter value={(c.saved ?? 0) / c.amount} color="year" height={6} />
                </ListRow>
              );
            })
          ) : (
            <Empty>Assurances annuelles, entretien, abonnements à l’année…</Empty>
          )}
        </List>
        <Btn title="Ajouter une charge" onPress={() => openSheet({ kind: 'charge' })} />
      </Section>
    </Screen>
  );
}
