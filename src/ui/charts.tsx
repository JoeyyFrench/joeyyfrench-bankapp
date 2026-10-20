import React, { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { useColors } from './theme';
import { Txt } from './kit';

const compact = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1000) return `${(n / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} k€`;
  return `${Math.round(n)} €`;
};

/** Rounds the axis maximum up to a readable value (100, 250, 500, 1000, 2500…). */
function niceMax(v: number) {
  if (v <= 0) return 100;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

function useWidth(initial = 320) {
  const [w, setW] = useState(initial);
  return [w, (e: LayoutChangeEvent) => setW(Math.round(e.nativeEvent.layout.width))] as const;
}

/* ------------------------------------------------------------------ donut */

export function Donut({
  slices, size = 200, thickness = 26, center, centerSub,
}: { slices: { value: number; color: string }[]; size?: number; thickness?: number; center: string; centerSub?: string }) {
  const c = useColors();
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  const total = slices.reduce((a, s) => a + s.value, 0);
  const gap = slices.length > 1 ? 3 : 0;
  let offset = 0;
  return (
    <View style={{ width: size, height: size, alignSelf: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.surface2} strokeWidth={thickness} fill="none" />
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          {total > 0
            ? slices.map((s, i) => {
                const len = (s.value / total) * circ;
                const dash = Math.max(0, len - gap);
                const el = (
                  <Circle
                    key={i}
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    stroke={s.color}
                    strokeWidth={thickness}
                    fill="none"
                    strokeDasharray={`${dash} ${circ - dash}`}
                    strokeDashoffset={-offset}
                  />
                );
                offset += len;
                return el;
              })
            : null}
        </G>
      </Svg>
      <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
        <Txt style={{ fontSize: 24, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{center}</Txt>
        {centerSub ? <Txt muted style={{ fontSize: 12 }}>{centerSub}</Txt> : null}
      </View>
    </View>
  );
}

/* --------------------------------------------------------------- bar pairs */

export function BarPairs({
  data, a, b, height = 200, highlightLast = true,
}: {
  data: { label: string; a: number; b: number }[];
  a: { name: string; color: string };
  b: { name: string; color: string };
  height?: number;
  highlightLast?: boolean;
}) {
  const c = useColors();
  const [w, onLayout] = useWidth();
  const left = 44;
  const bottom = 22;
  const top = 8;
  const plotH = height - bottom - top;
  const max = niceMax(Math.max(1, ...data.flatMap((d) => [d.a, d.b])));
  const step = (w - left) / Math.max(1, data.length);
  const barW = Math.min(16, step / 3.2);
  const y = (v: number) => top + plotH - (v / max) * plotH;
  const ticks = [0, max / 2, max];
  return (
    <View onLayout={onLayout} style={{ gap: 10 }}>
      <Svg width={w} height={height}>
        {ticks.map((t) => (
          <G key={t}>
            <Line x1={left} x2={w} y1={y(t)} y2={y(t)} stroke={c.line} strokeWidth={1} strokeDasharray={t === 0 ? undefined : '3 4'} />
            <SvgText x={left - 6} y={y(t) + 4} fill={c.muted} fontSize={10} textAnchor="end">
              {compact(t)}
            </SvgText>
          </G>
        ))}
        {data.map((d, i) => {
          const cx = left + step * i + step / 2;
          const faded = highlightLast && i !== data.length - 1 ? 0.75 : 1;
          return (
            <G key={d.label + i} opacity={faded}>
              <Rect x={cx - barW - 1.5} y={y(d.a)} width={barW} height={Math.max(0, top + plotH - y(d.a))} rx={3} fill={a.color} />
              <Rect x={cx + 1.5} y={y(d.b)} width={barW} height={Math.max(0, top + plotH - y(d.b))} rx={3} fill={b.color} />
              <SvgText x={cx} y={height - 6} fill={i === data.length - 1 ? c.ink : c.muted} fontSize={11} fontWeight={i === data.length - 1 ? '700' : '400'} textAnchor="middle">
                {d.label}
              </SvgText>
            </G>
          );
        })}
      </Svg>
      <Legend items={[a, b]} />
    </View>
  );
}

/* -------------------------------------------------------------------- lines */

export function Lines({
  labels, series, height = 200,
}: { labels: string[]; series: { name: string; color: string; values: number[] }[]; height?: number }) {
  const c = useColors();
  const [w, onLayout] = useWidth();
  const left = 44;
  const right = 12;
  const bottom = 22;
  const top = 10;
  const plotH = height - bottom - top;
  const n = labels.length;
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const x = (i: number) => left + (n <= 1 ? (w - left - right) / 2 : ((w - left - right) * i) / (n - 1));
  const y = (v: number) => top + plotH - (v / max) * plotH;
  const ticks = [0, max / 2, max];
  return (
    <View onLayout={onLayout} style={{ gap: 10 }}>
      <Svg width={w} height={height}>
        {ticks.map((t) => (
          <G key={t}>
            <Line x1={left} x2={w - right} y1={y(t)} y2={y(t)} stroke={c.line} strokeWidth={1} strokeDasharray={t === 0 ? undefined : '3 4'} />
            <SvgText x={left - 6} y={y(t) + 4} fill={c.muted} fontSize={10} textAnchor="end">
              {compact(t)}
            </SvgText>
          </G>
        ))}
        {series.map((s) => {
          const pts = s.values.map((v, i) => `${x(i)},${y(v)}`);
          const line = `M${pts.join(' L')}`;
          const area = `${line} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z`;
          return (
            <G key={s.name}>
              <Path d={area} fill={s.color} opacity={0.12} />
              <Path d={line} stroke={s.color} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
              {s.values.map((v, i) => (
                <Circle key={i} cx={x(i)} cy={y(v)} r={i === n - 1 ? 4.5 : 2.5} fill={i === n - 1 ? s.color : c.surface} stroke={s.color} strokeWidth={2} />
              ))}
            </G>
          );
        })}
        {labels.map((l, i) =>
          n <= 6 || i % 2 === (n - 1) % 2 ? (
            <SvgText key={i} x={x(i)} y={height - 6} fill={i === n - 1 ? c.ink : c.muted} fontSize={11} textAnchor="middle">
              {l}
            </SvgText>
          ) : null,
        )}
      </Svg>
      <Legend items={series} />
    </View>
  );
}

export function Legend({ items }: { items: { name: string; color: string }[] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
      {items.map((i) => (
        <View key={i.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: i.color }} />
          <Txt muted style={{ fontSize: 12.5 }}>{i.name}</Txt>
        </View>
      ))}
    </View>
  );
}
