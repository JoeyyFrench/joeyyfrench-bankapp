import React from 'react';
import { View } from 'react-native';
import { useFonts, SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { Fab } from '../components/Fab';
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
  const [fontsLoaded] = useFonts({ SpaceGrotesk_500Medium, SpaceGrotesk_700Bold });
  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  return (
    <ThemeProvider value={theme}>
      <AppProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="compte" options={{ presentation: 'modal' }} />
        </Stack>
        <Fab />
        <SheetHost />
        <Toast />
      </AppProvider>
    </ThemeProvider>
  );
}
