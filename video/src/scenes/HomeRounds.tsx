import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {ease, pop, rise, sceneFade} from '../anim';
import {HomeRoom, SPOT} from '../components/HomeRoom';
import {VideoOff} from '../components/Icons';
import {lineStart, scene, sec} from '../timing';
import {C, NUM, UI} from '../theme';

const S = 'homeRounds';
type Pt = {x: number; y: number};

/** Piecewise path of the camera's aim through waypoints at given frames. */
const aimAt = (f: number, keys: {f: number; p: Pt}[]): Pt => {
  if (f <= keys[0].f) return keys[0].p;
  for (let i = 1; i < keys.length; i++) {
    if (f <= keys[i].f) {
      const a = keys[i - 1];
      const b = keys[i];
      const k = ease(f, a.f, b.f - a.f);
      return {x: a.p.x + (b.p.x - a.p.x) * k, y: a.p.y + (b.p.y - a.p.y) * k};
    }
  }
  return keys[keys.length - 1].p;
};

const Row: React.FC<{time: string; text: string; o: number}> = ({time, text, o}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderTop: `1px solid ${C.line}`, opacity: o, transform: `translateY(${(1 - o) * 12}px)`}}>
    <span style={{fontFamily: NUM, fontWeight: 600, fontSize: 26, color: C.muted, width: 70}}>{time}</span>
    <span style={{fontFamily: UI, fontSize: 28, color: C.ink, flex: 1}}>{text}</span>
    <svg width={30} height={30} viewBox="0 0 30 30"><circle cx={15} cy={15} r={14} fill={C.ok} /><path d="M8 15.5 L13 20 L22 10" stroke="#fff" strokeWidth={3.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
  </div>
);

/** At home: PatrolEye on the ceiling makes the rounds and texts the caregiver. */
export const HomeRounds: React.FC = () => {
  const f = useCurrentFrame();
  const dur = sec(scene(S).duration);
  const a = lineStart(S, 'hr1');
  const b = lineStart(S, 'hr2');
  const A = (o: number) => a + sec(o);
  const B = (o: number) => b + sec(o);

  const onHer = A(3.3);
  const onStove = A(4.9);
  const cut = B(-0.5); // 10:12, she is on the floor
  const onFloor = B(0.9);
  const alertAt = B(2.25);
  const footAt = B(3.95);

  const aim = aimAt(f, [
    {f: A(0.3), p: {x: 980, y: 300}},
    {f: A(1.6), p: {x: 300, y: 300}},
    {f: onHer - 4, p: SPOT.sofaHead},
    {f: onStove - 10, p: SPOT.sofaHead},
    {f: onStove + 4, p: SPOT.stove},
    {f: cut + 4, p: SPOT.stove},
    {f: onFloor, p: SPOT.floor},
  ]);
  const camIn = ease(f, sec(0.2), 12);
  const sitO = 1 - ease(f, cut - 8, 8);
  const lieO = ease(f, cut, 8);
  const alertRing = ease(f, onFloor, 8);
  const pulse = Math.abs(Math.sin((f / 30) * 4));

  const checks = [
    {...SPOT.sofaHead, r: 46, tone: 'ok' as const, o: ease(f, onHer + 6, 8) * (1 - ease(f, cut - 8, 8))},
    {...SPOT.stove, r: 52, tone: 'ok' as const, o: ease(f, onStove + 10, 8) * (1 - ease(f, cut - 8, 8))},
    {...SPOT.floor, r: 92, tone: 'alert' as const, o: alertRing},
  ];
  const badge = f < cut ? (f < onStove ? '09:30' : '09:31') : '10:12';
  const phoneIn = ease(f, A(0.6), 16);
  const alertPop = interpolate(pop(f, alertAt), [0, 1], [0.85, 1]);

  return (
    <AbsoluteFill style={{background: C.bg, opacity: sceneFade(f, dur)}}>
      <div style={{position: 'absolute', left: 80, top: 132, transform: 'scale(0.94)', transformOrigin: '0 0'}}>
        {/* two copies of the room: before and after the fall, so the cut is a cross-fade */}
        <div style={{position: 'absolute', opacity: 1}}>
          <HomeRoom draw={ease(f, 0, sec(1.0))} pose="sit" personO={sitO} badge={badge}
            cam={{o: camIn, aim, cone: camIn}} checks={checks} pulse={pulse} />
        </div>
        {lieO > 0 && (
          <div style={{position: 'absolute', opacity: lieO}}>
            <HomeRoom pose="stand" fall={1} badge={badge} cam={{o: 1, aim, cone: 1}} checks={checks} pulse={pulse} />
          </div>
        )}
      </div>

      {/* caregiver's phone: text only */}
      <div style={{position: 'absolute', left: 1300, top: 96, opacity: phoneIn, transform: `translateY(${(1 - phoneIn) * 30}px)`}}>
        <div style={{width: 500, height: 900, borderRadius: 64, background: '#0F1A22', padding: 14, boxShadow: '0 30px 80px rgba(15,26,34,0.28)'}}>
          <div style={{width: 472, height: 872, borderRadius: 52, background: '#fff', overflow: 'hidden', padding: '40px 30px'}}>
            <div style={{fontFamily: UI, fontWeight: 600, fontSize: 22, letterSpacing: 3, color: C.signal}}>CAREGIVER · HOME CHECKS</div>
            <div style={{fontFamily: UI, fontWeight: 700, fontSize: 38, color: C.ink, marginTop: 10}}>Mrs. Lin, 82</div>
            <div style={{fontFamily: UI, fontSize: 24, color: C.muted, marginTop: 2, marginBottom: 18}}>Lives alone · living room and kitchen</div>
            <Row time="09:30" text="Up, on the sofa" o={ease(f, onHer + 10, 10)} />
            <Row time="09:31" text="Stove off" o={ease(f, onStove + 14, 10)} />
            {f >= alertAt - 2 && (
              <div style={{marginTop: 22, borderRadius: 18, background: '#FFF3EA', border: `3px solid ${C.signal}`, padding: '18px 20px', transform: `scale(${alertPop})`, opacity: ease(f, alertAt, 6), transformOrigin: '50% 0'}}>
                <div style={{display: 'flex', alignItems: 'baseline', gap: 12}}>
                  <span style={{fontFamily: NUM, fontWeight: 700, fontSize: 28, color: C.signal}}>10:12</span>
                  <span style={{fontFamily: UI, fontWeight: 600, fontSize: 22, letterSpacing: 2, color: C.signal}}>ALERT</span>
                </div>
                <div style={{fontFamily: UI, fontWeight: 600, fontSize: 31, color: C.ink, lineHeight: 1.2, marginTop: 8}}>On the living-room floor, not moving.</div>
                <div style={{display: 'flex', gap: 12, marginTop: 16}}>
                  <div style={{flex: 1, textAlign: 'center', fontFamily: UI, fontWeight: 600, fontSize: 24, color: '#fff', background: C.ink, borderRadius: 12, padding: '12px 0'}}>Call her</div>
                  <div style={{flex: 1, textAlign: 'center', fontFamily: UI, fontWeight: 600, fontSize: 24, color: '#111', background: C.signal, borderRadius: 12, padding: '12px 0'}}>Send someone</div>
                </div>
              </div>
            )}
            <div style={{display: 'flex', alignItems: 'center', gap: 12, marginTop: 26, ...rise(f, footAt, 14)}}>
              <VideoOff size={44} />
              <span style={{fontFamily: UI, fontWeight: 600, fontSize: 25, color: C.ink, lineHeight: 1.2}}>Text only. No video leaves her home.</span>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
