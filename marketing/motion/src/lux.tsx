// Luxury motion kit: slow expo easing, masked blur reveals, tightening letter-spacing, hairlines,
// constant slow camera drift, soft fades, vignette + grain. No bounce, shake or flash.
import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { C } from './kit';

export const EXPO = Easing.bezier(0.16, 1, 0.3, 1);      // entrances: fast start, long silky settle
export const SMOOTH = Easing.bezier(0.65, 0, 0.35, 1);   // moves between two states

/** 0 -> 1 between frames a and b with an ease. */
export const prog = (f: number, a: number, b: number, ease = EXPO) =>
  interpolate(f, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });

/** Lines rise out of a mask one after another, sharpening from a blur while their letter-spacing tightens. */
export const Reveal: React.FC<{ lines: string[]; from: number; stagger?: number; dur?: number; out?: number; style?: React.CSSProperties; lineStyle?: (i: number) => React.CSSProperties }> =
  ({ lines, from, stagger = 9, dur = 34, out, style, lineStyle }) => {
    const f = useCurrentFrame();
    const o = out == null ? 1 : 1 - prog(f, out, out + 20, SMOOTH);
    return (
      <div style={{ ...style, opacity: o }}>
        {lines.map((l, i) => {
          const p = prog(f, from + i * stagger, from + i * stagger + dur);
          return (
            <div key={i} style={{ overflow: 'hidden', paddingBottom: '0.08em' }}>
              <div style={{ transform: `translateY(${(1 - p) * 105}%)`, filter: `blur(${(1 - p) * 10}px)`, opacity: p,
                letterSpacing: `${0.02 + (1 - p) * 0.18}em`, ...lineStyle?.(i) }}>{l}</div>
            </div>
          );
        })}
      </div>
    );
  };

/** A thin line that draws out from its start. */
export const Hairline: React.FC<{ from: number; dur?: number; width: number; color?: string; style?: React.CSSProperties }> = ({ from, dur = 40, width, color = C.coral, style }) => {
  const f = useCurrentFrame();
  return <div style={{ height: 3, width: width * prog(f, from, from + dur, SMOOTH), background: color, ...style }} />;
};

/** Soft fade + slight scale settle + blur clear: the luxury replacement for a stamp. */
export const Settle: React.FC<{ from: number; dur?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ from, dur = 40, children, style }) => {
  const f = useCurrentFrame();
  const p = prog(f, from, from + dur);
  return <div style={{ opacity: p, transform: `scale(${1.08 - p * 0.08})`, filter: `blur(${(1 - p) * 12}px)`, ...style }}>{children}</div>;
};

/** Cinematic finish: vignette and fine animated grain. */
export const Finish: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,.55) 100%)', pointerEvents: 'none' }} />
      <AbsoluteFill style={{ opacity: 0.06, mixBlendMode: 'overlay', pointerEvents: 'none',
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' seed='${f % 8}'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")` }} />
    </>
  );
};

/** Fades the whole frame in from black and out to black. */
export const FadeEdges: React.FC<{ total: number; len?: number }> = ({ total, len = 14 }) => {
  const f = useCurrentFrame();
  const o = Math.max(1 - prog(f, 0, len, SMOOTH), prog(f, total - len, total, SMOOTH));
  return <AbsoluteFill style={{ background: '#000', opacity: o, pointerEvents: 'none' }} />;
};

/** A countdown whose digits cross-fade and drift instead of flipping. */
export const SoftClock: React.FC<{ from: number; start: number; every?: number; size?: number }> = ({ from, start, every = 30, size = 104 }) => {
  const f = useCurrentFrame();
  const ticks = Math.max(0, Math.floor((f - from) / every));
  const left = Math.max(0, start - ticks);
  const since = f - (from + ticks * every);
  const fmt = (s: number) => [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, '0'));
  const now = fmt(left), was = fmt(left + 1);
  const t = ticks > 0 ? prog(since, 0, 16) : 1;
  const unit = ['HRS', 'MIN', 'SEC'];
  return (
    <div style={{ display: 'flex', gap: 30, alignItems: 'flex-start' }}>
      {now.map((v, i) => (
        <div key={i} style={{ textAlign: 'center' }}>
          <div style={{ position: 'relative', height: size * 1.05, width: size * 2.15, overflow: 'hidden', fontFamily: '"Akira Expanded"', fontSize: size, color: C.white, lineHeight: 1.05 }}>
            {v !== was[i] && <div style={{ position: 'absolute', inset: 0, opacity: 1 - t, transform: `translateY(${-t * 30}%)`, filter: `blur(${t * 6}px)` }}>{was[i]}</div>}
            <div style={{ position: 'absolute', inset: 0, opacity: v !== was[i] ? t : 1, transform: `translateY(${v !== was[i] ? (1 - t) * 30 : 0}%)`, filter: `blur(${v !== was[i] ? (1 - t) * 6 : 0}px)` }}>{v}</div>
          </div>
          <div style={{ fontFamily: '"Creato Display"', fontWeight: 700, fontSize: 26, letterSpacing: '0.3em', color: C.grey, marginTop: 10 }}>{unit[i]}</div>
        </div>
      ))}
    </div>
  );
};
