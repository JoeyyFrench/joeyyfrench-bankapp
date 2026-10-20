import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../store/AppStore';
import { useColors } from '../ui/theme';
import { Text } from '../ui/kit';

export function Toast() {
  const { toastMessage } = useApp();
  const c = useColors();
  const insets = useSafeAreaInsets();
  if (!toastMessage) return null;
  return (
    <View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 100, alignItems: 'center' }}
    >
      <View style={{ backgroundColor: c.ink, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 11, maxWidth: 420, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
        <Text style={{ color: c.bg, fontWeight: '600', fontSize: 14, textAlign: 'center' }}>{toastMessage}</Text>
      </View>
    </View>
  );
}
