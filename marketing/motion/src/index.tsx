import React from 'react';
import { registerRoot, Composition, AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame, interpolate } from 'remotion';
import { BODY, C, Callout, Flash, FlipClock, Fonts, POSTER, Rise, Scan, Stamp, Typewriter } from './kit';

const FPS = 30;

/** 8s style reel: one beat per motion element, in the order the campaign uses them. */
const StyleReel: React.FC = () => {
  const f = useCurrentFrame();
  // The tee drifts up slowly across beats 1-3 so the frame never sits still.
  const drift = interpolate(f, [0, 135], [40, -40], { extrapolateRight: 'clamp' });
  const teeOut = interpolate(f, [128, 138], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: C.black }}>
      <Fonts />
      {/* Beats 1-3: scan, stamp, callouts over the drop tee */}
      <AbsoluteFill style={{ opacity: teeOut }}>
        <Scan src={staticFile('frtb-tee-gold-front.jpg')} from={4} dur={36} style={{ position: 'absolute', left: 90, top: 420 + drift, width: 900, borderRadius: 24 }} />
        <Typewriter text="SOMETHING JUST LANDED." from={8} style={{ position: 'absolute', left: 90, top: 200, fontSize: 64, width: 900, lineHeight: 1.15 }} />
        <Sequence from={44} durationInFrames={34}>
          <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', background: 'rgba(11,11,11,.82)' }}>
            <Stamp from={0} rotate={-8}>
              <Img src={staticFile('logo-mark.svg')} style={{ width: 360, filter: 'drop-shadow(0 20px 40px rgba(0,0,0,.6))' }} />
            </Stamp>
          </AbsoluteFill>
        </Sequence>
        <Callout from={80} x={250} y={700 + drift} dx={70} label="OVERSIZED" sub="Black / gold" />
        <Callout from={92} x={820} y={1080 + drift} dx={-70} label="FRTB" sub="Front + back print" />
      </AbsoluteFill>
      <Flash at={4} len={10} />
      <Flash at={44} len={8} />

      {/* Beat 4: countdown */}
      <Sequence from={136} durationInFrames={56}>
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', gap: 60 }}>
          <Rise from={0}><div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 40, letterSpacing: 10, color: C.grey }}>CARGO 01 · 11/11 FRTB</div></Rise>
          <FlipClock from={4} start={26 * 3600 + 14 * 60 + 9} />
          <Stamp from={22} rotate={-4}>
            <div style={{ border: `8px solid ${C.coral}`, color: C.coral, fontFamily: POSTER, fontSize: 56, padding: '22px 34px', lineHeight: 1.1, textAlign: 'center' }}>LEAVES THE DOCK<br />SUN 11:59PM</div>
          </Stamp>
        </AbsoluteFill>
      </Sequence>

      {/* Beat 5: end card */}
      <Sequence from={192}>
        <AbsoluteFill style={{ background: C.coral, justifyContent: 'center', alignItems: 'center', gap: 50 }}>
          <Rise from={0}><Img src={staticFile('logo-mark-white.svg')} style={{ width: 220 }} /></Rise>
          <Rise from={6}><div style={{ fontFamily: POSTER, fontSize: 84, color: C.white, textAlign: 'center', lineHeight: 1.05 }}>BOARD<br />BEFORE IT<br />SAILS</div></Rise>
          <Rise from={14}><div style={{ fontFamily: BODY, fontWeight: 900, fontSize: 58, color: C.black, background: C.white, padding: '16px 40px', borderRadius: 999 }}>smugpara.com</div></Rise>
        </AbsoluteFill>
      </Sequence>
      <Flash at={192} len={6} />
    </AbsoluteFill>
  );
};

registerRoot(() => (
  <>
    <Composition id="StyleReel" component={StyleReel} durationInFrames={240} fps={FPS} width={1080} height={1920} />
  </>
));
