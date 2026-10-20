import React from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../store/AppStore';
import { Banner, Btn, Card, Eyebrow, KV, Row, Txt, tap } from '../ui/kit';
import { useColors } from '../ui/theme';
import { dateLong, eur } from '../domain/format';
import { today } from '../domain/engine';

export function SyncPill() {
  const { state, update, now } = useApp();
  const c = useColors();
  const mins = Math.round((now - new Date(state.lastSync).getTime()) / 60000);
  const label = mins < 1 ? "Synchro à l'instant" : mins < 60 ? `Synchro il y a ${mins} min` : `Synchro il y a ${Math.round(mins / 60)} h`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Synchroniser le compte"
      onPress={() => {
        tap();
        update((s) => {
          s.lastSync = new Date().toISOString();
        }, 'Compte à jour (simulation)');
      }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: c.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 4 }}
    >
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.ok }} />
      <Txt muted style={{ fontSize: 12 }}>{label}</Txt>
    </Pressable>
  );
}

export function DemoBanner() {
  const { state } = useApp();
  if (state.clock)
    return (
      <Banner>
        <Txt muted style={{ fontSize: 13 }}>
          <Txt style={{ fontSize: 13, fontWeight: '700' }}>Jour simulé : {dateLong(today(state))}. </Txt>
          « Remettre les données d’exemple » dans Compte revient au vrai jour.
        </Txt>
      </Banner>
    );
  if (!state.demo) return null;
  return (
    <Banner>
      <Txt muted style={{ fontSize: 13 }}>
        <Txt style={{ fontSize: 13, fontWeight: '700' }}>Données d’exemple. </Txt>
        Faux compte bunq (sandbox). Modifie ou ajoute ce que tu veux pour tester.
      </Txt>
    </Banner>
  );
}

export function DetectionNotice() {
  const { state, update } = useApp();
  const c = useColors();
  const n = state.notices[0];
  if (!n) return null;
  const k = n.added.length;
  return (
    <Card style={{ borderWidth: 1, borderColor: c.accent }}>
      <Eyebrow>Paiements récurrents détectés</Eyebrow>
      {n.added.map((a, i) => (
        <KV key={i} label={a.label} value={`${eur(a.amount)} / mois`} />
      ))}
      {k > 0 ? (
        <Txt muted style={{ fontSize: 13.5 }}>
          {k > 1 ? 'Ajoutés à tes charges : ils sont pris' : 'Ajouté à tes charges : il est pris'} en compte dans ton reste à vivre et payé
          {k > 1 ? 's' : ''} depuis la pocket Factures.
        </Txt>
      ) : null}
      {n.priced.map((p, i) => (
        <Txt key={i} muted style={{ fontSize: 13.5 }}>
          <Txt style={{ fontWeight: '700', fontSize: 13.5 }}>{p.label}</Txt> passe de {eur(p.from)} à {eur(p.to)}. Montant mis à jour.
        </Txt>
      ))}
      <Row>
        <Btn
          small
          title="Voir mes abonnements"
          onPress={() => {
            update((s) => {
              s.notices = s.notices.filter((x) => x.id !== n.id);
            });
            router.navigate('/charges');
          }}
        />
        <Btn small variant="ghost" title="OK" onPress={() => update((s) => { s.notices = s.notices.filter((x) => x.id !== n.id); })} />
      </Row>
    </Card>
  );
}
