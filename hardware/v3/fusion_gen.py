"""Write rig_concept_v3.py: a self-contained Fusion 360 script built from design.py."""
import json
from pathlib import Path
from design import BUILDS

data = {}
for k, fn in BUILDS.items():
    parts, M = fn()
    data[k] = {'meta': {kk: vv for kk, vv in M.items() if kk != 'flow'}, 'parts': [p.as_dict() for p in parts]}

TEMPLATE = r'''# PatrolEye enclosure v3: Raspberry Pi 5 + 2280 M.2 HAT + ASUS UGen300 M.2 (Hailo-10H).
# Generated from design.py (single geometry model; clash-checked). Massing model, not print-ready.
#   v1  = competition prototype as built (C-bracket pan, tilt tower, C270), base raised to 80 x 98 x 47 mm
#         for Pi 5 + 2280 M.2 HAT + UGen300 M.2 + 30 mm fan; servo board on the back of the pan post
#   v2  = after the competition, smaller (68 x 92 x 36 mm body, CM5 on one carrier board,
#         compact turret head with two STS3032 micro bus servos; 102 mm tall overall)
#   v1x = v1 exploded, for explaining the parts
#   vc  = for real deployment: v2 hung from the ceiling on a twist-lock plate (PoE through the plate),
#         turret below the body, barrel resting 35 degrees down; drops 104 mm from the ceiling
# Axes in mm: r = right (seen from the front), f = toward the lens, u = up.
# Run in Fusion: Text Commands (Py) ->  exec(open('/Users/coconut/tmp/fusion_test/rig_concept_v3.py').read())
import adsk.core, adsk.fusion, traceback, os, math, json

OUT_DIR = '/Users/coconut/tmp/fusion_test'
LOG = os.path.join(OUT_DIR, 'rig4_result.log')
DATA = json.loads(r"""__DATA__""")
OFFSET = {'v1': 0.0, 'v2': 150.0, 'v1x': -175.0, 'vc': 420.0}           # r offset of each build in the scene
EXPLODE = {'lid': (0, 0, 120), 'head': (0, 0, 120), 'servo': (0, 0, 120),
           'hat': (0, 0, 40), 'ai': (0, 0, 68), 'cool': (40, 0, 0)}
XRAY_GROUPS = ('shell', 'lid', 'boss')
PALETTE = {
    'white': (236, 236, 232), 'black': (28, 28, 30), 'silver': (188, 191, 196), 'green': (24, 118, 66),
    'pcb': (30, 34, 40), 'brass': (196, 160, 70), 'amber': (215, 150, 50), 'blue': (40, 90, 170),
    'glass': (40, 110, 150), 'red': (176, 74, 56), 'ceiling': (222, 223, 220),
}
log_lines = []


def log(msg):
    log_lines.append(str(msg))


def build():
    app = adsk.core.Application.get()
    app.documents.add(adsk.core.DocumentTypes.FusionDesignDocumentType)
    design = adsk.fusion.Design.cast(app.activeProduct)
    design.designType = adsk.fusion.DesignTypes.DirectDesignType
    root = design.rootComponent
    tbm = adsk.fusion.TemporaryBRepManager.get()
    BT = adsk.fusion.BooleanTypes

    z_up = True
    try:
        pref = app.preferences.generalPreferences.defaultModelingOrientation
        z_up = (pref == adsk.core.DefaultModelingOrientations.ZUpModelingOrientation)
    except Exception:
        pass
    log('z_up=%s' % z_up)
    S = 0.1  # mm -> cm
    k = 1 / math.sqrt(2)

    def P(r, f, u):
        return adsk.core.Point3D.create(r * S, -f * S, u * S) if z_up else adsk.core.Point3D.create(r * S, u * S, f * S)

    def V(r, f, u):
        return adsk.core.Vector3D.create(r, -f, u) if z_up else adsk.core.Vector3D.create(r, u, f)

    def bx(r0, r1, f0, f1, u0, u1):
        c = ((r0 + r1) / 2.0, (f0 + f1) / 2.0, (u0 + u1) / 2.0)
        obb = adsk.core.OrientedBoundingBox3D.create(
            P(*c), V(1, 0, 0), V(0, 1, 0), abs(r1 - r0) * S, abs(f1 - f0) * S, abs(u1 - u0) * S)
        return tbm.createBox(obb)

    def cyl(p1, p2, rad):
        return tbm.createCylinderOrCone(P(*p1), rad * S, P(*p2), rad * S)

    def union(a, b):
        tbm.booleanOperation(a, b, BT.UnionBooleanType)

    def cut(a, b):
        tbm.booleanOperation(a, b, BT.DifferenceBooleanType)

    def rbox(r0, r1, f0, f1, u0, u1, R):
        b = bx(r0 + R, r1 - R, f0, f1, u0, u1)
        union(b, bx(r0, r1, f0 + R, f1 - R, u0, u1))
        for rr in (r0 + R, r1 - R):
            for ff in (f0 + R, f1 - R):
                union(b, cyl((rr, ff, u0), (rr, ff, u1), R))
        return b

    def diamond(c, a1, a2, size, thick=8):
        obb = adsk.core.OrientedBoundingBox3D.create(P(*c), V(*a1), V(*a2), size * S, size * S, thick * S)
        return tbm.createBox(obb)

    def prim(p, d):
        dr, df, du = d
        kind = p[0]
        if kind == 'box':
            r0, r1, f0, f1, u0, u1 = p[1:7]
            return bx(r0 + dr, r1 + dr, f0 + df, f1 + df, u0 + du, u1 + du)
        if kind == 'rbox':
            r0, r1, f0, f1, u0, u1, R = p[1:8]
            return rbox(r0 + dr, r1 + dr, f0 + df, f1 + df, u0 + du, u1 + du, R)
        if kind == 'cyl':
            (r1, f1, u1), (r2, f2, u2), rad = p[1], p[2], p[3]
            return cyl((r1 + dr, f1 + df, u1 + du), (r2 + dr, f2 + df, u2 + du), rad)
        if kind == 'dside':      # diamond vent through a side wall (normal along r)
            rw, f, u, size = p[1:5]
            return diamond((rw + dr, f + df, u + du), (0, k, k), (0, -k, k), size)
        if kind == 'dfront':     # through a front / rear wall (normal along f)
            fw, r, u, size = p[1:5]
            return diamond((r + dr, fw + df, u + du), (k, 0, k), (-k, 0, k), size)
        if kind == 'dtop':       # through the lid (normal along u)
            uw, r, f, size = p[1:5]
            return diamond((r + dr, f + df, uw + du), (k, k, 0), (-k, k, 0), size)
        raise ValueError(kind)

    bodies = {}          # build -> [(body, part dict)]
    by_colour = {}

    def make(key, src, explode):
        meta = DATA[src]['meta']
        comp = None
        try:
            occ = root.occurrences.addNewComponent(adsk.core.Matrix3D.create())
            comp = occ.component
            comp.name = {'v1': 'PatrolEye v1 (competition)', 'v2': 'PatrolEye v2 (compact)',
                         'v1x': 'PatrolEye v1 exploded', 'vc': 'PatrolEye ceiling (deployment)'}[key]
        except Exception:
            log('component %s: using root\n%s' % (key, traceback.format_exc()))
        target = comp or root
        out = []
        for part in DATA[src]['parts']:
            g = part['group']
            d = [OFFSET[key], 0.0, 0.0]
            if explode:
                if g == 'cable':
                    continue
                e = EXPLODE.get(g, (0, 0, 0))
                d = [d[0] + e[0], d[1] + e[1], d[2] + e[2]]
            try:
                body = None
                for p in part['plus']:
                    b = prim(p, d)
                    if body is None:
                        body = b
                    else:
                        union(body, b)
                for p in part['minus']:
                    cut(body, prim(p, d))
                try:
                    bb = target.bRepBodies.add(body)
                except Exception:
                    bb = root.bRepBodies.add(body)
                bb.name = part['name']
                out.append((bb, part))
                by_colour.setdefault(part['color'], []).append(bb)
            except Exception:
                log('part %s / %s FAILED\n%s' % (key, part['name'], traceback.format_exc()))
        bodies[key] = out
        log('%s: %d bodies (%s)' % (key, len(out), meta.get('name', '')))

    make('v1', 'v1', False)
    make('v2', 'v2', False)
    make('v1x', 'v1', True)
    make('vc', 'vc', False)

    # ------------------------------------------------------------------ colours
    try:
        lib = None
        for nm in ('Fusion Appearance Library', 'Fusion 360 Appearance Library'):
            lib = app.materialLibraries.itemByName(nm)
            if lib:
                break
        base = lib.appearances.itemByName('Plastic - Matte (Black)')
        for key, rgb in PALETTE.items():
            if key not in by_colour:
                continue
            nm = 'Concept ' + key
            ap = design.appearances.itemByName(nm) or design.appearances.addByCopy(base, nm)
            prop = adsk.core.ColorProperty.cast(ap.appearanceProperties.itemByName('Color'))
            if prop:
                prop.value = adsk.core.Color.create(rgb[0], rgb[1], rgb[2], 255)
            for b in by_colour[key]:
                b.appearance = ap
        log('appearances ok')
    except Exception:
        log('appearance step FAILED\n' + traceback.format_exc())

    # ------------------------------------------------------------------ views
    def show(keys, hide=()):
        for kk, lst in bodies.items():
            for b, part in lst:
                try:
                    b.isLightBulbOn = kk in keys and part['group'] not in hide
                except Exception:
                    pass

    def xray(on, keys=('v1', 'v2', 'v1x', 'vc')):
        for kk in keys:
            for b, part in bodies.get(kk, []):
                if part['group'] in XRAY_GROUPS or part.get('xray'):
                    try:
                        b.opacity = 0.16 if on else 1.0
                    except Exception:
                        pass

    def save(name, w=2000, h=1600):
        path = os.path.join(OUT_DIR, name)
        vp = app.activeViewport
        try:
            opt = adsk.core.SaveImageFileOptions.create(path)
            opt.width, opt.height = w, h
            opt.isBackgroundTransparent = True
            opt.isAntiAliased = True
            return vp.saveAsImageFileWithOptions(opt)
        except Exception:
            return vp.saveAsImageFile(path, w, h)

    def shot(name, keys, d, xr=False, hide=()):
        try:
            show(keys, hide)
            xray(xr)
            vp = app.activeViewport
            c = vp.camera
            c.isSmoothTransition = False
            tgt = P(0, 0, 60)
            dv = V(*d)
            dv.normalize()
            dv.scaleBy(80.0)
            c.target = tgt
            c.eye = adsk.core.Point3D.create(tgt.x + dv.x, tgt.y + dv.y, tgt.z + dv.z)
            c.upVector = V(0, 0, 1)
            c.isFitView = True
            vp.camera = c
            adsk.doEvents()
            vp.fit()
            adsk.doEvents()
            vp.refresh()
            adsk.doEvents()
            log('%s: %s' % (name, save(name)))
        except Exception:
            log('%s FAILED\n%s' % (name, traceback.format_exc()))

    FRONT = (1.0, 1.35, 0.55)
    REAR = (-1.0, -1.25, 0.6)
    shot('v3_v1_front.png', ['v1'], FRONT)
    shot('v3_v1_rear.png', ['v1'], REAR)
    shot('v3_v1_xray_left.png', ['v1'], (-1.0, 0.35, 0.5), xr=True)
    shot('v3_v1_xray_rear.png', ['v1'], (-0.8, -1.2, 0.8), xr=True)
    shot('v3_v1_exploded.png', ['v1x'], (1.0, 1.2, 0.6))
    shot('v3_v2_front.png', ['v2'], FRONT)
    shot('v3_v2_xray.png', ['v2'], (-1.0, 0.6, 0.6), xr=True)
    shot('v3_v2_rear.png', ['v2'], REAR)
    shot('v3_v1_v2_front.png', ['v1', 'v2'], (0.45, 1.3, 0.4))
    shot('v3_v1_base_xray.png', ['v1'], (1.0, 1.1, 1.0), xr=True, hide=('head', 'lid'))
    shot('v3_v2_base_xray.png', ['v2'], (1.0, 1.1, 1.0), xr=True, hide=('head', 'lid'))
    # ceiling version: seen from below, as from the room
    shot('v3_vc_front.png', ['vc'], (1.0, 1.35, -0.5), hide=('room',))
    shot('v3_vc_room.png', ['vc'], (0.85, 1.5, -0.38))
    shot('v3_vc_side.png', ['vc'], (1.0, 0.0, -0.12), hide=('room',))
    shot('v3_vc_xray.png', ['vc'], (1.0, 1.1, -0.9), xr=True, hide=('room',))
    show(['v1', 'v2', 'v1x', 'vc'])
    xray(False)
    try:
        app.activeViewport.fit()
    except Exception:
        pass
    log('bodies total=%d' % sum(len(v) for v in bodies.values()))
    log('DONE')


try:
    build()
except Exception:
    log('BUILD FAILED\n' + traceback.format_exc())
finally:
    try:
        os.makedirs(OUT_DIR, exist_ok=True)
        with open(LOG, 'w') as fh:
            fh.write('\n'.join(log_lines) + '\n')
    except Exception:
        pass
'''

out = Path(__file__).resolve().parent / 'rig_concept_v3.py'
out.write_text(TEMPLATE.replace('__DATA__', json.dumps(data)))
print('wrote', out, out.stat().st_size, 'bytes')
