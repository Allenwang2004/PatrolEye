import React from 'react';
import {C, NUM, UI} from '../theme';

/** What the PatrolEye camera sees, drawn as simple illustrations (factory examples). */

const Frame: React.FC<{children: React.ReactNode; label: string; w: number; h: number}> = ({children, label, w, h}) => (
  <div style={{position: 'relative', width: w, height: h, borderRadius: 16, overflow: 'hidden', background: '#1B232A'}}>
    <svg width={w} height={h} style={{position: 'absolute', inset: 0}}>
      {[1, 2].map((i) => (
        <g key={i} stroke="#ffffff" strokeOpacity={0.08}>
          <line x1={(w * i) / 3} y1={0} x2={(w * i) / 3} y2={h} />
          <line x1={0} y1={(h * i) / 3} x2={w} y2={(h * i) / 3} />
        </g>
      ))}
      {[[16, 16, 1, 1], [w - 16, 16, -1, 1], [16, h - 16, 1, -1], [w - 16, h - 16, -1, -1]].map(([x, y, sx, sy], i) => (
        <path key={i} d={`M${x} ${y + sy * 26} V${y} H${x + sx * 26}`} fill="none" stroke="#fff" strokeOpacity={0.7} strokeWidth={3} />
      ))}
    </svg>
    <div style={{position: 'absolute', inset: 0}}>{children}</div>
    <div style={{position: 'absolute', left: 22, top: 18, display: 'flex', alignItems: 'center', gap: 10, fontFamily: UI, fontWeight: 600, fontSize: 18, letterSpacing: 2, color: '#fff'}}>
      <span style={{width: 10, height: 10, borderRadius: 5, background: C.signal}} />
      {label}
    </div>
  </div>
);

/** Big pressure gauge, 0–10 bar, red band from 7. `value` sets the needle, `read` fades in the readout. */
export const GaugeView: React.FC<{w: number; h: number; zoom: number; value: number; read: number; tag: string}> = ({w, h, zoom, value, read, tag}) => {
  const cx = w / 2;
  const cy = h / 2 + 18;
  const R = 120 * (0.55 + 0.45 * zoom);
  const ang = (v: number) => ((-225 + (v / 10) * 270) * Math.PI) / 180;
  const pt = (v: number, r: number) => [cx + Math.cos(ang(v)) * r, cy + Math.sin(ang(v)) * r];
  const arc = (v0: number, v1: number, r: number) => {
    const [x0, y0] = pt(v0, r);
    const [x1, y1] = pt(v1, r);
    return `M${x0} ${y0} A${r} ${r} 0 ${v1 - v0 > 6.67 ? 1 : 0} 1 ${x1} ${y1}`;
  };
  const [nx, ny] = pt(value, R * 0.8);
  return (
    <Frame label="CAMERA VIEW · ZOOMED IN" w={w} h={h}>
      <svg width={w} height={h}>
        <circle cx={cx} cy={cy} r={R + 14} fill="#E9ECEE" stroke="#0F1A22" strokeWidth={6} />
        <path d={arc(7, 10, R - 8)} stroke={C.alert} strokeWidth={14} fill="none" />
        {Array.from({length: 11}, (_, i) => {
          const [x0, y0] = pt(i, R - 2);
          const [x1, y1] = pt(i, R - 20);
          const [tx, ty] = pt(i, R - 42);
          return (
            <g key={i}>
              <line x1={x0} y1={y0} x2={x1} y2={y1} stroke="#0F1A22" strokeWidth={3} />
              <text x={tx} y={ty + 7} fontFamily={NUM} fontWeight={600} fontSize={20 * (0.55 + 0.45 * zoom)} fill="#0F1A22" textAnchor="middle">{i}</text>
            </g>
          );
        })}
        <text x={cx} y={cy + R * 0.45} fontFamily={UI} fontSize={16} fill="#5B6770" textAnchor="middle">bar</text>
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#0F1A22" strokeWidth={5} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={9} fill="#0F1A22" />
      </svg>
      <div style={{position: 'absolute', right: 22, top: 56, textAlign: 'right', opacity: read}}>
        <div style={{fontFamily: NUM, fontWeight: 600, fontSize: 56, color: C.signal, lineHeight: 1}}>{value.toFixed(1)} bar</div>
        <div style={{fontFamily: UI, fontSize: 20, color: '#fff', marginTop: 6}}>{tag} · limit 7.0</div>
      </div>
    </Frame>
  );
};

export const PuddleView: React.FC<{w: number; h: number; zoom: number}> = ({w, h, zoom}) => {
  const s = 0.75 + 0.25 * zoom;
  return (
    <Frame label="CAMERA VIEW · PUMP P-3" w={w} h={h}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <g transform={`translate(${w / 2} ${h / 2 + 40}) scale(${s})`}>
          <rect x={-300} y={60} width={600} height={10} fill="#3A444C" />
          <rect x={-170} y={30} width={340} height={30} rx={4} fill="#8B969E" />
          <circle cx={-40} cy={-40} r={70} fill="#A9B4BB" stroke="#0F1A22" strokeWidth={5} />
          <rect x={30} y={-80} width={150} height={90} rx={10} fill="#C3CBD0" stroke="#0F1A22" strokeWidth={5} />
          <rect x={-60} y={-180} width={40} height={70} fill="#A9B4BB" stroke="#0F1A22" strokeWidth={5} />
          <ellipse cx={20} cy={78} rx={170 * zoom} ry={20 * zoom} fill="#5DA9D6" fillOpacity={0.75} />
          <circle cx={-20} cy={40} r={6} fill="#5DA9D6" />
          <rect x={-150} y={92} width={340} height={44} rx={8} fill="none" stroke={C.signal} strokeWidth={4} strokeDasharray="10 8" opacity={zoom} />
        </g>
      </svg>
    </Frame>
  );
};

export const ScanView: React.FC<{w: number; h: number; id: string; value: string; count: number}> = ({w, h, id, value, count}) => (
  <Frame label="CAMERA VIEW · PATROLLING" w={w} h={h}>
    <div style={{position: 'absolute', left: 40, right: 40, top: 110}}>
      <div style={{fontFamily: NUM, fontWeight: 600, fontSize: 84, color: '#fff', lineHeight: 1}}>{id}</div>
      <div style={{display: 'flex', alignItems: 'center', gap: 14, marginTop: 12}}>
        <span style={{fontFamily: UI, fontSize: 40, color: '#fff'}}>{value}</span>
        <span style={{fontFamily: UI, fontWeight: 600, fontSize: 30, color: '#4CD08D'}}>✓ normal</span>
      </div>
      <div style={{fontFamily: UI, fontSize: 24, color: '#9FB0BB', marginTop: 34}}>Checkpoint {count} of 22</div>
    </div>
  </Frame>
);
