import React from 'react';
import {AbsoluteFill, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {ease, sceneFade} from '../anim';
import {lineStart, scene, sec} from '../timing';
import {C, UI} from '../theme';

const S = 'bench';

/** Shots (scene seconds) cut from one real run on the test bench (camera, PatrolEye's view, control-room tablet).
 *  Clip sync: machine = board - 8 s, camera = board - 14.5 s. */
const SHOTS = {
  wide: {at: 0.0, len: 3.8, src: 'real/bench_cam_86_126.mp4', from: 9.5}, // the head swings to PT-101 at +2.5 s
  open: {at: 3.8, len: 2.8, src: 'real/bench_board_88_102.mp4', from: 7.0}, // PT-101 row appears at +1.0 s
  sees: {at: 6.6, len: 3.0, src: 'real/bench_mach_104_140.mp4', from: 0.6}, // turns onto PT-101, needle in the red
  found: {at: 9.6, len: 2.2, src: 'real/bench_board_128_148.mp4', from: 10.2}, // FOUND toast fades in at +0.2 s
  kpi: {at: 11.8, len: 4.8, src: 'real/bench_board_236_287.mp4', from: 43.5}, // 3 / 3 found, 1.2 %, 0 images
};
// KPI tiles on the 1920 x 1080 board frame
const TILES = {
  found: {x: 64, y: 166, w: 350, h: 177},
  error: {x: 769, y: 166, w: 317, h: 177},
  recv: {x: 1379, y: 166, w: 476, h: 177},
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

const Chip: React.FC<{text: string; o?: number; style?: React.CSSProperties}> = ({text, o = 1, style}) => (
  <div style={{position: 'absolute', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(15,26,34,0.78)', borderRadius: 999, padding: '10px 22px', opacity: o, ...style}}>
    <span style={{width: 12, height: 12, borderRadius: 6, background: C.signal}} />
    <span style={{fontFamily: UI, fontWeight: 600, fontSize: 24, letterSpacing: 2, color: '#fff'}}>{text}</span>
  </div>
);

export const Bench: React.FC = () => {
  const f = useCurrentFrame();
  const dur = sec(scene(S).duration);
  const b2 = lineStart(S, 'b2');
  const kpi0 = sec(SHOTS.kpi.at);
  const ring = (t: {x: number; y: number; w: number; h: number}, at: number) => {
    const o = ease(f, at, 8);
    return <rect x={t.x - 6} y={t.y - 6} width={t.w + 12} height={t.h + 12} rx={20} fill="none" stroke={C.signal} strokeWidth={7} opacity={o} />;
  };
  return (
    <AbsoluteFill style={{background: '#0B1319', opacity: sceneFade(f, dur, 10, 6)}}>
      <Shot s={SHOTS.wide} filter="brightness(1.18) contrast(1.08)">
        <Chip text="TEST BENCH · THREE SCREENS PLAY A PUMP ROOM" style={{left: 72, top: 60}} />
      </Shot>
      <Shot s={SHOTS.open} zoom={{k: 1.35, ox: 64, oy: 470}}>
        <Chip text="A FAULT IS INJECTED · PT-101 PRESSURE" style={{left: 72, top: 60}} />
      </Shot>
      <Shot s={SHOTS.sees}>
        <Chip text="WHAT PATROLEYE SEES · IT TURNS AND READS PT-101" style={{left: 72, top: 60}} />
      </Shot>
      <Shot s={SHOTS.found} />
      <Shot s={SHOTS.kpi}>
        <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
          {ring(TILES.found, kpi0 + 6)}
          {ring(TILES.error, b2 + sec(2.6))}
          {ring(TILES.recv, b2 + sec(5.1))}
        </svg>
      </Shot>
      {/* honest label across the whole segment */}
      <div style={{position: 'absolute', right: 40, bottom: 26, fontFamily: UI, fontWeight: 600, fontSize: 20, letterSpacing: 2, color: '#fff', background: 'rgba(15,26,34,0.6)', borderRadius: 8, padding: '6px 14px'}}>
        REAL RUN · EDITED FOR TIME
      </div>
    </AbsoluteFill>
  );
};
