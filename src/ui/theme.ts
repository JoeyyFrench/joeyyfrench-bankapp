/**
 * Malkidow art direction: deep neutral blacks, off-white text, signature red #E0263D.
 * The app is dark only. Pocket and category colours are tuned to stay readable on #16161B.
 */
const palette = {
  bg: '#0E0E12',
  surface: '#16161B',
  surface2: '#1E1E25',
  line: '#2A2A32',
  ink: '#F2F2F5',
  muted: '#9A9AA6',
  faint: '#5C5C68',
  accent: '#E0263D',
  accentDark: '#BC1C32',
  accentDeep: '#8E1526',
  accentInk: '#FFFFFF',
  accentSoft: 'rgba(224,38,61,0.14)',
  // pockets
  charge: '#7C8BA8',
  bill: '#F2A93B',
  year: '#4C9BE8',
  cushion: '#8A8A97',
  save: '#8E7CF0',
  goal: '#2EC4B6',
  debt: '#F07A3C',
  // states
  ok: '#34C77B',
  warn: '#F2A93B',
  danger: '#FF4D5E',
  scrim: 'rgba(0,0,0,0.6)',
};

export type Colors = typeof palette;
export type ColorName = keyof Colors;

export const colors = palette;
export function useColors(): Colors {
  return palette;
}

/** Adds an alpha channel to a #RRGGBB colour. */
export const alpha = (hex: string, a: number) =>
  hex.startsWith('#')
    ? `${hex}${Math.round(a * 255)
        .toString(16)
        .padStart(2, '0')}`
    : hex;

export const CATEGORY_COLOR: Record<string, string> = {
  logement: '#E0263D',
  courses: '#F2A93B',
  transport: '#4C9BE8',
  sorties: '#C86BFA',
  abonnements: '#2EC4B6',
  factures: '#F07A3C',
  sante: '#34C77B',
  shopping: '#FF7EB6',
  dettes: '#9A9AA6',
  autre: '#5C5C68',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 20 };
