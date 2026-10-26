"""把 scan.py 拍的資料集重建成點雲。

流程: 特徵比對校正每張朝向 → 單目深度推論 → 對齊各張尺度 → 反投影融合 → 輸出
用法: python build.py scans/<資料夾> [--model models/depth_metric_indoor.onnx]
輸出(在資料夾內): cloud.ply、panorama.jpg、depth/ 深度預覽圖與 .npy、points.bin(給網頁檢視器)、build.json(校正結果)
"""
import argparse
import itertools
import json
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort
import open3d as o3d

MEAN = np.array([0.485, 0.456, 0.406], np.float32)
STD = np.array([0.229, 0.224, 0.225], np.float32)
MAX_DEPTH = 8.0          # 公尺,超過的點丟掉(室內)
EDGE_THRESH = 0.03       # 深度相對跳變超過這個比例就當成邊緣鬼影剔除
GRAZING = 0.2            # 表面法線與視線夾角的 cos 小於這個(幾乎平行視線)就丟掉,避免拉成長條
SCALE_CLAMP = (0.8, 1.25)  # 尺度係數上下限;近距離拍桌面時對齊不可靠,不讓它修正太多
VOXEL = 0.015            # 融合用的體素大小(公尺)


# ---------------------------------------------------------------- 深度推論
class DepthModel:
    """包一層,之後換成 Hailo 只要改這個類別。"""

    def __init__(self, path):
        opt = ort.SessionOptions()
        opt.intra_op_num_threads = 2     # Pi 供電只有 1.5A,全核滿載會當機
        self.sess = ort.InferenceSession(path, opt, providers=["CPUExecutionProvider"])
        inp = self.sess.get_inputs()[0]
        self.name = inp.name
        self.h, self.w = inp.shape[2], inp.shape[3]

    def __call__(self, bgr):
        rgb = cv2.cvtColor(cv2.resize(bgr, (self.w, self.h), interpolation=cv2.INTER_CUBIC), cv2.COLOR_BGR2RGB)
        x = ((rgb.astype(np.float32) / 255 - MEAN) / STD).transpose(2, 0, 1)[None]
        depth = self.sess.run(None, {self.name: x})[0].reshape(self.h, self.w)
        return depth.astype(np.float32)     # z 深度,公尺



# ---------------------------------------------------------------- 幾何
def rot(pan, tilt, pan_sign=1, tilt_sign=1):
    """相機座標(x 右, y 下, z 前)→ 世界座標。先水平轉 pan,再在相機本地座標俯仰 tilt。"""
    a, b = np.radians(pan_sign * pan), np.radians(tilt_sign * tilt)
    ry = np.array([[np.cos(a), 0, np.sin(a)], [0, 1, 0], [-np.sin(a), 0, np.cos(a)]])
    rx = np.array([[1, 0, 0], [0, np.cos(b), -np.sin(b)], [0, np.sin(b), np.cos(b)]])
    return ry @ rx


def rot_angle(r):
    return np.degrees(np.arccos(np.clip((np.trace(r) - 1) / 2, -1, 1)))


class Camera:
    """針孔 + 一階徑向畸變。參數以原圖解析度(w0 寬)為準,其他解析度自動換算。"""

    def __init__(self, f, cx, cy, k1, w0):
        self.f, self.cx, self.cy, self.k1, self.w0 = f, cx, cy, k1, w0

    def rays_at(self, u, v, s=1.0):
        """像素(在縮放 s 倍的影像上)→ 去畸變後 z=1 的視線。"""
        x, y = (u / s - self.cx) / self.f, (v / s - self.cy) / self.f
        k = 1 + self.k1 * (x * x + y * y)
        return np.stack([x * k, y * k, np.ones_like(x)], -1)

    def rays(self, w, h):
        u, v = np.meshgrid(np.arange(w, dtype=float), np.arange(h, dtype=float))
        return self.rays_at(u, v, w / self.w0)

    def project(self, pc, w):
        """相機座標點 → 寬 w 影像上的像素(z<=0 的回傳 nan)。"""
        z = np.where(pc[:, 2] > 1e-3, pc[:, 2], np.nan)
        xu, yu = pc[:, 0] / z, pc[:, 1] / z
        x, y = xu, yu
        for _ in range(5):                                   # 反解畸變
            k = 1 + self.k1 * (x * x + y * y)
            x, y = xu / k, yu / k
        s = w / self.w0
        return np.stack([(x * self.f + self.cx) * s, (y * self.f + self.cy) * s], -1)


def match_pairs(images, frames):
    """找出有重疊的相鄰張,回傳 RANSAC 過濾後的對應點。"""
    sift = cv2.SIFT_create(3000)
    feats = [sift.detectAndCompute(cv2.cvtColor(im, cv2.COLOR_BGR2GRAY), None) for im in images]
    matcher = cv2.BFMatcher()
    pairs = []
    for i, j in itertools.combinations(range(len(frames)), 2):
        if abs(frames[i]["pan"] - frames[j]["pan"]) > 35 or abs(frames[i]["tilt"] - frames[j]["tilt"]) > 25:
            continue
        (k1, d1), (k2, d2) = feats[i], feats[j]
        if d1 is None or d2 is None or len(k1) < 30 or len(k2) < 30:
            continue
        good = [m for m, n in matcher.knnMatch(d1, d2, k=2) if m.distance < 0.7 * n.distance]
        if len(good) < 20:
            continue
        p1 = np.float64([k1[m.queryIdx].pt for m in good])
        p2 = np.float64([k2[m.trainIdx].pt for m in good])
        H, mask = cv2.findHomography(p1, p2, cv2.RANSAC, 6.0)
        if H is not None and mask.sum() >= 15:
            m = mask.ravel() == 1
            pairs.append((i, j, p1[m], p2[m], H))
    return pairs


def calibrate(images, frames, w, h):
    """旋轉版的光束法平差:用所有重疊配對,一起解俯仰零點偏移和每張的朝向。
    馬達角度當作先驗(允許每張偏差 1~2 度,吸收齒隙和安裝誤差)。"""
    from scipy.optimize import least_squares
    from scipy.spatial.transform import Rotation

    raw = match_pairs(images, frames)
    n = len(frames)
    pan = np.array([f["pan"] for f in frames])
    tilt = np.array([f["tilt"] for f in frames])

    # 白牆、天花板容易配錯。用單應矩陣粗估每對的相對旋轉,跟馬達角度差太多的整對丟掉;
    # 同時用「哪組正負方向讓最多配對吻合」決定雲台方向。
    K = np.array([[1410 * w / 1280, 0, w / 2], [0, 1410 * w / 1280, h / 2], [0, 0, 1]])
    rel = []
    for i, j, p1, p2, Hm in raw:
        u, _, vt = np.linalg.svd(np.linalg.inv(K) @ Hm @ K)
        rel.append(u @ vt * np.sign(np.linalg.det(u @ vt)))
    best = None
    for ps, ts, t0 in itertools.product((1, -1), (1, -1), range(-60, 61, 5)):
        errs = [rot_angle(r.T @ rot(pan[j], tilt[j] + t0, ps, ts).T @ rot(pan[i], tilt[i] + t0, ps, ts))
                for (i, j, *_), r in zip(raw, rel)]
        ok = [e < 10 for e in errs]
        score = (sum(ok), -np.median(errs))
        if best is None or score > best[0]:
            best = (score, ps, ts, t0, ok)
    _, ps, ts, t0, ok = best
    pairs = [p for p, k in zip(raw, ok) if k]
    print(f"  配對 {len(raw)} 組,與馬達角度吻合 {len(pairs)} 組(其餘視為誤配)  "
          f"對應點 {sum(len(p[2]) for p in pairs)}")
    I = np.concatenate([np.full(len(p[2]), p[0]) for p in pairs])
    J = np.concatenate([np.full(len(p[2]), p[1]) for p in pairs])
    P1 = np.concatenate([p[2] for p in pairs])
    P2 = np.concatenate([p[3] for p in pairs])
    prior = np.radians(1.5)
    # 焦距固定用規格值(C270 對角 55° → 1280 寬約 1410px)。純旋轉資料分不開「焦距」和「轉角」,
    # 加上鏡頭不在轉軸上造成的近物視差,放開焦距會被拉到不合理的值。
    cam = Camera(1410 * w / 1280, w / 2, h / 2, 0.0, w)
    R1 = cam.rays_at(P1[:, 0], P1[:, 1])
    R2 = cam.rays_at(P2[:, 0], P2[:, 1])

    def rotations(x):
        Rs = np.array([rot(p, t + x[0], ps, ts) for p, t in zip(pan, tilt)])
        return Rs @ Rotation.from_rotvec(x[1:].reshape(n, 3)).as_matrix()

    def residuals(x):
        Rs = rotations(x)
        Rij = np.einsum("nki,nkj->nij", Rs[J], Rs[I])              # 相機 i → 相機 j
        e1 = cam.project(np.einsum("nij,nj->ni", Rij, R1), w) - P2
        e2 = cam.project(np.einsum("nji,nj->ni", Rij, R2), w) - P1
        e = np.nan_to_num(np.concatenate([e1, e2]), nan=100.0)
        return np.concatenate([e.ravel() / 3.0,                      # 雙向重投影誤差(像素),σ≈3px
                               x[1:] / prior])                       # 每張偏離馬達角度的先驗

    x0 = np.concatenate([[t0], np.zeros(3 * n)])
    res = least_squares(residuals, x0, loss="soft_l1", f_scale=3.0, max_nfev=300)
    Rs = rotations(res.x)
    e = residuals(res.x)[: 4 * len(P1)].reshape(-1, 2) * 3.0
    err = np.median(np.linalg.norm(e, axis=1))
    dev = np.degrees(np.linalg.norm(res.x[1:].reshape(n, 3), axis=1))
    print(f"  pan 方向 {ps:+d}  tilt 方向 {ts:+d}  焦距 {cam.f:.0f}px(固定)  俯仰零點 {res.x[0]:+.1f}°")
    print(f"  對應點誤差中位數 {err:.1f}px  各張偏離馬達角度 中位數 {np.median(dev):.1f}° 最大 {dev.max():.1f}°")
    return cam, Rs, {"pan_sign": ps, "tilt_sign": ts, "tilt_offset": res.x[0], "match_err_px": err}


# ---------------------------------------------------------------- 主流程
def edge_mask(depth):
    gx = np.abs(cv2.Sobel(depth, cv2.CV_32F, 1, 0, ksize=3))
    gy = np.abs(cv2.Sobel(depth, cv2.CV_32F, 0, 1, ksize=3))
    return (np.maximum(gx, gy) / 8 / np.maximum(depth, 1e-3)) < EDGE_THRESH


def grazing_mask(depth, rays):
    """斜看的表面(桌面、地板貼著視線)深度一點誤差就會拉成長條,把這些像素去掉。"""
    p = rays * cv2.GaussianBlur(depth, (5, 5), 0)[..., None]
    dx, dy = np.zeros_like(p), np.zeros_like(p)
    dx[:, 1:-1] = p[:, 2:] - p[:, :-2]
    dy[1:-1] = p[2:] - p[:-2]
    n = np.cross(dx, dy)
    n /= np.linalg.norm(n, axis=-1, keepdims=True) + 1e-9
    v = p / np.linalg.norm(p, axis=-1, keepdims=True)
    return np.abs((n * v).sum(-1)) > GRAZING


def backproject(depth, rays, R, scale=1.0):
    return (rays * (depth * scale)[..., None]) @ R.T


def align_scales(depths, cam, rays, Rs):
    """相鄰張的重疊區,同一條視線上的深度應該一樣;解出每張的尺度係數。"""
    n = len(depths)
    h, w = depths[0].shape
    rows, rhs = [], []
    for i in range(n):
        pts = backproject(depths[i], rays, Rs[i])[::4, ::4].reshape(-1, 3)
        for j in range(n):
            if i == j or rot_angle(Rs[i].T @ Rs[j]) > 45:
                continue
            pc = pts @ Rs[j]                                   # 世界 → 相機 j
            uv = cam.project(pc, w)
            ok = np.isfinite(uv).all(1)
            u = np.round(uv[:, 0], 0)
            v = np.round(uv[:, 1], 0)
            ok &= (u >= 0) & (u < w) & (v >= 0) & (v < h)
            if ok.sum() < 500:
                continue
            ratio = depths[j][v[ok].astype(int), u[ok].astype(int)] / pc[ok, 2]
            row = np.zeros(n)
            row[i], row[j] = -1, 1                            # log s_i - log s_j = log(d_j / z_from_i)
            rows.append(row)
            rhs.append(-np.log(np.median(ratio)))
    if not rows:
        return np.ones(n)
    rows.append(np.ones(n))                                  # 平均尺度維持 1(保留模型的公制尺度)
    rhs.append(0)
    logs, *_ = np.linalg.lstsq(np.array(rows), np.array(rhs), rcond=None)
    return np.exp(logs)


def panorama(images, cam, Rs, px_per_deg=6):
    """等距柱狀投影全景圖,範圍依各張朝向自動決定。lon 向右、lat 向下為正。"""
    centers = Rs[:, :, 2]
    lons = np.degrees(np.arctan2(centers[:, 0], centers[:, 2]))
    lats = np.degrees(np.arcsin(np.clip(centers[:, 1], -1, 1)))
    lo_rng = (int(lons.min()) - 35, int(lons.max()) + 35)
    la_rng = (max(int(lats.min()) - 25, -90), min(int(lats.max()) + 25, 90))
    W = (lo_rng[1] - lo_rng[0]) * px_per_deg
    H = (la_rng[1] - la_rng[0]) * px_per_deg
    lon, lat = np.meshgrid(np.radians(np.linspace(*lo_rng, W)), np.radians(np.linspace(*la_rng, H)))
    d = np.stack([np.sin(lon) * np.cos(lat), np.sin(lat), np.cos(lon) * np.cos(lat)], -1).reshape(-1, 3)
    out = np.zeros((H * W, 3), np.uint8)
    best = np.full(H * W, np.inf)
    for img, R in zip(images, Rs):
        h, w = img.shape[:2]
        uv = cam.project(d @ R, w)
        inb = np.isfinite(uv).all(1)
        inb[inb] = (uv[inb, 0] >= 0) & (uv[inb, 0] < w - 1) & (uv[inb, 1] >= 0) & (uv[inb, 1] < h - 1)
        dist = np.hypot(uv[:, 0] - w / 2, uv[:, 1] - h / 2)
        take = inb & (dist < best)
        best[take] = dist[take]
        m = np.nan_to_num(uv, nan=-1).astype(np.float32).reshape(H, W, 2)
        warped = cv2.remap(img, m[..., 0], m[..., 1], cv2.INTER_LINEAR).reshape(-1, 3)
        out[take] = warped[take]
    return out.reshape(H, W, 3)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("scan")
    ap.add_argument("--model", default="models/depth_metric_indoor.onnx")
    args = ap.parse_args()
    root = Path(args.scan)
    meta = json.loads((root / "scan.json").read_text())
    frames = meta["frames"]
    images = [cv2.imread(str(root / f["file"])) for f in frames]
    H0, W0 = images[0].shape[:2]

    print("1/5 校正:雲台方向、焦距、畸變、每張朝向")
    cam, Rs, calib = calibrate(images, frames, W0, H0)

    print("2/5 拼全景圖")
    cv2.imwrite(str(root / "panorama.jpg"), panorama(images, cam, Rs))

    print("3/5 深度推論")
    model = DepthModel(args.model)
    (root / "depth").mkdir(exist_ok=True)
    depths = []
    for k, img in enumerate(images):
        d = model(img)
        depths.append(d)
        np.save(root / "depth" / (Path(frames[k]["file"]).stem + ".npy"), d.astype(np.float16))   # 給 detect3d.py 用
        vis = cv2.applyColorMap(cv2.convertScaleAbs(np.clip(d, 0, MAX_DEPTH), alpha=255 / MAX_DEPTH), cv2.COLORMAP_TURBO)
        cv2.imwrite(str(root / "depth" / frames[k]["file"]), np.hstack([cv2.resize(img, vis.shape[1::-1]), vis]))
        print(f"  {k + 1}/{len(images)}  深度範圍 {d.min():.2f}–{d.max():.2f} m", end="\r")
    print()

    dh, dw = depths[0].shape
    rays = cam.rays(dw, dh)
    scales = np.clip(align_scales(depths, cam, rays, Rs), *SCALE_CLAMP)
    print("  尺度係數:", np.round(scales, 2).tolist())

    print("4/5 反投影與融合")
    all_pts, all_cols = [], []
    for img, d, R, s in zip(images, depths, Rs, scales):
        col = cv2.cvtColor(cv2.resize(img, (dw, dh), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2RGB)
        keep = edge_mask(d) & grazing_mask(d, rays) & (d * s < MAX_DEPTH) & (d > 0.1)
        # 只留畫面中央區域,邊緣讓給相鄰張(重疊區取較準的那張)
        m = np.zeros_like(keep)
        m[int(dh * 0.08):int(dh * 0.92), int(dw * 0.08):int(dw * 0.92)] = True
        keep &= m
        all_pts.append(backproject(d, rays, R, s)[keep])
        all_cols.append(col[keep])
    pcd = o3d.geometry.PointCloud()
    pcd.points = o3d.utility.Vector3dVector(np.concatenate(all_pts))
    pcd.colors = o3d.utility.Vector3dVector(np.concatenate(all_cols) / 255.0)
    print(f"  原始點數 {len(pcd.points):,}")
    pcd = pcd.voxel_down_sample(VOXEL)
    pcd, _ = pcd.remove_statistical_outlier(nb_neighbors=20, std_ratio=2.0)
    print(f"  融合後點數 {len(pcd.points):,}")

    print("5/5 輸出")
    o3d.io.write_point_cloud(str(root / "cloud.ply"), pcd)
    pts = np.asarray(pcd.points, np.float32)
    cols = (np.asarray(pcd.colors) * 255).astype(np.uint8)
    with open(root / "points.bin", "wb") as fh:
        fh.write(np.uint32(len(pts)).tobytes() + pts.tobytes() + cols.tobytes())
    calib.update(f=cam.f, cx=cam.cx, cy=cam.cy, k1=cam.k1, scales=scales.tolist(), rotations=Rs.tolist())
    (root / "build.json").write_text(json.dumps(calib, indent=2, default=float))
    print(f"完成 → {root}/cloud.ply")


if __name__ == "__main__":
    main()
