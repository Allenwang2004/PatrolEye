import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ease, rise, sceneFade} from '../anim';
import {CamView, Gauge, Robot} from '../components/Icons';
import {lineStart, scene, sec} from '../timing';
import {C, UI} from '../theme';

const S = 'options';

export const Options: React.FC = () => {
  const f = useCurrentFrame();
  const dur = sec(scene(S).duration);
  const cards = [
    {line: 'o1', title: 'A sensor on every gauge', pain: '$1,800–2,500 per point', Icon: Gauge},
    {line: 'o2', title: 'Patrol robots', pain: '≈ $100,000 each', Icon: Robot},
    // o3: "Today's AI cameras spot people and pets, | but judging danger needs a GPU-class model." (pause 2.88–3.35 s)
    {line: 'o3', title: 'AI cameras', pain: 'People and pets only', Icon: CamView, strikeAt: 3.4},
  ].map((c: {line: string; title: string; pain: string; Icon: typeof Gauge; strikeAt?: number}) => ({...c, at: lineStart(S, c.line)}));
  const current = cards.reduce((acc, c, i) => (f >= c.at ? i : acc), -1);
  return (
    <AbsoluteFill style={{background: C.bg, opacity: sceneFade(f, dur), padding: '140px 150px'}}>
      <div style={{fontFamily: UI, fontWeight: 600, fontSize: 28, letterSpacing: 4, color: C.signal, ...rise(f, 0)}}>THE ALTERNATIVES</div>
      <div style={{fontFamily: UI, fontWeight: 600, fontSize: 72, color: C.ink, marginTop: 12, ...rise(f, 4)}}>Each one breaks somewhere.</div>
      <div style={{display: 'flex', gap: 48, marginTop: 90}}>
        {cards.map((c, i) => {
          const on = i === current;
          const strike = ease(f, c.at + sec(c.strikeAt ?? 1.4), 14);
          return (
            <div
              key={c.title}
              style={{
                flex: 1,
                background: C.panel,
                borderRadius: 16,
                padding: '48px 44px',
                borderTop: `8px solid ${on ? C.signal : C.line}`,
                boxShadow: on ? '0 18px 50px rgba(15,26,34,0.12)' : 'none',
                ...rise(f, c.at, 40, 20),
              }}
            >
              <c.Icon size={120} />
              <div style={{fontFamily: UI, fontWeight: 600, fontSize: 46, color: C.ink, marginTop: 30}}>{c.title}</div>
              <div style={{position: 'relative', display: 'inline-block', marginTop: 14}}>
                <div style={{fontFamily: UI, fontWeight: 500, fontSize: 34, color: C.alert}}>{c.pain}</div>
                <div style={{position: 'absolute', left: 0, bottom: -10, height: 4, width: `${strike * 100}%`, background: C.alert, borderRadius: 2}} />
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
