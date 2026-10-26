import {Easing, interpolate, spring} from 'remotion';
import {FPS} from './timing';

/** 0 → 1 over `dur` frames starting at `from`, eased. */
export const ease = (frame: number, from: number, dur = 18) =>
  interpolate(frame, [from, from + dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });

export const pop = (frame: number, from: number) =>
  spring({frame: frame - from, fps: FPS, config: {damping: 200, stiffness: 120}});

/** Fade + rise style for an element that appears at `from`. */
export const rise = (frame: number, from: number, dist = 24, dur = 18) => {
  const t = ease(frame, from, dur);
  return {opacity: t, transform: `translateY(${(1 - t) * dist}px)`};
};

/** Fade the whole scene out over its last frames. */
export const sceneFade = (frame: number, duration: number, out = 10, inn = 8) =>
  Math.min(
    interpolate(frame, [0, inn], [0, 1], {extrapolateRight: 'clamp'}),
    interpolate(frame, [duration - out, duration], [1, 0], {extrapolateLeft: 'clamp'}),
  );
