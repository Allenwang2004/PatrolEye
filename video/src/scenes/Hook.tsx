import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {ease, rise, sceneFade} from '../anim';
import {Clipboard} from '../components/Icons';
import {PumpRoom} from '../components/PumpRoom';
import {lineStart, scene, sec} from '../timing';
import {C, NUM, UI} from '../theme';

const S = 'hook';

type Row = {id: string; v: string; at: number; issue?: 'skipped' | 'mistyped' | 'late'};

export const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const dur = sec(scene(S).duration);
  const h1 = lineStart(S, 'h1');
  const h2 = lineStart(S, 'h2');
  const h3 = lineStart(S, 'h3');
  const walk = interpolate(f, [h2, h3 + sec(3)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const rows: Row[] = [
    {id: 'PT-101', v: '5.2', at: h2 + sec(0.4)},
    {id: 'PT-102', v: '—', at: h2 + sec(1.0), issue: 'skipped'},
    {id: 'PS-101', v: '1.1', at: h2 + sec(1.6)},
    {id: 'PI-203', v: '41', at: h2 + sec(2.2), issue: 'mistyped'},
    {id: 'V-12', v: 'open', at: h2 + sec(2.8)},
    {id: 'P-3 floor', v: 'leak, seen 08:10', at: h2 + sec(3.4), issue: 'late'},
  ];
  const issueAt: Record<string, number> = {skipped: h3 + sec(0.4), mistyped: h3 + sec(1.6), late: h3 + sec(3.1)};
  const label: Record<string, string> = {skipped: 'skipped', mistyped: 'mistyped', late: 'hours late'};
  return (
    <AbsoluteFill style={{background: C.bg, opacity: sceneFade(f, dur)}}>
      <div style={{position: 'absolute', left: 80, top: 132, transform: 'scale(0.94)', transformOrigin: '0 0'}}>
        <PumpRoom draw={ease(f, h1, sec(3.2))} camera={false} operator={f >= h2 ? walk : null} clock="02:00" />
      </div>
      {/* "not connected" tags on the instruments while h1 plays */}
      <div style={{position: 'absolute', left: 1250, top: 132, width: 610}}>
        <div style={{fontFamily: UI, fontWeight: 600, fontSize: 28, letterSpacing: 4, color: C.signal, ...rise(f, h1 + sec(1.5))}}>NOT CONNECTED</div>
        <div style={{fontFamily: UI, fontWeight: 600, fontSize: 52, color: C.ink, lineHeight: 1.12, marginTop: 10, ...rise(f, h1 + sec(2))}}>22 gauges, valves and lights. No wires to a control room.</div>
        <div style={{marginTop: 40, background: '#fff', borderRadius: 16, padding: '22px 26px', boxShadow: '0 10px 30px rgba(15,26,34,0.08)', ...rise(f, h2, 20)}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
            <Clipboard size={46} ticks={0} />
            <span style={{fontFamily: UI, fontWeight: 600, fontSize: 30, color: C.ink}}>Night round · 02:00</span>
          </div>
          {rows.map((r) => {
            const bad = r.issue && f >= issueAt[r.issue];
            return (
              <div key={r.id} style={{display: 'flex', alignItems: 'center', gap: 16, marginTop: 14, ...rise(f, r.at, 10, 10)}}>
                <span style={{fontFamily: NUM, fontWeight: 600, fontSize: 28, color: C.muted, width: 130}}>{r.id}</span>
                <span style={{fontFamily: UI, fontStyle: 'italic', fontSize: 30, color: bad ? C.alert : '#2B4C9B', flex: 1}}>{r.v}</span>
                {r.issue && (
                  <span style={{fontFamily: UI, fontWeight: 600, fontSize: 22, color: '#fff', background: C.alert, borderRadius: 999, padding: '4px 14px', opacity: ease(f, issueAt[r.issue], 8)}}>{label[r.issue]}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
