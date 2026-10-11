"""在 build.py 的結果上做物體辨識,並把每個物體定位到房間的 3D 座標。

流程: 每張 YOLOv8-seg 分割 → 遮罩內的深度反投影到世界座標 → 跨照片合併同一個物體
用法: python detect3d.py scans/<資料夾> [--model models/yolov8s-seg.onnx]
輸出(在資料夾內): objects.json、detections.jpg(2D 辨識結果拼圖)
"""
import argparse
import json
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort

from build import Camera

CONF = 0.35              # 信心門檻
IOU = 0.5                # NMS 重疊門檻
MIN_POINTS = 40          # 遮罩內有效深度點太少就不要
MERGE_DIST = 0.45        # 公尺,同類別且中心距離小於這個(或物體尺寸的一半)視為同一個

COCO = ["person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat", "traffic light",
        "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat", "dog", "horse", "sheep", "cow",
        "elephant", "bear", "zebra", "giraffe", "backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee",
        "skis", "snowboard", "sports ball", "kite", "baseball bat", "baseball glove", "skateboard", "surfboard",
        "tennis racket", "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple",
        "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "couch",
        "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse", "remote", "keyboard",
        "cell phone", "microwave", "oven", "toaster", "sink", "refrigerator", "book", "clock", "vase",
        "scissors", "teddy bear", "hair drier", "toothbrush"]
ZH = ["人", "腳踏車", "汽車", "機車", "飛機", "公車", "火車", "卡車", "船", "紅綠燈",
      "消防栓", "停止標誌", "停車計時器", "長椅", "鳥", "貓", "狗", "馬", "羊", "牛",
      "大象", "熊", "斑馬", "長頸鹿", "背包", "雨傘", "手提包", "領帶", "行李箱", "飛盤",
      "滑雪板", "單板滑雪板", "球", "風箏", "球棒", "棒球手套", "滑板", "衝浪板",
      "網球拍", "瓶子", "酒杯", "杯子", "叉子", "刀子", "湯匙", "碗", "香蕉", "蘋果",
      "三明治", "橘子", "花椰菜", "紅蘿蔔", "熱狗", "披薩", "甜甜圈", "蛋糕", "椅子", "沙發",
      "盆栽", "床", "桌子", "馬桶", "電視/螢幕", "筆電", "滑鼠", "遙控器", "鍵盤",
      "手機", "微波爐", "烤箱", "烤麵包機", "水槽", "冰箱", "書", "時鐘", "花瓶",
      "剪刀", "玩偶", "吹風機", "牙刷"]


class Segmenter:
    """YOLOv8-seg 的 ONNX 推論。之後換成 Hailo 只要改這個類別。"""

    def __init__(self, path):
        opt = ort.SessionOptions()
        opt.intra_op_num_threads = 2     # Pi 供電不足,全核滿載會當機
        self.sess = ort.InferenceSession(path, opt, providers=["CPUExecutionProvider"])
        self.name = self.sess.get_inputs()[0].name
        self.size = self.sess.get_inputs()[0].shape[2]

    def __call__(self, bgr):
        h, w = bgr.shape[:2]
        S = self.size
        r = min(S / w, S / h)
        nw, nh = round(w * r), round(h * r)
        px, py = (S - nw) // 2, (S - nh) // 2
        canvas = np.full((S, S, 3), 114, np.uint8)
        canvas[py:py + nh, px:px + nw] = cv2.resize(bgr, (nw, nh))
        x = cv2.cvtColor(canvas, cv2.COLOR_BGR2RGB).astype(np.float32).transpose(2, 0, 1)[None] / 255
        out, protos = self.sess.run(None, {self.name: x})
        pred = out[0].T                                    # (8400, 4 + 80 + 32)
        scores = pred[:, 4:84]
        cls = scores.argmax(1)
        conf = scores.max(1)
        keep = conf > CONF
        pred, cls, conf = pred[keep], cls[keep], conf[keep]
        if not len(pred):
            return []
        xywh = pred[:, :4].copy()
        xywh[:, :2] -= xywh[:, 2:] / 2                       # 中心 → 左上角
        idx = cv2.dnn.NMSBoxesBatched(xywh.tolist(), conf.tolist(), cls.tolist(), CONF, IOU)
        idx = np.array(idx).reshape(-1)
        proto = protos[0].reshape(32, -1)
        P = protos.shape[2]
        dets = []
        for i in idx:
            m = 1 / (1 + np.exp(-(pred[i, 84:] @ proto))).reshape(P, P)
            x0, y0, bw, bh = xywh[i]
            box = np.zeros((P, P), bool)                     # 遮罩只保留框內
            b = (np.array([x0, y0, x0 + bw, y0 + bh]) * P / S).round().astype(int).clip(0, P)
            box[b[1]:b[3], b[0]:b[2]] = True
            m = cv2.resize((m * box).astype(np.float32), (S, S))[py:py + nh, px:px + nw]
            m = cv2.resize(m, (w, h)) > 0.5
            bb = np.array([(x0 - px) / r, (y0 - py) / r, (x0 + bw - px) / r, (y0 + bh - py) / r])
            dets.append({"cls": int(cls[i]), "conf": float(conf[i]), "mask": m, "box": bb.clip(0, [w, h, w, h])})
        return dets


def lift(det, depth, rays, R, s):
    """2D 遮罩 → 世界座標點。邊緣先侵蝕掉,再丟掉深度離中位數太遠的點(背景漏進遮罩)。"""
    dh, dw = depth.shape
    m = cv2.resize(det["mask"].astype(np.uint8), (dw, dh), interpolation=cv2.INTER_NEAREST)
    m = cv2.erode(m, np.ones((5, 5), np.uint8)).astype(bool)
    if m.sum() < MIN_POINTS:
        return None
    d = depth[m] * s
    med = np.median(d)
    ok = np.abs(d - med) < 0.15 * med
    if ok.sum() < MIN_POINTS:
        return None
    return (rays[m][ok] * d[ok, None]) @ R.T


def summarize(pts):
    lo, hi = np.percentile(pts, 5, axis=0), np.percentile(pts, 95, axis=0)
    return np.median(pts, axis=0), lo, hi


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("scan")
    ap.add_argument("--model", default="models/yolov8s-seg.onnx")
    args = ap.parse_args()
    root = Path(args.scan)
    frames = json.loads((root / "scan.json").read_text())["frames"]
    calib = json.loads((root / "build.json").read_text())
    images = [cv2.imread(str(root / f["file"])) for f in frames]
    H0, W0 = images[0].shape[:2]
    cam = Camera(calib["f"], calib["cx"], calib["cy"], calib["k1"], W0)
    Rs = np.array(calib["rotations"])
    scales = calib["scales"]
    depths = [np.load(root / "depth" / (Path(f["file"]).stem + ".npy")).astype(np.float32) for f in frames]
    dh, dw = depths[0].shape
    rays = cam.rays(dw, dh)

    seg = Segmenter(args.model)
    found, per_frame = [], []
    for k, img in enumerate(images):
        dets = seg(img)
        per_frame.append(dets)
        for det in dets:
            pts = lift(det, depths[k], rays, Rs[k], scales[k])
            if pts is not None:
                found.append({"cls": det["cls"], "conf": det["conf"], "frame": k, "pts": pts})
        print(f"  {k + 1}/{len(images)}  {len(dets)} 個偵測", end="\r")
    print(f"\n  2D 偵測 {sum(len(d) for d in per_frame)} 個,成功定位到 3D {len(found)} 個")

    # 跨照片合併:信心高的先當代表,同類別且位置接近的併進去
    objects = []
    for det in sorted(found, key=lambda d: -d["conf"]):
        c, lo, hi = summarize(det["pts"])
        for obj in objects:
            if obj["cls"] != det["cls"]:
                continue
            oc, olo, ohi = summarize(obj["pts"])
            radius = max(MERGE_DIST, 0.5 * float(np.max(ohi - olo)))
            if np.linalg.norm(c - oc) < radius:
                obj["pts"] = np.concatenate([obj["pts"], det["pts"]])
                obj["frames"].add(det["frame"])
                obj["confs"].append(det["conf"])
                break
        else:
            objects.append({"cls": det["cls"], "pts": det["pts"], "frames": {det["frame"]}, "confs": [det["conf"]]})

    out = []
    for obj in sorted(objects, key=lambda o: (-len(o["frames"]), -max(o["confs"]))):
        c, lo, hi = summarize(obj["pts"])
        out.append({
            "label": COCO[obj["cls"]], "label_zh": ZH[obj["cls"]],
            "conf": round(max(obj["confs"]), 3), "views": len(obj["frames"]),
            "frames": sorted(frames[f]["file"] for f in obj["frames"]),
            "center": np.round(c, 3).tolist(), "min": np.round(lo, 3).tolist(), "max": np.round(hi, 3).tolist(),
            "distance": round(float(np.linalg.norm(c)), 2),
        })
    (root / "objects.json").write_text(json.dumps(out, indent=2, ensure_ascii=False))
    for o in out:
        sz = np.subtract(o["max"], o["min"])
        print(f"  {o['label_zh']:6s} 信心 {o['conf']:.2f}  {o['views']} 張看到  距離 {o['distance']:.2f} m  "
              f"大小 {sz[0]:.2f}×{sz[1]:.2f}×{sz[2]:.2f} m")

    # 2D 結果拼圖:挑偵測最多的 6 張
    rng = np.random.default_rng(3)
    colors = {c: tuple(int(v) for v in rng.integers(60, 255, 3)) for c in range(80)}
    best = sorted(range(len(images)), key=lambda k: -len(per_frame[k]))[:6]
    tiles = []
    for k in sorted(best):
        vis = images[k].copy()
        for det in per_frame[k]:
            col = colors[det["cls"]]
            vis[det["mask"]] = (0.5 * vis[det["mask"]] + 0.5 * np.array(col)).astype(np.uint8)
            x0, y0, x1, y1 = det["box"].astype(int)
            cv2.rectangle(vis, (x0, y0), (x1, y1), col, 3)
            cv2.putText(vis, f"{COCO[det['cls']]} {det['conf']:.2f}", (x0 + 4, max(y0 + 28, 28)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2, cv2.LINE_AA)
        cv2.putText(vis, frames[k]["file"], (12, 700), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2, cv2.LINE_AA)
        tiles.append(cv2.resize(vis, (640, 360)))
    if len(tiles) % 2:
        tiles.append(np.zeros_like(tiles[0]))
    rows = [np.hstack(tiles[i:i + 2]) for i in range(0, len(tiles), 2)]
    cv2.imwrite(str(root / "detections.jpg"), np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 85])
    print(f"完成 → {root}/objects.json")


if __name__ == "__main__":
    main()
