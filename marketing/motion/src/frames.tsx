// Campaign frames 1 (hook) and 4 (scarcity): real recordings of smugpara.com inside a phone,
// animated with the luxury kit (slow eases, masked reveals, hairlines, drift, vignette, grain).
import React from 'react';
import { AbsoluteFill, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { BODY, C, Fonts, POSTER } from './kit';
import { EXPO, FadeEdges, Finish, Hairline, LogoOutro, Reveal, SMOOTH, Settle, SoftClock, prog } from './lux';

/** An iPhone-style frame around a screen recording (1170x2532). */
/** One cut of a recording: play `src` from second `at` at `rate` for `len` output frames. */
export type Cut = { at: number; rate: number; len: number };
export const Phone: React.FC<{ src: string; startFrom?: number; rate?: number; cuts?: Cut[]; width?: number; zoom?: number; originX?: number; originY?: number; style?: React.CSSProperties }> =
  ({ src, startFrom = 0, rate = 1, cuts, width = 600, zoom = 1, originX = 0.5, originY = 0.5, style }) => {
    const h = width * (2532 / 1170);
    return (
      <div style={{ position: 'absolute', width: width + 24, height: h + 24, borderRadius: 82, background: '#0d0d0d', padding: 12,
        boxShadow: '0 60px 140px rgba(0,0,0,.75), inset 0 0 0 2px #262626', ...style }}>
        <div style={{ position: 'relative', width, height: h, borderRadius: 70, overflow: 'hidden', background: '#000' }}>
          {cuts ? (() => { let t = 0; return cuts.map((c, i) => { const from = t; t += c.len; return (
            <Sequence key={i} from={from} durationInFrames={c.len} layout="none">
              <OffthreadVideo src={src} startFrom={Math.round(c.at * 30)} playbackRate={c.rate} muted style={{ position: 'absolute', inset: 0, width, height: h, transform: `scale(${zoom})`, transformOrigin: `${originX * 100}% ${originY * 100}%` }} />
            </Sequence>); }); })()
            : <OffthreadVideo src={src} startFrom={startFrom} playbackRate={rate} muted style={{ width, height: h, transform: `scale(${zoom})`, transformOrigin: `${originX * 100}% ${originY * 100}%` }} />}
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

/** Shared layout: phone glides in and drifts, top and bottom darkened for type. */
const Stage: React.FC<{ src: string; startFrom?: number; rate?: number; cuts?: Cut[]; zoom?: (f: number) => number; originY?: number; total: number; outro?: boolean; children: React.ReactNode }> =
  ({ src, startFrom = 0, rate = 1, cuts, zoom, originY = 0.5, total, outro, children }) => {
    const f = useCurrentFrame();
    const enter = prog(f, 8, 68);
    const drift = interpolate(f, [8, total], [1, 1.06]);
    return (
      <AbsoluteFill style={{ background: C.black }}>
        <Fonts />
        <Phone src={src} startFrom={startFrom} rate={rate} cuts={cuts} width={560} zoom={zoom ? zoom(f) : 1} originY={originY}
          style={{ left: 540 - 292, top: 400, opacity: enter, transform: `translateY(${(1 - enter) * 220 - interpolate(f, [8, total], [0, 40])}px) scale(${drift * (0.94 + enter * 0.06)})`, transformOrigin: '50% 35%' }} />
        <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(11,11,11,.95) 0%, rgba(11,11,11,0) 22%, rgba(11,11,11,0) 70%, rgba(11,11,11,.96) 86%)' }} />
        {children}
        <Finish />
        {outro && <LogoOutro total={total} />}
        <FadeEdges total={total} noOut={outro} />
      </AbsoluteFill>
    );
  };

const sub: React.CSSProperties = { fontFamily: BODY, fontWeight: 900, fontSize: 44, color: C.white, textAlign: 'center' };
const small: React.CSSProperties = { fontFamily: BODY, fontWeight: 700, fontSize: 30, letterSpacing: '0.24em', color: C.grey, textAlign: 'center' };
const Rule: React.FC<{ top: number; from: number; w?: number }> = ({ top, from, w = 200 }) => (
  <div style={{ position: 'absolute', left: 0, right: 0, top, display: 'flex', justifyContent: 'center' }}><Hairline from={from} width={w} /></div>
);

/** FRAME 2, THE WORLD (9s): brand codes and who we are. */
export const Frame2: React.FC = () => (
  <Stage src={staticFile('rec-world.mp4')} startFrom={10} total={270}>
    <Reveal lines={['FOR THE', 'RISK TAKERS.']} from={4} style={{ position: 'absolute', left: 60, right: 60, top: 120 }} lineStyle={(i) => ({ ...headline, color: i ? C.coral : C.white })} />
    <Rule top={300} from={26} />
    <Reveal lines={['SOVEREIGNTY \u00b7 RISK \u00b7 PURPOSE']} from={110} style={{ position: 'absolute', left: 30, right: 30, top: 1600 }} lineStyle={() => sub} />
    <Rule top={1680} from={130} w={160} />
    <Reveal lines={['BORN ON THE BEACHES OF T&T']} from={150} style={{ position: 'absolute', left: 30, right: 30, top: 1715 }} lineStyle={() => small} />
  </Stage>
);

/** FRAME 3, THE DROP (13s): the X-ray scanner runs once through six looks, alternating front and back. No zoom. */
export const Frame3: React.FC = () => (
  <Stage src={staticFile('rec-drop6.mp4')} startFrom={380} total={395}>
    <Reveal lines={['ONE DROP.', 'SIX LOOKS.']} from={4} style={{ position: 'absolute', left: 60, right: 60, top: 120 }} lineStyle={(i) => ({ ...headline, color: i ? C.coral : C.white })} />
    <Rule top={300} from={26} />
    <Reveal lines={['OVERSIZED TEE \u00b7 CUT SLEEVE VEST']} from={130} style={{ position: 'absolute', left: 30, right: 30, top: 1600 }} lineStyle={() => ({ ...sub, fontSize: 40 })} />
    <Rule top={1675} from={150} w={160} />
    <Reveal lines={['GOLD \u00b7 RED \u00b7 WHITE \u2014 FRONT + BACK']} from={170} style={{ position: 'absolute', left: 30, right: 30, top: 1710 }} lineStyle={() => small} />
  </Stage>
);

/** FRAME 5, THE TWIST (8.5s): tap "Design your own" and land in the studio. */
export const Frame5: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Stage src={staticFile('rec-twist.mp4')} startFrom={20} total={255}>
      <Reveal lines={['DON\u2019T SEE', 'YOURS?']} from={4} out={95} style={{ position: 'absolute', left: 60, right: 60, top: 120 }} lineStyle={() => headline} />
      <Reveal lines={['MAKE IT.']} from={112} style={{ position: 'absolute', left: 60, right: 60, top: 150 }} lineStyle={() => ({ ...headline, fontSize: 84, color: C.coral })} />
      <Rule top={300} from={130} w={f > 100 ? 240 : 0} />
      <Reveal lines={['DESIGN YOUR OWN TEE']} from={150} style={{ position: 'absolute', left: 30, right: 30, top: 1600 }} lineStyle={() => sub} />
      <Rule top={1675} from={168} w={160} />
      <Reveal lines={['FRONT \u00b7 BACK \u00b7 SLEEVES \u00b7 LABEL']} from={186} style={{ position: 'absolute', left: 30, right: 30, top: 1710 }} lineStyle={() => small} />
    </Stage>
  );
};

/** FRAME 7, AI WOW (25s): type a prompt, Generate, the art lands on the tee; then it's a draft our team finishes;
 * then three finished customer designs, 1.5s each from 19s, the last holding to the end. */
const AI_CUTS: Cut[] = [
  { at: 3.6, rate: 1, len: 153 },     // scroll to Create with AI, type the prompt
  { at: 8.7, rate: 1, len: 48 },      // tap Generate
  { at: 10.3, rate: 1.5, len: 136 },  // drawing (sped up)
  { at: 17.1, rate: 1, len: 233 },    // art placed, scroll up to the tee, hold
];
const DESIGN_AT = 570;                // 19s
const DESIGN_CUTS = [45, 45, 90];     // 1.5s, 1.5s, then the last holds to 25s
const AI_TOTAL = 750;
const AI_PLACED = AI_CUTS[0].len + AI_CUTS[1].len + AI_CUTS[2].len;
const top = { position: 'absolute' as const, left: 50, right: 50, top: 130 };
export const Frame7: React.FC = () => {
  const f = useCurrentFrame();
  const fire = { fontFamily: '"Noto Color Emoji"' };
  return (
    <Stage src={staticFile('rec-ai.mp4')} cuts={AI_CUTS} total={AI_TOTAL}>
      {/* The finished customer designs play inside the same phone, cross-fading in from 19s */}
      {DESIGN_CUTS.map((len, i) => {
        const from = DESIGN_AT + DESIGN_CUTS.slice(0, i).reduce((n, x) => n + x, 0);
        if (f < from - 12 || f > from + len + 12) return null;
        const o = prog(f, from - 10, from + 6, SMOOTH);
        return (
          <div key={i} style={{ position: 'absolute', left: 540 - 292 + 12, top: 400 + 12, width: 560, height: 560 * 2532 / 1170, borderRadius: 70, overflow: 'hidden', opacity: o,
            transform: `translateY(${-interpolate(f, [8, AI_TOTAL], [0, 40])}px) scale(${interpolate(f, [8, AI_TOTAL], [1, 1.06])})`, transformOrigin: '50% 35%' }}>
            <Sequence from={from - 10} layout="none"><OffthreadVideo src={staticFile(`rec-design${i + 1}.mp4`)} startFrom={12} muted style={{ width: '100%', height: '100%' }} /></Sequence>
            {i === 0 && <div style={{ position: 'absolute', left: 0, right: 0, top: 200, height: 190, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(14px)', background: 'rgba(255,255,255,.15)' }} />}
          </div>
        );
      })}
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(11,11,11,.95) 0%, rgba(11,11,11,0) 22%, rgba(11,11,11,0) 70%, rgba(11,11,11,.96) 86%)' }} />
      <Reveal lines={['TYPE IT.']} from={4} out={AI_PLACED - 4} style={top} lineStyle={() => ({ ...headline, fontSize: 84 })} />
      <Reveal lines={['IT APPEARS.']} from={AI_PLACED + 14} out={400} style={top} lineStyle={() => ({ ...headline, fontSize: 76, color: C.coral })} />
      <Reveal lines={['YOUR DESIGN', 'IS A DRAFT']} from={420} out={444} style={top} lineStyle={(i) => ({ ...headline, color: i ? C.coral : C.white })} />
      <Reveal lines={['OUR TEAM', 'WILL ADD THE']} from={450} out={550} style={{ ...top, top: 110 }} lineStyle={() => headline} />
      {f >= 466 && f < 572 && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 270, textAlign: 'center', ...fire, fontSize: 96, opacity: prog(f, 466, 490) * (1 - prog(f, 550, 570, SMOOTH)), transform: `scale(${0.9 + prog(f, 466, 500) * 0.1})`, filter: `blur(${(1 - prog(f, 466, 490)) * 8}px)` }}>{'\u{1F525}'}</div>
      )}
      <Reveal lines={['GET CREATIVE.']} from={570} style={top} lineStyle={() => ({ ...headline, fontSize: 72, color: C.coral })} />
      <Rule top={300} from={26} w={240} />
      <Reveal lines={['CREATE WITH AI']} from={70} out={540} style={{ position: 'absolute', left: 30, right: 30, top: 1600 }} lineStyle={() => sub} />
      <Rule top={1675} from={90} w={160} />
      <Reveal lines={['YOUR IDEA, DRAWN ON THE TEE IN SECONDS']} from={110} out={540} style={{ position: 'absolute', left: 30, right: 30, top: 1710 }} lineStyle={() => small} />
      <Reveal lines={['FINISHED BY THE SMUG PARA TEAM']} from={590} style={{ position: 'absolute', left: 30, right: 30, top: 1600 }} lineStyle={() => ({ ...sub, fontSize: 40 })} />
      <Reveal lines={['REAL CUSTOMER DESIGNS']} from={610} style={{ position: 'absolute', left: 30, right: 30, top: 1710 }} lineStyle={() => small} />
    </Stage>
  );
};
export const AI_FRAMES = AI_TOTAL;

/** FRAME 6, CREATE (13.5s): add text, type a name, gold, oversized, flip to the back and return. Live site. */
export const Frame6: React.FC = () => (
  <Stage src={staticFile('rec-create.mp4')} startFrom={30} rate={1.15} total={455} outro>
    <Reveal lines={['PUT YOUR', 'NAME ON IT.']} from={4} out={196} style={{ position: 'absolute', left: 50, right: 50, top: 120 }} lineStyle={(i) => ({ ...headline, color: i ? C.coral : C.white })} />
    <Reveal lines={['YOUR COLOURS.']} from={212} out={296} style={{ position: 'absolute', left: 50, right: 50, top: 150 }} lineStyle={() => ({ ...headline, color: C.coral })} />
    <Reveal lines={['FRONT + BACK.']} from={312} style={{ position: 'absolute', left: 50, right: 50, top: 150 }} lineStyle={() => headline} />
    <Rule top={300} from={26} w={240} />
    <Reveal lines={['11 FONTS \u00b7 OUTLINE \u00b7 SHADOW \u00b7 CURVE']} from={90} style={{ position: 'absolute', left: 30, right: 30, top: 1600 }} lineStyle={() => ({ ...sub, fontSize: 38 })} />
    <Rule top={1675} from={110} w={160} />
    <Reveal lines={['REGULAR OR OVERSIZED \u00b7 ON YOUR PHONE']} from={130} style={{ position: 'absolute', left: 30, right: 30, top: 1710 }} lineStyle={() => small} />
  </Stage>
);

/** FRAME 8, SQUAD (14s): the team panel fills with four players, then the back of the tee shows KAI 7. Live site. */
export const Frame8: React.FC = () => (
  <Stage src={staticFile('rec-squad.mp4')} startFrom={45} rate={1.22} total={490} outro>
    <Reveal lines={['KITTING OUT', 'THE CREW?']} from={4} out={378} style={{ position: 'absolute', left: 50, right: 50, top: 120 }} lineStyle={(i) => ({ ...headline, color: i ? C.coral : C.white })} />
    <Reveal lines={['ONE ORDER.']} from={394} style={{ position: 'absolute', left: 50, right: 50, top: 150 }} lineStyle={() => ({ ...headline, fontSize: 80, color: C.coral })} />
    <Rule top={300} from={26} w={240} />
    <Reveal lines={['EVERY NAME, NUMBER + SIZE']} from={90} style={{ position: 'absolute', left: 30, right: 30, top: 1600 }} lineStyle={() => sub} />
    <Rule top={1675} from={110} w={160} />
    <Reveal lines={['TEAMS \u00b7 CREWS \u00b7 FETES \u00b7 EVENTS']} from={130} style={{ position: 'absolute', left: 30, right: 30, top: 1710 }} lineStyle={() => small} />
  </Stage>
);

const topL = { position: 'absolute' as const, left: 50, right: 50, top: 120 };
const two = (i: number) => ({ ...headline, color: i ? C.coral : C.white });

/** FRAME 9, TRUST (14s): a demo order steps Confirmed -> In production -> Ready -> Collected on the tracking page. */
export const Frame9: React.FC = () => (
  <Stage src={staticFile('rec-trust.mp4')} startFrom={24} total={420} outro>
    <Reveal lines={['TRACK EVERY', 'STEP LIVE.']} from={4} out={84} style={topL} lineStyle={two} />
    <Reveal lines={['PRINTED BY', 'OUR TEAM.']} from={100} out={176} style={topL} lineStyle={two} />
    <Reveal lines={['READY?', 'WE\u2019LL TELL YOU.']} from={190} out={280} style={topL} lineStyle={two} />
    <Reveal lines={['COLLECT IT', 'OR WE DELIVER.']} from={296} style={topL} lineStyle={two} />
    <Rule top={300} from={26} w={240} />
    <Reveal lines={['YOUR ORDER CODE = YOUR TRACKING LINK']} from={60} style={{ position: 'absolute', left: 30, right: 30, top: 1600 }} lineStyle={() => ({ ...sub, fontSize: 36 })} />
    <Rule top={1675} from={80} w={160} />
    <Reveal lines={['AN UPDATE AT EVERY STEP']} from={100} style={{ position: 'absolute', left: 30, right: 30, top: 1710 }} lineStyle={() => small} />
  </Stage>
);

/** FRAME 10, PLAY (12.5s): catch the pirogue (+5 EP), then claim today's Contraband coin on the FAQ (+20 EP). Live site. */
export const Frame10: React.FC = () => (
  <Stage src={staticFile('rec-play.mp4')} total={364} outro>
    <Reveal lines={['CATCH THE', 'PIROGUE.']} from={4} out={118} style={topL} lineStyle={two} />
    <Reveal lines={['FIND THE', 'CONTRABAND.']} from={134} out={232} style={topL} lineStyle={two} />
    <Reveal lines={['STACK YOUR', 'POINTS.']} from={248} style={topL} lineStyle={two} />
    <Rule top={300} from={26} w={240} />
    <Reveal lines={['A NEW HUNT EVERY DAY']} from={60} style={{ position: 'absolute', left: 30, right: 30, top: 1600 }} lineStyle={() => sub} />
    <Rule top={1675} from={80} w={160} />
    <Reveal lines={['POINTS UNLOCK FREE TEES + REWARDS']} from={100} style={{ position: 'absolute', left: 30, right: 30, top: 1710 }} lineStyle={() => small} />
  </Stage>
);

export { Img, Settle, EXPO };
