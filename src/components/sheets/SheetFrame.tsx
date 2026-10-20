import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { useApp } from '../../store/AppStore';
import { useColors } from '../../ui/theme';
import { Text, Btn, Txt, tap } from '../../ui/kit';

/**
 * Form sheet frame: Cancel / title / primary action in the header, scrolling content,
 * optional destructive action at the bottom. `onSubmit` returns an error message or nothing.
 */
export function SheetFrame({
  title, submitLabel = 'Enregistrer', onSubmit, onDelete, deleteLabel = 'Supprimer', children,
}: {
  title: string;
  submitLabel?: string;
  onSubmit: () => string | void;
  onDelete?: () => void;
  deleteLabel?: string;
  children: React.ReactNode;
}) {
  const { closeSheet } = useApp();
  const c = useColors();
  const [error, setError] = useState<string | null>(null);
  const submit = () => {
    const e = onSubmit();
    if (e) setError(e);
  };
  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      <View
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 14 : 40, paddingBottom: 12,
          borderBottomWidth: 1, borderBottomColor: c.line,
        }}
      >
        <Pressable accessibilityRole="button" onPress={closeSheet} hitSlop={10}>
          <Text style={{ color: c.accent, fontSize: 17 }}>Annuler</Text>
        </Pressable>
        <Text numberOfLines={1} style={{ flex: 1, textAlign: 'center', color: c.ink, fontSize: 17, fontWeight: '700' }} accessibilityRole="header">
          {title}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            tap();
            submit();
          }}
          hitSlop={10}
        >
          <Text style={{ color: c.accent, fontSize: 17, fontWeight: '700' }}>{shortLabel(submitLabel)}</Text>
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {children}
        {error ? <Txt color="danger" style={{ fontSize: 14 }}>{error}</Txt> : null}
        <Btn title={submitLabel} onPress={submit} />
        {onDelete ? <Btn variant="danger" title={deleteLabel} onPress={onDelete} /> : null}
      </ScrollView>
    </View>
  );
}

const shortLabel = (s: string) => (s.length > 12 ? 'OK' : s);
