import React from 'react';
import {C, UI} from '../theme';

const ARC = 38 * ((140 * Math.PI) / 180); // length of the sweep arc (r 38, 140°)
const RING = 2 * Math.PI * 19;

/**
 * Glyph (option A, "sweep lens"): a lens with an orange pupil, and above it the arc the head sweeps on patrol.
 * `sweep` 0 → 1 draws it: the arc first, then the ring, then the pupil pops in.
 */
export const Glyph: React.FC<{size?: number; sweep?: number; light?: boolean}> = ({size = 120, sweep = 1, light = false}) => {
  const ink = light ? '#F2F4F5' : C.ink;
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const arc = clamp(sweep / 0.55);
  const ring = clamp((sweep - 0.2) / 0.55);
  const pupil = clamp((sweep - 0.65) / 0.35);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <path
        d="M14.3 47 A38 38 0 0 1 85.7 47"
        stroke={C.signal}
        strokeWidth={7}
        strokeLinecap="round"
        strokeDasharray={ARC}
        strokeDashoffset={ARC * (1 - arc)}
      />
      <circle
        cx="50"
        cy="60"
        r="19"
        stroke={ink}
        strokeWidth={8}
        strokeDasharray={RING}
        strokeDashoffset={RING * (1 - ring)}
        transform="rotate(-90 50 60)"
      />
      <circle cx="50" cy="60" r={7 * pupil} fill={C.signal} />
    </svg>
  );
};

export const Wordmark: React.FC<{size?: number; sweep?: number; light?: boolean}> = ({size = 120, sweep = 1, light = false}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: size * 0.2}}>
    <Glyph size={size * 1.6} sweep={sweep} light={light} />
    <div style={{fontFamily: UI, fontWeight: 700, fontSize: size, color: light ? '#F2F4F5' : C.ink, letterSpacing: -size * 0.015, lineHeight: 1}}>
      Patrol<span style={{color: C.signal}}>Eye</span>
    </div>
  </div>
);
