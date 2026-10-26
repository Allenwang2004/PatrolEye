import type { MaskRect, Scan } from '@/lib/types';

/** A rectangle in panorama pixels. x0 < x1, y0 < y1. */
export type PixelRect = { x0: number; y0: number; x1: number; y1: number };

type Geometry = Pick<Scan, 'pan0' | 'tilt1' | 'px_per_deg' | 'width' | 'height'>;

// ARCHITECTURE.md: pan = pan0 + x / px_per_deg, tilt = tilt1 - y / px_per_deg (tilt up is positive)

export function pixelToAngles(r: PixelRect, s: Geometry): MaskRect {
  return {
    pan0: s.pan0 + r.x0 / s.px_per_deg,
    pan1: s.pan0 + r.x1 / s.px_per_deg,
    tilt0: s.tilt1 - r.y1 / s.px_per_deg,
    tilt1: s.tilt1 - r.y0 / s.px_per_deg,
  };
}

export function anglesToPixel(m: MaskRect, s: Geometry): PixelRect {
  return clampRect(
    {
      x0: (m.pan0 - s.pan0) * s.px_per_deg,
      x1: (m.pan1 - s.pan0) * s.px_per_deg,
      y0: (s.tilt1 - m.tilt1) * s.px_per_deg,
      y1: (s.tilt1 - m.tilt0) * s.px_per_deg,
    },
    s,
  );
}

export function normalizeRect(ax: number, ay: number, bx: number, by: number): PixelRect {
  return { x0: Math.min(ax, bx), y0: Math.min(ay, by), x1: Math.max(ax, bx), y1: Math.max(ay, by) };
}

export function clampRect(r: PixelRect, s: Pick<Scan, 'width' | 'height'>): PixelRect {
  const cx = (v: number) => Math.min(Math.max(v, 0), s.width);
  const cy = (v: number) => Math.min(Math.max(v, 0), s.height);
  return { x0: cx(r.x0), y0: cy(r.y0), x1: cx(r.x1), y1: cy(r.y1) };
}
