import React from 'react';
import {C, NUM, UI} from '../theme';

/** Side view (elevation) of Mrs. Lin's flat: kitchen on the left, living room on the right.
 *  Same line style as PumpRoom. The PatrolEye ceiling unit hangs from the ceiling at CAM. */

export const VIEW_W = 1100;
export const VIEW_H = 820;
const CEIL = 60;
const FLOOR = 720;
export const CAM = {x: 700, y: 122};
export const SPOT = {
  stove: {x: 165, y: 492},
  sofaHead: {x: 758, y: 520},
  floor: {x: 548, y: 688},
  phone: {x: 1000, y: 622},
};
const SOFA = {x0: 690, x1: 950};
const FALL_FEET = 660; // where she stands up and falls (feet x)

export type Pose = 'sit' | 'stand';

export type HomeProps = {
  draw?: number; // 0..1 build-in
  pose?: Pose;
  fall?: number; // 0..1 (only with pose 'stand')
  stove?: number; // 0..1 flame on
  smoke?: number; // 0..1 dark smoke from a pot left on the stove
  alarm?: number; // 0..1 kitchen smoke alarm sounding
  ring?: number; // phone ringing strength 0..1
  badge?: string; // "Wed 09:58"
  dim?: number; // 0..1 evening tint
  cam?: {o: number; aim: {x: number; y: number}; cone: number} | null;
  checks?: {x: number; y: number; r?: number; tone: 'ok' | 'alert'; o: number}[];
  pulse?: number;
  calDay?: number; // highlighted calendar column (0 = Mon)
  personO?: number; // opacity of Mrs. Lin (for cuts between poses)
};

const ink = {stroke: C.ink, strokeWidth: 2.6, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const};
const SKIN = '#F1D9C8';
const HAIR = '#B8BEC4';
const CARDI = '#9DB3C7';

/** Standing figure, feet at (0, 0), facing right. */
const Standing: React.FC = () => (
  <g>
    <line x1={34} y1={-122} x2={44} y2={0} stroke={C.ink} strokeWidth={5} strokeLinecap="round" />
    <rect x={-15} y={-46} width={11} height={44} rx={5} fill="#fff" {...ink} />
    <rect x={4} y={-46} width={11} height={44} rx={5} fill="#fff" {...ink} />
    <ellipse cx={-6} cy={-2} rx={13} ry={5} fill={C.ink} />
    <ellipse cx={13} cy={-2} rx={13} ry={5} fill={C.ink} />
    <path d="M-24 -124 L24 -124 L30 -40 L-30 -40 Z" fill="#fff" {...ink} />
    <rect x={-24} y={-196} width={48} height={80} rx={16} fill={CARDI} {...ink} />
    <path d="M10 -184 Q30 -150 36 -124" fill="none" stroke={C.ink} strokeWidth={9} strokeLinecap="round" />
    <path d="M10 -184 Q30 -150 36 -124" fill="none" stroke={CARDI} strokeWidth={5} strokeLinecap="round" />
    <circle cx={36} cy={-122} r={6} fill={SKIN} {...ink} strokeWidth={2} />
    <circle cx={4} cy={-222} r={22} fill={SKIN} {...ink} />
    <path d="M-18 -224 Q-14 -248 8 -246 Q24 -244 26 -230" fill={HAIR} {...ink} strokeWidth={2.2} />
    <circle cx={-19} cy={-236} r={9} fill={HAIR} {...ink} strokeWidth={2} />
  </g>
);

/** Sitting figure, hip on the seat at (0, 0), facing right, feet on the floor 100 below. */
const Sitting: React.FC = () => (
  <g>
    <rect x={44} y={-4} width={12} height={102} rx={5} fill="#fff" {...ink} />
    <ellipse cx={58} cy={98} rx={14} ry={5} fill={C.ink} />
    <rect x={-6} y={-18} width={64} height={24} rx={11} fill="#fff" {...ink} />
    <rect x={-26} y={-96} width={48} height={84} rx={16} fill={CARDI} {...ink} />
    <path d="M8 -84 Q30 -52 40 -16" fill="none" stroke={C.ink} strokeWidth={9} strokeLinecap="round" />
    <path d="M8 -84 Q30 -52 40 -16" fill="none" stroke={CARDI} strokeWidth={5} strokeLinecap="round" />
    <circle cx={2} cy={-122} r={22} fill={SKIN} {...ink} />
    <path d="M-20 -124 Q-16 -148 6 -146 Q22 -144 24 -130" fill={HAIR} {...ink} strokeWidth={2.2} />
    <circle cx={-21} cy={-136} r={9} fill={HAIR} {...ink} strokeWidth={2} />
    <line x1={-44} y1={-30} x2={-56} y2={98} stroke={C.ink} strokeWidth={5} strokeLinecap="round" />
  </g>
);

const hand = (deg: number, len: number, cx: number, cy: number) => {
  const r = ((deg - 90) * Math.PI) / 180;
  return {x2: cx + Math.cos(r) * len, y2: cy + Math.sin(r) * len};
};

export const HomeRoom: React.FC<HomeProps> = ({
  draw = 1,
  pose = 'sit',
  fall = 0,
  stove = 0,
  smoke = 0,
  alarm = 0,
  ring = 0,
  badge,
  dim = 0,
  cam = null,
  checks = [],
  pulse = 0,
  calDay = 2,
  personO = 1,
}) => {
  const g = (i: number) => Math.max(0, Math.min(1, draw * 5 - i));
  const time = badge?.split(' ').pop() ?? '09:30';
  const [hh, mm] = time.split(':').map(Number);
  const clockX = 470;
  const clockY = 190;
  // the fall: rotate the standing figure back about her feet, landing on the floor
  const a = -88 * Math.min(1, fall * fall * 1.15);
  const lift = 25 * Math.min(1, fall * 1.15);
  return (
    <svg width={VIEW_W} height={VIEW_H} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} style={{overflow: 'visible'}}>
      <defs>
        <radialGradient id="homeCone" cx={CAM.x} cy={CAM.y} r={720} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={C.signal} stopOpacity={0.5} />
          <stop offset="1" stopColor={C.signal} stopOpacity={0.06} />
        </radialGradient>
      </defs>

      {/* shell of the flat */}
      <g opacity={g(0)}>
        <rect x={20} y={20} width={1060} height={780} fill={C.panel} />
        <rect x={20} y={FLOOR} width={1060} height={80} fill="#E6E9EB" />
        <path d={`M20 ${CEIL} H1080 M20 ${FLOOR} H1080 M20 ${CEIL} V${FLOOR} M1080 ${CEIL} V${FLOOR}`} stroke={C.ink} strokeWidth={7} strokeLinecap="square" />
        <rect x={398} y={CEIL} width={22} height={150} fill="#fff" {...ink} />
        <text x={40} y={772} fontFamily={UI} fontSize={20} fill={C.muted}>Kitchen</text>
        <text x={440} y={772} fontFamily={UI} fontSize={20} fill={C.muted}>Living room</text>
      </g>

      {/* kitchen */}
      <g opacity={g(1)}>
        <rect x={175} y={CEIL} width={50} height={240} fill="#fff" {...ink} />
        <path d="M105 340 L295 340 L265 300 L135 300 Z" fill="#fff" {...ink} />
        <rect x={50} y={540} width={330} height={FLOOR - 540} fill="#fff" {...ink} />
        {[160, 270].map((x) => <line key={x} x1={x} y1={556} x2={x} y2={FLOOR - 12} {...ink} strokeWidth={2} />)}
        {[140, 180, 290].map((x) => <line key={x} x1={x} y1={600} x2={x} y2={630} {...ink} strokeWidth={3} />)}
        <rect x={44} y={528} width={342} height={14} rx={3} fill={C.ink} />
        <rect x={108} y={518} width={186} height={10} rx={3} fill="#3B4248" />
        {/* pot on the left burner */}
        <rect x={128} y={470} width={78} height={48} rx={6} fill="#fff" {...ink} />
        <line x1={120} y1={480} x2={128} y2={480} {...ink} strokeWidth={4} />
        <line x1={206} y1={480} x2={214} y2={480} {...ink} strokeWidth={4} />
        <path d="M134 470 Q167 456 200 470" fill="#fff" {...ink} />
        <ellipse cx={252} cy={516} rx={26} ry={4} fill="#6B737A" />
        {stove > 0 && (
          <g opacity={stove}>
            {[140, 158, 176, 194].map((x, i) => (
              <path key={x} d={`M${x} 520 q-7 -10 0 -${16 + (i % 2) * 6} q7 10 0 ${16 + (i % 2) * 6}`} fill={C.signal} stroke="#C2410C" strokeWidth={1.4} />
            ))}
            {[150, 172, 194].map((x, i) => (
              <path key={x} d={`M${x} 452 q-10 -16 0 -32 q10 -16 0 -32`} fill="none" stroke={C.muted} strokeWidth={2.4} strokeLinecap="round" opacity={0.55 + 0.25 * Math.sin(pulse * 3 + i)} />
            ))}
          </g>
        )}
        {/* a pot left on the stove: smoke rising under the hood */}
        {smoke > 0 && (
          <g opacity={smoke}>
            {[0, 1, 2, 3, 4].map((i) => {
              const t = (pulse * 0.6 + i / 5) % 1;
              const r = 16 + 26 * t;
              return <circle key={i} cx={167 + Math.sin(pulse * 2 + i * 1.7) * 18} cy={458 - 120 * t} r={r} fill="#5B6770" opacity={0.42 * (1 - t) * smoke} />;
            })}
          </g>
        )}
        {/* smoke alarm on the kitchen ceiling */}
        <g>
          <rect x={290} y={CEIL} width={44} height={8} rx={2} fill={C.ink} />
          <path d={`M292 ${CEIL + 8} Q312 ${CEIL + 26} 332 ${CEIL + 8} Z`} fill="#fff" {...ink} strokeWidth={2.2} />
          <circle cx={312} cy={CEIL + 15} r={3.5} fill={alarm > 0 ? C.alert : '#9AA3AA'} />
          {alarm > 0 && (
            <g opacity={alarm} fill="none" stroke={C.alert} strokeWidth={3.5} strokeLinecap="round">
              {[22, 38, 54].map((rr, i) => (
                <path key={rr} opacity={0.35 + 0.65 * Math.abs(Math.sin(pulse * 7 + i * 0.9))}
                  d={`M${312 - rr} ${CEIL + 18 + rr * 0.5} A ${rr} ${rr} 0 0 0 ${312 + rr} ${CEIL + 18 + rr * 0.5}`} />
              ))}
            </g>
          )}
        </g>
      </g>

      {/* living room */}
      <g opacity={g(2)}>
        {/* wall clock */}
        <circle cx={clockX} cy={clockY} r={38} fill="#fff" {...ink} strokeWidth={3} />
        <line x1={clockX} y1={clockY} {...hand(((hh % 12) + mm / 60) * 30, 18, clockX, clockY)} {...ink} strokeWidth={4} />
        <line x1={clockX} y1={clockY} {...hand(mm * 6, 28, clockX, clockY)} {...ink} strokeWidth={2.6} />
        {/* calendar */}
        <rect x={530} y={128} width={120} height={128} rx={6} fill="#fff" {...ink} />
        <rect x={530} y={128} width={120} height={28} rx={6} fill={C.ink} />
        {Array.from({length: 7}).map((_, c) =>
          Array.from({length: 3}).map((__, r) => {
            const visit = c === 0 || c === 4;
            return (
              <rect key={`${c}-${r}`} x={538 + c * 15.5} y={166 + r * 27} width={11} height={11} rx={2}
                fill={visit ? C.signal : c === calDay && r === 1 ? C.ink : '#D6DBDF'} />
            );
          }),
        )}
        {/* window */}
        <rect x={760} y={110} width={180} height={220} fill="#EEF4F7" {...ink} />
        <line x1={850} y1={110} x2={850} y2={330} {...ink} strokeWidth={2} />
        <line x1={760} y1={220} x2={940} y2={220} {...ink} strokeWidth={2} />
        {/* sofa */}
        <rect x={SOFA.x0 + 12} y={556} width={SOFA.x1 - SOFA.x0 - 24} height={84} rx={18} fill="#fff" {...ink} />
        <rect x={SOFA.x0 + 20} y={616} width={SOFA.x1 - SOFA.x0 - 40} height={48} rx={10} fill="#fff" {...ink} />
        <rect x={SOFA.x0} y={600} width={40} height={92} rx={14} fill="#fff" {...ink} />
        <rect x={SOFA.x1 - 40} y={600} width={40} height={92} rx={14} fill="#fff" {...ink} />
        <rect x={SOFA.x0 + 10} y={690} width={SOFA.x1 - SOFA.x0 - 20} height={10} fill={C.ink} />
        <rect x={SOFA.x0 + 18} y={700} width={10} height={20} fill={C.ink} />
        <rect x={SOFA.x1 - 28} y={700} width={10} height={20} fill={C.ink} />
        {/* side table + phone */}
        <rect x={966} y={634} width={86} height={10} rx={3} fill={C.ink} />
        <line x1={976} y1={644} x2={976} y2={FLOOR} {...ink} strokeWidth={4} />
        <line x1={1042} y1={644} x2={1042} y2={FLOOR} {...ink} strokeWidth={4} />
        <rect x={982} y={612} width={50} height={22} rx={5} fill="#fff" {...ink} />
        <path d="M980 610 Q1007 590 1034 610" fill="none" stroke={C.ink} strokeWidth={7} strokeLinecap="round" />
        {ring > 0 && (
          <g opacity={ring} fill="none" stroke={C.alert} strokeWidth={3.5} strokeLinecap="round">
            {[30, 48].map((rr, i) => (
              <g key={rr} opacity={0.4 + 0.6 * Math.abs(Math.sin(pulse * 6 + i))}>
                <path d={`M${SPOT.phone.x + 7 - rr} ${SPOT.phone.y - rr * 0.7} A ${rr} ${rr} 0 0 0 ${SPOT.phone.x + 7 - rr} ${SPOT.phone.y + rr * 0.5}`} />
                <path d={`M${SPOT.phone.x + 7 + rr} ${SPOT.phone.y - rr * 0.7} A ${rr} ${rr} 0 0 1 ${SPOT.phone.x + 7 + rr} ${SPOT.phone.y + rr * 0.5}`} />
              </g>
            ))}
          </g>
        )}
      </g>

      {/* Mrs. Lin */}
      <g opacity={g(3) * personO}>
        {pose === 'sit' ? (
          <g transform="translate(756 620)">
            <Sitting />
          </g>
        ) : (
          <g transform={`translate(${FALL_FEET} ${FLOOR - lift}) rotate(${a})`}>
            <Standing />
          </g>
        )}
      </g>

      {/* evening tint (time passing) */}
      {dim > 0 && <rect x={20} y={20} width={1060} height={780} fill="#1B2A3A" opacity={0.28 * dim} />}

      {/* PatrolEye on the ceiling */}
      {cam && cam.o > 0 && (
        <g>
          {cam.cone > 0 && (() => {
            const ang = Math.atan2(cam.aim.y - CAM.y, cam.aim.x - CAM.x);
            const len = Math.hypot(cam.aim.x - CAM.x, cam.aim.y - CAM.y) + 70;
            const half = (10 * Math.PI) / 180;
            const p = (t: number) => `${CAM.x + Math.cos(t) * len},${CAM.y + Math.sin(t) * len}`;
            return <polygon points={`${CAM.x},${CAM.y} ${p(ang - half)} ${p(ang + half)}`} fill="url(#homeCone)" opacity={cam.cone} />;
          })()}
          <g opacity={cam.o}>
            <rect x={CAM.x - 34} y={CEIL} width={68} height={7} rx={2} fill={C.ink} />
            <rect x={CAM.x - 24} y={CEIL + 7} width={48} height={30} rx={5} fill="#fff" {...ink} />
            <rect x={CAM.x - 11} y={CEIL + 37} width={22} height={12} fill="#fff" {...ink} />
            <circle cx={CAM.x} cy={CAM.y} r={15} fill="#fff" {...ink} />
            {(() => {
              const ang = Math.atan2(cam.aim.y - CAM.y, cam.aim.x - CAM.x);
              return <circle cx={CAM.x + Math.cos(ang) * 9} cy={CAM.y + Math.sin(ang) * 9} r={6} fill={C.signal} stroke={C.ink} strokeWidth={2} />;
            })()}
            <text x={CAM.x + 44} y={CEIL + 34} fontFamily={UI} fontWeight={700} fontSize={22} fill={C.signal}>PatrolEye</text>
          </g>
        </g>
      )}

      {/* check rings */}
      {checks.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={(c.r ?? 40) + (c.tone === 'alert' ? 5 * pulse : 0)} fill={c.tone === 'alert' ? C.signal : 'none'}
          fillOpacity={c.tone === 'alert' ? 0.16 : 0} stroke={c.tone === 'alert' ? C.signal : C.ok} strokeWidth={c.tone === 'alert' ? 5 : 4} opacity={c.o} />
      ))}

      {badge && (
        <g>
          <rect x={30} y={-58} width={330} height={46} rx={10} fill={C.ink} />
          <text x={50} y={-26} fontFamily={NUM} fontWeight={600} fontSize={30} fill="#fff">Mrs. Lin, 82 · {badge}</text>
        </g>
      )}
    </svg>
  );
};
