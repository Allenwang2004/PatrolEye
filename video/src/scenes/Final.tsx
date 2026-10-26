import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ease, rise, sceneFade} from '../anim';
import {Drop, Flame, Gauge} from '../components/Icons';
import {Glyph, Wordmark} from '../components/Logo';
import {lineStart, scene, sec} from '../timing';
import {C, UI} from '../theme';

const S = 'close';

export const Final: React.FC<{githubUrl: string}> = ({githubUrl}) => {
  const f = useCurrentFrame();
  const dur = sec(scene(S).duration);
  const c1 = lineStart(S, 'c1');
  const c2 = lineStart(S, 'c2');
  const c3 = lineStart(S, 'c3');
  // c1: "One camera | that catches danger early, | so nobody has to watch."
  const items = [
    {t: 'A pressure past its limit', Icon: Gauge, at: c1 + sec(1.0)},
    {t: 'A slow leak', Icon: Drop, at: c1 + sec(1.45)},
    {t: 'A stove left on', Icon: Flame, at: c1 + sec(1.9)},
  ];
  const brand = ease(f, c2 - 8, 16);
  return (
    <AbsoluteFill style={{background: C.bg, opacity: sceneFade(f, dur, 20)}}>
      {/* one camera that catches danger early */}
      <AbsoluteFill style={{opacity: 1 - brand, alignItems: 'center', justifyContent: 'center', gap: 64}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 30, ...rise(f, c1, 20)}}>
          <Glyph size={110} />
          <span style={{fontFamily: UI, fontWeight: 600, fontSize: 64, color: C.ink}}>One camera that catches danger early</span>
        </div>
        <div style={{display: 'flex', gap: 60}}>
          {items.map((it) => {
            const ok = ease(f, it.at + sec(0.45), 8);
            return (
              <div key={it.t} style={{position: 'relative', width: 400, background: C.panel, borderRadius: 16, padding: '34px 30px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, ...rise(f, it.at, 24)}}>
                <it.Icon size={96} />
                <div style={{fontFamily: UI, fontWeight: 600, fontSize: 34, color: C.ink, textAlign: 'center'}}>{it.t}</div>
                <div style={{position: 'absolute', right: 18, top: 18, width: 44, height: 44, borderRadius: 22, background: C.ok, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: ok, transform: `scale(${0.6 + 0.4 * ok})`}}>
                  <svg width={24} height={24} viewBox="0 0 24 24"><path d="M5 12.5 L10 17 L19 7" fill="none" stroke="#fff" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{fontFamily: UI, fontWeight: 500, fontSize: 40, color: C.muted, ...rise(f, c1 + sec(2.7), 14)}}>so nobody has to watch</div>
      </AbsoluteFill>

      {/* brand */}
      <AbsoluteFill style={{opacity: brand, alignItems: 'center', justifyContent: 'center'}}>
        <Wordmark size={150} sweep={ease(f, c2 - 8, 26)} />
        <div style={{display: 'flex', gap: 28, marginTop: 56, fontFamily: UI, fontSize: 54, fontWeight: 500, color: C.ink}}>
          <span style={rise(f, c3, 18)}>Private at home.</span>
          <span style={{...rise(f, c3 + sec(1.3), 18), color: C.muted}}>Confidential at work.</span>
        </div>
        <div style={{position: 'absolute', bottom: 90, fontFamily: UI, fontSize: 30, color: C.muted, ...rise(f, c3 + sec(2.2), 10)}}>{githubUrl}</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
