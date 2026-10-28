import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ease, sceneFade} from '../anim';
import {HomeRoom, SPOT} from '../components/HomeRoom';
import {PhoneFrame, Push, Screen, Tap} from '../components/PhoneApp';
import {lineStart, scene, sec} from '../timing';
import {C} from '../theme';

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

/** At home: PatrolEye on the ceiling makes the rounds; the caregiver's PatrolEye app gets the alert. */
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
  const bannerAt = B(2.0); // "...the caregiver gets an alert right away"
  const tapAt = B(3.75); // opens it: the alert is words, no live video

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
  const banner = ease(f, bannerAt, 6);
  const push = ease(f, tapAt + 3, 10);

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

      {/* caregiver's phone: the PatrolEye app's own screens (app/, web build), sample data */}
      <div style={{position: 'absolute', left: 1336, top: 46, opacity: phoneIn, transform: `translateY(${(1 - phoneIn) * 30}px)`}}>
        <PhoneFrame time={f < cut ? (f < onStove ? '9:30' : '9:31') : '10:12'}>
          <Push
            k={push}
            from={<>
              <Screen name="r1_cameras" />
              {banner > 0 && <Screen name="r2_alert" style={{opacity: banner}} />}
            </>}
            to={<Screen name="r3_detail" />}
          />
          <Tap x={195} y={36} at={tapAt} />
        </PhoneFrame>
      </div>
    </AbsoluteFill>
  );
};
