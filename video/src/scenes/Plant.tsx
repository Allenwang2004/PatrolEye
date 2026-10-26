import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {ease, rise, sceneFade} from '../anim';
import {GaugeView, PuddleView, ScanView} from '../components/Closeup';
import {Mic} from '../components/Icons';
import {CHECKPOINTS, cp, FE_DOOR, PUDDLE, PumpRoom} from '../components/PumpRoom';
import {FPS, lineStart, scene, sec} from '../timing';
import {C, NUM, UI} from '../theme';

const S = 'plant';
const PANEL_X = 1250;
const PANEL_W = 610;

const Card: React.FC<{tone: 'ok' | 'alert' | 'ink'; time: string; title: string; detail: string; style?: React.CSSProperties}> = ({tone, time, title, detail, style}) => (
  <div style={{background: '#fff', borderRadius: 14, padding: '18px 22px', borderLeft: `8px solid ${tone === 'alert' ? C.signal : tone === 'ok' ? C.ok : C.ink}`, boxShadow: '0 10px 30px rgba(15,26,34,0.08)', ...style}}>
    <div style={{display: 'flex', alignItems: 'baseline', gap: 14}}>
      <span style={{fontFamily: NUM, fontWeight: 600, fontSize: 28, color: C.muted}}>{time}</span>
      <span style={{fontFamily: UI, fontWeight: 600, fontSize: 30, color: C.ink}}>{title}</span>
    </div>
    <div style={{fontFamily: UI, fontSize: 25, color: C.muted, marginTop: 6}}>{detail}</div>
  </div>
);

export const Plant: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const dur = sec(scene(S).duration);
  // f3-f5 were cut for time: their anchors fall past the end of the scene, so those beats never start
  const L = (id: string, off = 0) => (scene(S).lines.some((l) => l.id === id) ? lineStart(S, id, off) : 1e6);

  // timeline anchors (frames)
  const sweep0 = L('f1', 0.5);
  const sweep1 = L('f1', 6.4);
  const alertAt = L('f2');
  const leakAt = L('f3');
  const feAt = L('f3', 9.0);
  const askAt = L('f4');
  const ansAt = L('f5');

  const visited = interpolate(f, [sweep0, sweep1], [0, CHECKPOINTS.length], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const idx = Math.min(CHECKPOINTS.length - 1, Math.floor(visited));
  const cur = CHECKPOINTS[idx];
  const nxt = CHECKPOINTS[Math.min(CHECKPOINTS.length - 1, idx + 1)];
  const k = visited - idx;
  const sweeping = f >= sweep0 && f < sweep1 + 6;
  const pt102 = cp('PT-102');

  let cone: {x: number; y: number; o: number} | null = null;
  if (sweeping) cone = {x: cur.x + (nxt.x - cur.x) * k, y: cur.y + (nxt.y - cur.y) * k, o: 1};
  if (f >= sweep1 + 6 && f < leakAt) cone = {x: pt102.x, y: pt102.y, o: ease(f, alertAt - 6, 10)};
  if (f >= leakAt && f < askAt) {
    const turn = ease(f, L('f3', 5.0), 16);
    cone = {x: pt102.x + (PUDDLE.x - pt102.x) * turn, y: pt102.y + (PUDDLE.y - pt102.y) * turn, o: turn};
  }

  const alertShown = f >= sweep0 + ((CHECKPOINTS.findIndex((c) => c.id === 'PT-102') + 1) / CHECKPOINTS.length) * (sweep1 - sweep0);
  const clock = f < leakAt - sec(1.5) ? '02:00' : f < feAt ? '03:00' : f < askAt - sec(1.2) ? '05:20' : '06:40';
  const puddle = ease(f, leakAt, sec(2));
  const feMove = ease(f, feAt + sec(0.6), sec(1.6));
  const pulse = Math.abs(Math.sin(t * 4));

  const ansLines = [
    {at: L('f5', 1.2), text: 'PT-102 ran high, 02:00 to 03:10. Peak 7.8 bar, normal since.', tone: C.signal},
    {at: L('f5', 2.5), text: 'New puddle under pump P-3 since 03:00. Still there.', tone: C.signal},
    {at: L('f5', 3.9), text: 'Fire extinguisher FE-2 is off its bracket. Now by the east door.', tone: C.signal},
  ];
  const callouts = [
    {x: pt102.x + 26, y: pt102.y - 4, label: '7.8 bar', tone: 'alert' as const, o: ease(f, ansLines[0].at, 8)},
    {x: PUDDLE.x + 30, y: PUDDLE.y - 50, label: 'Leak', tone: 'alert' as const, o: ease(f, ansLines[1].at, 8)},
    {x: FE_DOOR.x - 170, y: FE_DOOR.y - 20, label: 'FE-2 moved', tone: 'alert' as const, o: ease(f, ansLines[2].at, 8)},
  ];

  // right panel modes
  const phase = f < alertAt ? 'scan' : f < leakAt ? 'gauge' : f < askAt - sec(0.8) ? 'leak' : 'ask';
  const insetW = PANEL_W;
  const insetH = 360;

  return (
    <AbsoluteFill style={{background: C.bg, opacity: sceneFade(f, dur)}}>
      <div style={{position: 'absolute', left: 80, top: 132, transform: 'scale(0.94)', transformOrigin: '0 0'}}>
        <PumpRoom
          draw={ease(f, 0, sec(2.2))}
          visited={f >= askAt ? 0 : visited}
          cone={f >= askAt ? null : cone}
          alerts={alertShown && f < askAt ? ['PT-102'] : []}
          puddle={puddle}
          diffBox={f < askAt ? ease(f, L('f3', 2.6), 8) * (1 - ease(f, askAt - 10, 8)) : 0}
          feMove={feMove}
          callouts={callouts}
          clock={clock}
          pulse={pulse}
        />
      </div>

      {/* right panel */}
      <div style={{position: 'absolute', left: PANEL_X, top: 74, width: PANEL_W}}>
        {phase === 'scan' && (
          <div style={rise(f, sweep0 - 6, 16)}>
            <ScanView w={insetW} h={insetH} id={cur.id} value={cur.id === 'PT-102' ? '7.8 bar' : cur.value} count={idx + 1} />
            <Card style={{marginTop: 26, ...rise(f, sweep0, 16)}} tone="ink" time="02:00" title={`Hourly round · ${Math.min(22, Math.floor(visited))} / 22`} detail="Gauges, valves, lights, extinguisher" />
            {f >= sweep1 && <Card style={{marginTop: 18, ...rise(f, sweep1, 16)}} tone="alert" time="02:00" title="21 normal · 1 out of range" detail="No one walked the floor" />}
          </div>
        )}
        {phase === 'gauge' && (
          <div>
            <GaugeView w={insetW} h={insetH} zoom={ease(f, L('f2', 1.9), sec(1.2))} value={7.8} read={ease(f, L('f2', 3.6), 10)} tag="PT-102" />
            <Card style={{marginTop: 26, ...rise(f, L('f2', 4.5), 18)}} tone="alert" time="02:00" title="PT-102 discharge: 7.8 bar" detail="Above the 7.0 bar limit · Pump P-2" />
            <div style={{marginTop: 18, display: 'flex', alignItems: 'center', gap: 16, background: C.ink, color: '#fff', borderRadius: 14, padding: '16px 22px', ...rise(f, L('f2', 5.3), 18)}}>
              <span style={{width: 12, height: 12, borderRadius: 6, background: C.signal}} />
              <span style={{fontFamily: UI, fontSize: 26}}>Sent to shift lead · text only</span>
            </div>
          </div>
        )}
        {phase === 'leak' && (
          <div>
            <div style={{opacity: ease(f, L('f3', 5.4), 10)}}>
              <PuddleView w={insetW} h={insetH} zoom={ease(f, L('f3', 5.6), sec(1.2))} />
            </div>
            <Card style={{marginTop: 26, ...rise(f, L('f3', 2.6), 16)}} tone="ink" time="03:00" title="Changed since 02:00" detail="Floor area under pump P-3" />
            <Card style={{marginTop: 18, ...rise(f, L('f3', 7.4), 16)}} tone="alert" time="03:00" title="New puddle under P-3" detail="Not there at 02:00 · likely seal leak" />
            {f >= feAt && <Card style={{marginTop: 18, ...rise(f, feAt + sec(0.6), 16)}} tone="ink" time="05:20" title="FE-2 left its bracket" detail="Logged, tracked to the east door" />}
          </div>
        )}
        {phase === 'ask' && (
          <div style={{background: '#fff', borderRadius: 34, padding: '30px 30px 34px', boxShadow: '0 18px 50px rgba(15,26,34,0.12)', ...rise(f, askAt - sec(0.6), 20)}}>
            <div style={{fontFamily: UI, fontWeight: 600, fontSize: 26, color: C.muted, letterSpacing: 2}}>PUMP ROOM 2 · 06:40</div>
            <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: 36, ...rise(f, L('f4', 1.6), 16)}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 12, background: C.ink, color: '#fff', borderRadius: 22, padding: '16px 24px', fontFamily: UI, fontSize: 32}}>
                <Mic size={34} color="#fff" />
                What changed overnight?
              </div>
            </div>
            <div style={{marginTop: 30, background: C.panel, borderRadius: 22, padding: '22px 26px', ...rise(f, ansAt, 16)}}>
              <div style={{fontFamily: UI, fontWeight: 600, fontSize: 30, color: C.ink}}>Three things since 22:00:</div>
              {ansLines.map((l) => (
                <div key={l.text} style={{display: 'flex', gap: 14, marginTop: 18, ...rise(f, l.at, 14)}}>
                  <span style={{width: 12, height: 12, borderRadius: 6, background: l.tone, marginTop: 13, flexShrink: 0}} />
                  <span style={{fontFamily: UI, fontSize: 29, color: C.ink, lineHeight: 1.3}}>{l.text}</span>
                </div>
              ))}
              <div style={{fontFamily: UI, fontSize: 24, color: C.muted, marginTop: 22, ...rise(f, L('f5', 5.4), 12)}}>Everything else normal across 9 rounds.</div>
            </div>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
