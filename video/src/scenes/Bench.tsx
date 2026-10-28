import React from 'react';
import {AbsoluteFill, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {ease, sceneFade} from '../anim';
import {lineStart, scene, sec} from '../timing';
import {C, UI} from '../theme';

const S = 'bench';

/** Shots (scene seconds) from one real run on the test bench (run 20261014_084053).
 *  wide, sees: camera footage (camera = board - 14.5 s, machine = board - 8 s).
 *  inject, alert, overview: the bench's own pages (station 1 and the plant control room, bench/static/monitor.html)
 *  redrawn frame by frame from that run's log by bench/replay/capture.js; `from` in the comments is seconds into the run. */
const SHOTS = {
  wide: {at: 0.0, len: 3.4, src: 'real/bench_cam_86_126.mp4', from: 9.5}, // the head swings to PT-101 at +2.5 s
  inject: {at: 3.4, len: 2.6, src: 'real/replay_inject.mp4', from: 0}, // run 104.85 s: PT-101 needle climbs into the red at +1.55 s
  sees: {at: 6.0, len: 3.0, src: 'real/bench_mach_104_140.mp4', from: 0.6}, // turns onto PT-101, needle in the red
  alert: {at: 9.0, len: 2.4, src: 'real/replay_alert.mp4', from: 0}, // run 148.1 s: PatrolEye's PT-101 alert lands at +0.4 s
  overview: {at: 11.4, len: 4.812, src: 'real/replay_overview.mp4', from: 0}, // run 286.9 s: three alerts, patrol log
};
// boxes on the 1920 x 1080 control-room page (bench/replay_out/boxes.json)
const BOX = {
  log: {x: 876, y: 366, w: 980, h: 640},
  sent: {x: 1449, y: 160, w: 407, h: 178},
  alerts: {x: 64, y: 430, w: 784, h: 312},
};

const Shot: React.FC<{s: {at: number; len: number; src: string; from: number}; filter?: string; children?: React.ReactNode; zoom?: {k: number; ox: number; oy: number}}> = ({s, filter, children, zoom}) => {
  const local = useCurrentFrame() - sec(s.at);
  const k = zoom ? interpolate(local, [0, sec(s.len)], [1, zoom.k], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1;
  return (
    <Sequence from={sec(s.at)} durationInFrames={sec(s.len) + 6} layout="none">
      <AbsoluteFill style={{opacity: Math.max(0, Math.min(1, local / 6))}}>
        <AbsoluteFill style={{transform: `scale(${k})`, transformOrigin: zoom ? `${zoom.ox}px ${zoom.oy}px` : '50% 50%'}}>
          <OffthreadVideo src={staticFile(s.src)} startFrom={sec(s.from)} muted style={{width: '100%', height: '100%', objectFit: 'cover', filter}} />
        </AbsoluteFill>
        {children}
      </AbsoluteFill>
    </Sequence>
  );
};

const Chip: React.FC<{text: string; o?: number; light?: boolean; style?: React.CSSProperties}> = ({text, o = 1, light, style}) => (
  <div style={{position: 'absolute', display: 'flex', alignItems: 'center', gap: 12, background: light ? 'rgba(247,248,249,0.96)' : 'rgba(15,26,34,0.78)', borderRadius: 999, padding: '10px 22px', opacity: o, ...style}}>
    <span style={{width: 12, height: 12, borderRadius: 6, background: C.signal}} />
    <span style={{fontFamily: UI, fontWeight: 600, fontSize: 24, letterSpacing: 2, color: light ? C.ink : '#fff'}}>{text}</span>
  </div>
);

export const Bench: React.FC = () => {
  const f = useCurrentFrame();
  const dur = sec(scene(S).duration);
  const b2 = lineStart(S, 'b2'); // "This is the plant edition's control room: | here you see every reading and alert, as text, | and every fault it caught."
  const ring = (t: {x: number; y: number; w: number; h: number}, at: number) => {
    const o = ease(f, at, 8);
    return <rect x={t.x - 6} y={t.y - 6} width={t.w + 12} height={t.h + 12} rx={20} fill="none" stroke={C.signal} strokeWidth={7} opacity={o} />;
  };
  const replay = f >= sec(SHOTS.inject.at) && f < sec(SHOTS.sees.at) + 3 ? true : f >= sec(SHOTS.alert.at) + 3;
  return (
    <AbsoluteFill style={{background: '#0B1319', opacity: sceneFade(f, dur, 10, 6)}}>
      <Shot s={SHOTS.wide} filter="brightness(1.18) contrast(1.08)">
        <Chip text="TEST BENCH · THREE SCREENS PLAY A PUMP ROOM" style={{left: 72, top: 60}} />
      </Shot>
      <Shot s={SHOTS.inject} zoom={{k: 1.04, ox: 540, oy: 600}}>
        <Chip text="A FAULT IS INJECTED · PT-101 PRESSURE" style={{right: 72, top: 60}} />
      </Shot>
      <Shot s={SHOTS.sees}>
        <Chip text="WHAT PATROLEYE SEES · IT TURNS AND READS PT-101" style={{left: 72, top: 60}} />
      </Shot>
      <Shot s={SHOTS.alert} />
      <Shot s={SHOTS.overview}>
        <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
          {ring(BOX.log, b2 + sec(3.0))}
          {ring(BOX.sent, b2 + sec(4.5))}
          {ring(BOX.alerts, b2 + sec(5.7))}
        </svg>
        {/* bench results, in the empty part of the alerts column (clear of the two-line caption) */}
        <Chip text="ON THE BENCH: 3 / 3 FAULTS FOUND" light o={ease(f, b2 + sec(5.8), 8)} style={{left: 96, top: 768}} />
        <Chip text="AVERAGE GAUGE ERROR 1.2 % OF FULL SCALE" light o={ease(f, b2 + sec(6.1), 8)} style={{left: 96, top: 828}} />
      </Shot>
      {/* honest label across the whole segment */}
      <div style={{position: 'absolute', right: 40, bottom: 26, fontFamily: UI, fontWeight: 600, fontSize: 20, letterSpacing: 2, color: '#fff', background: 'rgba(15,26,34,0.6)', borderRadius: 8, padding: '6px 14px'}}>
        {replay ? 'REAL RUN DATA · EDITED FOR TIME' : 'REAL RUN · EDITED FOR TIME'}
      </div>
    </AbsoluteFill>
  );
};
