"""把全景掃描拼成等距柱狀全景圖,並產生「固定廣角鏡頭」對照組。

用法: ~/servo/bin/python panorama.py scans/<資料夾>
輸出: pano.jpg(全景,每度 PX_PER_DEG 像素)、pano.json(全景的角度範圍)
      fixed_wide120.jpg:120°×68° 廣角固定鏡頭,1280×720(一般監視器廣角)
      fixed_all.jpg:整個掃描範圍壓成 1280 寬(固定鏡頭能看到全部的最佳情況)
      fixed_center.jpg:pan 0 / tilt 0 那一張(C270 擺死不動)
"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np

F_PX = 1410
PX_PER_DEG = 12


def build(folder):
    meta = json.loads((folder / "scan.json").read_text())
    w, h = meta["width"], meta["height"]
    frames = [f for f in meta["frames"] if f["shot"] == 0]
    half_w, half_h = np.degrees(np.arctan(w / 2 / F_PX)), np.degrees(np.arctan(h / 2 / F_PX))
    pan0 = min(f["pan"] for f in frames) - half_w
    pan1 = max(f["pan"] for f in frames) + half_w
    tilt0 = min(f["tilt"] for f in frames) - half_h
    tilt1 = max(f["tilt"] for f in frames) + half_h
    W, H = int((pan1 - pan0) * PX_PER_DEG), int((tilt1 - tilt0) * PX_PER_DEG)
    a = np.radians(pan0 + (np.arange(W) + 0.5) / PX_PER_DEG)[None, :]
    b = np.radians(tilt1 - (np.arange(H) + 0.5) / PX_PER_DEG)[:, None]
    x, y, z = np.cos(b) * np.sin(a), -np.sin(b) * np.ones_like(a), np.cos(b) * np.cos(a)   # x 右 y 下 z 前

    pano = np.zeros((H, W, 3), np.uint8)
    best = np.full((H, W), np.inf, np.float32)
    for f in frames:
        p, t = np.radians(f["pan"]), np.radians(f["tilt"])
        x1 = x * np.cos(p) - z * np.sin(p)
        z1 = x * np.sin(p) + z * np.cos(p)
        y2 = y * np.cos(t) + z1 * np.sin(t)
        z2 = -y * np.sin(t) + z1 * np.cos(t)
        ok = z2 > 0.1
        u = np.where(ok, w / 2 + F_PX * x1 / np.where(ok, z2, 1), -1).astype(np.float32)
        v = np.where(ok, h / 2 + F_PX * y2 / np.where(ok, z2, 1), -1).astype(np.float32)
        d = np.hypot(u - w / 2, v - h / 2)
        take = (u >= 0) & (u < w - 1) & (v >= 0) & (v < h - 1) & (d < best)
        if not take.any():
            continue
        img = cv2.imread(str(folder / f["file"]))
        warped = cv2.remap(img, u, v, cv2.INTER_LINEAR)
        pano[take] = warped[take]
        best[take] = d[take]
    return pano, {"pan0": pan0, "pan1": pan1, "tilt0": tilt0, "tilt1": tilt1, "px_per_deg": PX_PER_DEG}


def main():
    folder = Path(sys.argv[1])
    pano, info = build(folder)
    cv2.imwrite(str(folder / "pano.jpg"), pano, [cv2.IMWRITE_JPEG_QUALITY, 92])
    (folder / "pano.json").write_text(json.dumps(info, indent=1))

    def crop_deg(pa, pb, ta, tb):
        x0, x1 = int((pa - info["pan0"]) * PX_PER_DEG), int((pb - info["pan0"]) * PX_PER_DEG)
        y0, y1 = int((info["tilt1"] - tb) * PX_PER_DEG), int((info["tilt1"] - ta) * PX_PER_DEG)
        return pano[max(y0, 0):y1, max(x0, 0):x1]

    # 120° 廣角固定鏡頭,對準掃描範圍中間(等距柱狀近似,不模擬魚眼變形)
    mid = (info["pan0"] + info["pan1"]) / 2
    wide = crop_deg(mid - 60, mid + 60, -34, 34)
    cv2.imwrite(str(folder / "fixed_wide120.jpg"), cv2.resize(wide, (1280, 720), interpolation=cv2.INTER_AREA))
    allv = cv2.resize(pano, (1280, round(1280 * pano.shape[0] / pano.shape[1])), interpolation=cv2.INTER_AREA)
    cv2.imwrite(str(folder / "fixed_all.jpg"), allv)
    meta = json.loads((folder / "scan.json").read_text())
    c = min((f for f in meta["frames"] if f["shot"] == 0), key=lambda f: abs(f["pan"]) + abs(f["tilt"]))
    cv2.imwrite(str(folder / "fixed_center.jpg"), cv2.imread(str(folder / c["file"])))
    print(f"全景 {pano.shape[1]}×{pano.shape[0]},pan {info['pan0']:.0f}~{info['pan1']:.0f}°,"
          f"tilt {info['tilt0']:.0f}~{info['tilt1']:.0f}°")


if __name__ == "__main__":
    main()
