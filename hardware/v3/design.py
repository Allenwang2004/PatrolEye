"""PatrolEye enclosure, v3. One geometry model drives:
  - the clearance / fit checks           (python3 design.py check)
  - the 2D layout drawings               (python3 design.py draw)
  - the Fusion 360 script                (python3 design.py fusion)

Axes in mm: r = right (seen from the front), f = toward the front (lens side), u = up.
Two builds:
  v1  competition prototype: Raspberry Pi 5 + 2280 M.2 HAT + ASUS UGen300 M.2 (Hailo-10H)
  v2  after the competition: same parts family, smaller: Compute Module 5 on one carrier board
"""
import json
import math
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent

# ---------------------------------------------------------------- primitives
# ('box', r0, r1, f0, f1, u0, u1)
# ('rbox', r0, r1, f0, f1, u0, u1, R)        vertical edges rounded
# ('cyl', (r, f, u), (r, f, u), rad)
# ('dside', r_wall, f, u, size)              diamond vent through a side wall
# ('dfront', f_wall, r, u, size)             diamond vent through a front/rear wall
# ('dtop', u_wall, r, f, size)               diamond vent through the lid


def box(r0, r1, f0, f1, u0, u1):
    return ('box', r0, r1, f0, f1, u0, u1)


def rbox(r0, r1, f0, f1, u0, u1, R):
    return ('rbox', r0, r1, f0, f1, u0, u1, R)


def cyl(p1, p2, rad):
    return ('cyl', tuple(p1), tuple(p2), rad)


def aabb(p):
    k = p[0]
    if k in ('box', 'rbox'):
        return p[1:7]
    if k == 'cyl':
        (r1, f1, u1), (r2, f2, u2), rad = p[1], p[2], p[3]
        ax = [abs(r2 - r1) > 1e-6, abs(f2 - f1) > 1e-6, abs(u2 - u1) > 1e-6]
        lo = [min(r1, r2), min(f1, f2), min(u1, u2)]
        hi = [max(r1, r2), max(f1, f2), max(u1, u2)]
        for i in range(3):
            if not ax[i]:
                lo[i] -= rad
                hi[i] += rad
        return (lo[0], hi[0], lo[1], hi[1], lo[2], hi[2])
    raise ValueError(k)


def rot180(p):
    """Turn a primitive 180 degrees about the vertical axis through r = f = 0."""
    k = p[0]
    if k in ('box', 'rbox'):
        r0, r1, f0, f1, u0, u1 = p[1:7]
        return (k, -r1, -r0, -f1, -f0, u0, u1) + tuple(p[7:])
    if k == 'cyl':
        (r1, f1, u1), (r2, f2, u2), rad = p[1], p[2], p[3]
        return ('cyl', (-r1, -f1, u1), (-r2, -f2, u2), rad)
    raise ValueError(k)


def flip_f(p, u_ref):
    """Turn a primitive upside down: 180 degrees about the front-back axis (r -> -r, u -> u_ref - u)."""
    k = p[0]
    if k in ('box', 'rbox'):
        r0, r1, f0, f1, u0, u1 = p[1:7]
        return (k, -r1, -r0, f0, f1, u_ref - u1, u_ref - u0) + tuple(p[7:])
    if k == 'cyl':
        (r1, f1, u1), (r2, f2, u2), rad = p[1], p[2], p[3]
        return ('cyl', (-r1, f1, u_ref - u1), (-r2, f2, u_ref - u2), rad)
    if k == 'dside':
        rw, f, u, size = p[1:5]
        return ('dside', -rw, f, u_ref - u, size)
    if k == 'dfront':
        fw, r, u, size = p[1:5]
        return ('dfront', fw, -r, u_ref - u, size)
    if k == 'dtop':
        uw, r, f, size = p[1:5]
        return ('dtop', u_ref - uw, -r, f, size)
    raise ValueError(k)


class Part:
    def __init__(self, name, color, group, plus, minus=(), through=False, label=None, top=None, side=None, xray=False):
        self.name, self.color, self.group = name, color, group
        self.xray = xray                    # drawn see-through in the Fusion x-ray shots
        self.top, self.side = top, side    # drawing anchors: top=(r, f), side=(f, u); default = centre
        self.plus, self.minus = list(plus), list(minus)
        self.through = through          # allowed to pass through the shell
        self.label = label              # shown on the 2D drawing

    def bounds(self):
        bs = [aabb(p) for p in self.plus]
        return (min(b[0] for b in bs), max(b[1] for b in bs), min(b[2] for b in bs),
                max(b[3] for b in bs), min(b[4] for b in bs), max(b[5] for b in bs))

    def as_dict(self):
        return {'name': self.name, 'color': self.color, 'group': self.group,
                'plus': self.plus, 'minus': self.minus, 'xray': self.xray}


MICRO = dict(L=23.2, W=12.1, H=28.5, SH=5.9)   # Feetech STS3032: body L x W, height incl. shaft boss, shaft from front end


def head_compact(top, PF):
    """v2 head: fixed pedestal, rotating turret, tilting camera barrel. Two STS3032 micro bus servos.
    The pan servo sinks 12 mm into the base through the lid; the tilt servo hides inside the barrel."""
    L, Wd, Hs, SH = MICRO['L'], MICRO['W'], MICRO['H'], MICRO['SH']
    w = Wd / 2
    sb = top - 12.0                                   # pan servo bottom (below the lid)
    ear0 = sb + 18.0                                  # mounting ears rest on the pedestal bar
    ped_top, tur0, tur1 = top + 6.0, top + 7.0, top + 20.5
    UT = tur1 + 1.0 + 21.0                            # tilt axis height
    P = []
    P.append(Part('Pan servo STS3032', 'black', 'head',
                  [box(-w, w, PF - (L - SH), PF + SH, sb, sb + 25), cyl((0, PF, sb + 25), (0, PF, sb + Hs), 3.0),
                   box(-w, w, PF - (L - SH) - 4.55, PF + SH + 4.55, ear0, ear0 + 2.5)],
                  through=True, label='水平伺服 STS3032（下半截沉入機身）', side=(PF - 6, sb + 6)))
    P.append(Part('Pan horn', 'silver', 'head', [cyl((0, PF, sb + Hs), (0, PF, sb + Hs + 2), 10)]))
    ped_plus = [cyl((0, PF, top), (0, PF, ped_top), 25), box(-8, 8, PF - 23, PF + 11.5, ped_top - 2.5, ped_top)]
    ped_minus = [cyl((0, PF, top - 1), (0, PF, ped_top - 2.5), 23),
                 box(-w - 0.3, w + 0.3, PF - (L - SH) - 0.2, PF + SH + 0.2, top - 1, ped_top + 1)]
    P.append(Part('Pedestal (fixed)', 'white', 'head', ped_plus, ped_minus, xray=True))
    P.append(Part('Turret (rotates)', 'white', 'head', [cyl((0, PF, tur0), (0, PF, tur1), 25)],
                  [cyl((0, PF, tur0 - 1), (0, PF, tur1 - 2), 23)], label='轉台（水平轉動）', xray=True))
    for sgn in (-1, 1):
        r0, r1 = sorted((sgn * 28.6, sgn * 31.6))
        P.append(Part('Cheek', 'white', 'head',
                      [box(r0, r1, PF - 11, PF + 11, tur1, UT), cyl((r0, PF, UT), (r1, PF, UT), 11),
                       cyl((sgn * 28.0, PF, UT), (sgn * 28.6, PF, UT), 6)]))
    P.append(Part('Camera barrel (tilts)', 'white', 'head', [cyl((-28, PF, UT), (28, PF, UT), 21)],
                  label='鏡頭筒（俯仰）', xray=True, side=(PF - 14, UT + 12)))
    P.append(Part('Tilt servo STS3032 (inside the barrel)', 'black', 'head',
                  [box(-27.5, 0, PF - (L - SH), PF + SH, UT - w, UT + w)], label='俯仰伺服 STS3032（藏在筒內）', side=(PF - 8, UT - 2)))
    P.append(Part('Camera Module 3', 'green', 'head', [box(1, 26, PF + 3, PF + 14.5, UT - 12, UT + 12)], label='相機模組 3'))
    P.append(Part('Lens bezel', 'black', 'head', [cyl((13.5, PF + 14.5, UT), (13.5, PF + 21.6, UT), 9)]))
    P.append(Part('Camera lens', 'glass', 'head', [cyl((13.5, PF + 21.6, UT), (13.5, PF + 22.4, UT), 6.5)]))
    P.append(Part('Status LED + mic', 'black', 'head', [cyl((-13.5, PF + 19.5, UT), (-13.5, PF + 21.5, UT), 2.5)]))
    return P


# ------------------------------------------------------------------- v1
def build_v1():
    """Competition prototype, as built (see the A1 footage), with the base raised for the M.2 stack.
    USB / Ethernet face the rear; the lens faces the front.
    Base = Pi 5 + 2280 M.2 HAT + UGen300 M.2 + 30 mm fan. On the lid: a fixed post holds the pan servo
    upright; a C-bracket clamps the servo's top and bottom discs and turns around it, carrying the tilt
    tower at its front. The bus servo board sits on the back of the post. Camera on a printed yoke."""
    HW, FR, RE, H, W = 40.0, 49.0, -49.0, 47.0, 3.0
    P = []
    # ---- base shell (Pi case): ports at the front, USB-C on the right, microSD at the rear
    shell_minus = [box(-HW + W, HW - W, RE + W, FR - W, W, H + 1),
                   box(-27, 27, RE - 2, RE + 5, 8, 25.5),                       # USB x4 + Ethernet window (rear)
                   box(-HW - 2, -HW + 5, 25.5, 36.5, 7, 14),                     # Pi USB-C power (left)
                   box(-8, 8, FR - 5, FR + 2, 4.5, 8.5),                         # microSD slot (front)
                   cyl((HW - 5, 1, 28), (HW + 2, 1, 28), 13.5)]                  # 30 mm fan exhaust (right)
    for i in range(6):
        shell_minus.append(box(-20, 20, -36 + i * 12, -32 + i * 12, -1, W + 1))   # floor intake slots
    for uu in (16, 34):
        for i in range(4):
            shell_minus.append(('dside', -HW + 1.5, -20 + i * 12, uu, 5.5))    # left intake vents
    P.append(Part('Base shell', 'white', 'shell', [rbox(-HW, HW, RE, FR, 0, H - W, 6)], shell_minus, label='底座外殼'))
    BOSS = [(rr, ff) for rr in (-HW + 6.5, HW - 6.5) for ff in (FR - 6.5, RE + 6.5)]
    lid_minus = [cyl((rr, ff, H - W - 1), (rr, ff, H + 1), 1.7) for rr, ff in BOSS]
    for i in range(4):
        lid_minus.append(box(-24, 24, RE + 6 + i * 4.5, RE + 8.5 + i * 4.5, H - W - 1, H + 1))   # rear top slots
    P.append(Part('Lid', 'white', 'lid', [rbox(-HW, HW, RE, FR, H - W, H, 6)], lid_minus, label='上蓋'))
    for sgn in (-1, 1):
        for ff in (-24, 24):
            r0, r1 = sorted((sgn * HW, sgn * (HW + 7)))
            P.append(Part('Mounting tab', 'white', 'shell', [box(r0, r1, ff - 6, ff + 6, 0, 3)],
                          [cyl((sgn * (HW + 3.5), ff, -1), (sgn * (HW + 3.5), ff, 4), 1.7)], through=True))
    P.append(Part('1/4"-20 tripod / ceiling insert', 'silver', 'shell', [cyl((0, 0, 0), (0, 0, 8), 4.5)], through=True))
    P.append(Part('Fan grille', 'white', 'shell', [box(HW - W, HW - 0.6, -13, 15, uu - 1, uu + 1) for uu in (21, 28, 35)]
                  + [box(HW - W, HW - 0.6, 0, 2, 14.5, 41.5)], through=True))
    for rr, ff in BOSS:
        P.append(Part('Lid screw boss', 'white', 'boss', [cyl((rr, ff, W), (rr, ff, H - W), 3.0)],
                      [cyl((rr, ff, H - W - 9), (rr, ff, H - W + 0.1), 1.25)]))

    # ---- Raspberry Pi 5 (drawn with USB at the front, then the whole stack is turned 180 deg below)
    PR_, PFr = 43.0, -42.0                         # front (USB) edge, rear (PCIe) edge
    pcb_u0, pcb_u1 = 7.0, 8.6
    holes = [(rr, ff) for rr in (-24.5, 24.5) for ff in (PFr + 3.5, PFr + 61.5)]
    for rr, ff in holes:
        P.append(Part('Pi standoff 4 mm', 'brass', 'pi', [cyl((rr, ff, W), (rr, ff, pcb_u0), 2.75)]))
    P.append(Part('Raspberry Pi 5 (85x56)', 'green', 'pi', [box(-28, 28, PFr, PR_, pcb_u0, pcb_u1)], label='Raspberry Pi 5',
                  top=(19, 34), side=(-30, pcb_u0 + 0.8)))
    P.append(Part('Pi USB 2.0', 'silver', 'pi', [box(12.5, 25.5, PR_ - 14.5, PR_ + 3, pcb_u1, pcb_u1 + 16)]))
    P.append(Part('Pi USB 3.0', 'silver', 'pi', [box(-4.5, 8.5, PR_ - 14.5, PR_ + 3, pcb_u1, pcb_u1 + 16)]))
    P.append(Part('Pi Ethernet', 'silver', 'pi', [box(-26, -10, PR_ - 18, PR_ + 3, pcb_u1, pcb_u1 + 13.5)]))
    P.append(Part('Pi active cooler', 'silver', 'pi', [box(-13, 17, -11, 19, pcb_u1, pcb_u1 + 9)]))
    P.append(Part('Pi GPIO header', 'black', 'pi', [box(-27.5, -22.5, PFr + 7, PFr + 57, pcb_u1, pcb_u1 + 8.5)]))
    P.append(Part('Pi USB-C power', 'silver', 'pi', [box(24, 31, PFr + 6.5, PFr + 15.5, pcb_u1, pcb_u1 + 3.2)]))
    P.append(Part('Pi micro-HDMI x2', 'silver', 'pi', [box(24, 30, PFr + 22, PFr + 43, pcb_u1, pcb_u1 + 3.5)]))
    P.append(Part('Pi PCIe FPC connector', 'black', 'pi', [box(-9, 9, PFr, PFr + 4, pcb_u1, pcb_u1 + 2)]))
    P.append(Part('microSD card', 'black', 'pi', [box(-6, 6, PFr - 2, PFr + 12, pcb_u0 - 1.4, pcb_u0)]))

    # ---- 2280 M.2 HAT on 16 mm standoffs + UGen300 M.2 (socket at the rear, next to the PCIe FPC)
    hat_u0 = pcb_u1 + 16.0
    for rr, ff in holes:
        P.append(Part('HAT standoff 16 mm', 'brass', 'hat', [cyl((rr, ff, pcb_u1), (rr, ff, hat_u0), 2.75)]))
    P.append(Part('M.2 HAT for 2280 (PCIe, top of Pi)', 'green', 'hat', [box(-28, 28, PFr - 2, PR_, hat_u0, hat_u0 + 1.6)],
                  label='M.2 HAT（2280）', top=(-20, 30), side=(32, hat_u0 + 0.8)))
    P.append(Part('PCIe FFC ribbon', 'amber', 'hat', [box(-8, 8, PFr - 1.2, PFr - 0.2, pcb_u1 + 2, hat_u0)]))
    card_u = hat_u0 + 1.6 + 2.2
    P.append(Part('M.2 Key-M socket', 'black', 'hat', [box(-11, 11, PFr - 1, PFr + 4.5, hat_u0 + 1.6, card_u + 2.5)]))
    P.append(Part('UGen300 M.2 card (2280)', 'pcb', 'ai', [box(-11, 11, PFr, PFr + 80, card_u, card_u + 0.8)],
                  label='UGen300 M.2（Hailo-10H）', top=(0, -32), side=(-34, card_u + 0.4)))
    P.append(Part('Hailo-10H', 'black', 'ai', [box(-8, 8, PFr + 33, PFr + 50, card_u + 0.8, card_u + 2.0)]))
    P.append(Part('LPDDR4 8 GB', 'black', 'ai', [box(-7, 7, PFr + 57, PFr + 70, card_u + 0.8, card_u + 1.8),
                                                 box(-7, 7, PFr + 14, PFr + 27, card_u + 0.8, card_u + 1.8)]))
    P.append(Part('Heatsink on Hailo-10H', 'silver', 'ai', [box(-10, 10, PFr + 29, PFr + 54, card_u + 2.0, card_u + 10)], label='Hailo-10H 散熱片'))
    P.append(Part('M.2 screw post', 'brass', 'hat', [cyl((0, PFr + 78, hat_u0 + 1.6), (0, PFr + 78, card_u), 2.0)]))
    # 30 x 30 x 7 mm exhaust fan on the left wall, beside the AI chip
    P.append(Part('30 mm exhaust fan', 'black', 'cool', [box(-HW + W, -HW + W + 7, -16, 14, 13, 43)], label='30 mm 排風扇', top=(-33.5, -12)))
    # USB / Ethernet face the rear: turn the whole base stack 180 deg about the vertical axis
    for p in P:
        if p.group in ('pi', 'hat', 'ai', 'cool'):
            p.plus = [rot180(q) for q in p.plus]
            p.minus = [rot180(q) for q in p.minus]
            if p.top:
                p.top = (-p.top[0], -p.top[1])
            if p.side:
                p.side = (-p.side[0], p.side[1])

    # ---- pan: fixed post on the lid holds the pan servo upright; a C-bracket turns around it
    T, PF = H, 5.0
    sL, sW, sH = 45.2, 24.7, 35.0                   # STS3215 body; shaft 11.5 mm from one end
    P.append(Part('Pan servo post (fixed)', 'white', 'head', [box(2, 30, PF - sW / 2 - 10, PF - sW / 2, T, T + 52),
                                                               box(-2, 34, PF - sW / 2 - 14, PF - sW / 2, T, T + 3)],
                  label='水平伺服固定柱', side=(PF - sW / 2 - 5, T + 40)))
    P.append(Part('Pan servo STS3215', 'black', 'head', [box(-11.5, sL - 11.5, PF - sW / 2, PF + sW / 2, T + 17, T + 17 + sH)],
                  label='水平伺服 STS3215', side=(PF, T + 34)))
    P.append(Part('Pan servo discs', 'silver', 'head', [cyl((0, PF, T + 14), (0, PF, T + 17), 10),
                                                         cyl((0, PF, T + 17 + sH), (0, PF, T + 20 + sH), 10)]))
    C0, C1 = PF + 26, PF + 40                       # spine of the C, in front of the servo
    Cplus = [box(-11, 11, PF, C1, T + 2, T + 14), cyl((0, PF, T + 2), (0, PF, T + 14), 11),           # lower arm
             box(-11, 11, PF, C1, T + 55, T + 67), cyl((0, PF, T + 55), (0, PF, T + 67), 11),         # upper arm
             box(-14, 14, C0, C1, T + 2, T + 67)]                                                     # spine
    P.append(Part('Pan C-bracket (turns)', 'white', 'head', Cplus, label='C 型支架（水平轉動）', side=((C0 + C1) / 2, T + 30)))
    # ---- tilt: tower on the C, tilt servo standing in it, horn on the right face
    TF = PF + 28.0                                  # tilt tower centre (f)
    ts0 = T + 80.0                                  # tilt servo bottom
    TU = ts0 + sL - 11.5                            # tilt axis height
    P.append(Part('Tilt tower', 'white', 'head', [box(-20.5, 20.5, TF - 15.35, TF + 15.35, T + 67, T + 100)],
                  [box(-17.6, 17.6, TF - 12.45, TF + 12.45, ts0 - 0.1, T + 101)], label='俯仰塔'))
    P.append(Part('Tilt servo STS3215', 'black', 'head', [box(-17.5, 17.5, TF - sW / 2, TF + sW / 2, ts0, ts0 + sL)],
                  label='俯仰伺服 STS3215'))
    P.append(Part('Tilt horn', 'silver', 'head', [cyl((17.5, TF, TU), (20.5, TF, TU), 10)]))
    yoke = [box(20.5, 24.5, TF - 10, TF + 10, T + 102, T + 136), box(-24.5, -20.5, TF - 10, TF + 10, T + 102, T + 136),
            box(-24.5, 24.5, TF - 10, TF + 10, T + 132, T + 136), box(-8, 8, TF - 10, TF + 10, T + 136, T + 146)]
    P.append(Part('Camera yoke (printed)', 'white', 'head', yoke, label='相機轉接件（3D 列印）', side=(TF - 4, T + 134)))
    cam_u = T + 161.75
    cam = [box(-20, 20, TF - 11.5, TF + 11.5, T + 146, T + 177.5),
           cyl((-20, TF - 11.5, cam_u), (-20, TF + 11.5, cam_u), 15.75),
           cyl((20, TF - 11.5, cam_u), (20, TF + 11.5, cam_u), 15.75)]
    P.append(Part('USB webcam (Logitech C270)', 'black', 'head', cam, label='USB 攝影機 C270'))
    P.append(Part('Webcam lens', 'glass', 'head', [cyl((-12, TF + 11.5, cam_u), (-12, TF + 13.5, cam_u), 7)]))
    # ---- bus servo adapter on the back of the post (the yellow board in the footage)
    bf = PF - sW / 2 - 10                           # back face of the post
    P.append(Part('Bus servo adapter (A)', 'pcb', 'head', [box(-1, 32, bf - 1.6, bf, T + 8, T + 50)],
                  label='伺服驅動板（固定柱背面）', side=(bf - 1, T + 30)))
    P.append(Part('Adapter screw terminal (12 V in)', 'green', 'head', [box(1, 9, bf - 9.6, bf - 1.6, T + 8, T + 16)]))
    P.append(Part('Adapter USB-C (to Pi)', 'silver', 'head', [box(21, 30, bf - 4.8, bf - 1.6, T + 8, T + 15)]))
    P.append(Part('Servo ports', 'white', 'head', [box(3, 11, bf - 7, bf - 1.6, T + 44, T + 50), box(19, 27, bf - 7, bf - 1.6, T + 44, T + 50)]))

    flow = [('in', 'L', ff) for ff in (-8, 16)] + [('out', 'R', 1)]
    return P, dict(HW=HW, FR=FR, RE=RE, H=H, W=W, name='v1 · 比賽原型（換 M.2 後）', flow=flow)


# ------------------------------------------------------------------- v2
def build_v2():
    HW, FR, RE, H, W = 34.0, 46.0, -46.0, 36.0, 3.0
    P = []
    shell_minus = [box(-HW + W, HW - W, RE + W, FR - W, W, H + 1),
                   box(-23, -5, RE - 2, RE + W + 1, 14.1, 28.5),               # RJ45 (PoE) window
                   cyl((0.5, RE - 2, 20), (0.5, RE + 5, 20), 5.5),             # 12 V jack
                   box(8, 29, RE - 2, RE + W + 1, 23, 31)]                      # blower exhaust
    shell_minus += [
                   box(-8, 8, FR - 5, FR + 2, 15, 18)]                          # service slot
    for i in range(6):
        shell_minus.append(box(-18, 18, -32 + i * 12, -28 + i * 12, -1, W + 1))
    for i in range(5):
        shell_minus.append(('dside', -HW + 1.5, -26 + i * 12, 9, 5.0))
        shell_minus.append(('dside', HW - 1.5, -26 + i * 12, 9, 5.0))
    P.append(Part('Base shell', 'white', 'shell', [rbox(-HW, HW, RE, FR, 0, H - W, 6)], shell_minus, label='機身外殼'))
    PF = -2.0                                                                    # pan axis (body centre)
    L, SH = MICRO['L'], MICRO['SH']
    lid_minus = [box(-7, 7, PF - (L - SH) - 1, PF + SH + 1, H - W - 1, H + 1),     # pan servo drops through the lid
                 box(13, 17, PF - 9, PF - 1, H - W - 1, H + 1)]                     # camera FFC + tilt servo cable, inside the pedestal
    P.append(Part('Lid', 'white', 'lid', [rbox(-HW, HW, RE, FR, H - W, H, 6)], lid_minus, label='上蓋'))
    for rr in (-26, 26):
        for ff in (-38, 38):
            P.append(Part('Rubber foot', 'black', 'shell', [cyl((rr, ff, -2.5), (rr, ff, 0), 5)], through=True))
    for rr in (-26, 26):
        for ff in (-38, 38):
            P.append(Part('Carrier standoff', 'brass', 'board', [cyl((rr, ff, W), (rr, ff, 13), 2.5)]))
    P.append(Part('Camera CSI connector', 'black', 'board', [box(12, 20, PF - 12, PF - 4, 14.6, 17)]))
    P.append(Part('Custom carrier board (84x58)', 'green', 'board', [box(-29, 29, -42, 42, 13, 14.6)], label='自製載板（M.2 槽、伺服驅動、降壓、PoE）',
                  top=(8, -10), side=(-12, 13.8)))
    P.append(Part('Compute Module 5 (55x40)', 'green', 'board', [box(-27.5, 27.5, 0, 40, 16.1, 17.3)], label='Compute Module 5', top=(-24, 20), side=(38, 16.7)))
    P.append(Part('CM5 heatsink', 'silver', 'board', [box(-20, 20, 5, 35, 17.3, 24)]))
    P.append(Part('CM5 board-to-board connectors', 'black', 'board', [box(-25, 25, 3, 37, 14.6, 16.1)]))
    P.append(Part('M.2 socket (underside)', 'black', 'board', [box(-11, 11, 36, 42, 9, 13)]))
    P.append(Part('UGen300 M.2 card (2280, underside)', 'pcb', 'ai', [box(-11, 11, -40, 40, 10.5, 11.3)], label='UGen300 M.2（板下）', top=(2, -12), side=(24, 10.9)))
    P.append(Part('Hailo-10H (faces down)', 'black', 'ai', [box(-8, 8, -10, 7, 9.3, 10.5)]))
    P.append(Part('Buck + bus-servo driver', 'blue', 'board', [box(-27, -8, -24, -8, 14.6, 19)]))
    P.append(Part('RJ45 (PoE)', 'silver', 'board', [box(-22, -6, -45, -26, 14.6, 28)], through=True, label='RJ45（PoE）'))
    P.append(Part('12 V jack', 'black', 'board', [box(-4, 5, -45, -33, 14.6, 25)], through=True))
    P.append(Part('25 mm blower (exhaust rear)', 'black', 'cool', [box(8, 31, -43, -20, 22, 32)], label='25 mm 鼓風扇（後排）'))
    P += head_compact(H, PF)
    flow = [('in', 'L', ff) for ff in (-26, 10)] + [('in', 'R', ff) for ff in (-2, 22)] + [('out', 'B', 18.5)]
    return P, dict(HW=HW, FR=FR, RE=RE, H=H, W=W, name='v2 · 比賽後縮小版', flow=flow)


# ------------------------------------------------------------- ceiling (vc)
U_REF = 110.0          # ceiling version: the body's top face (v2's underside) sits at u = U_REF
PLATE_T = 5.0          # twist-lock ceiling plate thickness
TILT_DOWN = 35.0       # resting pose of the barrel: looking 35 degrees below the horizon


def build_vc(flipped=True):
    """For real deployment: the compact v2 hung from the ceiling, like a PTZ dome without the dome.
    Same body, boards and turret as v2, turned upside down (180 degrees about the front-back axis):
      - a round twist-lock plate (like a smoke detector base) is screwed to the ceiling; the body turns onto it;
      - power and data (PoE) come down through the plate, so the body needs no rear cable;
      - the floor vents of v2 would face the plate, so they are closed; air enters the side vents and the
        blower still exhausts at the rear; the rubber feet are gone;
      - the turret hangs below the body; pan turns the whole head, tilt points the barrel from the horizon
        down to straight below, so one unit sees the whole floor of a room.
    flipped=False returns the same parts the right way up, for the clearance check."""
    parts, M = build_v2()
    HW, RE, FR, W = M['HW'], M['RE'], M['FR'], M['W']
    keep = []
    for p in parts:
        if p.name == 'Rubber foot':
            continue
        if p.name == 'Base shell':
            # drop v2's six floor slots (u from -1 to W+1); add a cable hole up through the plate
            p.minus = [m for m in p.minus if not (m[0] == 'box' and m[5] == -1 and m[6] == W + 1)]
            p.minus.append(cyl((0, -30, -1), (0, -30, W + 1), 6.5))
            p.label = '機身（倒掛，上方鎖進吸頂底座）'
        if p.name in ('RJ45 (PoE)', '12 V jack'):
            p.label = None
        keep.append(p)
    PF = -2.0
    keep.append(Part('Ceiling plate (twist-lock)', 'white', 'mount',
                     [cyl((0, PF, -PLATE_T), (0, PF, 0), 62)],
                     [cyl((0, -30, -PLATE_T - 1), (0, -30, 1), 6.5)],
                     label='吸頂旋鎖底座 Ø124（PoE 線從中間上去）'))
    keep.append(Part('Ceiling', 'ceiling', 'room', [box(-150, 150, -130, 130, -PLATE_T - 12, -PLATE_T)]))
    meta = dict(M, name='吸頂版 · 實際部署', flow=[], u_ref=U_REF)
    if not flipped:
        return keep, meta
    out = []
    for p in keep:
        q = Part(p.name, p.color, p.group, [flip_f(x, U_REF) for x in p.plus], [flip_f(x, U_REF) for x in p.minus],
                 through=p.through, label=p.label, xray=p.xray)
        out.append(q)
    # resting pose: tilt the parts on the front of the barrel down by TILT_DOWN about the tilt axis
    barrel = next(p for p in out if p.name == 'Camera barrel (tilts)')
    (_, ax_f, ax_u) = barrel.plus[0][1]
    th = math.radians(TILT_DOWN)
    for p in out:
        if p.name in ('Lens bezel', 'Camera lens', 'Status LED + mic'):
            new = []
            for (kind, a, b, rad) in p.plus:
                def tilt(pt):
                    d = pt[1] - ax_f
                    du = pt[2] - ax_u
                    return (pt[0], ax_f + d * math.cos(th) + du * math.sin(th), ax_u - d * math.sin(th) + du * math.cos(th))
                new.append(('cyl', tilt(a), tilt(b), rad))
            p.plus = new
    return out, meta


BUILDS = {'v1': build_v1, 'v2': build_v2, 'vc': build_vc}
CHECK_BUILDS = {'v1': build_v1, 'v2': build_v2, 'vc': lambda: build_vc(False)}

# ------------------------------------------------------------------- checks
NESTED_OK = {('Tilt tower', 'Tilt servo STS3215'),
             ('Turret (rotates)', 'Pan servo STS3032'), ('Turret (rotates)', 'Pan horn'),
             ('Pedestal (fixed)', 'Pan servo STS3032'), ('Camera barrel (tilts)', 'Tilt servo STS3032 (inside the barrel)'),
             ('Camera barrel (tilts)', 'Camera Module 3'), ('Camera barrel (tilts)', 'Lens bezel'),
             ('Camera Module 3', 'Lens bezel'),
             ('Camera barrel (tilts)', 'Status LED + mic'),
             ('Pan servo holder', 'Pan servo STS3215'), ('Tilt bracket', 'Tilt servo STS3215'),
             ('Tilt bracket', 'Pan horn'), ('M.2 Key-M socket', 'UGen300 M.2 card (2280)'),
             ('M.2 socket (underside)', 'UGen300 M.2 card (2280, underside)')}


def overlap(a, b, tol=0.05):
    d = [min(a[1], b[1]) - max(a[0], b[0]), min(a[3], b[3]) - max(a[2], b[2]), min(a[5], b[5]) - max(a[4], b[4])]
    return d if all(x > tol for x in d) else None


def check(key):
    parts, M = CHECK_BUILDS[key]()
    out = []
    inner = (-M['HW'] + M['W'], M['HW'] - M['W'], M['RE'] + M['W'], M['FR'] - M['W'], M['W'], M['H'] - M['W'])
    inside = [p for p in parts if p.group not in ('shell', 'lid', 'head', 'mount', 'room')]
    for p in inside:
        if p.through:
            continue
        b = p.bounds()
        bad = [b[0] < inner[0] - 0.01, b[1] > inner[1] + 0.01, b[2] < inner[2] - 0.01,
               b[3] > inner[3] + 0.01, b[4] < inner[4] - 0.01, b[5] > inner[5] + 0.01]
        if any(bad):
            out.append(f'OUTSIDE  {p.name}: {tuple(round(x, 1) for x in b)}')
    movable = [p for p in parts if p.group not in ('shell', 'lid', 'room')]
    for i in range(len(movable)):
        for j in range(i + 1, len(movable)):
            a, b = movable[i], movable[j]
            if (a.name, b.name) in NESTED_OK or (b.name, a.name) in NESTED_OK:
                continue
            for pa in a.plus:
                for pb in b.plus:
                    d = overlap(aabb(pa), aabb(pb))
                    if d:
                        out.append(f'CLASH    {a.name} x {b.name}: {[round(x, 1) for x in d]}')
                        break
                else:
                    continue
                break
    lid = next(p for p in parts if p.group == 'lid')
    for p in parts:
        if p.group == 'head' and not p.through:
            d = overlap(p.bounds(), lid.bounds())
            if d:
                out.append(f'CLASH    {p.name} x lid: {[round(x, 1) for x in d]}')
    hb = [p.bounds() for p in parts if p.group != 'room']
    total = (max(b[5] for b in hb) - min(b[4] for b in hb))
    out.append(f'SIZE     body {M["HW"] * 2:.0f} W x {M["FR"] - M["RE"]:.0f} L x {M["H"]:.0f} H mm; overall height {total:.0f} mm')
    return out


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'check'
    if cmd == 'check':
        for k in CHECK_BUILDS:
            print(f'== {k}')
            for line in check(k):
                print('  ', line)
    elif cmd == 'json':
        data = {}
        for k, fn in BUILDS.items():
            parts, M = fn()
            data[k] = {'meta': M, 'parts': [p.as_dict() for p in parts]}
        print(json.dumps(data))
