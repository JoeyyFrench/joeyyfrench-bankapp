import React, { useState } from 'react';
import { LayoutAnimation, Pressable, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, RadialGradient, Stop } from 'react-native-svg';
import { useApp } from '../store/AppStore';
import { Banner, Breathe, Card, KV, Rise, StatTile, Txt, tap, useCountUp, useTween } from '../ui/kit';
import { accentGradient, colors } from '../ui/theme';
import { compute, previewPayday } from '../domain/engine';
import { dateShort, eur, eurShort } from '../domain/format';

const SIZE = 244;
const R = 108;
const CIRC = 2 * Math.PI * R;
const ARC = CIRC * 0.75; // 270°


/** 270° gauge: how much of the monthly living budget is still available. */
function Gauge({ value, children, label }: { value: number; children: React.ReactNode; label: string }) {
  const p = useTween(Math.max(0, Math.min(1, value)), 1600, 250);
  return (
    <View style={{ height: SIZE, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={label}>
      <Breathe style={{ position: 'absolute', width: 320, height: 320, top: (SIZE - 320) / 2 }}>
        <Svg width={320} height={320}>
          <Defs>
            <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#E0263D" stopOpacity="0.3" />
              <Stop offset="1" stopColor="#E0263D" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={160} cy={160} r={160} fill="url(#halo)" />
        </Svg>
      </Breathe>
      <Svg width={SIZE} height={SIZE} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={accentGradient[0]} />
            <Stop offset="1" stopColor={accentGradient[1]} />
          </LinearGradient>
        </Defs>
        <G rotation={135} origin={`${SIZE / 2}, ${SIZE / 2}`}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={10} strokeLinecap="round" strokeDasharray={`${ARC} ${CIRC}`} />
          {p > 0.004 ? (
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="url(#ring)" strokeWidth={10} strokeLinecap="round" strokeDasharray={`${ARC * p} ${CIRC}`} />
          ) : null}
        </G>
      </Svg>
      {children}
    </View>
  );
}

export function HeroCard() {
  const { state } = useApp();
  const [showCalc, setShowCalc] = useState(false);
  const k = compute(state);
  const pv = previewPayday(state);
  const shown = useCountUp(k.free);
  const life = state.settings.lifeBudget;
  const share = life > 0 ? Math.max(0, k.free) / life : 1;
  const toneColor = k.status.tone === 'bad' ? 'danger' : k.status.tone === 'warn' ? 'warn' : 'ok';
  const toneWord = k.free < 0 ? 'ça ne passe pas' : k.free < k.lifeNeed ? 'serré' : k.free < k.lifeNeed * 1.25 ? 'ça passe' : 'large';
  const toggle = () => {
    tap();
    LayoutAnimation.configureNext(LayoutAnimation.create(240, 'easeInEaseOut', 'opacity'));
    setShowCalc((v) => !v);
  };

  return (
    <>
      <Rise order={1}>
        <Pressable
          onPress={toggle}
          accessibilityRole="button"
          accessibilityState={{ expanded: showCalc }}
          accessibilityHint="Affiche le détail du calcul"
        >
          <Gauge value={share} label={`Il te reste ${Math.round(Math.min(1, share) * 100)} % de ton budget de vie du mois`}>
            <View style={{ alignItems: 'center', gap: 2, marginTop: -8, maxWidth: 190 }}>
              <Txt muted style={{ fontSize: 11, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase' }}>Reste à vivre</Txt>
              <Txt
                style={{ fontSize: 34, fontWeight: '800', letterSpacing: -1.4, fontVariant: ['tabular-nums'], color: k.free < 0 ? colors.danger : colors.ink }}
                adjustsFontSizeToFit
                numberOfLines={1}
                accessibilityLabel={`Reste à vivre ${eur(k.free)}`}
              >
                {eur(shown)}
              </Txt>
              <Txt style={{ fontSize: 13, color: colors.soft }}>{`${eur(Math.max(0, k.perDay))} par jour`}</Txt>
              <Txt color="accent" style={{ fontSize: 12, fontWeight: '600', marginTop: 4 }}>{showCalc ? 'Masquer le calcul' : 'Le calcul'}</Txt>
            </View>
            <View
              style={{
                position: 'absolute', bottom: 4, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5,
                backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
              }}
            >
              <Txt style={{ fontSize: 12, fontWeight: '600' }}>
                {k.days <= 0 ? 'Paie aujourd’hui' : `${k.days} jour${k.days > 1 ? 's' : ''} avant la paie`}
              </Txt>
            </View>
          </Gauge>
        </Pressable>
      </Rise>

      <Rise order={2} style={{ flexDirection: 'row', gap: 10 }}>
        <StatTile label="À payer" value={eurShort(k.need)} sub={k.short > 0 ? `manque ${eurShort(k.short)}` : 'couvert'} subColor={k.short > 0 ? 'danger' : 'ok'} />
        <StatTile label="Budget de vie" value={eurShort(k.lifeNeed)} sub={toneWord} subColor={toneColor} />
        <StatTile label="Épargne" value={`+ ${eurShort(pv.toSavings)}`} sub={`le ${dateShort(k.pay)}`} />
      </Rise>

      {showCalc ? (
        <Card>
          <Txt color={toneColor} style={{ fontSize: 14, fontWeight: '600' }}>{k.status.text}</Txt>
          <KV label="Compte courant" value={eur(state.balance)} />
          <KV label="À payer d’ici la paie" value={`− ${eur(k.need)}`} />
          <KV label="Déjà mis de côté (pocket Factures)" value={`+ ${eur(Math.min(k.need, state.pockets.bills))}`} />
          <KV bold label="Reste à vivre" value={eur(k.free)} />
          <KV label="Budget de vie prévu d’ici la paie" value={eur(k.lifeNeed)} />
          {k.short > 0 ? <Banner tone="danger">{`La pocket Factures ne couvre pas tout : ${eur(k.short)} sont pris sur le courant.`}</Banner> : null}
          <Txt muted style={{ fontSize: 12 }}>{`La jauge montre la part de ton budget de vie du mois (${eur(life)}) qu’il te reste.`}</Txt>
        </Card>
      ) : null}
    </>
  );
}
