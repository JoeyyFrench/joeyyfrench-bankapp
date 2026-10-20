import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useApp } from '../../store/AppStore';
import { SheetFrame } from './SheetFrame';
import { Text, AmountField, Banner, Btn, CategoryIcon, Field, Row, Segmented, Txt, tap } from '../../ui/kit';
import { alpha, fonts, useColors } from '../../ui/theme';
import { addTx } from '../../domain/engine';
import { CATEGORY_KEYS, CATEGORY_LABEL, VARIABLE_CATEGORIES, averageSpending, categorize, envelopes } from '../../domain/stats';
import { amountInput, eur, parseAmount, r2 } from '../../domain/format';
import type { CategoryKey } from '../../domain/types';

const SHORT_LABEL: Record<CategoryKey, string> = {
  courses: 'Courses',
  transport: 'Transport',
  sorties: 'Sorties',
  shopping: 'Shopping',
  sante: 'Santé',
  abonnements: 'Abonnement',
  factures: 'Facture',
  logement: 'Logement',
  dettes: 'Dette',
  autre: 'Autre',
};

/** Express entry: big keypad, one tap on a category, done. */
export function QuickAddForm() {
  const { state, update, closeSheet, openSheet } = useApp();
  const c = useColors();
  const [type, setType] = useState<'out' | 'in'>('out');
  const [digits, setDigits] = useState('');
  const [cat, setCat] = useState<CategoryKey | null>(null);
  const [note, setNote] = useState('');
  const amount = parseAmount(digits || '0');

  const press = (k: string) => {
    tap();
    setDigits((d) => {
      if (k === '⌫') return d.slice(0, -1);
      if (k === ',') return d.includes(',') ? d : (d || '0') + ',';
      if (d.includes(',') && d.split(',')[1].length >= 2) return d;
      if (d.replace(',', '').length >= 7) return d;
      return d === '0' ? k : d + k;
    });
  };

  return (
    <SheetFrame
      title="Ajout express"
      submitLabel="Ajouter"
      onSubmit={() => {
        if (!(amount > 0)) return 'Tape un montant.';
        if (type === 'out' && !cat && !note.trim()) return 'Choisis une catégorie.';
        const label = note.trim() || (type === 'in' ? 'Rentrée' : CATEGORY_LABEL[cat ?? 'autre']);
        const env = type === 'out' && cat ? envelopes(state).find((e) => e.key === cat) : undefined;
        const left = env ? r2(env.left - amount) : null;
        update(
          (s) => {
            const signed = type === 'in' ? amount : -amount;
            s.balance = r2(s.balance + signed);
            addTx(s, label, signed, 'courant', 'manuel', undefined, type === 'out' && cat ? { category: cat } : undefined);
          },
          left === null ? 'Ajouté' : left >= 0 ? `Ajouté · ${env!.label} : plus que ${eur(left)}` : `Ajouté · ${env!.label} dépassé de ${eur(-left)}`,
        );
        closeSheet();
      }}
    >
      <Segmented options={[{ value: 'out', label: 'Dépense' }, { value: 'in', label: 'Rentrée' }]} value={type} onChange={setType} />
      <View style={{ alignItems: 'center', paddingVertical: 6 }}>
        <Text
          style={{ color: digits ? c.ink : c.faint, fontFamily: fonts.display, fontSize: 56, letterSpacing: -1.5, fontVariant: ['tabular-nums'] }}
          accessibilityLabel={`Montant ${eur(amount)}`}
          adjustsFontSizeToFit
          numberOfLines={1}
        >
          {`${type === 'out' ? '−' : '+'} ${digits || '0'} €`}
        </Text>
      </View>

      {type === 'out' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, justifyContent: 'space-between' }}>
          {[...VARIABLE_CATEGORIES, ...CATEGORY_KEYS.filter((k) => !VARIABLE_CATEGORIES.includes(k))].map((k) => {
            const on = cat === k;
            return (
              <Pressable
                key={k}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={CATEGORY_LABEL[k]}
                onPress={() => {
                  tap();
                  setCat(k);
                }}
                style={{
                  width: '18.4%', alignItems: 'center', gap: 5, paddingVertical: 8, borderRadius: 14,
                  backgroundColor: on ? alpha(c.accent, 0.16) : c.bg, borderWidth: 1, borderColor: on ? c.accent : c.line,
                }}
              >
                <CategoryIcon category={k} size={30} />
                <Text numberOfLines={1} style={{ color: on ? c.ink : c.muted, fontSize: 10.5, fontWeight: '600' }}>{SHORT_LABEL[k]}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', '⌫'].map((k) => (
          <Pressable
            key={k}
            accessibilityRole="button"
            accessibilityLabel={k === '⌫' ? 'Effacer' : k === ',' ? 'Virgule' : k}
            onPress={() => press(k)}
            style={({ pressed }) => ({
              width: '31.8%', height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
              backgroundColor: pressed ? c.line : c.surface2,
            })}
          >
            <Text style={{ color: c.ink, fontFamily: fonts.displayMedium, fontSize: 24 }}>{k}</Text>
          </Pressable>
        ))}
      </View>

      <Field
        label="Note (facultatif)"
        value={note}
        onChangeText={(t) => {
          setNote(t);
          if (!cat && type === 'out' && t.trim().length > 2) {
            const g = categorize(state, { label: t });
            if (g !== 'autre') setCat(g);
          }
        }}
        placeholder={type === 'out' ? 'ex. Leclerc' : 'ex. Remboursement'}
      />

      <View style={{ gap: 8 }}>
        <Txt muted style={{ fontSize: 13, fontWeight: '600' }}>Autre chose ?</Txt>
        <Row>
          <Btn small variant="ghost" title="Envie (48 h)" onPress={() => openSheet({ kind: 'wish', price: amount > 0 ? amount : undefined, label: note.trim() || undefined })} />
          <Btn small variant="ghost" title="Facture" onPress={() => openSheet({ kind: 'bill' })} />
          <Btn small variant="ghost" title="Charge mensuelle" onPress={() => openSheet({ kind: 'charge' })} />
        </Row>
      </View>
    </SheetFrame>
  );
}

/** Create, change or remove a monthly limit for one category. */
export function EnvelopeForm({ category }: { category?: CategoryKey }) {
  const { state, update, closeSheet } = useApp();
  const c = useColors();
  const existing = category ? state.settings.envelopes?.[category] : undefined;
  const free = VARIABLE_CATEGORIES.filter((k) => k === category || !state.settings.envelopes?.[k]);
  const [key, setKey] = useState<CategoryKey>(category ?? free[0] ?? 'courses');
  const [limit, setLimit] = useState(existing ? amountInput(existing) : '');
  const avg = averageSpending(state, key);

  return (
    <SheetFrame
      title={existing ? 'Modifier l’enveloppe' : 'Nouvelle enveloppe'}
      submitLabel={existing ? 'Enregistrer' : 'Créer'}
      onSubmit={() => {
        const a = parseAmount(limit);
        if (!(a > 0)) return 'Entre un plafond supérieur à 0.';
        update((s) => {
          s.settings.envelopes = { ...(s.settings.envelopes ?? {}) };
          if (category && category !== key) delete s.settings.envelopes[category];
          s.settings.envelopes[key] = a;
        }, existing ? 'Enveloppe modifiée' : 'Enveloppe créée');
        closeSheet();
      }}
      onDelete={
        existing
          ? () => {
              update((s) => {
                s.settings.envelopes = { ...(s.settings.envelopes ?? {}) };
                delete s.settings.envelopes[category!];
              }, 'Enveloppe supprimée');
              closeSheet();
            }
          : undefined
      }
    >
      <Banner>Un plafond par mois (d’une paie à l’autre) pour tes dépenses du quotidien. Tu es prévenu à 80 %.</Banner>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {free.map((k) => {
          const on = key === k;
          return (
            <Pressable
              key={k}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => setKey(k)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: on ? c.accent : c.line, backgroundColor: on ? alpha(c.accent, 0.14) : 'transparent' }}
            >
              <CategoryIcon category={k} size={24} />
              <Text style={{ color: on ? c.ink : c.muted, fontWeight: '600', fontSize: 14 }}>{CATEGORY_LABEL[k]}</Text>
            </Pressable>
          );
        })}
      </View>
      <AmountField label="Plafond par mois (€)" value={limit} onChangeText={setLimit} />
      {avg > 0 ? (
        <Banner>
          <View style={{ gap: 8 }}>
            <Txt muted style={{ fontSize: 13.5 }}>{`Ces 3 derniers mois, tu as dépensé en moyenne ${eur(avg)} en ${CATEGORY_LABEL[key].toLowerCase()}.`}</Txt>
            <Row>
              <Btn small variant="ghost" title={`Mettre ${eur(Math.ceil(avg / 10) * 10)}`} onPress={() => setLimit(amountInput(Math.ceil(avg / 10) * 10))} />
              <Btn small variant="ghost" title={`Viser −10 % (${eur(Math.ceil((avg * 0.9) / 10) * 10)})`} onPress={() => setLimit(amountInput(Math.ceil((avg * 0.9) / 10) * 10))} />
            </Row>
          </View>
        </Banner>
      ) : null}
    </SheetFrame>
  );
}
