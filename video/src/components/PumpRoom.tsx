import React from 'react';
import {C, NUM, UI} from '../theme';

/** Plan view of a pump room: three pumps, headers, an instrument rack, a control panel,
 *  a fire extinguisher and 22 checkpoints. PatrolEye sits on the south wall. */

export const VIEW_W = 1100;
export const VIEW_H = 820;
export const CAM = {x: 550, y: 776};

export type Kind = 'light' | 'gauge' | 'valve' | 'fe';
export type Checkpoint = {id: string; x: number; y: number; kind: Kind; value: string};

const PUMPS = [270, 550, 830];

const raw: Checkpoint[] = [
  ...[370, 420, 470, 520].map((y, i) => ({id: `L-${i + 1}`, x: 60, y, kind: 'light' as Kind, value: 'green'})),
  ...[600, 670, 740, 810, 880, 950].map((x, i) => ({id: `PI-20${i + 1}`, x, y: 70, kind: 'gauge' as Kind, value: `${(3.8 + i * 0.15).toFixed(1)} bar`})),
  ...PUMPS.map((x, i) => ({id: `PT-10${i + 1}`, x, y: 330, kind: 'gauge' as Kind, value: `${[5.2, 5.4, 5.1][i]} bar`})),
  {id: 'V-01', x: 200, y: 250, kind: 'valve', value: 'open'},
  {id: 'V-02', x: 900, y: 250, kind: 'valve', value: 'open'},
  ...PUMPS.map((x, i) => ({id: `V-1${i + 1}`, x, y: 600, kind: 'valve' as Kind, value: 'open'})),
  ...PUMPS.map((x, i) => ({id: `PS-10${i + 1}`, x, y: 655, kind: 'gauge' as Kind, value: '1.1 bar'})),
  {id: 'FE-2', x: 60, y: 690, kind: 'fe', value: 'on bracket'},
];

// Patrol order: sweep by bearing from the camera, like a real pan.
export const CHECKPOINTS = [...raw].sort(
  (a, b) => Math.atan2(a.y - CAM.y, a.x - CAM.x) - Math.atan2(b.y - CAM.y, b.x - CAM.x),
);
export const cp = (id: string) => raw.find((c) => c.id === id)!;
export const PUDDLE = {x: 862, y: 560};
export const FE_HOME = {x: 60, y: 690};
export const FE_DOOR = {x: 1030, y: 712};

const ROUTE: [number, number][] = [
  [1040, 600], [900, 400], [830, 470], [700, 400], [550, 400], [420, 400], [270, 400], [160, 450], [120, 450],
  [300, 160], [600, 130], [950, 130],
];

const routePoint = (t: number) => {
  const segs = ROUTE.slice(1).map((p, i) => {
    const a = ROUTE[i];
    return {a, b: p, len: Math.hypot(p[0] - a[0], p[1] - a[1])};
  });
  const total = segs.reduce((s, x) => s + x.len, 0);
  let d = Math.max(0, Math.min(1, t)) * total;
  for (const s of segs) {
    if (d <= s.len) {
      const k = d / s.len;
      return {x: s.a[0] + (s.b[0] - s.a[0]) * k, y: s.a[1] + (s.b[1] - s.a[1]) * k, done: total * t};
    }
    d -= s.len;
  }
  const last = ROUTE[ROUTE.length - 1];
  return {x: last[0], y: last[1], done: total};
};
const travelled = (done: number) => {
  const pts: [number, number][] = [ROUTE[0]];
  let acc = 0;
  for (let i = 1; i < ROUTE.length; i++) {
    const a = ROUTE[i - 1];
    const b = ROUTE[i];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (acc + len <= done) {
      pts.push(b);
      acc += len;
    } else {
      const k = (done - acc) / len;
      pts.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]);
      break;
    }
  }
  return pts;
};
export const ROUTE_LEN = ROUTE.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - ROUTE[i][0], p[1] - ROUTE[i][1]), 0);

export type RoomProps = {
  draw?: number; // 0..1 build-in
  visited?: number; // checkpoints ticked in patrol order
  cone?: {x: number; y: number; o: number} | null;
  alerts?: string[];
  callouts?: {x: number; y: number; label: string; tone?: 'alert' | 'ok' | 'ink'; o: number}[];
  puddle?: number;
  diffBox?: number;
  feMove?: number;
  operator?: number | null;
  camera?: boolean;
  clock?: string;
  pulse?: number;
};

const Bowtie: React.FC<{x: number; y: number; vertical?: boolean}> = ({x, y, vertical}) => (
  <g transform={`translate(${x} ${y}) rotate(${vertical ? 90 : 0})`}>
    <path d="M-14 -10 L14 10 L14 -10 L-14 10 Z" fill={C.panel} stroke={C.ink} strokeWidth={2.4} strokeLinejoin="round" />
  </g>
);

const Dial: React.FC<{x: number; y: number}> = ({x, y}) => (
  <g>
    <circle cx={x} cy={y} r={15} fill="#fff" stroke={C.ink} strokeWidth={2.4} />
    <line x1={x} y1={y} x2={x + 7} y2={y - 9} stroke={C.ink} strokeWidth={2.4} strokeLinecap="round" />
  </g>
);

export const PumpRoom: React.FC<RoomProps> = ({
  draw = 1,
  visited = 0,
  cone = null,
  alerts = [],
  callouts = [],
  puddle = 0,
  diffBox = 0,
  feMove = 0,
  operator = null,
  camera = true,
  clock,
  pulse = 0,
}) => {
  const g = (i: number) => Math.max(0, Math.min(1, draw * 6 - i)); // staged build-in
  const pipe = '#A9B1B7';
  const fe = {x: FE_HOME.x + (FE_DOOR.x - FE_HOME.x) * feMove, y: FE_HOME.y + (FE_DOOR.y - FE_HOME.y) * feMove};
  const op = operator == null ? null : routePoint(operator);
  return (
    <svg width={VIEW_W} height={VIEW_H} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} style={{overflow: 'visible'}}>
      <defs>
        <radialGradient id="coneGrad" cx={CAM.x} cy={CAM.y} r={820} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={C.signal} stopOpacity={0.5} />
          <stop offset="1" stopColor={C.signal} stopOpacity={0.05} />
        </radialGradient>
      </defs>

      {/* room */}
      <g opacity={g(0)}>
        <rect x={20} y={20} width={1060} height={780} fill={C.panel} />
        <path d="M1080 540 V20 H20 V800 H1080 V660" fill="none" stroke={C.ink} strokeWidth={7} strokeLinecap="square" />
        <path d="M1080 540 L1000 600" stroke={C.ink} strokeWidth={3} />
        <path d="M1080 660 A120 120 0 0 0 1000 600" fill="none" stroke={C.line} strokeWidth={2} strokeDasharray="5 6" />
        <text x={1010} y={690} fontFamily={UI} fontSize={20} fill={C.muted} textAnchor="end">East door</text>
      </g>

      {/* pipes */}
      <g opacity={g(1)} stroke={pipe} strokeLinecap="round">
        <line x1={150} y1={250} x2={950} y2={250} strokeWidth={14} />
        <line x1={150} y1={705} x2={950} y2={705} strokeWidth={14} />
        {PUMPS.map((x) => (
          <g key={x}>
            <line x1={x} y1={250} x2={x} y2={476} strokeWidth={9} />
            <line x1={x} y1={564} x2={x} y2={705} strokeWidth={9} />
          </g>
        ))}
        <text x={160} y={232} fontFamily={UI} fontSize={18} fill={C.muted} stroke="none">Discharge header</text>
        <text x={160} y={742} fontFamily={UI} fontSize={18} fill={C.muted} stroke="none">Suction header</text>
      </g>

      {/* puddle (under P-3) */}
      {puddle > 0 && (
        <g>
          <ellipse cx={PUDDLE.x} cy={PUDDLE.y} rx={70 * puddle} ry={30 * puddle} fill="#5DA9D6" fillOpacity={0.55} />
          <ellipse cx={PUDDLE.x + 30 * puddle} cy={PUDDLE.y + 14 * puddle} rx={30 * puddle} ry={14 * puddle} fill="#5DA9D6" fillOpacity={0.45} />
        </g>
      )}

      {/* pumps */}
      <g opacity={g(2)}>
        {PUMPS.map((x, i) => (
          <g key={x}>
            <rect x={x + 40} y={494} width={92} height={52} rx={8} fill="#fff" stroke={C.ink} strokeWidth={2.6} />
            <line x1={x + 40} y1={520} x2={x + 26} y2={520} stroke={C.ink} strokeWidth={4} />
            <circle cx={x} cy={520} r={44} fill="#fff" stroke={C.ink} strokeWidth={2.6} />
            <circle cx={x} cy={520} r={14} fill="none" stroke={C.ink} strokeWidth={2} />
            <text x={x - 58} y={528} fontFamily={NUM} fontWeight={600} fontSize={26} fill={C.ink} textAnchor="end">P-{i + 1}</text>
          </g>
        ))}
      </g>

      {/* instrument rack + control panel */}
      <g opacity={g(3)}>
        <rect x={565} y={44} width={420} height={52} rx={6} fill="#fff" stroke={C.line} strokeWidth={2} />
        <text x={560} y={122} fontFamily={UI} fontSize={18} fill={C.muted}>Instrument rack</text>
        <rect x={30} y={340} width={60} height={210} rx={6} fill="#fff" stroke={C.ink} strokeWidth={2.4} />
        <text x={102} y={340} fontFamily={UI} fontSize={18} fill={C.muted}>Control panel</text>
        {[370, 420, 470, 520].map((y) => (
          <circle key={y} cx={60} cy={y} r={11} fill={C.ok} stroke={C.ink} strokeWidth={1.6} />
        ))}
        {/* extinguisher bracket */}
        <rect x={44} y={666} width={32} height={50} rx={4} fill="none" stroke={C.line} strokeWidth={2} strokeDasharray={feMove > 0.05 ? '4 4' : undefined} />
      </g>

      {/* instruments */}
      <g opacity={g(4)}>
        {raw.filter((c) => c.kind === 'gauge').map((c) => <Dial key={c.id} x={c.x} y={c.y} />)}
        {raw.filter((c) => c.kind === 'valve').map((c) => <Bowtie key={c.id} x={c.x} y={c.y} vertical={c.y > 300} />)}
        {/* fire extinguisher */}
        <g transform={`translate(${fe.x} ${fe.y})`}>
          <rect x={-11} y={-20} width={22} height={40} rx={8} fill={C.alert} stroke={C.ink} strokeWidth={2} />
          <rect x={-5} y={-27} width={10} height={8} rx={2} fill={C.ink} />
        </g>
        <text x={FE_HOME.x + 26} y={FE_HOME.y + 40} fontFamily={NUM} fontWeight={600} fontSize={20} fill={C.muted}>FE-2</text>
      </g>

      {/* change-detection box */}
      {diffBox > 0 && (
        <rect x={PUDDLE.x - 105} y={PUDDLE.y - 60} width={210} height={120} rx={10} fill="none" stroke={C.signal} strokeWidth={3} strokeDasharray="10 8" opacity={diffBox} />
      )}

      {/* camera field of view */}
      {camera && cone && cone.o > 0 && (() => {
        const ang = Math.atan2(cone.y - CAM.y, cone.x - CAM.x);
        const len = Math.hypot(cone.x - CAM.x, cone.y - CAM.y) + 60;
        const half = (8 * Math.PI) / 180;
        const p = (a: number) => `${CAM.x + Math.cos(a) * len},${CAM.y + Math.sin(a) * len}`;
        return <polygon points={`${CAM.x},${CAM.y} ${p(ang - half)} ${p(ang + half)}`} fill="url(#coneGrad)" opacity={cone.o} />;
      })()}

      {/* checkpoint rings */}
      {CHECKPOINTS.map((c, i) => {
        const v = Math.max(0, Math.min(1, visited - i));
        const isAlert = alerts.includes(c.id);
        if (v <= 0 && !isAlert) return null;
        const r = 26 + (isAlert ? 4 * pulse : 0);
        return (
          <circle key={c.id} cx={c.x} cy={c.y} r={r} fill={isAlert ? C.signal : 'none'} fillOpacity={isAlert ? 0.18 : 0} stroke={isAlert ? C.signal : C.ok} strokeWidth={isAlert ? 4 : 3} opacity={isAlert ? 1 : v} />
        );
      })}

      {/* operator on foot (hook) */}
      {op && (
        <g>
          <polyline points={travelled(op.done).map((p) => p.join(',')).join(' ')} fill="none" stroke={C.muted} strokeWidth={4} strokeDasharray="2 14" strokeLinecap="round" />
          <circle cx={op.x} cy={op.y} r={16} fill={C.ink} />
          <circle cx={op.x} cy={op.y} r={7} fill="#fff" />
        </g>
      )}

      {/* PatrolEye on the south wall */}
      {camera && (
        <g opacity={g(5)}>
          <rect x={CAM.x - 34} y={CAM.y - 4} width={68} height={30} rx={8} fill={C.ink} />
          <circle cx={CAM.x} cy={CAM.y} r={11} fill={C.signal} stroke={C.ink} strokeWidth={3} />
          <text x={CAM.x + 48} y={CAM.y + 18} fontFamily={UI} fontWeight={700} fontSize={22} fill={C.signal}>PatrolEye</text>
        </g>
      )}

      {/* callouts */}
      {callouts.map((c, i) => (
        <g key={i} opacity={c.o}>
          <rect x={c.x - 8} y={c.y - 60} width={c.label.length * 12.5 + 28} height={40} rx={8} fill={c.tone === 'alert' ? C.signal : c.tone === 'ok' ? C.ok : C.ink} />
          <text x={c.x + 6} y={c.y - 33} fontFamily={UI} fontWeight={600} fontSize={22} fill="#fff">{c.label}</text>
        </g>
      ))}

      {clock && (
        <g>
          <rect x={30} y={-58} width={172} height={46} rx={10} fill={C.ink} />
          <text x={50} y={-26} fontFamily={NUM} fontWeight={600} fontSize={30} fill="#fff">Pump Room</text>
        </g>
      )}
    </svg>
  );
};
