import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {ease, pop, rise, sceneFade} from '../anim';
import {VideoOff} from '../components/Icons';
import {lineStart, scene, sec} from '../timing';
import {C, NUM, UI} from '../theme';

const S = 'how';

// ---- side section of the rig, in mm (same geometry as the layout drawing; front = left) ----
type Part = {f0: number; f1: number; u0: number; u1: number; fill: string; g: string; stroke?: string};
const W = '#FFFFFF';
const SHELL = '#EEEDE8';
const PARTS: Part[] = [
  {f0: 73, f1: -35, u0: 0, u1: 52, fill: SHELL, g: 'body'},
  {f0: -35, f1: -73, u0: 0, u1: 52, fill: W, g: 'body'},
  {f0: 70, f1: -35, u0: 22, u1: 24, fill: '#DCDAD4', g: 'body'},
  {f0: 70, f1: -35, u0: 3.5, u1: 21.5, fill: '#9AA0AA', g: 'ugen'},
  {f0: -35, f1: -58, u0: 8, u1: 17, fill: C.dark, g: 'ugen'},
  {f0: 70, f1: -15, u0: 28, u1: 29.6, fill: C.pcb, g: 'pi'},
  {f0: 52, f1: 14, u0: 29.6, u1: 40, fill: C.metal, g: 'pi'},
  {f0: -0.5, f1: -18, u0: 29.6, u1: 45.2, fill: C.metal, g: 'pi'},
  {f0: -18, f1: -52, u0: 31, u1: 37, fill: C.dark, g: 'body'},
  {f0: -18, f1: -52, u0: 39, u1: 45, fill: C.dark, g: 'body'},
  {f0: -37, f1: -67, u0: 20, u1: 27, fill: '#55585E', g: 'body'},
  {f0: -14, f1: -73, u0: 52, u1: 71, fill: W, g: 'driver'},
  {f0: -26, f1: -59, u0: 55, u1: 56.6, fill: '#3B4450', g: 'driver'},
  {f0: -45, f1: -59, u0: 56.6, u1: 67.6, fill: C.dark, g: 'driver'},
  {f0: -26, f1: -32, u0: 56.6, u1: 62, fill: W, g: 'driver'},
  {f0: -62, f1: -98, u0: 57.6, u1: 66.4, fill: C.dark, g: 'driver'},
  {f0: 18, f1: -9, u0: 52, u1: 97, fill: W, g: 'head'},
  {f0: 42.2, f1: -3, u0: 60, u1: 95, fill: C.dark, g: 'servo'},
  {f0: 40, f1: 20, u0: 95, u1: 98, fill: C.metal, g: 'head'},
  {f0: 40, f1: 20, u0: 57, u1: 60, fill: C.metal, g: 'head'},
  {f0: 64, f1: 20, u0: 98, u1: 103, fill: W, g: 'head'},
  {f0: 64, f1: 20, u0: 53, u1: 57, fill: W, g: 'head'},
  {f0: 64, f1: 59, u0: 53, u1: 103, fill: W, g: 'head'},
  {f0: 64, f1: 28, u0: 103, u1: 128, fill: W, g: 'head'},
  {f0: 58.3, f1: 33.7, u0: 106, u1: 151, fill: C.dark, g: 'servo'},
  {f0: 55, f1: 37, u0: 131, u1: 160, fill: W, g: 'head'},
  {f0: 62, f1: 32, u0: 156, u1: 160, fill: W, g: 'head'},
  {f0: 62, f1: 59, u0: 160, u1: 166, fill: W, g: 'head'},
  {f0: 58, f1: 35, u0: 160.5, u1: 192, fill: C.dark, g: 'camera'},
  {f0: 60, f1: 58, u0: 169, u1: 183, fill: '#3F7FA6', g: 'camera'},
];
const K = 3.7; // px per mm
const X = (f: number) => (73 - f) * K;
const Y = (u: number) => (200 - u) * K;

export const Section: React.FC<{active: Record<string, number>; f: number}> = ({active, f}) => (
  <svg width={175 * K} height={205 * K} viewBox={`0 0 ${175 * K} ${205 * K}`}>
    <line x1={-20} y1={Y(0)} x2={175 * K} y2={Y(0)} stroke={C.line} strokeWidth={2} />
    {PARTS.map((p, i) => {
      const a = active[p.g] ?? 0;
      const x0 = Math.min(X(p.f0), X(p.f1));
      const w = Math.abs(X(p.f1) - X(p.f0));
      const appear = ease(f, i * 2, 12);
      return (
        <g key={i} opacity={appear}>
          <rect x={x0} y={Y(p.u1)} width={w} height={(p.u1 - p.u0) * K} fill={p.fill} stroke={C.ink} strokeWidth={1.4} />
          {a > 0 && <rect x={x0} y={Y(p.u1)} width={w} height={(p.u1 - p.u0) * K} fill={C.signal} fillOpacity={0.45 * a} stroke={C.signal} strokeWidth={3 * a} />}
        </g>
      );
    })}
    <circle cx={X(46)} cy={Y(140)} r={9 * K} fill={C.metal} stroke={C.ink} strokeWidth={1.4} opacity={ease(f, 40, 12)} />
  </svg>
);

const ROWS = [
  {g: 'pi', name: 'Raspberry Pi 5', sub: 'Patrol, motor control, gauge reading'},
  {g: 'servo', name: 'Two bus servos', sub: 'Pan and tilt, with position and load feedback'},
  {g: 'camera', name: 'Camera', sub: 'Looks, crops, zooms'},
  {g: 'ugen', name: 'ASUS UGen300 · Hailo-10H', sub: 'Vision-language model on a USB stick'},
];

const LOOP = ['Patrol', 'Remember', 'Ask', 'Turn', 'Zoom', 'Answer'];

export const How: React.FC = () => {
  const f = useCurrentFrame();
  const dur = sec(scene(S).duration);
  const w1 = lineStart(S, 'w1');
  const w2 = lineStart(S, 'w2');
  const w3 = lineStart(S, 'w3');
  const w4 = lineStart(S, 'w4');

  // which part is being named
  const on = (from: number, to: number) => ease(f, from, 8) * (1 - ease(f, to, 8));
  const named = {
    pi: on(w1 + sec(0.8), w1 + sec(2.2)),
    servo: on(w1 + sec(2.2), w1 + sec(3.4)),
    camera: on(w1 + sec(3.4), w2),
    ugen: on(w2, w3 - sec(0.6)),
  } as Record<string, number>;
  const rowAt: Record<string, number> = {pi: w1 + sec(0.8), servo: w1 + sec(2.2), camera: w1 + sec(3.4), ugen: w2};
  const specs = [
    {t: 'Hailo-10H', at: w2 + sec(2.6)},
    {t: '40 TOPS', at: w2 + sec(4.0)},
    {t: '8 GB', at: w2 + sec(5.6)},
    {t: '1 USB port', at: w2 + sec(7.4)},
  ];

  const phase2 = ease(f, w3 - sec(0.5), 14);
  const stepGap = 0.62;
  const loopNode = LOOP.reduce((acc, _, i) => (f >= w3 + sec(i * stepGap) ? i : acc), -1);
  const deviceAt = w3 + sec(LOOP.length * stepGap + 0.2);
  const out = ease(f, w4, 16);

  return (
    <AbsoluteFill style={{background: C.bg, opacity: sceneFade(f, dur)}}>
      {/* phase 1: what's inside */}
      <AbsoluteFill style={{opacity: 1 - phase2, padding: '40px 140px 0 200px', flexDirection: 'row', alignItems: 'flex-start', gap: 110}}>
        <div style={{marginTop: 30}}>
          <Section active={named} f={f} />
        </div>
        <div style={{flex: 1, marginTop: 150}}>
          <div style={{fontFamily: UI, fontWeight: 600, fontSize: 28, letterSpacing: 4, color: C.signal, ...rise(f, 0)}}>INSIDE</div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 30, marginTop: 30}}>
            {ROWS.map((r) => {
              const hl = named[r.g] ?? 0;
              return (
                <div key={r.g} style={{borderLeft: `6px solid ${hl > 0.5 ? C.signal : C.line}`, paddingLeft: 26, ...rise(f, rowAt[r.g], 20)}}>
                  <div style={{fontFamily: UI, fontWeight: 600, fontSize: 44, color: C.ink}}>{r.name}</div>
                  <div style={{fontFamily: UI, fontSize: 28, color: C.muted, marginTop: 4}}>{r.sub}</div>
                </div>
              );
            })}
          </div>
          <div style={{display: 'flex', gap: 16, marginTop: 40}}>
            {specs.map((s) => (
              <div key={s.t} style={{fontFamily: NUM, fontWeight: 600, fontSize: 40, color: C.ink, background: C.panel, padding: '10px 22px', borderRadius: 10, border: `2px solid ${C.line}`, transform: `scale(${interpolate(pop(f, s.at), [0, 1], [0.6, 1])})`, opacity: ease(f, s.at, 6)}}>
                {s.t}
              </div>
            ))}
          </div>
        </div>
      </AbsoluteFill>

      {/* phase 2: the loop, all on the device */}
      <AbsoluteFill style={{opacity: phase2, justifyContent: 'center'}}>
        <div style={{position: 'relative', left: 70, width: 1800, height: 560}}>
          <div style={{position: 'absolute', left: 0, top: 0, width: 1380, height: 560, borderRadius: 28, border: `4px dashed ${C.signal}`, opacity: 0.35 + 0.65 * ease(f, deviceAt, 12)}} />
          <div style={{position: 'absolute', left: 40, top: 30, fontFamily: UI, fontWeight: 600, fontSize: 30, letterSpacing: 3, color: C.signal}}>ON THE DEVICE</div>
          <div style={{position: 'absolute', left: 50, top: 200, display: 'flex', gap: 18}}>
            {LOOP.map((n, i) => {
              const lit = i <= loopNode;
              const cur = i === loopNode;
              return (
                <div key={n} style={{width: 196, height: 130, borderRadius: 16, background: cur ? C.signal : lit ? C.ink : C.panel, color: lit ? '#fff' : C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: UI, fontWeight: 600, fontSize: 33, transform: `scale(${cur ? 1.06 : 1})`, border: `2px solid ${lit ? 'transparent' : C.line}`}}>
                  {n}
                </div>
              );
            })}
          </div>
          {/* loop arrow back from Answer to Patrol */}
          <svg width={1380} height={560} style={{position: 'absolute', left: 0, top: 0}}>
            <path d="M1218 345 V420 H148 V345" fill="none" stroke={C.muted} strokeWidth={3} strokeDasharray={1200} strokeDashoffset={1200 * (1 - ease(f, deviceAt - sec(0.6), 20))} />
            <path d="M138 357 L148 340 L158 357" fill="none" stroke={C.muted} strokeWidth={3} opacity={ease(f, deviceAt, 6)} />
          </svg>
          <svg width={360} height={40} style={{position: 'absolute', left: 1372, top: 245, overflow: 'visible'}}>
            <line x1={0} y1={20} x2={20 + 70 * out} y2={20} stroke={C.ink} strokeWidth={4} />
            <path d={`M${80 * out + 4} 8 L${80 * out + 20} 20 L${80 * out + 4} 32`} fill="none" stroke={C.ink} strokeWidth={4} opacity={out} />
          </svg>
          <div style={{position: 'absolute', left: 1470, top: 186, width: 320, ...rise(f, w4, 16)}}>
            <div style={{background: C.panel, borderRadius: 12, padding: '16px 18px', border: `2px solid ${C.ok}`}}>
              <div style={{fontFamily: UI, fontWeight: 600, fontSize: 22, letterSpacing: 2, color: C.ok}}>TEXT ONLY</div>
              <div style={{fontFamily: UI, fontSize: 30, color: C.ink, marginTop: 6, whiteSpace: 'nowrap'}}>“The faucet is off.”</div>
            </div>
          </div>
          <div style={{position: 'absolute', left: 1470, top: 330, display: 'flex', alignItems: 'center', gap: 12, ...rise(f, w4 + sec(1.2), 16)}}>
            <VideoOff size={64} />
            <div style={{fontFamily: UI, fontWeight: 600, fontSize: 32, color: C.alert, whiteSpace: 'nowrap'}}>Never the video</div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
