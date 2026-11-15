// Style reel, luxury version (~16.5s): scan reveal, logo, callouts, countdown, end card.
import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { BODY, C, Fonts, POSTER } from './kit';
import { FadeEdges, Finish, Hairline, Reveal, SMOOTH, Settle, SoftClock, prog } from './lux';

/** Scene wrapper: fades/blurs in over `inLen`, out over `outLen`, so scenes dissolve into each other. */
const Scene: React.FC<{ from: number; to: number; children: React.ReactNode; bg?: string }> = ({ from, to, children, bg }) => {
  const f = useCurrentFrame();
  if (f < from - 1 || f > to + 1) return null;
  const i = prog(f, from, from + 30, SMOOTH), o = prog(f, to - 30, to, SMOOTH);
  return <AbsoluteFill style={{ background: bg, opacity: i * (1 - o), filter: `blur(${(1 - i) * 10 + o * 14}px)`, transform: `scale(${1 + o * 0.03})` }}>{children}</AbsoluteFill>;
};

/** A soft X-ray scan: the coloured garment is revealed under a glowing line that eases down. */
const LuxScan: React.FC<{ from: number; dur: number; src: string; style: React.CSSProperties }> = ({ from, dur, src, style }) => {
  const f = useCurrentFrame();
  const p = prog(f, from, from + dur, SMOOTH) * 100;
  return (
    <div style={{ position: 'absolute', overflow: 'hidden', borderRadius: 28, ...style }}>
      <Img src={src} style={{ width: '100%', display: 'block', filter: 'grayscale(1) brightness(.22) contrast(1.3)' }} />
      <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 0 ${100 - p}% 0)` }}><Img src={src} style={{ width: '100%', display: 'block' }} /></div>
      {p > 0 && p < 100 && <div style={{ position: 'absolute', left: 0, right: 0, top: `${p}%`, height: 2, background: C.coral, boxShadow: `0 0 60px 18px rgba(243,73,73,.45)` }} />}
    </div>
  );
};

/** Callout: dot fades in, hairline draws, label reveals. */
const Callout: React.FC<{ from: number; x: number; y: number; dir: 1 | -1; title: string; sub: string }> = ({ from, x, y, dir, title, sub }) => {
  const f = useCurrentFrame();
  const d = prog(f, from, from + 24);
  return (
    <div style={{ position: 'absolute', left: x, top: y }}>
      <div style={{ position: 'absolute', width: 18, height: 18, borderRadius: 9, background: C.coral, opacity: d, transform: `translate(-9px,-9px) scale(${0.6 + d * 0.4})`, boxShadow: `0 0 0 ${10 * d}px rgba(243,73,73,.18)` }} />
      <div style={{ position: 'absolute', top: -1, [dir > 0 ? 'left' : 'right']: 14 }}><Hairline from={from + 8} width={110} color={C.white} style={{ height: 2 }} /></div>
      <div style={{ position: 'absolute', top: -44, [dir > 0 ? 'left' : 'right']: 140, whiteSpace: 'nowrap', textAlign: dir > 0 ? 'left' : 'right', background: `rgba(11,11,11,${0.88 * prog(f, from + 18, from + 40)})`, padding: '14px 22px', borderRadius: 6 }}>
        <Reveal lines={[title]} from={from + 22} lineStyle={() => ({ fontFamily: POSTER, fontSize: 32, color: C.white })} />
        <Reveal lines={[sub]} from={from + 30} lineStyle={() => ({ fontFamily: BODY, fontWeight: 500, fontSize: 28, color: C.grey, marginTop: 4 })} />
      </div>
    </div>
  );
};

export const StyleReelLux: React.FC = () => {
  const f = useCurrentFrame();
  const drift = interpolate(f, [0, 270], [1, 1.06]);
  return (
    <AbsoluteFill style={{ background: C.black }}>
      <Fonts />
      {/* 1. Scan reveal + headline (0-270, the tee stays under scenes 2-3) */}
      <Scene from={0} to={270}>
        <LuxScan from={20} dur={90} src={staticFile('frtb-tee-gold-front.jpg')} style={{ left: 110, top: 470, width: 860, transform: `scale(${drift})` }} />
        <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(11,11,11,.95) 0%, rgba(11,11,11,0) 20%)' }} />
        <Reveal lines={['CARGO 01', '11/11 FRTB']} from={8} style={{ position: 'absolute', left: 60, right: 60, top: 150 }}
          lineStyle={(i) => ({ fontFamily: POSTER, fontSize: 64, color: i ? C.coral : C.white, textAlign: 'center', lineHeight: 1.12 })} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: 330, display: 'flex', justifyContent: 'center' }}><Hairline from={30} width={220} /></div>
        {/* 2. Logo settles over the dimmed tee (110-170) */}
        <AbsoluteFill style={{ background: `rgba(11,11,11,${0.8 * prog(f, 110, 140, SMOOTH) * (1 - prog(f, 160, 190, SMOOTH))})`, justifyContent: 'center', alignItems: 'center' }}>
          {f >= 110 && f < 195 && <div style={{ opacity: 1 - prog(f, 160, 190, SMOOTH) }}><Settle from={115}><Img src={staticFile('logo-mark.svg')} style={{ width: 340 }} /></Settle></div>}
        </AbsoluteFill>
        {/* 3. Callouts (180-270) */}
        <Callout from={185} x={250} y={760} dir={1} title="OVERSIZED" sub="Black / gold" />
        <Callout from={205} x={830} y={1120} dir={-1} title="FRTB" sub="Front + back print" />
      </Scene>

      {/* 4. Countdown (250-390) */}
      <Scene from={250} to={390}>
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', gap: 50 }}>
          <Reveal lines={['CARGO 01 · 11/11 FRTB']} from={262} lineStyle={() => ({ fontFamily: BODY, fontWeight: 700, fontSize: 34, letterSpacing: '0.3em', color: C.grey, textAlign: 'center' })} />
          <SoftClock from={268} start={26 * 3600 + 14 * 60 + 9} />
          <Hairline from={290} width={640} />
          <Reveal lines={['LEAVES THE DOCK', 'SUN 11:59PM']} from={296} lineStyle={(i) => ({ fontFamily: POSTER, fontSize: 56, color: i ? C.coral : C.white, textAlign: 'center', lineHeight: 1.15 })} />
        </AbsoluteFill>
      </Scene>

      {/* 5. End card (370-495) */}
      <Scene from={370} to={520} bg={C.coral}>
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', gap: 44, transform: `scale(${interpolate(f, [370, 495], [1, 1.04])})` }}>
          <Settle from={380}><Img src={staticFile('logo-mark-white.svg')} style={{ width: 200 }} /></Settle>
          <Reveal lines={['CLAIM YOUR', 'CARGO']} from={392} lineStyle={() => ({ fontFamily: POSTER, fontSize: 84, color: C.white, textAlign: 'center', lineHeight: 1.08 })} />
          <Reveal lines={['BEFORE IT LEAVES THE DOCKS']} from={404} lineStyle={() => ({ fontFamily: BODY, fontWeight: 900, fontSize: 44, letterSpacing: '0.12em', color: C.black, textAlign: 'center' })} />
          <Settle from={420}><div style={{ fontFamily: BODY, fontWeight: 900, fontSize: 56, color: C.black, background: C.white, padding: '16px 42px', borderRadius: 999 }}>smugpara.com</div></Settle>
        </AbsoluteFill>
        <Reveal lines={['NO RISK. NO REWARD.']} from={440} style={{ position: 'absolute', left: 0, right: 0, bottom: 240 }} lineStyle={() => ({ fontFamily: POSTER, fontSize: 38, color: C.white, textAlign: 'center' })} />
      </Scene>
      <div style={{ opacity: 1 - prog(f, 370, 400, SMOOTH) }}><Finish /></div>
      <FadeEdges total={495} len={18} />
    </AbsoluteFill>
  );
};
