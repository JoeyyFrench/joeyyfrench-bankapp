import { useColorScheme } from 'react-native';

const light = {
  bg: '#F2F5F3',
  surface: '#FFFFFF',
  ink: '#15221E',
  muted: '#5B6A65',
  line: '#DCE3DF',
  accent: '#0E6A5A',
  accentInk: '#FFFFFF',
  accentSoft: '#DCEFE9',
  charge: '#44557A',
  bill: '#B97F12',
  year: '#2A7AA3',
  cushion: '#8E9C97',
  save: '#5E4B9C',
  goal: '#B04A73',
  debt: '#A0522D',
  danger: '#B4392C',
  ok: '#1E7A4C',
  scrim: 'rgba(10,18,15,0.45)',
};

const dark: typeof light = {
  bg: '#0E1412',
  surface: '#171F1C',
  ink: '#E6EEEA',
  muted: '#93A29D',
  line: '#28332F',
  accent: '#4CC0A5',
  accentInk: '#0B1A16',
  accentSoft: '#1A3630',
  charge: '#8DA2CB',
  bill: '#E2AE48',
  year: '#6DB8DE',
  cushion: '#6F7E79',
  save: '#AE9BE6',
  goal: '#E68AAF',
  debt: '#E39A6E',
  danger: '#EF7A6B',
  ok: '#5CC48C',
  scrim: 'rgba(0,0,0,0.55)',
};

export type Colors = typeof light;
export type ColorName = keyof Colors;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

/** Adds an alpha channel to a #RRGGBB color. */
export const alpha = (hex: string, a: number) =>
  `${hex}${Math.round(a * 255)
    .toString(16)
    .padStart(2, '0')}`;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 20 };
