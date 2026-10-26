import React from 'react';
import {C} from '../theme';

type P = {size?: number; color?: string; accent?: string; style?: React.CSSProperties};

const Svg: React.FC<P & {children: React.ReactNode}> = ({size = 96, style, children}) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={style}>
    {children}
  </svg>
);

const s = (color = C.ink) => ({stroke: color, strokeWidth: 2.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const});

export const Gauge: React.FC<P & {angle?: number}> = ({angle = -30, color, accent = C.signal, ...p}) => (
  <Svg {...p}>
    <circle cx="32" cy="34" r="22" {...s(color)} />
    {[-120, -80, -40, 0, 40, 80, 120].map((a) => {
      const r = (a - 90) * (Math.PI / 180);
      return <line key={a} x1={32 + Math.cos(r) * 16} y1={34 + Math.sin(r) * 16} x2={32 + Math.cos(r) * 19} y2={34 + Math.sin(r) * 19} {...s(color)} strokeWidth={2} />;
    })}
    <path d="M40 22 A14 14 0 0 1 46 30" stroke={accent} strokeWidth={3} strokeLinecap="round" />
    <g transform={`rotate(${angle} 32 34)`}>
      <line x1="32" y1="34" x2="32" y2="18" {...s(color)} strokeWidth={2.8} />
    </g>
    <circle cx="32" cy="34" r="2.6" fill={color ?? C.ink} />
    <line x1="32" y1="56" x2="32" y2="62" {...s(color)} />
  </Svg>
);

export const Valve: React.FC<P & {turn?: number}> = ({turn = 0, color, ...p}) => (
  <Svg {...p}>
    <g transform={`rotate(${turn} 32 22)`}>
      <circle cx="32" cy="22" r="14" {...s(color)} />
      {[0, 60, 120].map((a) => (
        <line key={a} x1={32 + Math.cos((a * Math.PI) / 180) * 14} y1={22 + Math.sin((a * Math.PI) / 180) * 14} x2={32 - Math.cos((a * Math.PI) / 180) * 14} y2={22 - Math.sin((a * Math.PI) / 180) * 14} {...s(color)} strokeWidth={2} />
      ))}
    </g>
    <line x1="32" y1="36" x2="32" y2="44" {...s(color)} />
    <rect x="6" y="44" width="52" height="10" rx="2" {...s(color)} />
  </Svg>
);

export const WarningLight: React.FC<P & {on?: number}> = ({on = 0, color, accent = C.signal, ...p}) => (
  <Svg {...p}>
    <path d="M18 44 V30 a14 14 0 0 1 28 0 V44" {...s(color)} fill={accent} fillOpacity={0.15 + on * 0.75} />
    <rect x="12" y="44" width="40" height="8" rx="2" {...s(color)} />
    {on > 0.5 && (
      <g stroke={accent} strokeWidth={2.4} strokeLinecap="round">
        <line x1="32" y1="4" x2="32" y2="9" />
        <line x1="10" y1="14" x2="14" y2="18" />
        <line x1="54" y1="14" x2="50" y2="18" />
      </g>
    )}
  </Svg>
);

export const Clipboard: React.FC<P & {ticks?: number}> = ({ticks = 3, color, accent = C.signal, ...p}) => (
  <Svg {...p}>
    <rect x="14" y="10" width="36" height="46" rx="4" {...s(color)} />
    <rect x="24" y="6" width="16" height="8" rx="2" {...s(color)} />
    {[24, 34, 44].map((y, i) => (
      <g key={y}>
        <rect x="20" y={y - 3} width="6" height="6" rx="1" {...s(color)} strokeWidth={1.8} />
        {i < ticks && <path d={`M21 ${y} l2 2 l4 -5`} stroke={accent} strokeWidth={2.4} strokeLinecap="round" />}
        <line x1="31" y1={y} x2="44" y2={y} {...s(color)} strokeWidth={1.8} />
      </g>
    ))}
  </Svg>
);

export const Robot: React.FC<P> = ({color, ...p}) => (
  <Svg {...p}>
    <rect x="12" y="20" width="36" height="16" rx="5" {...s(color)} />
    <rect x="46" y="16" width="10" height="9" rx="2" {...s(color)} />
    <path d="M18 36 l-3 12 M26 36 l2 12 M36 36 l-2 12 M44 36 l3 12" {...s(color)} />
    <line x1="10" y1="52" x2="54" y2="52" {...s(color)} strokeWidth={1.6} />
  </Svg>
);

export const CloudUp: React.FC<P> = ({color, accent = C.alert, ...p}) => (
  <Svg {...p}>
    <path d="M18 42 a10 10 0 0 1 1 -20 a13 13 0 0 1 25 -2 a10 10 0 0 1 2 22 Z" {...s(color)} />
    <rect x="22" y="46" width="14" height="10" rx="2" {...s(accent)} />
    <path d="M36 49 l6 -3 v10 l-6 -3" {...s(accent)} />
    <path d="M29 44 V32 M24 37 l5 -5 l5 5" {...s(accent)} />
  </Svg>
);

export const VideoOff: React.FC<P> = ({color, accent = C.alert, ...p}) => (
  <Svg {...p}>
    <rect x="8" y="20" width="34" height="24" rx="4" {...s(color)} />
    <path d="M42 28 l14 -7 v22 l-14 -7" {...s(color)} />
    <line x1="6" y1="54" x2="58" y2="10" stroke={accent} strokeWidth={3} strokeLinecap="round" />
  </Svg>
);

export const Unplugged: React.FC<P> = ({color, accent = C.signal, ...p}) => (
  <Svg {...p}>
    <path d="M14 26 h14 v12 h-14 z M18 26 v-8 M24 26 v-8 M28 32 h6" {...s(color)} />
    <path d="M50 26 h-10 v12 h10 M40 32 h-4" {...s(color)} />
    <path d="M30 46 l4 6 M34 44 l6 4 M28 50 l1 6" stroke={accent} strokeWidth={2.4} strokeLinecap="round" />
  </Svg>
);

export const Factory: React.FC<P> = ({color, ...p}) => (
  <Svg {...p}>
    <path d="M8 54 V30 l12 8 v-8 l12 8 v-8 l12 8 V12 h8 v42 Z" {...s(color)} />
    <line x1="4" y1="54" x2="60" y2="54" {...s(color)} />
    <rect x="16" y="44" width="6" height="6" {...s(color)} strokeWidth={1.8} />
    <rect x="30" y="44" width="6" height="6" {...s(color)} strokeWidth={1.8} />
  </Svg>
);

export const Server: React.FC<P> = ({color, accent = C.ok, ...p}) => (
  <Svg {...p}>
    {[10, 26, 42].map((y) => (
      <g key={y}>
        <rect x="12" y={y} width="40" height="12" rx="2" {...s(color)} />
        <circle cx="20" cy={y + 6} r="1.8" fill={accent} />
        <line x1="30" y1={y + 6} x2="44" y2={y + 6} {...s(color)} strokeWidth={1.8} />
      </g>
    ))}
  </Svg>
);

export const Flask: React.FC<P> = ({color, ...p}) => (
  <Svg {...p}>
    <path d="M26 8 h12 M28 8 v16 L14 52 a3 3 0 0 0 3 4 h30 a3 3 0 0 0 3 -4 L36 24 V8" {...s(color)} />
    <path d="M19 42 h26" {...s(color)} strokeWidth={1.8} />
  </Svg>
);

export const House: React.FC<P> = ({color, ...p}) => (
  <Svg {...p}>
    <path d="M8 30 L32 10 L56 30" {...s(color)} />
    <path d="M14 26 V54 H50 V26" {...s(color)} />
    <rect x="27" y="38" width="10" height="16" {...s(color)} />
  </Svg>
);

export const Mic: React.FC<P> = ({color, ...p}) => (
  <Svg {...p}>
    <rect x="24" y="8" width="16" height="28" rx="8" {...s(color)} />
    <path d="M16 30 a16 16 0 0 0 32 0 M32 46 v10" {...s(color)} />
  </Svg>
);

export const Phone: React.FC<P> = ({color, ...p}) => (
  <Svg {...p}>
    <rect x="18" y="6" width="28" height="52" rx="5" {...s(color)} />
    <line x1="28" y1="51" x2="36" y2="51" {...s(color)} />
  </Svg>
);

export const CamView: React.FC<P> = ({color, accent = C.signal, ...p}) => (
  <Svg {...p}>
    <rect x="6" y="14" width="52" height="36" rx="3" {...s(color)} />
    <rect x="22" y="24" width="20" height="16" stroke={accent} strokeWidth={2.4} />
    <path d="M6 32 h6 M52 32 h6" {...s(color)} strokeWidth={1.8} />
  </Svg>
);

export const RigIcon: React.FC<P> = ({color, ...p}) => (
  <Svg {...p}>
    <rect x="20" y="8" width="24" height="12" rx="6" {...s(color)} />
    <rect x="28" y="20" width="8" height="16" {...s(color)} />
    <rect x="12" y="36" width="40" height="18" rx="3" {...s(color)} />
  </Svg>
);

export const WifiOff: React.FC<P> = ({color, accent = C.signal, ...p}) => (
  <Svg {...p}>
    <path d="M10 26 a32 32 0 0 1 44 0 M18 34 a20 20 0 0 1 28 0 M26 42 a9 9 0 0 1 12 0" {...s(color)} />
    <circle cx="32" cy="50" r="2.6" fill={color ?? C.ink} />
    <line x1="10" y1="56" x2="54" y2="10" stroke={accent} strokeWidth={3} strokeLinecap="round" />
  </Svg>
);

export const Drop: React.FC<P> = ({color, accent = C.signal, ...p}) => (
  <Svg {...p}>
    <path d="M32 8 C25 19 18 27 18 36 a14 14 0 0 0 28 0 C46 27 39 19 32 8 Z" {...s(color)} />
    <path d="M25 37 a7 7 0 0 0 7 7" {...s(color)} strokeWidth={1.8} />
    <path d="M10 57 h44" stroke={accent} strokeWidth={3} strokeLinecap="round" />
  </Svg>
);

export const Flame: React.FC<P> = ({color, accent = C.signal, ...p}) => (
  <Svg {...p}>
    <path d="M32 6 C38 16 46 23 46 34 a14 14 0 0 1 -28 0 c0 -6 3 -10 6 -13 c0 5 2 8 5 9 c-1 -8 1 -16 3 -24 Z" stroke={accent} strokeWidth={2.6} strokeLinejoin="round" />
    <path d="M10 56 h44 M16 56 v-5 M48 56 v-5" {...s(color)} />
  </Svg>
);
