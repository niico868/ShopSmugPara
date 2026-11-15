// Campaign frames 1 (hook) and 4 (scarcity): real recordings of smugpara.com inside a phone,
// animated with the luxury kit (slow eases, masked reveals, hairlines, drift, vignette, grain).
import React from 'react';
import { AbsoluteFill, Img, OffthreadVideo, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { BODY, C, Fonts, POSTER } from './kit';
import { EXPO, FadeEdges, Finish, Hairline, Reveal, SMOOTH, Settle, SoftClock, prog } from './lux';

/** An iPhone-style frame around a screen recording (1170x2532). */
export const Phone: React.FC<{ src: string; startFrom?: number; width?: number; zoom?: number; originX?: number; originY?: number; style?: React.CSSProperties }> =
  ({ src, startFrom = 0, width = 600, zoom = 1, originX = 0.5, originY = 0.5, style }) => {
    const h = width * (2532 / 1170);
    return (
      <div style={{ position: 'absolute', width: width + 24, height: h + 24, borderRadius: 82, background: '#0d0d0d', padding: 12,
        boxShadow: '0 60px 140px rgba(0,0,0,.75), inset 0 0 0 2px #262626', ...style }}>
        <div style={{ position: 'relative', width, height: h, borderRadius: 70, overflow: 'hidden', background: '#000' }}>
          <OffthreadVideo src={src} startFrom={startFrom} muted style={{ width, height: h, transform: `scale(${zoom})`, transformOrigin: `${originX * 100}% ${originY * 100}%` }} />
          <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', width: 140, height: 40, borderRadius: 20, background: '#000' }} />
        </div>
      </div>
    );
  };

const headline: React.CSSProperties = { fontFamily: POSTER, fontSize: 64, color: C.white, lineHeight: 1.12, textAlign: 'center' };

/** FRAME 1, HOOK (8s). */
export const Frame1: React.FC = () => {
  const f = useCurrentFrame();
  const enter = prog(f, 10, 70);                                   // phone glides up and settles
  const drift = interpolate(f, [10, 240], [1.0, 1.07]);             // constant slow push, never stops
  const lift = interpolate(f, [10, 240], [0, -40]);
  return (
    <AbsoluteFill style={{ background: C.black }}>
      <Fonts />
      <Phone src={staticFile('rec-home.mp4')} startFrom={30} width={560}
        style={{ left: 540 - 292, top: 400, opacity: enter, transform: `translateY(${(1 - enter) * 220 + lift}px) scale(${drift * (0.94 + enter * 0.06)})`, transformOrigin: '50% 35%' }} />
      {/* Darken top and bottom so the type always reads */}
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(11,11,11,.95) 0%, rgba(11,11,11,0) 22%, rgba(11,11,11,0) 70%, rgba(11,11,11,.96) 86%)' }} />
      <Reveal lines={['LAST CHANCE', 'TO RESERVE YOURS!']} from={4} style={{ position: 'absolute', left: 60, right: 60, top: 120 }} lineStyle={(i) => ({ ...headline, color: i === 1 ? C.coral : C.white })} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 300, display: 'flex', justifyContent: 'center' }}><Hairline from={24} width={220} /></div>
      <Reveal lines={['KEEPING PIECE RARE, YK WE!']} from={120} style={{ position: 'absolute', left: 40, right: 40, top: 1590 }}
        lineStyle={() => ({ fontFamily: BODY, fontWeight: 900, fontSize: 46, color: C.white, textAlign: 'center' })} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1675, display: 'flex', justifyContent: 'center' }}><Hairline from={140} width={160} /></div>
      <Reveal lines={['SMUGGLER BADNESS']} from={150} style={{ position: 'absolute', left: 40, right: 40, top: 1710 }}
        lineStyle={() => ({ fontFamily: POSTER, fontSize: 54, color: C.coral, textAlign: 'center' })} />
      <Finish />
      <FadeEdges total={240} />
    </AbsoluteFill>
  );
};

/** FRAME 4, SCARCITY (9s). */
export const Frame4: React.FC = () => {
  const f = useCurrentFrame();
  const enter = prog(f, 6, 66);
  const zoom = 1 + 0.2 * prog(f, 80, 150, SMOOTH);                  // slow lean into the countdown
  const away = prog(f, 165, 215, SMOOTH);                           // phone recedes, clock takes over
  return (
    <AbsoluteFill style={{ background: C.black }}>
      <Fonts />
      <Phone src={staticFile('rec-product.mp4')} startFrom={20} width={560} zoom={zoom} originX={0.42} originY={0.6}
        style={{ left: 540 - 292, top: 330, opacity: enter * (1 - away * 0.85), filter: `blur(${away * 14}px)`,
          transform: `translateY(${(1 - enter) * 220 + away * 120}px) scale(${(0.94 + enter * 0.06) * (1 - away * 0.12)})` }} />
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(11,11,11,.95) 0%, rgba(11,11,11,0) 16%)' }} />
      <Reveal lines={['THE CLOCK IS REAL.']} from={8} out={160} style={{ position: 'absolute', left: 40, right: 40, top: 130 }} lineStyle={() => headline} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', gap: 56, opacity: prog(f, 175, 215, SMOOTH) }}>
        <SoftClock from={180} start={18 * 3600 + 40 * 60 + 53} />
        <Hairline from={200} width={640} />
        <Reveal lines={['LEAVES THE DOCK', 'SUN 11:59PM']} from={205} style={{}} lineStyle={(i) => ({ fontFamily: POSTER, fontSize: 56, color: i ? C.coral : C.white, textAlign: 'center', lineHeight: 1.15 })} />
        <Reveal lines={['When it’s gone, it’s gone for good.']} from={232} style={{}} lineStyle={() => ({ fontFamily: BODY, fontWeight: 500, fontSize: 38, color: C.grey, textAlign: 'center' })} />
      </AbsoluteFill>
      <Finish />
      <FadeEdges total={270} />
    </AbsoluteFill>
  );
};

export { Img, Settle, EXPO };
