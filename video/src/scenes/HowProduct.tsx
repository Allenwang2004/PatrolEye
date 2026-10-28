import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {ease, pop, rise, sceneFade} from '../anim';
import {CamView, VideoOff} from '../components/Icons';
import {lineStart, scene, sec} from '../timing';
import {C, NUM, UI} from '../theme';

const S = 'how';

/** Renders in public/render/ (trimmed, transparent). Sizes in px; anchors are fractions of the image.
 *  v1_* are Fusion renders of the competition prototype; p5_* and p5x/ come from the 3D model of the
 *  real-deployment unit (design/film). */
const R = {
  v1x: {src: 'render/v1_exploded.png', w: 531, h: 1381},
  v1base: {src: 'render/v1_base_xray.png', w: 1578, h: 1372},
  v1: {src: 'render/v1_front.png', w: 714, h: 1377},
  p5x: {w: 429, h: 807, frames: 48},
  p5base: {src: 'render/p5_base_xray.png', w: 1017, h: 838},
  p5: {src: 'render/p5_front.png', w: 597, h: 700},
  ceil: {src: 'render/p5_ceiling.png', w: 591, h: 706},
};
const p5xFrame = (i: number) => `render/p5x/f${String(Math.max(0, Math.min(R.p5x.frames - 1, i))).padStart(2, '0')}.png`;

type Pt = {x: number; y: number};
type Box = {x: number; y: number; h: number; w: number};
const place = (img: {w: number; h: number}, x: number, y: number, h: number): Box => ({x, y, h, w: (h * img.w) / img.h});
const at = (b: Box, fx: number, fy: number): Pt => ({x: b.x + fx * b.w, y: b.y + fy * b.h});

const Header: React.FC<{kicker: string; sub: string; style?: React.CSSProperties}> = ({kicker, sub, style}) => (
  <div style={{position: 'absolute', left: 90, top: 52, ...style}}>
    <div style={{fontFamily: UI, fontWeight: 600, fontSize: 30, letterSpacing: 4, color: C.signal}}>{kicker}</div>
    <div style={{fontFamily: UI, fontSize: 28, color: C.muted, marginTop: 4}}>{sub}</div>
  </div>
);

const Label: React.FC<{x: number; y: number; title: string; sub?: string; o: number; hot?: boolean}> = ({x, y, title, sub, o, hot}) => (
  <div
    style={{
      position: 'absolute', left: x, top: y, transform: `translate(0, -50%) translateX(${(1 - o) * 16}px)`, opacity: o,
      background: '#fff', borderRadius: 12, padding: sub ? '10px 20px 12px' : '10px 20px',
      border: `3px solid ${hot ? C.signal : C.line}`, boxShadow: '0 8px 24px rgba(15,26,34,0.08)', whiteSpace: 'nowrap',
    }}
  >
    <div style={{fontFamily: UI, fontWeight: 600, fontSize: 32, color: C.ink, lineHeight: 1.1}}>{title}</div>
    {sub && <div style={{fontFamily: UI, fontSize: 23, color: C.muted, marginTop: 4}}>{sub}</div>}
  </div>
);

/** Part labels to the right of an exploded view, with leader lines back to the parts. */
type Callout = {at: number; y: number; title: string; sub?: string; from: Pt[]; hot?: boolean};
const Callouts: React.FC<{f: number; lx: number; items: Callout[]}> = ({f, lx, items}) => (
  <>
    <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
      {items.map((l) =>
        l.from.map((p, i) => (
          <g key={l.title + i} opacity={ease(f, l.at, 10)}>
            <circle cx={p.x} cy={p.y} r={7} fill={l.hot ? C.signal : C.ink} />
            <line x1={p.x} y1={p.y} x2={lx} y2={l.y} stroke={l.hot ? C.signal : C.ink} strokeWidth={3} />
          </g>
        )),
      )}
    </svg>
    {items.map((l) => (
      <Label key={l.title} x={lx} y={l.y} title={l.title} sub={l.sub} o={ease(f, l.at, 10)} hot={l.hot} />
    ))}
  </>
);

/** X-ray of the base with a ring around the AI module and an "Inside the base" card. */
const BaseXray: React.FC<{
  f: number; src: string; box: Box; ring: Pt; rx: number; ry: number; inAt: number; cardAt: number; hailoAt: number; o?: number; shadow?: boolean;
}> = ({f, src, box, ring, rx, ry, inAt, cardAt, hailoAt, o = 1, shadow}) => {
  const baseIn = ease(f, inAt, 16);
  const pulse = 1 + 0.06 * Math.max(0, Math.sin(((f - hailoAt) / 30) * Math.PI * 2)) * (f >= hailoAt && f < hailoAt + sec(2) ? 1 : 0);
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, opacity: o}}>
      <div style={{position: 'absolute', left: box.x, top: box.y, opacity: baseIn, transform: `translateY(${(1 - baseIn) * 24}px)`}}>
        <Img src={staticFile(src)} style={{height: box.h, display: 'block', filter: shadow ? 'drop-shadow(0 16px 24px rgba(15,26,34,0.14))' : undefined}} />
      </div>
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, opacity: baseIn}}>
        <ellipse cx={ring.x} cy={ring.y} rx={rx * pulse} ry={ry * pulse} transform={`rotate(-27 ${ring.x} ${ring.y})`} fill="none" stroke={C.signal} strokeWidth={6} />
      </svg>
      <div style={{position: 'absolute', left: box.x + 10, top: box.y + 30, opacity: ease(f, cardAt, 12)}}>
        <div style={{background: C.ink, color: '#fff', borderRadius: 12, padding: '10px 18px'}}>
          <div style={{fontFamily: UI, fontWeight: 600, fontSize: 28}}>Inside the base</div>
          <div style={{fontFamily: UI, fontSize: 22, color: '#C5CCD1', marginTop: 2}}>
            <span style={{color: f >= hailoAt ? C.signal : '#C5CCD1'}}>Hailo-10H</span> · 8 GB LPDDR4 · PCIe
          </div>
        </div>
      </div>
    </div>
  );
};

/** Cross-section of a room: the ceiling unit sees the whole floor, a shelf camera cannot see behind the sofa. */
const RoomSection: React.FC<{f: number; inAt: number; floorAt: number}> = ({f, inAt, floorAt}) => {
  const o = ease(f, inAt, 14);
  const fl = ease(f, floorAt, 10);
  const W = 860;
  const CE = 40; // ceiling y
  const FL = 470; // floor y
  const cam = {x: 430, y: CE + 34};
  const sweep = Math.sin(((f - inAt) / 30) * 1.3) * 0.62; // radians
  const ray = (a: number, len = 560) => `${cam.x + Math.sin(a) * len},${cam.y + Math.cos(a) * len}`;
  const ink = {stroke: C.ink, strokeWidth: 3, strokeLinejoin: 'round' as const};
  return (
    <svg width={W} height={520} viewBox={`0 0 ${W} 520`} style={{opacity: o, overflow: 'visible'}}>
      <defs>
        <clipPath id="roomClip"><rect x={10} y={CE} width={W - 20} height={FL - CE} /></clipPath>
      </defs>
      <rect x={10} y={CE} width={W - 20} height={FL - CE} fill={C.panel} />
      {/* everything the ceiling unit can see */}
      <g clipPath="url(#roomClip)">
        <polygon points={`${cam.x},${cam.y} 10,${FL} ${W - 10},${FL}`} fill={C.signal} opacity={0.1} />
        <polygon points={`${cam.x},${cam.y} ${ray(sweep - 0.17)} ${ray(sweep + 0.17)}`} fill={C.signal} opacity={0.28} />
      </g>
      {/* floor highlight */}
      <rect x={10} y={FL - 8} width={W - 20} height={8} fill={C.signal} opacity={fl} />
      <path d={`M10 ${CE} H${W - 10} M10 ${FL} H${W - 10} M10 ${CE} V${FL} M${W - 10} ${CE} V${FL}`} stroke={C.ink} strokeWidth={6} strokeLinecap="square" fill="none" />
      {/* sofa (left) and a cabinet with a shelf camera (right) */}
      <rect x={150} y={360} width={170} height={70} rx={14} fill="#fff" {...ink} />
      <rect x={140} y={400} width={190} height={50} rx={10} fill="#fff" {...ink} />
      <rect x={150} y={450} width={10} height={20} fill={C.ink} />
      <rect x={310} y={450} width={10} height={20} fill={C.ink} />
      <rect x={640} y={370} width={150} height={100} fill="#fff" {...ink} />
      {/* shelf camera's blind spot behind the sofa */}
      <g opacity={fl}>
        <rect x={706} y={350} width={18} height={20} rx={3} fill="#fff" stroke={C.muted} strokeWidth={2.5} strokeDasharray="5 4" />
        <line x1={706} y1={360} x2={330} y2={392} stroke={C.muted} strokeWidth={2.5} strokeDasharray="7 6" />
        <line x1={706} y1={360} x2={150} y2={360} stroke={C.muted} strokeWidth={2.5} strokeDasharray="7 6" />
        <text x={706} y={336} fontFamily={UI} fontSize={20} fill={C.muted} textAnchor="middle">on a shelf</text>
      </g>
      {/* person on the floor behind the sofa */}
      <g>
        <circle cx={58} cy={FL - 16} r={13} fill="#F1D9C8" {...ink} strokeWidth={2.4} />
        <rect x={72} y={FL - 28} width={64} height={24} rx={10} fill="#9DB3C7" {...ink} strokeWidth={2.4} />
        <circle cx={92} cy={FL - 16} r={58 + 4 * Math.sin(f / 5)} fill="none" stroke={C.signal} strokeWidth={4} opacity={fl} />
      </g>
      {/* ceiling unit */}
      <rect x={cam.x - 30} y={CE} width={60} height={7} rx={2} fill={C.ink} />
      <rect x={cam.x - 20} y={CE + 7} width={40} height={20} rx={4} fill="#fff" {...ink} strokeWidth={2.4} />
      <circle cx={cam.x} cy={cam.y} r={11} fill="#fff" {...ink} strokeWidth={2.4} />
      <circle cx={cam.x + Math.sin(sweep) * 6} cy={cam.y + Math.cos(sweep) * 6} r={4.5} fill={C.signal} />
      <text x={cam.x + 34} y={CE + 30} fontFamily={UI} fontWeight={700} fontSize={22} fill={C.signal}>PatrolEye</text>
      <text x={W / 2} y={FL + 42} fontFamily={UI} fontWeight={600} fontSize={26} fill={C.signal} textAnchor="middle" opacity={fl}>
        Floor included, even behind the sofa
      </text>
    </svg>
  );
};

export const HowProduct: React.FC = () => {
  const f = useCurrentFrame();
  const dur = sec(scene(S).duration);
  const L = (id: string, off = 0) => lineStart(S, id, off);

  // Narration order: w1 prototype → w3 for real deployment (smaller, on the ceiling) → w2 40 TOPS… → w4 images stay.
  const toB = ease(f, L('w3') - sec(0.5), 16); // prototype → for real deployment: smaller
  const toC = ease(f, L('w3', 5.25), 16); // → on the ceiling
  const toD = ease(f, L('w2') - sec(0.3), 16); // → the deployment unit, exploded

  // ---- phase A: the competition prototype, exploded, + inside of its base (w1; pauses measured in w1.wav)
  const tPi = L('w1', 1.5);
  const tCam = L('w1', 2.1);
  const tServo = L('w1', 2.6);
  const tUgen = L('w1', 3.4);
  const tHailo = L('w1', 7.6);
  const exA = place(R.v1x, 150, 135, 740);
  const calloutsA: Callout[] = [
    {at: tCam, y: at(exA, 0, 0.07).y, title: 'Webcam', sub: 'Logitech C270', from: [at(exA, 0.62, 0.07)]},
    {at: tServo, y: at(exA, 0, 0.3).y, title: 'Two bus servos', sub: 'Feetech STS3215', from: [at(exA, 0.42, 0.21), at(exA, 0.62, 0.4)]},
    {at: tUgen, y: at(exA, 0, 0.655).y, title: 'ASUS UGen300 M.2', sub: 'on a 2280 M.2 HAT', from: [at(exA, 0.62, 0.655)], hot: true},
    {at: tPi, y: at(exA, 0, 0.84).y, title: 'Raspberry Pi 5', from: [at(exA, 0.58, 0.835)]},
  ];
  const baseA = place(R.v1base, 1080, 200, 650);

  // ---- phase B: prototype next to the deployment unit, same scale (224 mm vs 120 mm); pauses measured in w3.wav
  const p1 = place(R.v1, 190, 150, 680);
  const p2 = place(R.p5, p1.x + p1.w + 70, 0, (680 * 120) / 224);
  p2.y = p1.y + p1.h - p2.h; // stand both on the same table line
  const pr = {x: p1.x, y: p1.y, w: p2.x + p2.w - p1.x, h: p1.h};
  const v1Top = at(p1, 0, 0.009).y, v1Bot = at(p1, 0, 0.991).y;
  const v2Top = at(p2, 0, 0.009).y, v2Bot = at(p2, 0, 0.991).y;
  const dims = ease(f, L('w3', 0.6), 20);
  const dimsHot = ease(f, L('w3', 4.4), 10);
  const tags = [
    {t: 'Same ASUS UGen300 M.2 module', at: L('w3', 1.4)},
    {t: 'Compact head: micro servos, one lens', at: L('w3', 3.8)},
    {t: 'About half the height', at: L('w3', 4.4), stat: true},
  ];

  // ---- phase C: on the ceiling
  const ce = place(R.ceil, 200, 150, 540); // keeps the spec list clear of the two-line w3 caption
  const specs = [
    {t: 'Twist-lock ceiling plate', at: L('w3', 5.7)},
    {t: 'One cable, up through the plate', at: L('w3', 6.2)},
    {t: 'Looks straight down: no blind spot below', at: L('w3', 6.7)},
  ];

  // ---- phase D: the deployment unit, exploded (parts fly apart as it comes in), + inside of its base (w2), then w4
  const exD = place(R.p5x, 170, 135, 740);
  const exIdx = Math.round(interpolate(f, [L('w2', -0.1), L('w2', 1.5)], [0, R.p5x.frames - 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  const calloutsD: Callout[] = [
    {at: L('w2', 1.6), y: at(exD, 0, 0.113).y, title: 'Camera Module 3', sub: '12 MP, autofocus', from: [at(exD, 0.318, 0.113)]},
    {at: L('w2', 1.9), y: at(exD, 0, 0.36).y, title: 'Two micro bus servos', sub: 'Feetech STS3032', from: [at(exD, 0.463, 0.459)]},
    {at: L('w2', 2.2), y: at(exD, 0, 0.629).y, title: 'ASUS UGen300 M.2', sub: 'on a 2280 M.2 HAT', from: [at(exD, 0.551, 0.629)], hot: true},
    {at: L('w2', 2.5), y: at(exD, 0, 0.8).y, title: 'Raspberry Pi 5', from: [at(exD, 0.558, 0.782)]},
  ];
  const baseD = place(R.p5base, 1080, 200, 650);
  const chips = [{t: '40 TOPS', at: L('w2', 0.2)}, {t: '8 GB', at: L('w2', 1.4)}, {t: 'Vision-language model, offline', at: L('w2', 2.6)}];
  const baseOut = ease(f, L('w4') - sec(0.35), 10); // the x-ray makes room for the on-device band
  const band = ease(f, L('w4'), 14);

  const phaseA = 1 - toB;
  const phaseB = toB * (1 - toC);
  const phaseC = toC * (1 - toD);
  return (
    <AbsoluteFill style={{background: C.bg, opacity: sceneFade(f, dur)}}>
      {/* ================= phase A: prototype ================= */}
      {phaseA > 0.001 && (
        <AbsoluteFill style={{opacity: phaseA, transform: `translateX(${-toB * 60}px)`}}>
          <Header kicker="PROTOTYPE · TODAY" sub="Off-the-shelf parts, competition build" style={rise(f, 0, 16, 14)} />
          <Img src={staticFile(R.v1x.src)} style={{position: 'absolute', left: exA.x, top: exA.y, height: exA.h, ...rise(f, sec(0.2), 30, 20)}} />
          <Callouts f={f} lx={exA.x + exA.w + 70} items={calloutsA} />
          <BaseXray f={f} src={R.v1base.src} box={baseA} ring={at(baseA, 0.53, 0.4)} rx={235} ry={120} inAt={tUgen + 4} cardAt={tUgen + 10} hailoAt={tHailo} />
        </AbsoluteFill>
      )}

      {/* ================= phase B: for real deployment, smaller ================= */}
      {phaseB > 0.001 && (
        <AbsoluteFill style={{opacity: phaseB, transform: `translateX(${(1 - toB) * 60 - toC * 60}px)`}}>
          <Header kicker="FOR REAL DEPLOYMENT" sub="Same AI module. Everything around it, smaller." />
          <Img src={staticFile(R.v1.src)} style={{position: 'absolute', left: p1.x, top: p1.y, height: p1.h}} />
          <Img src={staticFile(R.p5.src)} style={{position: 'absolute', left: p2.x, top: p2.y, height: p2.h, filter: 'drop-shadow(0 14px 22px rgba(15,26,34,0.16))'}} />
          <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, opacity: dims}}>
            {[
              {x: pr.x - 34, y0: v1Top, y1: v1Bot},
              {x: pr.x + pr.w + 30, y0: v2Top, y1: v2Bot},
            ].map((d, i) => {
              const y0 = d.y1 - (d.y1 - d.y0) * dims;
              const col = dimsHot > 0 ? C.signal : C.ink;
              return (
                <g key={i} stroke={i === 1 ? col : C.ink} strokeWidth={3}>
                  <line x1={d.x} y1={y0} x2={d.x} y2={d.y1} />
                  <line x1={d.x - 12} y1={y0} x2={d.x + 12} y2={y0} />
                  <line x1={d.x - 12} y1={d.y1} x2={d.x + 12} y2={d.y1} />
                </g>
              );
            })}
          </svg>
          <div style={{position: 'absolute', left: pr.x - 34 - 128, top: (v1Top + v1Bot) / 2 - 24, width: 110, textAlign: 'right', opacity: dims}}>
            <div style={{fontFamily: NUM, fontWeight: 600, fontSize: 44, color: C.ink}}>224</div>
            <div style={{fontFamily: UI, fontSize: 22, color: C.muted, marginTop: -6}}>mm</div>
          </div>
          <div style={{position: 'absolute', left: pr.x + pr.w + 52, top: (v2Top + v2Bot) / 2 - 24, opacity: dims}}>
            <div style={{fontFamily: NUM, fontWeight: 600, fontSize: 44, color: dimsHot > 0 ? C.signal : C.ink}}>120</div>
            <div style={{fontFamily: UI, fontSize: 22, color: C.muted, marginTop: -6}}>mm</div>
          </div>
          <div style={{position: 'absolute', left: p1.x, width: p1.w, textAlign: 'center', top: p1.y + p1.h + 14, fontFamily: UI, fontWeight: 600, fontSize: 24, letterSpacing: 2, color: C.muted}}>PROTOTYPE</div>
          <div style={{position: 'absolute', left: p2.x - 60, width: p2.w + 120, textAlign: 'center', top: p2.y + p2.h + 14, fontFamily: UI, fontWeight: 600, fontSize: 24, letterSpacing: 2, color: C.signal}}>REAL DEPLOYMENT</div>
          <div style={{position: 'absolute', left: 1160, top: 300, width: 700, display: 'flex', flexDirection: 'column', gap: 30}}>
            {tags.map((t) => (
              <div key={t.t} style={{display: 'flex', alignItems: 'center', gap: 18, ...rise(f, t.at, 18)}}>
                <span style={{width: 16, height: 16, borderRadius: 8, background: t.stat ? C.signal : C.ink, flexShrink: 0}} />
                <span style={{fontFamily: UI, fontWeight: 600, fontSize: 36, color: C.ink, lineHeight: 1.15}}>
                  {t.t}
                  {t.stat && <span style={{fontFamily: NUM, color: C.signal}}>{'  224 → 120 mm'}</span>}
                </span>
              </div>
            ))}
          </div>
        </AbsoluteFill>
      )}

      {/* ================= phase C: on the ceiling ================= */}
      {phaseC > 0.001 && (
        <AbsoluteFill style={{opacity: phaseC, transform: `translateX(${(1 - toC) * 60 - toD * 60}px)`}}>
          <Header kicker="FOR REAL DEPLOYMENT · ON THE CEILING" sub="The same unit, hung from a twist-lock plate" />
          <Img src={staticFile(R.ceil.src)} style={{position: 'absolute', left: ce.x, top: ce.y, height: ce.h, filter: 'drop-shadow(0 16px 24px rgba(15,26,34,0.16))'}} />
          <div style={{position: 'absolute', left: 120, top: ce.y + ce.h + 10, display: 'flex', flexDirection: 'column', gap: 10}}>
            {specs.map((s) => (
              <div key={s.t} style={{display: 'flex', alignItems: 'center', gap: 14, ...rise(f, s.at, 12)}}>
                <span style={{width: 12, height: 12, borderRadius: 6, background: C.ink}} />
                <span style={{fontFamily: UI, fontWeight: 500, fontSize: 28, color: C.ink}}>{s.t}</span>
              </div>
            ))}
          </div>
          <div style={{position: 'absolute', left: 960, top: 200}}>
            <RoomSection f={f} inAt={L('w3', 7.0)} floorAt={L('w3', 9.25)} />
          </div>
        </AbsoluteFill>
      )}

      {/* ================= phase D: the deployment unit, exploded ================= */}
      {toD > 0.001 && (
        <AbsoluteFill style={{opacity: toD, transform: `translateX(${(1 - toD) * 60}px)`}}>
          <Header kicker="FOR REAL DEPLOYMENT · INSIDE" sub="Same Pi 5 and AI module, new compact head" />
          <Img src={staticFile(p5xFrame(exIdx))} style={{position: 'absolute', left: exD.x, top: exD.y, height: exD.h, filter: 'drop-shadow(0 16px 24px rgba(15,26,34,0.16))'}} />
          <Callouts f={f} lx={exD.x + exD.w + 70} items={calloutsD} />
          <BaseXray
            f={f} src={R.p5base.src} box={baseD} ring={at(baseD, 0.4856, 0.4103)} rx={290} ry={100}
            inAt={L('w2', 0.5)} cardAt={L('w2', 0.9)} hailoAt={L('w2', 0.9)} o={1 - baseOut} shadow
          />
          <div style={{position: 'absolute', left: baseD.x, top: 112, display: 'flex', gap: 14}}>
            {chips.map((c) => (
              <div
                key={c.t}
                style={{
                  fontFamily: NUM, fontWeight: 600, fontSize: 36, color: C.ink, background: C.panel, padding: '6px 18px', borderRadius: 10,
                  border: `2px solid ${C.line}`, transform: `scale(${interpolate(pop(f, c.at), [0, 1], [0.6, 1])})`, opacity: ease(f, c.at, 6),
                }}
              >
                {c.t}
              </div>
            ))}
          </div>
          {/* on-device band */}
          <div style={{position: 'absolute', left: 1080, top: 430, opacity: band, transformOrigin: 'left top', transform: `translateY(${(1 - band) * 20}px) scale(1.15)`}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
              <CamView size={58} />
              <svg width={44} height={20}><path d="M0 10 H36 M28 3 L38 10 L28 17" stroke={C.ink} strokeWidth={3.5} fill="none" /></svg>
              <div style={{background: C.ink, color: '#fff', borderRadius: 12, padding: '12px 20px', fontFamily: UI, fontWeight: 600, fontSize: 28}}>AI on the device</div>
              <svg width={44} height={20}><path d="M0 10 H36 M28 3 L38 10 L28 17" stroke={C.ink} strokeWidth={3.5} fill="none" /></svg>
              <div style={{background: '#fff', border: `3px solid ${C.ok}`, borderRadius: 12, padding: '8px 18px'}}>
                <div style={{fontFamily: UI, fontWeight: 600, fontSize: 18, letterSpacing: 2, color: C.ok}}>REPORT + CLIP</div>
                <div style={{fontFamily: UI, fontSize: 26, color: C.ink}}>“Stove off · 09:31”</div>
              </div>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: 12, marginTop: 18}}>
              <VideoOff size={48} />
              <span style={{fontFamily: UI, fontWeight: 600, fontSize: 30, color: C.alert}}>No live video stream</span>
            </div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
