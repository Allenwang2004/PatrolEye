"""2D layout drawings (side x-ray + top view without lid) from design.py, with leader-line callouts."""
import sys
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Circle, FancyBboxPatch, FancyArrowPatch
from matplotlib import font_manager as fm
from design import BUILDS, aabb

for cand in ('Noto Sans CJK TC', 'Noto Sans CJK JP', 'Noto Sans CJK SC'):
    if cand in [f.name for f in fm.fontManager.ttflist]:
        plt.rcParams['font.family'] = cand
        break
INK, MUTE = '#1f2328', '#6b7280'
COL = {'white': '#ffffff', 'black': '#2b2d31', 'silver': '#c9ccd1', 'green': '#2f8f5b', 'pcb': '#3b4450',
       'brass': '#c9a54a', 'amber': '#d9a441', 'blue': '#3b6fb6', 'glass': '#3f7fa6', 'red': '#b04a38'}
IN_C, OUT_C = '#2f7fd1', '#d9502f'
R_BADGE = 3.4


def spread(vals, gap, lo, hi):
    """1-D label placement: keep order, enforce a minimum gap, stay in [lo, hi]."""
    order = sorted(range(len(vals)), key=lambda i: vals[i])
    pos = [vals[i] for i in order]
    for _ in range(200):
        moved = False
        for k in range(1, len(pos)):
            if pos[k] - pos[k - 1] < gap:
                d = (gap - (pos[k] - pos[k - 1])) / 2
                pos[k - 1] -= d
                pos[k] += d
                moved = True
        pos = [min(max(p, lo), hi) for p in pos]
        if not moved:
            break
    out = [0.0] * len(vals)
    for k, i in enumerate(order):
        out[i] = pos[k]
    return out


def cyl_axis(prim):
    (r1, f1, u1), (r2, f2, u2) = prim[1], prim[2]
    d = [abs(r2 - r1), abs(f2 - f1), abs(u2 - u1)]
    return 'rfu'[d.index(max(d))]


def shape(ax, prim, view, **kw):
    """Draw one primitive. side view: x = -f, y = u.  top view: x = -f, y = -r."""
    r0, r1, f0, f1, u0, u1 = aabb(prim)
    if prim[0] == 'cyl':
        (rc, fc_, uc) = prim[1]
        if view == 'side' and cyl_axis(prim) == 'r':
            return ax.add_patch(Circle((-fc_, uc), prim[3], **kw))
        if view == 'top' and cyl_axis(prim) == 'u':
            return ax.add_patch(Circle((-fc_, -rc), prim[3], **kw))
    if prim[0] == 'rbox' and view == 'top':
        return ax.add_patch(FancyBboxPatch((-f1, -r1), f1 - f0, r1 - r0, boxstyle=f'round,pad=0,rounding_size={prim[7]}', **kw))
    if view == 'side':
        return ax.add_patch(Rectangle((-f1, u0), f1 - f0, u1 - u0, **kw))
    return ax.add_patch(Rectangle((-f1, -r1), f1 - f0, r1 - r0, **kw))


def badge(ax, x, y, n):
    ax.add_patch(Circle((x, y), R_BADGE, fc='white', ec=INK, lw=1.1, zorder=11))
    ax.text(x, y, str(n), ha='center', va='center', fontsize=8, fontweight='bold', zorder=12)


def leader(ax, ax0, ay0, bx, by):
    ax.plot([ax0, bx], [ay0, by], color=INK, lw=0.7, zorder=10)
    ax.add_patch(Circle((ax0, ay0), 0.9, fc=INK, ec='none', zorder=10))


def anchor_side(p, M):
    r0, r1, f0, f1, u0, u1 = p.bounds()
    if p.side:
        return -p.side[0], p.side[1]
    if p.group == 'shell':
        return -(M['FR'] - 1.5), M['H'] * 0.62
    if p.group == 'lid':
        return -(M['RE'] + 14), M['H'] - 1.5
    return -(f0 + f1) / 2, (u0 + u1) / 2


def anchor_top(p, M):
    r0, r1, f0, f1, u0, u1 = p.bounds()
    if p.top:
        return -p.top[1], -p.top[0]
    if p.group == 'shell':
        return -(M['FR'] - 1.5), -(M['HW'] * 0.35)
    return -(f0 + f1) / 2, -(r0 + r1) / 2


def draw(key, out):
    parts, M = BUILDS[key]()
    fig = plt.figure(figsize=(17, 9.2), dpi=150)
    axS = fig.add_axes([0.02, 0.06, 0.42, 0.88])
    axT = fig.add_axes([0.45, 0.22, 0.31, 0.70])
    axL = fig.add_axes([0.78, 0.06, 0.21, 0.88]); axL.axis('off')
    labels = [p for p in parts if p.label]
    num = {id(p): i for i, p in enumerate(labels, 1)}
    FR, RE, HW, H, W = M['FR'], M['RE'], M['HW'], M['H'], M['W']
    top = max(p.bounds()[5] for p in parts)
    g = min(p.bounds()[4] for p in parts)          # bottom of the feet = table

    # ------------------------------------------------ side x-ray: x = -f (front on the left), y = u
    for p in parts:
        for prim in p.plus:
            if p.group in ('shell', 'lid'):
                shape(axS, prim, 'side', fc='#f3f3f0', ec=INK, lw=1.4, zorder=1)
            elif p.group == 'boss':
                shape(axS, prim, 'side', fc='#e6e6e0', ec=MUTE, lw=0.6, zorder=2)
            elif p.xray:                                  # see-through housings: outline + light fill, parts show through
                shape(axS, prim, 'side', fc='#f7f7f4', ec=INK, lw=1.2, alpha=0.9, zorder=2.2)
            else:
                shape(axS, prim, 'side', fc=COL.get(p.color, '#999'), ec=INK, lw=0.7, alpha=0.92, zorder=3)
    axS.add_patch(Rectangle((-(FR - W), W), FR - RE - 2 * W, H - 2 * W, fc='none', ec=MUTE, lw=0.8, ls='--', zorder=2.5))
    axS.plot([-FR - 30, -RE + 30], [g, g], color=MUTE, lw=0.8)
    # callouts: body parts in a column right of the body, head parts in a column left of the head
    body = [p for p in labels if p.group != 'head']
    headp = [p for p in labels if p.group == 'head']
    colx = -RE + 14
    ys = spread([anchor_side(p, M)[1] for p in body], 2 * R_BADGE + 1.6, 2, top - 4)
    for p, y in zip(body, ys):
        x0, y0 = anchor_side(p, M)
        leader(axS, x0, y0, colx - R_BADGE, y)
        badge(axS, colx, y, num[id(p)])
    hx = min(-p.bounds()[3] for p in parts if p.group == 'head') - 12
    ys = spread([anchor_side(p, M)[1] for p in headp], 2 * R_BADGE + 1.6, H + 6, top)
    for p, y in zip(headp, ys):
        x0, y0 = anchor_side(p, M)
        leader(axS, x0, y0, hx + R_BADGE, y)
        badge(axS, hx, y, num[id(p)])
    # dimensions on the front (left) side
    dx = -FR - 10
    axS.annotate('', (dx, 0), (dx, H), arrowprops=dict(arrowstyle='<->', color=MUTE, lw=0.9))
    axS.text(dx - 1.5, H / 2, f'{H:.0f}', rotation=90, va='center', ha='right', color=MUTE, fontsize=8)
    dx2 = -FR - 22
    axS.annotate('', (dx2, g), (dx2, top), arrowprops=dict(arrowstyle='<->', color=MUTE, lw=0.9))
    axS.text(dx2 - 1.5, top / 2, f'總高 {top - g:.0f}', rotation=90, va='center', ha='right', color=MUTE, fontsize=8.5)
    axS.annotate('', (-FR, -8), (-RE, -8), arrowprops=dict(arrowstyle='<->', color=MUTE, lw=0.9))
    axS.text(-(FR + RE) / 2, -11, f'機身長 {FR - RE:.0f} mm', ha='center', va='top', color=MUTE, fontsize=9)
    axS.text(-FR - 30, top + 2, '← 鏡頭方向', ha='left', va='bottom', color=MUTE, fontsize=8)
    axS.set_xlim(-FR - 34, -RE + 24)
    axS.set_ylim(-18, top + 12)
    axS.set_aspect('equal'); axS.axis('off')
    axS.set_title('側面透視（鏡頭朝左）', fontsize=13, loc='left')

    # ------------------------------------------------ top view without lid/head: x = -f, y = -r (right side at the bottom)
    for p in parts:
        if p.group == 'lid' or (p.group == 'head' and not p.through):
            continue
        for prim in p.plus:
            r0, r1, f0, f1, u0, u1 = aabb(prim)
            if p.group == 'shell':
                if p.name == 'Base shell':
                    shape(axT, prim, 'top', fc='#f3f3f0', ec=INK, lw=1.4, zorder=1)
                continue
            if p.group == 'head' and u0 > H:              # parts of a through-lid head piece above the lid
                continue
            fc = '#e6e6e0' if p.group == 'boss' else COL.get(p.color, '#999')
            shape(axT, prim, 'top', fc=fc, ec=INK, lw=0.6, alpha=0.8, zorder=2 + u1 / 100)
    axT.add_patch(Rectangle((-(FR - W), -(HW - W)), FR - RE - 2 * W, 2 * (HW - W), fc='none', ec=MUTE, ls='--', lw=0.8, zorder=1.5))
    # airflow
    for kind, side, pos in M.get('flow', []):
        c = IN_C if kind == 'in' else OUT_C
        if side in ('L', 'R'):
            y_wall = HW if side == 'L' else -HW            # left side of the device is +y in this view
            inward = -1 if side == 'L' else 1
            if kind == 'in':
                a, b = (-pos, y_wall - inward * 9), (-pos, y_wall + inward * 4)
            else:
                a, b = (-pos, y_wall + inward * 4), (-pos, y_wall - inward * 11)
        else:                                               # 'B' = out of the rear wall
            a, b = (-RE - 4, -pos), (-RE + 11, -pos)
        axT.add_patch(FancyArrowPatch(a, b, arrowstyle='-|>', mutation_scale=12, color=c, lw=2.2, zorder=20))
    axT.text(-FR, HW + 25, '藍：進風　紅：排風', color=MUTE, fontsize=8.5, va='center')
    # callouts above (left half of the device) and below (right half)
    tp = [p for p in labels if p.group != 'lid' and (p.group != 'head' or p.through)]
    up = [p for p in tp if anchor_top(p, M)[1] >= 0]
    dn = [p for p in tp if anchor_top(p, M)[1] < 0]
    for grp, yrow in ((up, HW + 16), (dn, -HW - 17)):
        xs = spread([anchor_top(p, M)[0] for p in grp], 2 * R_BADGE + 1.6, -FR, -RE)
        for p, x in zip(grp, xs):
            x0, y0 = anchor_top(p, M)
            leader(axT, x0, y0, x, yrow - (R_BADGE if yrow > 0 else -R_BADGE))
            badge(axT, x, yrow, num[id(p)])
    axT.text(-(FR + RE) / 2, -HW - 24, f'寬 {2 * HW:.0f} mm', ha='center', va='top', color=MUTE, fontsize=9)
    axT.set_xlim(-FR - 8, -RE + 18); axT.set_ylim(-HW - 30, HW + 28)
    axT.set_aspect('equal'); axT.axis('off')
    axT.set_title('俯視（拿掉上蓋與雲台；下方是機身右側）', fontsize=13, loc='left')

    # ------------------------------------------------ legend
    axL.set_xlim(0, 1); axL.set_ylim(0, 1)
    axL.text(0, 0.985, M['name'], fontsize=17, fontweight='bold', va='top')
    axL.text(0, 0.935, f'機身 {2 * HW:.0f}×{FR - RE:.0f}×{H:.0f} mm（寬×長×高）', fontsize=10, color=MUTE, va='top')
    axL.text(0, 0.905, f'含雲台總高 {top - g:.0f} mm', fontsize=10, color=MUTE, va='top')
    y = 0.85
    for i, p in enumerate(labels, 1):
        axL.plot([0.035], [y - 0.011], 'o', ms=15, mfc='white', mec=INK, mew=1.1)
        axL.text(0.035, y - 0.011, str(i), ha='center', va='center', fontsize=8, fontweight='bold')
        axL.text(0.09, y, p.label, fontsize=10.5, va='top')
        y -= 0.052
    fig.savefig(out, facecolor='white')
    print('wrote', out)


if __name__ == '__main__':
    for k in sys.argv[1:] or ['v1', 'v2']:
        draw(k, f'layout_{k}.png')
