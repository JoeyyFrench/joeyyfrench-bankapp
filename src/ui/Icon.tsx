import React from 'react';
import { Platform, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { SymbolView, type SFSymbol } from 'expo-symbols';

type Shape = string | { rect: [number, number, number, number, number] } | { circle: [number, number, number] };

/** Line icons (24 × 24, round caps) drawn in SVG wherever SF Symbols are not available (web app). */
const SHAPES: Record<string, Shape[]> = {
  house: ['M3 10.5 12 3l9 7.5', 'M5 9.5V21h14V9.5', 'M10 21v-6h4v6'],
  'chart.pie': ['M21 12A9 9 0 1 1 12 3v9z', 'M15 3.5A9 9 0 0 1 20.5 9H15z'],
  'square.grid.2x2': [{ rect: [3, 3, 7.5, 7.5, 2] }, { rect: [13.5, 3, 7.5, 7.5, 2] }, { rect: [3, 13.5, 7.5, 7.5, 2] }, { rect: [13.5, 13.5, 7.5, 7.5, 2] }],
  'list.bullet': ['M9 6h12', 'M9 12h12', 'M9 18h12', 'M4 6h.01', 'M4 12h.01', 'M4 18h.01'],
  plus: ['M12 5v14', 'M5 12h14'],
  'arrow.triangle.2.circlepath': ['M21 12a9 9 0 0 1-15.5 6.2L3 16', 'M3 12a9 9 0 0 1 15.5-6.2L21 8', 'M21 3v5h-5', 'M3 21v-5h5'],
  person: [{ circle: [12, 8, 4] }, 'M4 21a8 8 0 0 1 16 0'],
  xmark: ['M18 6 6 18', 'M6 6l12 12'],
  cart: [{ circle: [9, 20, 1.5] }, { circle: [18, 20, 1.5] }, 'M2 3h3l2.6 12.4a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L22 7H6'],
  fuelpump: ['M3 22h12', 'M4 9h10', 'M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18', 'M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 4 0V9.8a2 2 0 0 0-.6-1.4L18 5'],
  'fork.knife': ['M3 2v7a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V2', 'M7 2v20', 'M21 15V2a5 5 0 0 0-5 5v6a2 2 0 0 0 2 2h3v7'],
  repeat: ['m17 2 4 4-4 4', 'M3 11v-1a4 4 0 0 1 4-4h14', 'm7 22-4-4 4-4', 'M21 13v1a4 4 0 0 1-4 4H3'],
  'doc.text': ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M16 13H8', 'M16 17H8'],
  'cross.case': [{ rect: [2, 6, 20, 15, 2] }, 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2', 'M12 10v7', 'M8.5 13.5h7'],
  bag: ['M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z', 'M3 6h18', 'M16 10a4 4 0 0 1-8 0'],
  creditcard: [{ rect: [2, 5, 20, 14, 2] }, 'M2 10h20', 'M6 15h4'],
  lock: [{ rect: [4, 11, 16, 11, 2] }, 'M8 11V7a4 4 0 0 1 8 0v4'],
  shield: ['M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z'],
  'arrow.down.right': ['m7 7 10 10', 'M17 7v10H7'],
  calendar: [{ rect: [3, 4, 18, 18, 2] }, 'M16 2v4', 'M8 2v4', 'M3 10h18'],
  circle: [{ circle: [12, 12, 8] }],
};

/** SF Symbol on iOS (native app), the matching SVG line icon elsewhere (web app on the home screen). */
export function Icon({
  name, size = 20, color, weight = 'regular',
}: { name: string; size?: number; color: string; weight?: 'regular' | 'semibold' | 'bold' }) {
  if (Platform.OS === 'ios') return <SymbolView name={name as SFSymbol} size={size} tintColor={color} weight={weight} />;
  const shapes = SHAPES[name.replace(/\.fill$/, '')] ?? SHAPES.circle;
  const stroke = weight === 'bold' ? 2.6 : weight === 'semibold' ? 2.2 : 1.9;
  // Wrapped in a View so it paints above absolutely positioned backgrounds (gradients) on the web
  return (
    <View pointerEvents="none" style={{ width: size, height: size }}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      {shapes.map((sh, i) =>
        typeof sh === 'string' ? (
          <Path key={i} d={sh} />
        ) : 'rect' in sh ? (
          <Rect key={i} x={sh.rect[0]} y={sh.rect[1]} width={sh.rect[2]} height={sh.rect[3]} rx={sh.rect[4]} />
        ) : (
          <Circle key={i} cx={sh.circle[0]} cy={sh.circle[1]} r={sh.circle[2]} />
        ),
      )}
    </Svg>
    </View>
  );
}
