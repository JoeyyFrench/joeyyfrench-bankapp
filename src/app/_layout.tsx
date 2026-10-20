import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { AppProvider } from '../store/AppStore';
import { SheetHost } from '../components/sheets/SheetHost';
import { Toast } from '../components/Toast';
import { useColors } from '../ui/theme';

function Tabs() {
  const c = useColors();
  return (
    <NativeTabs tintColor={c.accent}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Accueil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="pockets">
        <NativeTabs.Trigger.Label>Pockets</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' }} md="grid_view" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="charges">
        <NativeTabs.Trigger.Label>Charges</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="factures">
        <NativeTabs.Trigger.Label>Factures</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'doc.text', selected: 'doc.text.fill' }} md="receipt_long" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="compte">
        <NativeTabs.Trigger.Label>Compte</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'creditcard', selected: 'creditcard.fill' }} md="credit_card" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <StatusBar style="auto" />
      <Tabs />
      <SheetHost />
      <Toast />
    </AppProvider>
  );
}
