import React, { useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useApp } from '../store/AppStore';
import { Banner, KV, Pill, Txt, tap, useCountUp } from '../ui/kit';
import { colors, fonts } from '../ui/theme';
import { compute } from '../domain/engine';
import { dateShort, eur } from '../domain/format';

/** Malkidow three-pillar emblem (taller pointed centre pillar). */
export function MalkidowMark({ size = 22, color = colors.ink, opacity = 1 }: { size?: number; color?: string; opacity?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" opacity={opacity}>
      <Path d="M8 92 V38 L28 30 V92 Z M38 92 V24 L50 6 L62 24 V92 Z M72 92 V30 L92 38 V92 Z" fill={color} />
    </Svg>
  );
}

/** Two concentric rings: outer = living budget covered, inner = time left in the pay cycle. */
function Rings({ money, time, tone, daysLeft }: { money: number; time: number; tone: string; daysLeft: number }) {
  const size = 104;
  const ring = (r: number, value: number, color: string, w: number) => {
    const circ = 2 * Math.PI * r;
    const v = Math.max(0, Math.min(1, value));
    return (
      <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={w} fill="none" />
        {v > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={w}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circ * v} ${circ}`}
          />
        ) : null}
      </G>
    );
  };
  return (
    <View style={{ width: size, height: size }} accessibilityLabel={`Budget de vie couvert à ${Math.round(Math.min(1, money) * 100)} %, ${daysLeft} jours avant la paie`}>
      <Svg width={size} height={size}>
        {ring(46, money, tone, 9)}
        {ring(32, time, 'rgba(242,242,245,0.55)', 7)}
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
        <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 20 }}>{daysLeft}</Text>
        <Text style={{ color: colors.muted, fontSize: 10, marginTop: -2 }}>{daysLeft > 1 ? 'jours' : 'jour'}</Text>
      </View>
    </View>
  );
}

export function HeroCard() {
  const { state } = useApp();
  const [showCalc, setShowCalc] = useState(false);
  const k = compute(state);
  const shown = useCountUp(k.free);
  const tone = k.status.tone === 'bad' ? colors.danger : k.status.tone === 'warn' ? colors.warn : colors.ok;
  const coverage = k.lifeNeed > 0 ? Math.max(0, k.free) / k.lifeNeed : 1;

  return (
    <View style={{ borderRadius: 26, overflow: 'hidden', borderWidth: 1, borderColor: '#3A1219', borderCurve: 'continuous' }}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#3A0D16" />
            <Stop offset="0.55" stopColor="#1A0B0F" />
            <Stop offset="1" stopColor="#0E0E12" />
          </LinearGradient>
          <RadialGradient id="glow" cx="90%" cy="0%" r="70%">
            <Stop offset="0" stopColor={colors.accent} stopOpacity="0.45" />
            <Stop offset="1" stopColor={colors.accent} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#bg)" />
        <Rect width="100%" height="100%" fill="url(#glow)" />
      </Svg>
      <View style={{ position: 'absolute', right: -18, bottom: -22 }} pointerEvents="none">
        <MalkidowMark size={150} color={colors.accent} opacity={0.07} />
      </View>

      <View style={{ padding: 20, gap: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: 'rgba(242,242,245,0.7)', fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
            {`Dépensable d’ici le ${dateShort(k.pay)}`}
          </Text>
          <MalkidowMark size={18} color={colors.accent} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text
              style={{ color: k.free < 0 ? colors.danger : colors.ink, fontFamily: fonts.display, fontSize: 46, letterSpacing: -1.5, fontVariant: ['tabular-nums'] }}
              adjustsFontSizeToFit
              numberOfLines={1}
              accessibilityLabel={`Reste à vivre ${eur(k.free)}`}
            >
              {eur(shown)}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 15 }}>
              soit <Text style={{ color: colors.ink, fontWeight: '700' }}>{eur(Math.max(0, k.perDay))}</Text> par jour
            </Text>
          </View>
          <Rings money={coverage} time={k.days / k.cycleDays} tone={tone} daysLeft={k.days} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <Pill tone={k.status.tone}>{k.status.text}</Pill>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showCalc }}
            hitSlop={8}
            onPress={() => {
              tap();
              LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'));
              setShowCalc((v) => !v);
            }}
          >
            <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '700' }}>{showCalc ? 'Masquer' : 'Le calcul'}</Text>
          </Pressable>
        </View>

        {showCalc ? (
          <View style={{ gap: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingTop: 12 }}>
            <KV label="Compte courant" value={eur(state.balance)} />
            <KV label="À payer d’ici la paie" value={`− ${eur(k.need)}`} />
            <KV label="Déjà mis de côté (pocket Factures)" value={`+ ${eur(Math.min(k.need, state.pockets.bills))}`} />
            <KV bold label="Reste à vivre" value={eur(k.free)} />
            <KV label="Budget de vie prévu d’ici la paie" value={eur(k.lifeNeed)} />
            {k.short > 0 ? <Banner tone="danger">{`La pocket Factures ne couvre pas tout : ${eur(k.short)} sont pris sur le courant.`}</Banner> : null}
            <Txt muted style={{ fontSize: 12 }}>Anneau extérieur : part de ton budget de vie couverte. Anneau intérieur : temps restant avant la paie.</Txt>
          </View>
        ) : null}
      </View>
    </View>
  );
}
