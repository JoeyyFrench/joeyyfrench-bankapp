import React from 'react';
import { Platform, Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import { useApp } from '../store/AppStore';
import { colors } from '../ui/theme';

/** Floating "+" above the tab bar: the one place to add anything. */
export function Fab() {
  const { openSheet } = useApp();
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Ajouter une dépense"
      onPress={() => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        openSheet({ kind: 'quick' });
      }}
      style={({ pressed }) => ({
        position: 'absolute',
        right: 20,
        bottom: insets.bottom + 72,
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: pressed ? colors.accentDark : colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 8px 24px rgba(224,38,61,0.45)',
        transform: [{ scale: pressed ? 0.94 : 1 }],
      })}
    >
      {Platform.OS === 'ios' ? (
        <SymbolView name="plus" size={26} tintColor={colors.accentInk} weight="bold" />
      ) : (
        <Text style={{ color: colors.accentInk, fontSize: 30, fontWeight: '700', marginTop: -2 }}>+</Text>
      )}
    </Pressable>
  );
}
