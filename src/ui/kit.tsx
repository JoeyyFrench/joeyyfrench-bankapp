import React, { useState } from 'react';
import {
  Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { alpha, radius, space, useColors, type ColorName } from './theme';
import { dateFull, parseYmd, ymd } from '../domain/format';

export const tap = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
};

/* ---------------------------------------------------------------- layout */

export function Screen({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  const c = useColors();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: 120, gap: space.lg }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: space.md, paddingTop: space.sm }}>
        <Text style={{ fontSize: 34, fontWeight: '800', color: c.ink, letterSpacing: -0.5, flexShrink: 1 }} accessibilityRole="header">
          {title}
        </Text>
        {right}
      </View>
      {children}
    </ScrollView>
  );
}

export function Section({ title, meta, children, action }: { title: string; meta?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.sm + 2 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: space.sm }}>
        <Txt style={{ fontSize: 20, fontWeight: '700' }} accessibilityRole="header">{title}</Txt>
        {meta ? <Txt muted style={{ fontSize: 13, fontVariant: ['tabular-nums'] }}>{meta}</Txt> : null}
        {action}
      </View>
      {children}
    </View>
  );
}

export function Card({ children, style, accent }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; accent?: ColorName }) {
  const c = useColors();
  return (
    <View
      style={[
        {
          backgroundColor: c.surface,
          borderRadius: radius.xl,
          padding: space.lg,
          gap: space.md,
          borderCurve: 'continuous',
          boxShadow: '0 1px 2px rgba(21,34,30,0.06), 0 8px 24px rgba(21,34,30,0.06)',
        },
        accent ? { borderLeftWidth: 5, borderLeftColor: c[accent] } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function List({ children }: { children: React.ReactNode }) {
  const c = useColors();
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: radius.lg, overflow: 'hidden', borderCurve: 'continuous' }}>
      {items.map((child, i) => (
        <View key={i} style={i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line } : null}>
          {child}
        </View>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ text */

export function Txt({
  children, muted, style, color, ...rest
}: { children: React.ReactNode; muted?: boolean; color?: ColorName; style?: StyleProp<TextStyle> } & React.ComponentProps<typeof Text>) {
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

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <Txt muted style={{ fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' }}>
      {children}
    </Txt>
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
      <Txt color={color} style={{ fontSize: 14, fontWeight: bold ? '700' : '500', fontVariant: ['tabular-nums'], textAlign: 'right' }}>{value}</Txt>
    </View>
  );
}

export function Tag({ children, color = 'muted' }: { children: React.ReactNode; color?: ColorName }) {
  const c = useColors();
  const fg = c[color];
  return (
    <View style={{ backgroundColor: color === 'muted' ? c.line : alpha(fg, 0.15), borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1, alignSelf: 'flex-start' }}>
      <Text style={{ color: fg, fontSize: 11, fontWeight: '700' }}>{children}</Text>
    </View>
  );
}

export function Pill({ children, tone }: { children: React.ReactNode; tone: 'ok' | 'warn' | 'bad' }) {
  const c = useColors();
  const fg = tone === 'ok' ? c.ok : tone === 'warn' ? c.bill : c.danger;
  return (
    <View style={{ backgroundColor: alpha(fg, 0.14), borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' }}>
      <Text style={{ color: fg, fontSize: 13, fontWeight: '700' }}>{children}</Text>
    </View>
  );
}

export function Banner({ children, tone = 'accent' }: { children: React.ReactNode; tone?: 'accent' | 'danger' | 'goal' }) {
  const c = useColors();
  const bg = tone === 'accent' ? c.accentSoft : alpha(tone === 'danger' ? c.danger : c.goal, 0.12);
  return (
    <View style={{ backgroundColor: bg, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: space.sm + 2 }}>
      {typeof children === 'string' ? <Txt color={tone === 'danger' ? 'danger' : undefined} muted={tone !== 'danger'} style={{ fontSize: 13.5 }}>{children}</Txt> : children}
    </View>
  );
}

/* --------------------------------------------------------------- visuals */

export function Meter({ value, color = 'accent', height = 8 }: { value: number; color?: ColorName; height?: number }) {
  const c = useColors();
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: c.line, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(100, value * 100))}%`, height: '100%', backgroundColor: c[color] }} />
    </View>
  );
}

export function SplitBar({ parts }: { parts: { value: number; color: ColorName }[] }) {
  const c = useColors();
  const sum = Math.max(0.01, parts.reduce((a, p) => a + Math.max(0, p.value), 0));
  return (
    <View style={{ flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', backgroundColor: c.line, gap: 2 }} accessibilityLabel="Répartition de ton argent">
      {parts.map((p, i) => (p.value > 0 ? <View key={i} style={{ flex: p.value / sum, backgroundColor: c[p.color] }} /> : null))}
    </View>
  );
}

/* ---------------------------------------------------------------- inputs */

type BtnVariant = 'primary' | 'ghost' | 'danger' | 'save';

export function Btn({
  title, onPress, variant = 'primary', small, disabled, grow, accessibilityLabel,
}: { title: string; onPress: () => void; variant?: BtnVariant; small?: boolean; disabled?: boolean; grow?: boolean; accessibilityLabel?: string }) {
  const c = useColors();
  const bg = variant === 'primary' ? c.accent : variant === 'save' ? c.save : 'transparent';
  const fg = variant === 'primary' ? c.accentInk : variant === 'save' ? c.surface : variant === 'danger' ? c.danger : c.ink;
  const border = variant === 'ghost' ? c.line : variant === 'danger' ? alpha(c.danger, 0.4) : 'transparent';
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
        borderRadius: small ? 10 : 12,
        paddingHorizontal: small ? 12 : 14,
        paddingVertical: small ? 8 : 12,
        opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
        borderCurve: 'continuous',
      })}
    >
      <Text style={{ color: fg, fontWeight: '700', fontSize: small ? 13.5 : 15 }}>{title}</Text>
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
        placeholderTextColor={c.muted}
        {...props}
        style={[
          { borderWidth: 1, borderColor: c.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: c.bg, color: c.ink, fontSize: 17 },
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
    <View style={{ flexDirection: 'row', backgroundColor: c.bg, borderRadius: 12, padding: 4, gap: 4 }} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => {
              tap();
              onChange(o.value);
            }}
            style={{ flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center', backgroundColor: on ? c.surface : 'transparent' }}
          >
            <Text style={{ fontWeight: '700', fontSize: 14, color: on ? c.ink : c.muted }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
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
          <DateTimePicker value={date} mode="date" display="compact" locale="fr-FR" onValueChange={(_, d) => onChange(ymd(d))} />
        </View>
      ) : (
        <>
          <Pressable
            onPress={() => setOpen(true)}
            accessibilityRole="button"
            style={{ borderWidth: 1, borderColor: c.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: c.bg }}
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
        Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={{
        width: 26, height: 26, borderRadius: 8, borderWidth: 2,
        borderColor: on ? c[color] : c.line, backgroundColor: on ? c[color] : 'transparent',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      {on ? <Text style={{ color: c.accentInk, fontWeight: '900', fontSize: 14 }}>✓</Text> : null}
    </Pressable>
  );
}

/** Tappable list row: optional date badge on the left, title + subtitle, amount on the right. */
export function ListRow({
  title, subtitle, amount, amountColor, left, onPress, done, children,
}: {
  title: string; subtitle?: React.ReactNode; amount?: string; amountColor?: ColorName; left?: React.ReactNode;
  onPress?: () => void; done?: boolean; children?: React.ReactNode;
}) {
  const c = useColors();
  const body = (
    <View style={{ paddingHorizontal: 14, paddingVertical: 12, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {left}
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Txt numberOfLines={1} style={{ fontWeight: '600', color: done ? c.muted : c.ink, textDecorationLine: done ? 'line-through' : 'none' }}>
            {title}
          </Txt>
          {subtitle ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>{subtitle}</View> : null}
        </View>
        {amount ? (
          <Money color={done ? 'muted' : amountColor} style={done ? { textDecorationLine: 'line-through' } : null}>
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
  const months = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];
  return (
    <View style={{ width: 44, alignItems: 'center' }}>
      <Txt style={{ fontSize: 19, fontWeight: '800', lineHeight: 21 }}>{top ?? String(date?.getDate() ?? '')}</Txt>
      <Txt muted style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>{bottom ?? (date ? months[date.getMonth()] : '')}</Txt>
    </View>
  );
}

export const Empty = ({ children }: { children: string }) => (
  <View style={{ padding: 16 }}>
    <Txt muted style={{ fontSize: 14 }}>{children}</Txt>
  </View>
);

export const Tip = ({ children }: { children: string }) => <Txt muted style={{ fontSize: 12.5, lineHeight: 17 }}>{children}</Txt>;
