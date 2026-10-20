import React, { useEffect, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '../ui/Icon';
import * as Haptics from 'expo-haptics';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useApp } from '../store/AppStore';
import { tap, useReducedMotion } from '../ui/kit';
import { accentGradient, colors } from '../ui/theme';

const TABS: { name: string; label: string; icon: string; iconOn: string }[] = [
  { name: 'index', label: 'Accueil', icon: 'house', iconOn: 'house.fill' },
  { name: 'stats', label: 'Stats', icon: 'chart.pie', iconOn: 'chart.pie.fill' },
  { name: 'pockets', label: 'Pockets', icon: 'square.grid.2x2', iconOn: 'square.grid.2x2.fill' },
  { name: 'budget', label: 'Budget', icon: 'list.bullet', iconOn: 'list.bullet' },
];

/** Floating glass tab bar with the red "+" in the middle (quick entry). */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index]?.name;

  const go = (name: string) => {
    const route = state.routes.find((r) => r.name === name);
    if (!route) return;
    tap();
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (current !== name && !event.defaultPrevented) navigation.navigate(route.name, route.params);
  };

  const tab = (t: (typeof TABS)[number]) => {
    const on = current === t.name;
    return (
      <Pressable
        key={t.name}
        accessibilityRole="tab"
        accessibilityLabel={t.label}
        accessibilityState={{ selected: on }}
        onPress={() => go(t.name)}
        hitSlop={4}
        style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? 'rgba(255,255,255,0.08)' : 'transparent' }}
      >
        <Icon name={on ? t.iconOn : t.icon} size={21} color={on ? colors.ink : colors.muted} weight={on ? 'semibold' : 'regular'} />
      </Pressable>
    );
  };

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(9,9,12,0)', 'rgba(9,9,12,0.92)']}
        locations={[0, 0.55]}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 120 + insets.bottom }}
      />
      <View style={{ marginHorizontal: 20, marginBottom: Math.max(insets.bottom - 6, 16), height: 66 }}>
        <View style={[StyleSheet.absoluteFill, { borderRadius: 33, overflow: 'hidden' }]}>
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(28,28,34,0.78)', borderRadius: 33, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }]} />
        </View>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 8 }} accessibilityRole="tablist">
          {tab(TABS[0])}
          {tab(TABS[1])}
          <PlusButton />
          {tab(TABS[2])}
          {tab(TABS[3])}
        </View>
      </View>
    </View>
  );
}

function PlusButton() {
  const { openSheet } = useApp();
  const reduced = useReducedMotion();
  const [pop] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(pop, { toValue: 1, duration: 600, delay: 500, easing: Easing.bezier(0.2, 0.8, 0.2, 1.3), useNativeDriver: true }).start();
  }, [pop]);
  return (
    <Animated.View style={reduced ? null : { opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ajouter une dépense"
        onPress={() => {
          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          openSheet({ kind: 'quick' });
        }}
        style={({ pressed }) => ({
          width: 58,
          height: 58,
          marginTop: -26,
          borderRadius: 29,
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 30px rgba(224,38,61,0.55)',
          transform: [{ scale: pressed ? 0.93 : 1 }],
        })}
      >
        <LinearGradient colors={accentGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 29 }]} />
        <View style={[StyleSheet.absoluteFill, { borderRadius: 29, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }]} />
        <Icon name="plus" size={24} color="#FFFFFF" weight="bold" />
      </Pressable>
    </Animated.View>
  );
}
