"""How far the compact head may tilt before the device itself enters the camera's frame.

For each pan angle (0..180 deg in 5 deg steps; the body is symmetric left/right, so only |pan| matters)
this finds the lowest tilt at which no ray of the frame (Camera Module 3 standard, 66 x 41 deg) hits the
body, the pedestal / turret or the U bracket. Desk mount; negative tilt = down. A 1 deg margin is added.
Hung from the ceiling the same numbers apply with the sign flipped (the ceiling plate never binds).

    python3 tilt_limits.py        -> tilt_limits.json

Camera software: min_tilt = interpolate(table, abs(pan) / 5) and never tilt below it. The global scan uses
the same floor, so the panorama never shows the device.
Units: mm; x right, y front, z up; origin = pan axis at the bottom of the body."""
import json
import math
from pathlib import Path

import numpy as np

from design import build_p5, build_v2

HERE = Path(__file__).resolve().parent
HF, VF, LENS = 66.0, 41.0, 23.0          # camera FOV; lens front, mm ahead of the tilt axis
N = 61                                  # rays per side of the frame
MARGIN = 1.0


def hit_box(o, d, b):
    with np.errstate(divide='ignore', invalid='ignore'):
        inv = 1.0 / d
        lo = (np.array(b[0::2]) - o) * inv
        hi = (np.array(b[1::2]) - o) * inv
    t0 = np.nanmax(np.minimum(lo, hi), axis=1)
    t1 = np.nanmin(np.maximum(lo, hi), axis=1)
    return t1 >= np.maximum(t0, 1e-6)


def hit_vcyl(o, d, r, z0, z1):
    a = d[:, 0] ** 2 + d[:, 1] ** 2
    b = 2 * (o[0] * d[:, 0] + o[1] * d[:, 1])
    c = o[0] ** 2 + o[1] ** 2 - r * r
    disc = b * b - 4 * a * c
    ok = (disc >= 0) & (a > 1e-12)
    sq = np.sqrt(np.where(ok, disc, 0))
    hit = np.zeros(len(d), bool)
    for t in ((-b - sq) / (2 * a + 1e-30), (-b + sq) / (2 * a + 1e-30)):
        z = o[2] + t * d[:, 2]
        hit |= ok & (t > 1e-6) & (z >= z0) & (z <= z1)
    with np.errstate(divide='ignore', invalid='ignore'):
        for zc in (z0, z1):
            t = (zc - o[2]) / d[:, 2]
            x, y = o[0] + t * d[:, 0], o[1] + t * d[:, 1]
            hit |= (t > 1e-6) & (x * x + y * y <= r * r)
    return hit


def frame_hits_body(pan, tilt, M):
    top = M['top']
    UT = top + 48.5                      # same stack as design.head_compact
    p, t = math.radians(pan), math.radians(tilt)
    fwd = np.array([math.sin(p) * math.cos(t), math.cos(p) * math.cos(t), math.sin(t)])
    right = np.array([math.cos(p), -math.sin(p), 0.0])
    up = np.cross(right, fwd)
    o = np.array([0, 0, UT]) + LENS * fwd
    tx, ty = math.tan(math.radians(HF / 2)), math.tan(math.radians(VF / 2))
    u, v = np.meshgrid(np.linspace(-1, 1, N), np.linspace(-1, 1, N))
    d = fwd + (u.ravel() * tx)[:, None] * right + (v.ravel() * ty)[:, None] * up
    d /= np.linalg.norm(d, axis=1)[:, None]
    if hit_box(o, d, M['base']).any() or hit_vcyl(o, d, 25, top, top + 20.5).any():
        return True
    c, s = math.cos(p), math.sin(p)                      # into the pan frame (lens looks along +y)
    R = np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])
    ol, dl = R @ o, d @ R.T
    for b in ((-31.6, 31.6, -11, 11, top + 20.5, top + 23.5),          # U bracket plate and cheeks
              (-31.6, -28.6, -11, 11, top + 23.5, UT), (28.6, 31.6, -11, 11, top + 23.5, UT)):
        if hit_box(ol, dl, b).any():
            return True
    return False


def lowest_clear_tilt(pan, M):
    lo, hi = -90.0, 0.0
    if not frame_hits_body(pan, lo, M):
        return lo
    for _ in range(14):
        mid = (lo + hi) / 2
        if frame_hits_body(pan, mid, M):
            lo = mid
        else:
            hi = mid
    return hi


def model(build):
    _, M = build()
    PF, H = M['pan_f'], M['H']
    return dict(top=H, base=(-M['HW'], M['HW'], M['RE'] - PF, M['FR'] - PF, 0, H))


if __name__ == '__main__':
    out = {'note': 'Lowest tilt in degrees (negative = down) that keeps the device out of the frame, '
                   'for |pan| = 0, 5, ... 180 deg. Desk mount, 1 deg margin included. '
                   'Ceiling mount: same numbers with the sign flipped = highest tilt toward the ceiling.',
           'camera': 'Raspberry Pi Camera Module 3 standard, 66 x 41 deg',
           'pan_step_deg': 5, 'margin_deg': MARGIN}
    for key, build in (('p5', build_p5), ('v2', build_v2)):
        M = model(build)
        out[key] = [round(lowest_clear_tilt(pan, M) + MARGIN, 1) for pan in range(0, 181, 5)]
        print(key, ' '.join(f'{pan}:{t}' for pan, t in zip(range(0, 181, 5), out[key]) if pan % 45 == 0 or pan == 170))
    rows = [f' {json.dumps(k)}: {json.dumps(v, ensure_ascii=False)}' for k, v in out.items()]
    (HERE / 'tilt_limits.json').write_text('{\n' + ',\n'.join(rows) + '\n}\n')       # one table per line
    print('wrote', HERE / 'tilt_limits.json')
