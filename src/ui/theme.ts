/**
 * "Nuit" art direction: near-black background, glass cards, off-white text and a red accent
 * (colours inspired by Malkidow, nothing else). The app is dark only.
 */
const palette = {
  bg: '#09090C',
  surface: '#131317',
  surface2: '#1B1B21',
  line: '#24242B',
  /** Translucent card fill and border, drawn over the background. */
  glass: 'rgba(255,255,255,0.035)',
  glassLine: 'rgba(255,255,255,0.06)',
  glassStrong: 'rgba(255,255,255,0.07)',
  ink: '#F4F4F6',
  soft: '#B9B9C2',
  muted: '#8E8E99',
  faint: '#55555F',
  accent: '#FF4D63',
  accentDark: '#C8102E',
  accentDeep: '#8E1526',
  accentInk: '#FFFFFF',
  accentSoft: 'rgba(255,77,99,0.14)',
  // pockets
  charge: '#7C8BA8',
  bill: '#FFB23E',
  year: '#5AA9FF',
  cushion: '#9A9AA6',
  save: '#B07DFF',
  goal: '#3FD0C0',
  debt: '#FF8A3D',
  // states
  ok: '#5BD69A',
  warn: '#FFB23E',
  danger: '#FF5468',
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

/** The red gradient used by the gauge, the + button and primary actions. */
export const accentGradient = ['#FF6B7D', '#C8102E'] as const;

export const CATEGORY_COLOR: Record<string, string> = {
  logement: '#FF4D63',
  courses: '#FFB23E',
  transport: '#5AA9FF',
  sorties: '#C9A6FF',
  abonnements: '#3FD0C0',
  factures: '#FF8A3D',
  sante: '#5BD69A',
  shopping: '#FF7EB6',
  dettes: '#9A9AA6',
  autre: '#55555F',
};

/** SF Symbols per spending category (iOS); a coloured square is used as fallback elsewhere. */
export const CATEGORY_SYMBOL: Record<string, string> = {
  logement: 'house.fill',
  courses: 'cart.fill',
  transport: 'fuelpump.fill',
  sorties: 'fork.knife',
  abonnements: 'repeat',
  factures: 'doc.text.fill',
  sante: 'cross.case.fill',
  shopping: 'bag.fill',
  dettes: 'creditcard.fill',
  autre: 'square.grid.2x2.fill',
};

/** Geist faces, loaded in the root layout. One family per weight (custom fonts ignore fontWeight on iOS). */
export const geist: Record<string, string> = {
  '100': 'Geist_400Regular',
  '200': 'Geist_400Regular',
  '300': 'Geist_400Regular',
  '400': 'Geist_400Regular',
  normal: 'Geist_400Regular',
  '500': 'Geist_500Medium',
  '600': 'Geist_600SemiBold',
  '700': 'Geist_700Bold',
  bold: 'Geist_700Bold',
  '800': 'Geist_800ExtraBold',
  '900': 'Geist_800ExtraBold',
};

export const fonts = {
  display: 'Geist_800ExtraBold',
  displayMedium: 'Geist_600SemiBold',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };
export const radius = { sm: 10, md: 14, lg: 18, xl: 24 };
