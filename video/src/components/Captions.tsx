import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ease} from '../anim';
import {FPS, scenes} from '../timing';
import {C, UI} from '../theme';

/** Per scene: no captions where the big on-screen type already says the line. */
const STYLE: Record<string, 'off' | 'light' | 'dark' | 'darkLeft' | 'lightLeft'> = {
  hook: 'light',
  homeProblem: 'light',
  options: 'light',
  proto: 'darkLeft',
  editions: 'light',
  plant: 'light',
  bench: 'dark',
  homeRounds: 'lightLeft', // under the room drawing, clear of the caregiver's phone on the right
  homeAsk: 'darkLeft',
  how: 'light',
  close: 'off',
};

export const Captions: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const sc = scenes.find((s) => t >= s.start && t < s.start + s.duration);
  if (!sc || STYLE[sc.id] === 'off') return null;
  const local = t - sc.start;
  const line = sc.lines.find((l) => local >= l.start - 0.05 && local < l.start + l.duration + 0.35);
  if (!line) return null;
  const inF = Math.round((sc.start + line.start) * FPS);
  const o = ease(f, inF - 2, 6);
  const style = STYLE[sc.id];
  const dark = style === 'dark' || style === 'darkLeft';
  const left = style === 'darkLeft' || style === 'lightLeft';
  const padLeft = style === 'lightLeft' ? 96 : 72;
  const maxWidth = style === 'lightLeft' ? 1000 : left ? 1020 : 1500;
  return (
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: left ? 'flex-start' : 'center', paddingBottom: 64, paddingLeft: left ? padLeft : 0, pointerEvents: 'none'}}>
      <div
        style={{
          opacity: o,
          maxWidth,
          padding: '14px 28px',
          borderRadius: 10,
          background: dark ? 'rgba(15,26,34,0.78)' : 'rgba(247,248,249,0.92)',
          color: dark ? '#FFFFFF' : C.ink,
          fontFamily: UI,
          fontWeight: 500,
          fontSize: 40,
          lineHeight: 1.25,
          textAlign: left ? 'left' : 'center',
        }}
      >
        {line.text}
      </div>
    </AbsoluteFill>
  );
};
