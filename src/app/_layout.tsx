import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { AppProvider } from '../store/AppStore';
import { SheetHost } from '../components/sheets/SheetHost';
import { Toast } from '../components/Toast';
import { colors } from '../ui/theme';

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.bg,
    card: colors.surface,
    text: colors.ink,
    border: colors.line,
    notification: colors.accent,
  },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={theme}>
      <AppProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="compte" options={{ presentation: 'modal' }} />
        </Stack>
        <SheetHost />
        <Toast />
      </AppProvider>
    </ThemeProvider>
  );
}
