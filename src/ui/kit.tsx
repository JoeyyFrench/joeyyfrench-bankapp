import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo, Animated, Easing, LayoutAnimation, Platform, Pressable, ScrollView, StyleSheet, Text as RNText,
  TextInput, View, type LayoutChangeEvent, type StyleProp, type TextInputProps, type TextProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { CATEGORY_COLOR, CATEGORY_SYMBOL, accentGradient, alpha, geist, radius, space, useColors, type ColorName } from './theme';
import { dateFull, parseYmd, ymd } from '../domain/format';
import { SymbolView, type SFSymbol } from 'expo-symbols';

export const tap = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
};

/* ------------------------------------------------------------------ text */

/** Text in Geist: the weight picks the font file (custom fonts ignore fontWeight on iOS). */
export function Text({ style, ...rest }: TextProps) {
  const flat = StyleSheet.flatten(style) ?? {};
  if (flat.fontFamily) return <RNText style={style} {...rest} />;
  const { fontWeight, ...other } = flat;
  return <RNText style={{ ...other, fontFamily: geist[String(fontWeight ?? '400')] ?? geist['400'] }} {...rest} />;
}

export function Txt({
  children, muted, style, color, ...rest
}: { children: React.ReactNode; muted?: boolean; color?: ColorName; style?: StyleProp<TextStyle> } & TextProps) {
  const c = useColors();
  return (
    <Text style={[{ color: color ? c[color] : muted ? c.muted : c.ink, fontSize: 15 }, style]} {...rest}>
      {children}
    </Text>
  );
}

export const Money = ({ children, style, color }: { children: React.ReactNode; style?: StyleProp<TextStyle>; color?: ColorName }) => (
  <Txt color={color} style={[{ fontVariant: ['tabular-nums'], fontWeight: '600' }, style]}>{children}</Txt>
);

export function Eyebrow({ children, color }: { children: React.ReactNode; color?: ColorName }) {
  return (
    <Txt muted={!color} color={color} style={{ fontSize: 11.5, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}>
      {children}
    </Txt>
  );
}

/* ------------------------------------------------------------- motion */

/** True when the user asked iOS to reduce motion: animations are then skipped. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => alive && setReduced(v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

/** Animates a number from 0 (on mount) or its previous value to `target`, with an ease-out curve. */
export function useTween(target: number, duration = 900, delay = 0) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  const mounted = useRef(false);
  useEffect(() => {
    if (reduced) return;
    const start = from.current;
    const wait = mounted.current ? 0 : delay;
    mounted.current = true;
    let raf = 0;
    const timer = setTimeout(() => {
      const t0 = Date.now();
      const step = () => {
        const p = Math.min(1, (Date.now() - t0) / duration);
        const v = start + (target - start) * (1 - Math.pow(1 - p, 4));
        from.current = v;
        setShown(v);
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, wait);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [target, duration, delay, reduced]);
  return reduced ? target : shown;
}

/** Counts up to a money amount, rounded to the cent. */
export function useCountUp(value: number, duration = 900) {
  return Math.round(useTween(value, duration) * 100) / 100;
}

/** Fades and lifts its content in on mount. `order` staggers siblings. */
export function Rise({ children, order = 0, style }: { children: React.ReactNode; order?: number; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 650, delay: order * 70, easing: Easing.bezier(0.2, 0.8, 0.2, 1), useNativeDriver: true }).start();
  }, [v, order]);
  if (reduced) return <View style={style}>{children}</View>;
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/** Slow breathing opacity, for background glows. */
export function Breathe({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const [v] = useState(() => new Animated.Value(0.6));
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.6, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, reduced]);
  return <Animated.View pointerEvents="none" style={[style, { opacity: v }]}>{children}</Animated.View>;
}

export function useWidth(initial = 320) {
  const [w, setW] = useState(initial);
  return [w, (e: LayoutChangeEvent) => setW(Math.round(e.nativeEvent.layout.width))] as const;
}

/* ---------------------------------------------------------------- layout */

/** Height kept free at the bottom of each tab for the floating tab bar. */
export const TAB_BAR_SPACE = 112;

export function Screen({
  title, eyebrow, right, children, background, modal,
}: { title: string; eyebrow?: string; right?: React.ReactNode; children: React.ReactNode; background?: React.ReactNode; modal?: boolean }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {background}
      <ScrollView
        style={{ flex: 1 }}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{
          paddingHorizontal: space.xl,
          paddingTop: modal ? 20 : insets.top + 10,
          paddingBottom: (modal ? 40 : TAB_BAR_SPACE) + insets.bottom,
          gap: space.lg,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Rise style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md }}>
          <View style={{ flexShrink: 1, gap: 2 }}>
            {eyebrow ? <Txt muted style={{ fontSize: 13, fontWeight: '500' }}>{eyebrow}</Txt> : null}
            <Txt style={{ fontSize: 26, fontWeight: '700', letterSpacing: -0.6 }} accessibilityRole="header" numberOfLines={1}>
              {title}
            </Txt>
          </View>
          {right}
        </Rise>
        {children}
      </ScrollView>
    </View>
  );
}

export function Section({ title, meta, children, action }: { title: string; meta?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: space.sm }}>
        <Txt style={{ fontSize: 17, fontWeight: '700', letterSpacing: -0.3 }} accessibilityRole="header">{title}</Txt>
        {meta ? <Txt muted style={{ fontSize: 13, fontVariant: ['tabular-nums'] }}>{meta}</Txt> : null}
        {action}
      </View>
      {children}
    </View>
  );
}

/** Text link used in section headers ("Tout voir"). */
export function LinkText({ children, onPress }: { children: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" hitSlop={8} onPress={onPress}>
      <Txt color="accent" style={{ fontSize: 13, fontWeight: '600' }}>{children}</Txt>
    </Pressable>
  );
}

const glassStyle = (c: ReturnType<typeof useColors>): ViewStyle => ({
  backgroundColor: c.glass,
  borderWidth: 1,
  borderColor: c.glassLine,
  borderCurve: 'continuous',
});

export function Card({ children, style, tint }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; tint?: string }) {
  const c = useColors();
  return (
    <View style={[glassStyle(c), { borderRadius: radius.xl, padding: space.lg, gap: space.md, overflow: 'hidden' }, tint ? { borderColor: alpha(tint, 0.25) } : null, style]}>
      {tint ? (
        <LinearGradient
          colors={[alpha(tint, 0.15), 'rgba(255,255,255,0.02)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : null}
      {children}
    </View>
  );
}

export function List({ children }: { children: React.ReactNode }) {
  const c = useColors();
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[glassStyle(c), { borderRadius: radius.xl, overflow: 'hidden' }]}>
      {items.map((child, i) => (
        <View key={i} style={i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.08)' } : null}>
          {child}
        </View>
      ))}
    </View>
  );
}

export function KV({ label, value, color, bold, swatch }: { label: React.ReactNode; value: React.ReactNode; color?: ColorName; bold?: boolean; swatch?: ColorName }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexShrink: 1 }}>
        {swatch ? <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: c[swatch] }} /> : null}
        <Txt muted={!bold && !color} color={color} style={{ fontSize: 14, fontWeight: bold ? '700' : '400', flexShrink: 1 }}>{label}</Txt>
      </View>
      {typeof value === 'string' ? (
        <Txt color={color} style={{ fontSize: 14, fontWeight: bold ? '700' : '500', fontVariant: ['tabular-nums'], textAlign: 'right' }}>{value}</Txt>
      ) : (
        value
      )}
    </View>
  );
}

export function Tag({ children, color = 'muted' }: { children: React.ReactNode; color?: ColorName }) {
  const c = useColors();
  const fg = c[color];
  return (
    <View style={{ backgroundColor: color === 'muted' ? c.glassStrong : alpha(fg, 0.15), borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, alignSelf: 'flex-start' }}>
      <Text style={{ color: color === 'muted' ? c.soft : fg, fontSize: 11, fontWeight: '600' }}>{children}</Text>
    </View>
  );
}

export function Pill({ children, tone }: { children: React.ReactNode; tone: 'ok' | 'warn' | 'bad' | 'neutral' }) {
  const c = useColors();
  const fg = tone === 'ok' ? c.ok : tone === 'warn' ? c.warn : tone === 'bad' ? c.danger : c.ink;
  return (
    <View
      style={{
        backgroundColor: tone === 'neutral' ? c.glassStrong : alpha(fg, 0.14),
        borderWidth: tone === 'neutral' ? 1 : 0,
        borderColor: c.glassLine,
        borderRadius: 999,
        paddingHorizontal: 11,
        paddingVertical: 5,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ color: fg, fontSize: 12, fontWeight: '600' }}>{children}</Text>
    </View>
  );
}

export function Banner({ children, tone = 'accent' }: { children: React.ReactNode; tone?: 'accent' | 'danger' | 'goal' }) {
  const c = useColors();
  const bg = tone === 'accent' ? c.glassStrong : alpha(tone === 'danger' ? c.danger : c.goal, 0.12);
  return (
    <View style={{ backgroundColor: bg, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: space.sm + 2, borderCurve: 'continuous' }}>
      {typeof children === 'string' ? <Txt color={tone === 'danger' ? 'danger' : undefined} muted={tone !== 'danger'} style={{ fontSize: 13.5 }}>{children}</Txt> : children}
    </View>
  );
}

/* --------------------------------------------------------------- visuals */

/** Progress bar that fills in on mount. Pass `to` for a two-colour gradient fill. */
export function Meter({ value, color = 'accent', height = 6, to, delay = 250 }: { value: number; color?: ColorName; height?: number; to?: string; delay?: number }) {
  const c = useColors();
  const v = useTween(Math.max(0, Math.min(1, value)), 1000, delay);
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: c.glassStrong, overflow: 'hidden' }}>
      <View style={{ width: `${v * 100}%`, height: '100%', borderRadius: height / 2, overflow: 'hidden', backgroundColor: c[color] }}>
        {to ? <LinearGradient colors={[c[color], to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} /> : null}
      </View>
    </View>
  );
}

/** Stacked bar revealed by a single left-to-right sweep. */
export function SplitBar({ parts, height = 14 }: { parts: { value: number; color: string }[]; height?: number }) {
  const [w, onLayout] = useWidth();
  const p = useTween(1, 1300, 250);
  const sum = Math.max(0.01, parts.reduce((a, x) => a + Math.max(0, x.value), 0));
  return (
    <View onLayout={onLayout} style={{ height }} accessibilityLabel="Répartition de ton argent">
      <View style={{ width: w * p, height, overflow: 'hidden', borderRadius: height / 2 }}>
        <View style={{ width: w, height, flexDirection: 'row', gap: 2 }}>
          {parts.map((x, i) => (x.value > 0 ? <View key={i} style={{ flex: x.value / sum, backgroundColor: x.color }} /> : null))}
        </View>
      </View>
    </View>
  );
}

/* ---------------------------------------------------------------- inputs */

type BtnVariant = 'primary' | 'ghost' | 'danger' | 'save' | 'light';

export function Btn({
  title, onPress, variant = 'primary', small, disabled, grow, accessibilityLabel,
}: { title: string; onPress: () => void; variant?: BtnVariant; small?: boolean; disabled?: boolean; grow?: boolean; accessibilityLabel?: string }) {
  const c = useColors();
  const bg = variant === 'save' ? c.save : variant === 'light' ? c.ink : variant === 'ghost' ? c.glassStrong : 'transparent';
  const fg = variant === 'primary' ? c.accentInk : variant === 'save' || variant === 'light' ? c.bg : variant === 'danger' ? c.danger : c.ink;
  const border = variant === 'ghost' ? c.glassLine : variant === 'danger' ? alpha(c.danger, 0.4) : 'transparent';
  const r = small ? 12 : 16;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => ({
        flexGrow: grow ? 1 : 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: border,
        borderRadius: r,
        paddingHorizontal: small ? 13 : 16,
        minHeight: small ? 36 : 50,
        overflow: 'hidden',
        opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
        borderCurve: 'continuous',
      })}
    >
      {variant === 'primary' ? (
        <LinearGradient colors={['#FF4D63', '#C8102E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      ) : null}
      <Text style={{ color: fg, fontWeight: '700', fontSize: small ? 13.5 : 15.5 }}>{title}</Text>
    </Pressable>
  );
}

export const Row = ({ children, wrap = true, style }: { children: React.ReactNode; wrap?: boolean; style?: StyleProp<ViewStyle> }) => (
  <View style={[{ flexDirection: 'row', gap: space.sm + 2, flexWrap: wrap ? 'wrap' : 'nowrap', alignItems: 'center' }, style]}>{children}</View>
);

export function Field({ label, ...props }: { label: string } & TextInputProps) {
  const c = useColors();
  return (
    <View style={{ gap: 6 }}>
      <Txt muted style={{ fontSize: 13, fontWeight: '600' }}>{label}</Txt>
      <TextInput
        placeholderTextColor={c.faint}
        {...props}
        style={[
          {
            borderWidth: 1, borderColor: c.glassLine, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
            backgroundColor: c.glass, color: c.ink, fontSize: 17, fontFamily: geist['500'], borderCurve: 'continuous',
          },
          props.multiline ? { minHeight: 84, textAlignVertical: 'top' } : null,
          props.style,
        ]}
      />
    </View>
  );
}

export const AmountField = (props: { label: string } & TextInputProps) => (
  <Field keyboardType="decimal-pad" placeholder="0,00" inputMode="decimal" {...props} />
);

export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.glass, borderWidth: 1, borderColor: c.glassLine, borderRadius: 14, padding: 4, gap: 4 }} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => {
              tap();
              LayoutAnimation.configureNext(LayoutAnimation.create(180, 'easeInEaseOut', 'opacity'));
              onChange(o.value);
            }}
            style={{ flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center', backgroundColor: on ? c.ink : 'transparent' }}
          >
            <Text style={{ fontWeight: '600', fontSize: 14, color: on ? c.bg : c.muted }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Horizontal row of pills (month selector…). */
export function PillTabs<T extends string | number>({
  options, value, onChange, startAtEnd = true,
}: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; startAtEnd?: boolean }) {
  const c = useColors();
  const ref = useRef<ScrollView>(null);
  return (
    <ScrollView
      ref={ref}
      onContentSizeChange={() => {
        if (startAtEnd) ref.current?.scrollToEnd({ animated: false });
      }}
      horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: space.xl }} style={{ marginHorizontal: -space.xl, flexGrow: 0 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => {
              tap();
              onChange(o.value);
            }}
            style={{ paddingHorizontal: 15, paddingVertical: 8, borderRadius: 999, backgroundColor: on ? c.ink : c.glass, borderWidth: 1, borderColor: on ? c.ink : c.glassLine }}
          >
            <Text style={{ color: on ? c.bg : c.muted, fontWeight: '600', fontSize: 13.5 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Date field with the native picker. Value is YYYY-MM-DD. */
export function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const date = value ? parseYmd(value) : new Date();
  return (
    <View style={{ gap: 6 }}>
      <Txt muted style={{ fontSize: 13, fontWeight: '600' }}>{label}</Txt>
      {Platform.OS === 'ios' ? (
        <View style={{ alignItems: 'flex-start' }}>
          <DateTimePicker value={date} mode="date" display="compact" locale="fr-FR" themeVariant="dark" accentColor={c.accent} onValueChange={(_, d) => onChange(ymd(d))} />
        </View>
      ) : (
        <>
          <Pressable
            onPress={() => setOpen(true)}
            accessibilityRole="button"
            style={{ borderWidth: 1, borderColor: c.glassLine, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: c.glass }}
          >
            <Txt style={{ fontSize: 17 }}>{value ? dateFull(date) : 'Choisir une date'}</Txt>
          </Pressable>
          {open ? (
            <DateTimePicker
              value={date}
              mode="date"
              onValueChange={(_, d) => {
                setOpen(false);
                onChange(ymd(d));
              }}
              onDismiss={() => setOpen(false)}
            />
          ) : null}
        </>
      )}
    </View>
  );
}

export function Check({ on, onPress, color = 'accent', label }: { on: boolean; onPress: () => void; color?: ColorName; label: string }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={{
        width: 24, height: 24, borderRadius: 8, borderWidth: 1.5,
        borderColor: on ? c[color] : 'rgba(255,255,255,0.18)', backgroundColor: on ? c[color] : 'transparent',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      {on ? <Text style={{ color: c.bg, fontWeight: '800', fontSize: 13 }}>✓</Text> : null}
    </Pressable>
  );
}

/** Tappable list row: optional badge on the left, title + subtitle, amount on the right. */
export function ListRow({
  title, subtitle, amount, amountColor, left, onPress, done, children,
}: {
  title: string; subtitle?: React.ReactNode; amount?: string; amountColor?: ColorName; left?: React.ReactNode;
  onPress?: () => void; done?: boolean; children?: React.ReactNode;
}) {
  const c = useColors();
  const body = (
    <View style={{ paddingHorizontal: 16, paddingVertical: 13, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {left}
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Txt numberOfLines={1} style={{ fontWeight: '600', fontSize: 14.5, color: done ? c.muted : c.ink, textDecorationLine: done ? 'line-through' : 'none' }}>
            {title}
          </Txt>
          {subtitle ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>{subtitle}</View> : null}
        </View>
        {amount ? (
          <Money color={done ? 'muted' : amountColor} style={[{ fontWeight: '700', fontSize: 15 }, done ? { textDecorationLine: 'line-through' } : null]}>
            {amount}
          </Money>
        ) : null}
      </View>
      {children}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      {body}
    </Pressable>
  );
}

export const Sub = ({ children }: { children: React.ReactNode }) => <Txt muted style={{ fontSize: 12.5 }}>{children}</Txt>;

export function DateBadge({ date, top, bottom }: { date?: Date; top?: string; bottom?: string }) {
  const c = useColors();
  const months = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];
  return (
    <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: c.glassStrong, alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' }}>
      <Txt style={{ fontSize: 16, fontWeight: '700', lineHeight: 18, fontVariant: ['tabular-nums'] }}>{top ?? String(date?.getDate() ?? '')}</Txt>
      <Txt muted style={{ fontSize: 9.5, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>{bottom ?? (date ? months[date.getMonth()] : '')}</Txt>
    </View>
  );
}

export const Empty = ({ children }: { children: string }) => (
  <View style={{ padding: 16 }}>
    <Txt muted style={{ fontSize: 14 }}>{children}</Txt>
  </View>
);

export const Tip = ({ children }: { children: string }) => <Txt muted style={{ fontSize: 12.5, lineHeight: 18 }}>{children}</Txt>;

/* ------------------------------------------------------------ additions */

/** Round glass button using SF Symbols (falls back to a text glyph elsewhere). */
export function IconButton({ symbol, fallback, label, onPress, tint, text }: { symbol?: SFSymbol; fallback?: string; label: string; onPress: () => void; tint?: string; text?: string }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => ({
        width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        backgroundColor: c.glassStrong, opacity: pressed ? 0.6 : 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
      })}
    >
      {text ? (
        <>
          <LinearGradient colors={['#2A2A33', '#16161B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <Text style={{ color: c.ink, fontSize: 15, fontWeight: '700' }}>{text}</Text>
        </>
      ) : Platform.OS === 'ios' && symbol ? (
        <SymbolView name={symbol} size={17} tintColor={tint ?? c.ink} weight="semibold" />
      ) : (
        <Text style={{ color: tint ?? c.ink, fontSize: 16 }}>{fallback}</Text>
      )}
    </Pressable>
  );
}

/**
 * Card that shows a one-line summary and opens to reveal details.
 * Keeps long screens short: the user only expands what they care about.
 */
export function Expandable({
  color, title, summary, amount, children, initiallyOpen = false, footer,
}: {
  color: ColorName; title: string; summary?: React.ReactNode; amount?: string; children: React.ReactNode; initiallyOpen?: boolean;
  /** Always visible under the header (a progress bar…). */
  footer?: React.ReactNode;
}) {
  const c = useColors();
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <View style={[glassStyle(c), { borderRadius: radius.xl, overflow: 'hidden' }, open ? { borderColor: 'rgba(255,255,255,0.1)' } : null]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${title}${amount ? `, ${amount}` : ''}`}
        onPress={() => {
          tap();
          LayoutAnimation.configureNext(LayoutAnimation.create(240, 'easeInEaseOut', 'opacity'));
          setOpen((o) => !o);
        }}
        style={({ pressed }) => ({ padding: 16, gap: 12, opacity: pressed ? 0.7 : 1 })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: c[color] }} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt style={{ fontSize: 15.5, fontWeight: '600' }}>{title}</Txt>
            {summary ? (typeof summary === 'string' ? <Txt muted style={{ fontSize: 12.5 }}>{summary}</Txt> : summary) : null}
          </View>
          {amount ? <Txt style={{ fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: -0.3 }}>{amount}</Txt> : null}
          <Text style={{ color: c.faint, fontSize: 20, transform: [{ rotate: open ? '90deg' : '0deg' }] }}>›</Text>
        </View>
        {footer}
      </Pressable>
      {open ? <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}>{children}</View> : null}
    </View>
  );
}

/** Small glass tile: label, figure, optional coloured note. */
export function StatTile({ label, value, sub, color, subColor }: { label: string; value: string; sub?: string; color?: ColorName; subColor?: ColorName }) {
  const c = useColors();
  return (
    <View style={[glassStyle(c), { flex: 1, minWidth: 0, borderRadius: radius.lg, padding: 12, gap: 4 }]}>
      <Txt muted style={{ fontSize: 11, fontWeight: '600' }} numberOfLines={1}>{label}</Txt>
      <Txt color={color} style={{ fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: -0.4 }} adjustsFontSizeToFit numberOfLines={1}>
        {value}
      </Txt>
      {sub ? <Txt color={subColor} muted={!subColor} style={{ fontSize: 11 }} numberOfLines={1}>{sub}</Txt> : null}
    </View>
  );
}

/** Rounded-square category badge with its SF Symbol. */
export function CategoryIcon({ category, size = 36 }: { category: string; size?: number }) {
  const color = CATEGORY_COLOR[category] ?? '#55555F';
  return (
    <View style={{ width: size, height: size, borderRadius: size / 3, backgroundColor: alpha(color, 0.16), alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' }}>
      {Platform.OS === 'ios' ? (
        <SymbolView name={(CATEGORY_SYMBOL[category] ?? 'circle.fill') as SFSymbol} size={size * 0.46} tintColor={color} />
      ) : (
        <View style={{ width: size * 0.35, height: size * 0.35, borderRadius: 3, backgroundColor: color }} />
      )}
    </View>
  );
}

/** Red gradient fill, used behind primary surfaces. */
export const AccentFill = () => <LinearGradient colors={accentGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />;
