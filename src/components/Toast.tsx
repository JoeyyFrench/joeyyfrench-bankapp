import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../store/AppStore';
import { useColors } from '../ui/theme';

export function Toast() {
  const { toastMessage } = useApp();
  const c = useColors();
  const insets = useSafeAreaInsets();
  if (!toastMessage) return null;
  return (
    <View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 72, alignItems: 'center' }}
    >
      <View style={{ backgroundColor: c.ink, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, maxWidth: 420 }}>
        <Text style={{ color: c.bg, fontWeight: '600', fontSize: 14, textAlign: 'center' }}>{toastMessage}</Text>
      </View>
    </View>
  );
}
