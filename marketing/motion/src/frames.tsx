// Campaign frames 1 (hook) and 4 (scarcity): real recordings of smugpara.com inside a phone, with the motion kit on top.
import React from 'react';
import { AbsoluteFill, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { BODY, C, Flash, FlipClock, Fonts, POSTER, Rise, Stamp, Typewriter } from './kit';

/** An iPhone-style frame around a screen recording (1170x2532). */
export const Phone: React.FC<{ src: string; startFrom?: number; width?: number; zoom?: number; focusY?: number; style?: React.CSSProperties }> = ({ src, startFrom = 0, width = 640, zoom = 1, focusY = 0.5, style }) => {
  const h = width * (2532 / 1170);
  return (
    <div style={{ position: 'absolute', width: width + 28, height: h + 28, borderRadius: 86, background: '#111', padding: 14, boxShadow: '0 40px 120px rgba(0,0,0,.7), inset 0 0 0 3px #2a2a2a', ...style }}>
      <div style={{ position: 'relative', width, height: h, borderRadius: 72, overflow: 'hidden', background: '#000' }}>
        <OffthreadVideo src={src} startFrom={startFrom} muted style={{ width, height: h, transform: `scale(${zoom})`, transformOrigin: `42% ${focusY * 100}%` }} />
        <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', width: 150, height: 42, borderRadius: 21, background: '#000' }} />
      </div>
    </div>
  );
};

/** The phone rises into place from below. */
const usePhoneIn = (from = 0) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: f - from, fps, config: { damping: 18, mass: 0.9 } });
};

/** FRAME 1, HOOK (7s): "Something just landed in Trinidad." over the live X-ray hero. */
export const Frame1: React.FC = () => {
  const f = useCurrentFrame();
  const inP = usePhoneIn(18);
  // Slow push-in on the phone so the frame is never static.
  const push = interpolate(f, [18, 210], [1, 1.06], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: C.black }}>
      <Fonts />
      <Typewriter text="SOMETHING JUST LANDED IN TRINIDAD." from={4} cps={16} style={{ position: 'absolute', left: 80, right: 80, top: 120, fontSize: 60, lineHeight: 1.12 }} />
      <Phone src={staticFile('rec-home.mp4')} startFrom={30} width={600}
        style={{ left: 540 - 314, top: 420, transform: `translateY(${(1 - inP) * 1400}px) scale(${push})`, transformOrigin: '50% 30%' }} />
      {/* Label the scanner once it's on screen */}
      <Sequence from={110}>
        <Rise from={0} style={{ position: 'absolute', left: 60, top: 1290 }}>
          <div style={{ background: C.coral, color: C.white, fontFamily: POSTER, fontSize: 34, padding: '14px 22px', transform: 'rotate(-3deg)' }}>LIVE X-RAY SCAN</div>
        </Rise>
        <Rise from={10} style={{ position: 'absolute', right: 60, top: 1380 }}>
          <div style={{ background: C.white, color: C.black, fontFamily: BODY, fontWeight: 900, fontSize: 34, padding: '12px 22px', transform: 'rotate(2deg)' }}>CARGO 01 · 11/11 FRTB</div>
        </Rise>
      </Sequence>
      <Sequence from={160}>
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', background: `rgba(11,11,11,${interpolate(f, [160, 170], [0, 0.8], { extrapolateRight: 'clamp' })})` }}>
          <Stamp from={0} rotate={-6}><Img src={staticFile('logo-mark.svg')} style={{ width: 380, filter: 'drop-shadow(0 20px 40px rgba(0,0,0,.6))' }} /></Stamp>
        </AbsoluteFill>
      </Sequence>
      <Flash at={18} len={10} />
      <Flash at={160} len={8} />
    </AbsoluteFill>
  );
};

/** FRAME 4, SCARCITY (7s): the real countdown on the product page, then the flip clock and the stamp. */
export const Frame4: React.FC = () => {
  const f = useCurrentFrame();
  const inP = usePhoneIn(0);
  // Zoom into the countdown box once the page has scrolled to it, then pull the phone aside.
  const zoom = interpolate(f, [70, 110], [1, 1.22], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const away = interpolate(f, [140, 165], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: C.black }}>
      <Fonts />
      <Phone src={staticFile('rec-product.mp4')} startFrom={20} width={600} zoom={zoom} focusY={0.6}
        style={{ left: 540 - 314, top: 300, transform: `translateY(${(1 - inP) * 1400 + away * 260}px) scale(${1 - away * 0.35})`, opacity: 1 - away * 0.75 }} />
      <Rise from={6} style={{ position: 'absolute', left: 0, right: 0, top: 110, textAlign: 'center' }}>
        <div style={{ fontFamily: POSTER, fontSize: 58, color: C.white }}>THE CLOCK IS REAL.</div>
      </Rise>
      <Sequence from={150}>
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', gap: 50, background: `rgba(11,11,11,${interpolate(f, [150, 165], [0, 0.85], { extrapolateRight: 'clamp' })})` }}>
          <FlipClock from={4} start={18 * 3600 + 40 * 60 + 53} />
          <Stamp from={24} rotate={-4}>
            <div style={{ border: `8px solid ${C.coral}`, color: C.coral, fontFamily: POSTER, fontSize: 56, padding: '22px 34px', lineHeight: 1.1, textAlign: 'center' }}>LEAVES THE DOCK<br />SUN 11:59PM</div>
          </Stamp>
          <Rise from={44}><div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 40, color: C.white, textAlign: 'center' }}>When it&rsquo;s gone, it&rsquo;s gone for good.</div></Rise>
        </AbsoluteFill>
      </Sequence>
      <Flash at={150} len={8} />
    </AbsoluteFill>
  );
};
