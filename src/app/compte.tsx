import React, { useState } from 'react';
import { StyleSheet, Switch, TextInput, View } from 'react-native';
import { useApp } from '../store/AppStore';
import { router } from 'expo-router';
import { DemoBanner } from '../components/common';
import { categorize, CATEGORY_LABEL, isSpending } from '../domain/stats';
import { Banner, Btn, Card, DateBadge, Empty, IconButton, List, ListRow, Row, Screen, Section, Sub, Txt } from '../ui/kit';
import { geist, useColors } from '../ui/theme';
import { total } from '../domain/engine';
import { amountInput, eur, parseAmount, parseYmd } from '../domain/format';
import type { PocketKey, Settings } from '../domain/types';

const POCKET_LABEL: Record<PocketKey, string> = {
  courant: 'Courant', bills: 'Factures', year: 'Annuelles', cushion: 'Sécurité', savings: 'Épargne', goal: 'Objectifs', debts: 'Dettes',
};

export default function Compte() {
  const { state, openSheet, update, reset, now } = useApp();
  const c = useColors();
  const [confirmReset, setConfirmReset] = useState(false);
  const tx = state.tx
    .map((x, i) => ({ ...x, i }))
    .sort((a, b) => b.date.localeCompare(a.date) || b.i - a.i)
    .slice(0, 40);
  const mins = Math.round((now - new Date(state.lastSync).getTime()) / 60000);

  return (
    <Screen modal title="Compte" right={<IconButton symbol="xmark" fallback="✕" label="Fermer" onPress={() => router.back()} />}>
      <DemoBanner />
      <Card tint={c.accent} style={{ padding: 20, gap: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Txt style={{ color: c.ink, fontSize: 13 }}>Compte courant</Txt>
          <View style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2, opacity: 0.85 }}>
            <Txt style={{ color: c.ink, fontSize: 11.5 }}>{state.demo ? 'bunq · sandbox' : 'bunq'}</Txt>
          </View>
        </View>
        <Txt style={{ color: c.ink, fontSize: 34, fontWeight: '800', letterSpacing: -0.5, fontVariant: ['tabular-nums'] }}>{eur(state.balance)}</Txt>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Txt style={{ color: c.ink, fontSize: 13 }}>{mins < 1 ? "Synchronisé à l'instant" : `Synchronisé il y a ${mins < 60 ? `${mins} min` : `${Math.round(mins / 60)} h`}`}</Txt>
          <Txt style={{ color: c.ink, fontSize: 13 }}>Total {eur(total(state))}</Txt>
        </View>
      </Card>

      <Section title="Opérations" action={<Btn small title="Ajouter" onPress={() => openSheet({ kind: 'tx' })} />}>
        <List>
          {tx.length ? (
            tx.map((x) => {
              // bank and manual spending can be edited (at least to fix the category); internal transfers cannot
              const editable = !x.transfer && x.src !== 'auto';
              return (
                <ListRow
                  key={x.id}
                  left={<DateBadge date={parseYmd(x.date)} />}
                  title={x.label}
                  amount={`${x.amount > 0 ? '+ ' : '− '}${eur(Math.abs(x.amount))}`}
                  amountColor={x.amount > 0 ? 'ok' : undefined}
                  onPress={editable ? () => openSheet({ kind: 'tx', id: x.id }) : undefined}
                  subtitle={
                    <Sub>
                      {[
                        x.transfer ? `Virement interne · ${POCKET_LABEL[x.pocket] ?? 'Courant'}` : POCKET_LABEL[x.pocket] ?? 'Courant',
                        isSpending(x) ? CATEGORY_LABEL[categorize(state, x)] : null,
                        x.src === 'auto' ? 'Automatique' : x.src === 'bunq' ? 'Banque' : 'Saisie manuelle',
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Sub>
                  }
                />
              );
            })
          ) : (
            <Empty>Aucune opération.</Empty>
          )}
        </List>
      </Section>

      <Section title="Réglages">
        <List>
          <NameSetting />
          <NumberSetting k="payDay" label="Jour de paie" hint="Le salaire tombe ce jour-là" integer min={1} max={31} />
          <NumberSetting k="salary" label="Salaire net" hint="Réparti le jour de paie" />
          <NumberSetting k="otherIncome" label="Autres revenus réguliers" hint="Aides, activité… par mois" />
          <NumberSetting k="lifeBudget" label="Budget de vie" hint="Courses, essence, sorties, par mois" />
          <NumberSetting k="marginShare" label="Marge mise de côté (%)" hint="Le reste de la marge est un bonus libre" integer min={0} max={100} />
          <NumberSetting k="debtShare" label="Part pour les dettes (%)" hint="De ce qui est mis de côté, tant qu'il reste des dettes" integer min={0} max={100} />
          <NumberSetting k="cushion" label="Objectif Sécurité" hint="Recomplété chaque paie si besoin" />
          <NumberSetting k="wishMin" label="Seuil des Envies" hint="Au-dessus, l'appli propose d'attendre 48 h" />
          <SettingRow label="Ajout auto des abonnements" hint="Paiements récurrents repérés dans tes opérations">
            <Switch
              value={state.settings.autoSubs}
              trackColor={{ true: c.accent }}
              onValueChange={(v) =>
                update((s) => { s.settings.autoSubs = v; }, v ? 'Ajout automatique activé' : 'Les abonnements détectés te seront proposés')
              }
            />
          </SettingRow>
        </List>
        {state.ignoredRecurring.length ? (
          <Btn
            variant="ghost"
            title={state.ignoredRecurring.length > 1 ? `Redétecter les ${state.ignoredRecurring.length} paiements ignorés` : 'Redétecter le paiement ignoré'}
            onPress={() => update((s) => { s.ignoredRecurring = []; }, 'Détection réactivée')}
          />
        ) : null}
        {confirmReset ? (
          <Banner tone="danger">
            <View style={{ gap: 10 }}>
              <Txt style={{ fontSize: 14 }}>Remettre les données d’exemple et revenir au vrai jour ? Tout ce que tu as saisi sera effacé.</Txt>
              <Row wrap={false}>
                <Btn grow variant="ghost" title="Annuler" onPress={() => setConfirmReset(false)} />
                <Btn grow variant="danger" title="Tout effacer" onPress={() => { reset(); setConfirmReset(false); }} />
              </Row>
            </View>
          </Banner>
        ) : (
          <Btn variant="ghost" title="Remettre les données d'exemple" onPress={() => setConfirmReset(true)} />
        )}
      </Section>
    </Screen>
  );
}

function SettingRow({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 14, paddingVertical: 10 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt style={{ fontSize: 14 }}>{label}</Txt>
        <Sub>{hint}</Sub>
      </View>
      {children}
    </View>
  );
}

type NumericKey = { [K in keyof Settings]: Settings[K] extends number ? K : never }[keyof Settings];

function NumberSetting({ k, label, hint, integer, min = 0, max }: { k: NumericKey; label: string; hint: string; integer?: boolean; min?: number; max?: number }) {
  const { state, update, toast } = useApp();
  const c = useColors();
  const current = state.settings[k];
  // null = not being edited, show the saved value
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? amountInput(current);
  const commit = () => {
    if (draft === null) return;
    const v = integer ? parseInt(draft, 10) : parseAmount(draft);
    setDraft(null);
    if (Number.isFinite(v) && v >= min && (max === undefined || v <= max)) {
      if (v !== current) update((s) => { s.settings[k] = v; }, 'Enregistré');
    } else toast(max !== undefined ? `Entre une valeur entre ${min} et ${max}` : 'Entre un nombre valide');
  };
  return (
    <SettingRow label={label} hint={hint}>
      <TextInput
        value={text}
        onChangeText={setDraft}
        onEndEditing={commit}
        onSubmitEditing={commit}
        keyboardType={integer ? 'number-pad' : 'decimal-pad'}
        returnKeyType="done"
        accessibilityLabel={label}
        style={{
          width: 110, textAlign: 'right', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: c.line, borderRadius: 10,
          paddingHorizontal: 10, paddingVertical: 8, backgroundColor: c.bg, color: c.ink, fontSize: 16, fontVariant: ['tabular-nums'], fontFamily: geist['600'],
        }}
      />
    </SettingRow>
  );
}

function NameSetting() {
  const { state, update } = useApp();
  const c = useColors();
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const v = draft.trim().slice(0, 24);
    setDraft(null);
    if (v !== state.settings.name) update((s) => { s.settings.name = v; }, 'Enregistré');
  };
  return (
    <SettingRow label="Prénom" hint="Pour te saluer sur l’accueil">
      <TextInput
        value={draft ?? state.settings.name}
        onChangeText={setDraft}
        onEndEditing={commit}
        onSubmitEditing={commit}
        autoCapitalize="words"
        returnKeyType="done"
        placeholder="Ton prénom"
        placeholderTextColor={c.faint}
        accessibilityLabel="Prénom"
        style={{
          width: 140, textAlign: 'right', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: c.line, borderRadius: 10,
          paddingHorizontal: 10, paddingVertical: 8, backgroundColor: c.bg, color: c.ink, fontSize: 16, fontFamily: geist['600'],
        }}
      />
    </SettingRow>
  );
}
