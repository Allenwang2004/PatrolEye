"""把兩次掃描(不同擺放位置)的點雲對齊、合併成一個。

兩次掃描的俯仰零點都校正過,所以「往下」的方向本來就一致,只需要解:水平旋轉、平移、尺度(單目深度
每次的整體尺度會差一點)共 5 個參數。

做法(試過的結果寫在後面):
1. 錨點粗對齊:兩次都辨識到、而且確認正確的物體(電視、行李箱、螢幕…)的 3D 中心當作對應點,解出粗略位置。
2. 引導式特徵比對:用粗略位置預測每個 SIFT 特徵點在另一次掃描的位置,只在附近 0.8 m 內找配對,
   再逐步收緊門檻(0.6 → 0.25 m)重算 5 個參數。
3. 合併輸出,另存每個點來自哪一次掃描。

不採用的方法:
- 點雲幾何特徵 FPFH + RANSAC:單目深度太粗糙,每次結果不同,而且會把重力方向轉歪 11°~170°。
- 全域 SIFT 比對:兩個位置幾乎對看,132 組配對只有 11 組一致,解出來的位置跟畫面矛盾。
- ICP 精修:會額外帶入約 5° 傾斜,重疊率只從 0.28 提升到 0.33。

用法: python merge.py scans/<基準> scans/<要對齊的> anchors.json [輸出資料夾]
anchors.json: [{"name": "電視", "moved": [x, y, z], "base": [x, y, z]}, ...](各自掃描座標下的物體中心)
"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np
import open3d as o3d
from scipy.spatial import cKDTree

from build import Camera

SEARCH = 0.8                        # 引導式比對的搜尋半徑(公尺)
THRESHOLDS = (0.6, 0.4, 0.3, 0.25)  # 逐步收緊的內點門檻;單目深度本身約 10% 誤差,不能設太緊


def load(path):
    b = (Path(path) / "points.bin").read_bytes()
    n = int(np.frombuffer(b[:4], np.uint32)[0])
    pts = np.frombuffer(b[4:4 + 12 * n], np.float32).reshape(-1, 3).astype(np.float64)
    cols = np.frombuffer(b[4 + 12 * n:4 + 15 * n], np.uint8).reshape(-1, 3) / 255.0
    pcd = o3d.geometry.PointCloud(o3d.utility.Vector3dVector(pts))
    pcd.colors = o3d.utility.Vector3dVector(cols)
    return pcd


def keypoints3d(root):
    """每張照片的 SIFT 特徵點,用深度圖和校正後的朝向轉成該次掃描的世界座標。"""
    root = Path(root)
    frames = json.loads((root / "scan.json").read_text())["frames"]
    cal = json.loads((root / "build.json").read_text())
    cam = Camera(cal["f"], cal["cx"], cal["cy"], cal["k1"], 1280)
    sift = cv2.SIFT_create(1500)
    P, D = [], []
    for k, f in enumerate(frames):
        img = cv2.imread(str(root / f["file"]), cv2.IMREAD_GRAYSCALE)
        depth = np.load(root / "depth" / (Path(f["file"]).stem + ".npy")).astype(np.float32)
        kps, des = sift.detectAndCompute(img, None)
        if des is None:
            continue
        uv = np.float32([kp.pt for kp in kps])
        s = depth.shape[1] / img.shape[1]
        d = depth[np.clip((uv[:, 1] * s).astype(int), 0, depth.shape[0] - 1),
                  np.clip((uv[:, 0] * s).astype(int), 0, depth.shape[1] - 1)] * cal["scales"][k]
        ok = (d > 0.3) & (d < 6)
        rays = cam.rays_at(uv[ok, 0], uv[ok, 1])
        P.append((rays * d[ok, None]) @ np.array(cal["rotations"][k]).T)
        D.append(des[ok])
    return np.concatenate(P), np.concatenate(D)


def yaw_matrix(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])


def fit(src, dst):
    """最小平方解 dst ≈ s·R_y(θ)·src + t(只有繞垂直軸旋轉)。"""
    ms, md = src.mean(0), dst.mean(0)
    a, b = src - ms, dst - md
    th = np.arctan2(np.sum(a[:, 2] * b[:, 0] - a[:, 0] * b[:, 2]), np.sum(a[:, 0] * b[:, 0] + a[:, 2] * b[:, 2]))
    R = yaw_matrix(th)
    ra = a @ R.T
    s = np.sum(ra * b) / np.sum(ra * ra)
    return s, th, md - s * (R @ ms)


def apply(s, th, t, P):
    return s * P @ yaw_matrix(th).T + t


def register(moved_root, base_root, anchors):
    S = np.array([a["moved"] for a in anchors])
    D = np.array([a["base"] for a in anchors])
    s, th, t = fit(S, D)
    e = np.linalg.norm(apply(s, th, t, S) - D, axis=1)
    print(f"  錨點粗對齊({len(anchors)} 個):水平轉 {np.degrees(th):+.1f}°  尺度 {s:.2f}  "
          f"殘差 {', '.join(f'{a['name']} {x:.2f} m' for a, x in zip(anchors, e))}")

    Ps, Ds = keypoints3d(moved_root)
    Pd, Dd = keypoints3d(base_root)
    tree = cKDTree(Pd)
    pairs = []
    for i, (p, d) in enumerate(zip(apply(s, th, t, Ps), Ds)):
        idx = tree.query_ball_point(p, SEARCH)
        if len(idx) < 2:
            continue
        dist = np.linalg.norm(Dd[idx] - d, axis=1)
        o = np.argsort(dist)
        if dist[o[0]] < 0.8 * dist[o[1]] and dist[o[0]] < 250:
            pairs.append((i, idx[o[0]]))
    A = Ps[[i for i, _ in pairs]]
    B = Pd[[j for _, j in pairs]]
    print(f"  引導式特徵配對 {len(pairs)} 組")
    for th_m in THRESHOLDS:
        inl = np.linalg.norm(apply(s, th, t, A) - B, axis=1) < th_m
        s, th, t = fit(A[inl], B[inl])
        err = np.linalg.norm(apply(s, th, t, A[inl]) - B[inl], axis=1)
        print(f"    門檻 {th_m} m:內點 {inl.sum()}  殘差中位數 {np.median(err) * 100:.1f} cm  "
              f"水平轉 {np.degrees(th):+.1f}°  尺度 {s:.3f}")
    return s, th, t, {"inliers": int(inl.sum()), "pairs": len(pairs), "median_err_m": float(np.median(err)),
                      "anchor_residuals_m": e.round(3).tolist()}


def main():
    base, moved, anchor_file = sys.argv[1], sys.argv[2], sys.argv[3]
    out = Path(sys.argv[4] if len(sys.argv) > 4 else f"scans/merge_{Path(base).name}_{Path(moved).name}")
    out.mkdir(parents=True, exist_ok=True)
    anchors = json.loads(Path(anchor_file).read_text())
    s, th, t, info = register(moved, base, anchors)
    print(f"結果:{Path(moved).name} 的相機在 {Path(base).name} 座標的 {np.round(t, 2)} m"
          f"(相距 {np.linalg.norm(t):.2f} m),水平轉 {np.degrees(th):+.1f}°,尺度 {s:.3f}")

    T = np.eye(4)
    T[:3, :3] = s * yaw_matrix(th)
    T[:3, 3] = t
    dst, src = load(base), load(moved)
    src.transform(T)
    # 各自先降採樣再合併,保留每個點的來源(0 = 基準,1 = 對齊過來的)
    a = dst.voxel_down_sample(0.015)
    b = src.voxel_down_sample(0.015)
    pts = np.concatenate([np.asarray(a.points), np.asarray(b.points)]).astype(np.float32)
    cols = (np.concatenate([np.asarray(a.colors), np.asarray(b.colors)]) * 255).astype(np.uint8)
    srcflag = np.concatenate([np.zeros(len(a.points), np.uint8), np.ones(len(b.points), np.uint8)])
    merged = o3d.geometry.PointCloud(o3d.utility.Vector3dVector(pts.astype(np.float64)))
    merged.colors = o3d.utility.Vector3dVector(cols / 255.0)
    o3d.io.write_point_cloud(str(out / "cloud.ply"), merged)
    (out / "points.bin").write_bytes(np.uint32(len(pts)).tobytes() + pts.tobytes() + cols.tobytes() + srcflag.tobytes())

    # 物體也一起搬過來
    objs = []
    for root, tf in ((base, None), (moved, (s, th, t))):
        for o in json.loads((Path(root) / "objects.json").read_text()):
            o = dict(o, source=Path(root).name)
            if tf:
                c = apply(*tf, np.array([o["center"]]))
                # 旋轉後的外框重新取軸向包圍盒
                corners = np.array([[x, y, z] for x in (o["min"][0], o["max"][0])
                                    for y in (o["min"][1], o["max"][1]) for z in (o["min"][2], o["max"][2])])
                cc = apply(*tf, corners)
                o.update(center=c[0].round(3).tolist(), min=cc.min(0).round(3).tolist(), max=cc.max(0).round(3).tolist(),
                         distance=round(float(np.linalg.norm(c[0])), 2))
            objs.append(o)
    (out / "objects.json").write_text(json.dumps(objs, indent=1, ensure_ascii=False))
    (out / "merge.json").write_text(json.dumps({
        "base": base, "moved": moved, "transform": T.tolist(), "yaw": float(np.degrees(th)), "scale": float(s),
        "moved_camera": t.round(3).tolist(), **info}, indent=2))
    print(f"合併後 {len(pts):,} 點({len(a.points):,} + {len(b.points):,})→ {out}")


if __name__ == "__main__":
    main()
