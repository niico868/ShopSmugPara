// Smug Para motion kit: the reusable pieces every campaign frame is built from.
import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, continueRender, delayRender } from 'remotion';

export const C = { coral: '#F34949', black: '#0b0b0b', white: '#ffffff', gold: '#f6b21a', grey: '#9a9a9a' };
export const POSTER = '"Akira Expanded", Impact, sans-serif';
export const BODY = '"Creato Display", sans-serif';

/** Loads the site's own fonts before the first frame renders. */
export const Fonts: React.FC = () => {
  const [h] = React.useState(() => delayRender('fonts'));
  React.useEffect(() => {
    const faces = [
      new FontFace('Akira Expanded', `url(${staticFile('akira-expanded.woff2')})`),
      new FontFace('Creato Display', `url(${staticFile('creato-display-medium.woff2')})`, { weight: '500' }),
      new FontFace('Creato Display', `url(${staticFile('creato-display-bold.woff2')})`, { weight: '700' }),
      new FontFace('Creato Display', `url(${staticFile('creato-display-black.woff2')})`, { weight: '900' }),
    ];
    Promise.all(faces.map((f) => f.load().then((l) => document.fonts.add(l)))).then(() => continueRender(h));
  }, [h]);
  return null;
};

/** A full-screen coral flash that fades out over `len` frames. */
export const Flash: React.FC<{ at: number; len?: number }> = ({ at, len = 8 }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [at, at + 1, at + len], [0, 0.9, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ background: C.coral, opacity: o, mixBlendMode: 'screen' }} />;
};

/** The X-ray scan: a bright line sweeps down; above it the image shows through, below it stays dark. */
export const Scan: React.FC<{ src: string; from: number; dur: number; style?: React.CSSProperties }> = ({ src, from, dur, style }) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [from, from + dur], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const glitch = f >= from && f < from + dur && f % 7 < 2 ? 1 : 0;
  return (
    <div style={{ position: 'relative', overflow: 'hidden', ...style }}>
      <Img src={src} style={{ width: '100%', display: 'block', filter: 'grayscale(1) brightness(.25) contrast(1.4)' }} />
      <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 0 ${100 - p}% 0)` }}>
        <Img src={src} style={{ width: '100%', display: 'block' }} />
        {glitch ? <Img src={src} style={{ position: 'absolute', inset: 0, width: '100%', mixBlendMode: 'screen', opacity: 0.6, transform: 'translateX(14px)', filter: 'sepia(1) hue-rotate(-50deg) saturate(6)' }} /> : null}
      </div>
      {p > 0 && p < 100 && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: `${p}%`, height: 6, background: C.coral, boxShadow: `0 0 40px 12px ${C.coral}` }} />
      )}
      {/* scan grid */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,.05) 0 2px, transparent 2px 8px)' }} />
    </div>
  );
};

/** Text typed on letter by letter, with a blinking block cursor. */
export const Typewriter: React.FC<{ text: string; from: number; cps?: number; style?: React.CSSProperties }> = ({ text, from, cps = 22, style }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = Math.max(0, Math.floor(((f - from) / fps) * cps));
  const done = n >= text.length;
  return (
    <div style={{ fontFamily: POSTER, color: C.white, ...style }}>
      {text.slice(0, n)}
      {f >= from && <span style={{ color: C.coral, opacity: done && Math.floor(f / 8) % 2 ? 0 : 1 }}>▌</span>}
    </div>
  );
};

/** Something slammed onto the screen like a rubber stamp: overshoot, settle, a little shake. */
export const Stamp: React.FC<{ from: number; children: React.ReactNode; rotate?: number; style?: React.CSSProperties }> = ({ from, children, rotate = -6, style }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (f < from) return null;
  const s = spring({ frame: f - from, fps, config: { damping: 9, stiffness: 220 } });
  const scale = interpolate(s, [0, 1], [2.6, 1]);
  const shake = f - from < 6 ? Math.sin((f - from) * 3) * (6 - (f - from)) * 2 : 0;
  return <div style={{ transform: `translate(${shake}px, ${shake / 2}px) scale(${scale}) rotate(${rotate}deg)`, opacity: Math.min(1, s * 2), ...style }}>{children}</div>;
};

/** A callout: a dot on the garment, a line drawing out, then the label. */
export const Callout: React.FC<{ from: number; x: number; y: number; dx: number; label: string; sub?: string }> = ({ from, x, y, dx, label, sub }) => {
  const f = useCurrentFrame();
  const line = interpolate(f, [from + 4, from + 14], [0, Math.abs(dx)], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const dot = interpolate(f, [from, from + 5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const txt = interpolate(f, [from + 12, from + 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const left = dx < 0;
  return (
    <div style={{ position: 'absolute', left: x, top: y }}>
      <div style={{ position: 'absolute', width: 26, height: 26, borderRadius: 13, background: C.coral, transform: `translate(-13px,-13px) scale(${dot})`, boxShadow: `0 0 0 ${10 * dot}px rgba(243,73,73,.3)` }} />
      <div style={{ position: 'absolute', top: -2, height: 4, background: C.white, width: line, left: left ? -line : 0 }} />
      <div style={{ position: 'absolute', top: -50, [left ? 'right' : 'left']: Math.abs(dx) + 12, opacity: txt, whiteSpace: 'nowrap', transform: `translateY(${(1 - txt) * 20}px)`, textAlign: left ? 'right' : 'left', background: C.black, padding: '14px 22px', borderLeft: left ? undefined : `6px solid ${C.coral}`, borderRight: left ? `6px solid ${C.coral}` : undefined }}>
        <div style={{ fontFamily: POSTER, fontSize: 34, color: C.white }}>{label}</div>
        {sub && <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 30, color: C.grey, marginTop: 6 }}>{sub}</div>}
      </div>
    </div>
  );
};

/** A split-flap digit that flips when its value changes. */
const Flap: React.FC<{ v: string; flipAt: number }> = ({ v, flipAt }) => {
  const f = useCurrentFrame();
  const t = interpolate(f - flipAt, [0, 6], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'relative', width: 128, height: 180, background: '#1a1a1a', borderRadius: 14, overflow: 'hidden', boxShadow: 'inset 0 -6px 0 rgba(0,0,0,.5)' }}>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontFamily: POSTER, fontSize: 120, color: C.white, transform: `rotateX(${t * 80}deg)`, transformOrigin: 'center' }}>{v}</div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 89, height: 3, background: C.black }} />
    </div>
  );
};

/** Countdown clock (HH:MM:SS) ticking down one second every `fps` frames from `start` seconds. */
export const FlipClock: React.FC<{ from: number; start: number }> = ({ from, start }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ticks = Math.max(0, Math.floor((f - from) / (fps / 2)));
  const left = Math.max(0, start - ticks);
  const lastTick = from + ticks * (fps / 2);
  const parts = [Math.floor(left / 3600), Math.floor((left % 3600) / 60), left % 60].map((n) => String(n).padStart(2, '0'));
  const prev = [Math.floor((left + 1) / 3600), Math.floor(((left + 1) % 3600) / 60), (left + 1) % 60].map((n) => String(n).padStart(2, '0'));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      {parts.map((p, i) => (
        <React.Fragment key={i}>
          {i > 0 && <div style={{ fontFamily: POSTER, fontSize: 90, color: C.coral }}>:</div>}
          {p.split('').map((d, j) => <Flap key={j} v={d} flipAt={prev[i][j] !== d ? lastTick : -99} />)}
        </React.Fragment>
      ))}
    </div>
  );
};

/** Slides in from below with a soft spring. */
export const Rise: React.FC<{ from: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ from, children, style }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - from, fps, config: { damping: 16 } });
  return <div style={{ opacity: f < from ? 0 : s, transform: `translateY(${(1 - s) * 80}px)`, ...style }}>{children}</div>;
};
