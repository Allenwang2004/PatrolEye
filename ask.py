"""一句話查詢:解析目標 → 查空間記憶 → 雲台真的轉過去 → 格線定位、對準 → 放大 → 視覺模型判讀 → 回答。

live.py 呼叫 Asker.start(問題),網頁輪詢 Asker.status 看每一步進度。網頁上的文字和模型回答都是英文(比賽用)。
"""
import json
import math
import threading
import time
from pathlib import Path

import cv2

import vlm
from modes import KEYWORDS, MODES, en

ZOOM = 3            # 目標轉到畫面中央後,裁中間 1/3 給模型看(目標比較大,模型比較願意判讀)
GRID_COLS, GRID_ROWS = 6, 4      # 語言模型估座標很不準,改成畫格線讓它選格子(實測三張都選對)
F_PX = 1410
ANSWER_SCHEMA = {
    "type": "object",
    "properties": {"found": {"type": "boolean", "description": "Whether the target object is visible in the image"},
                   "answer": {"type": "string", "description": "A direct answer to the user's question, 1-2 English sentences"},
                   "confidence": {"type": "string", "enum": ["high", "medium", "low"]}},
    "required": ["found", "answer", "confidence"],
}
LOCATE_SCHEMA = {
    "type": "object",
    "properties": {"found": {"type": "boolean"},
                   "cells": {"type": "array", "items": {"type": "string"},
                             "description": "Grid cells containing the object, most important first"}},
    "required": ["found", "cells"],
}
PICK_SCHEMA = {"type": "object", "properties": {"target": {"type": "string"}}, "required": ["target"]}


def draw_grid(img):
    g = img.copy()
    h, w = g.shape[:2]
    for c in range(1, GRID_COLS):
        cv2.line(g, (w * c // GRID_COLS, 0), (w * c // GRID_COLS, h), (0, 255, 255), 2)
    for r in range(1, GRID_ROWS):
        cv2.line(g, (0, h * r // GRID_ROWS), (w, h * r // GRID_ROWS), (0, 255, 255), 2)
    for r in range(GRID_ROWS):
        for c in range(GRID_COLS):
            lab, x, y = f"{'ABCDEFGH'[r]}{c + 1}", w * c // GRID_COLS + 6, h * r // GRID_ROWS + 34
            cv2.putText(g, lab, (x, y), 0, 1.1, (0, 0, 0), 5)
            cv2.putText(g, lab, (x, y), 0, 1.1, (0, 255, 255), 2)
    return g


def cells_center(cells):
    """格子編號 → 中心位置(0~1)。多個格子取平均,第一個(最主要)加倍權重。"""
    pts = []
    for k, c in enumerate(cells):
        try:
            r, col = "ABCDEFGH".index(c[0].upper()), int(c[1:]) - 1
        except (ValueError, IndexError):
            continue
        if 0 <= r < GRID_ROWS and 0 <= col < GRID_COLS:
            pts += [((col + 0.5) / GRID_COLS, (r + 0.5) / GRID_ROWS)] * (2 if k == 0 else 1)
    if not pts:
        return None
    return sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)


def latest_memory():
    mems = sorted(Path("scans").glob("*/memory.json"))
    return mems[-1] if mems else None


class Asker:
    def __init__(self, pt, ptlock, fresh_frame, settle):
        self.pt, self.ptlock, self.fresh_frame, self.settle = pt, ptlock, fresh_frame, settle
        self.mode = "home"
        self.status = {"running": False, "q": "", "steps": [], "result": None}
        self.out = Path("asks")
        self.out.mkdir(exist_ok=True)

    def step(self, text):
        self.status["steps"].append({"t": time.strftime("%H:%M:%S"), "text": text})

    def start(self, q, mode="home", via="text"):
        if self.status["running"]:
            return False
        self.mode = mode if mode in MODES else "home"
        self.status = {"running": True, "q": q, "mode": self.mode, "via": via, "steps": [], "result": None,
                       "target": None, "started": time.time()}
        threading.Thread(target=self.run, args=(q,), daemon=True).start()
        return True

    def shoot(self, pan, tilt):
        with self.ptlock:
            self.pt.move(pan=pan, tilt=tilt)
            time.sleep(self.settle)
            real = self.pt.position()
        return self.fresh_frame(time.time()), real

    def locate(self, img, target):
        """在畫面上畫格線,問模型目標在哪一格。回傳 (x, y) 0~1,沒看到回傳 None。"""
        t0 = time.time()
        prompt = (f"The image has a yellow grid; each cell is labelled in its top-left corner "
                  f"(A1 to {'ABCDEFGH'[GRID_ROWS - 1]}{GRID_COLS}, row A is the top row, numbers go left to right). "
                  f"Is there a {en(target).lower()} in the image? If so, list the cells that contain its main body, "
                  f"most important first.")
        ans, _ = vlm.ask(draw_grid(img), prompt, LOCATE_SCHEMA)
        cloud = self.hailo_wait(t0)
        xy = cells_center(ans["cells"]) if ans["found"] else None
        return xy, ans["cells"], cloud

    def hailo_wait(self, t0):
        """模擬 Hailo-10H:每次判讀至少要 HAILO_SEC 秒。"""
        cloud = time.time() - t0
        if cloud < vlm.HAILO_SEC:
            time.sleep(vlm.HAILO_SEC - cloud)
        return cloud

    def pick_target(self, q, mem):
        ql = q.lower()
        for name, kws in KEYWORDS.items():
            if any(k in ql for k in kws) and any(m["name"] == name for m in mem):
                return name, "keyword"
        names = sorted({m["name"] for m in mem}, key=len, reverse=True)
        for n in names:
            if n in q or en(n).lower() in ql:
                return n, "keyword"
        self.step("No keyword match; asking the model which object to check…")
        t0 = time.time()
        listing = "\n".join(f"{n} ({en(n)})" for n in names)
        prompt = (f"The user asked: \"{q}\". Below are the objects in the spatial memory (Chinese name, English). "
                  f"Pick the one that most needs to be looked at, and reply with its Chinese name exactly as listed. "
                  f"If nothing is related, reply 無.\n{listing}")
        ans, _ = vlm.ask_text(prompt, PICK_SCHEMA)
        self.hailo_wait(t0)
        return (ans["target"] if ans["target"] in names else None), "model"

    def run(self, q):
        try:
            self._run(q)
        except Exception as e:
            self.step(f"Error: {e}")
            self.status["result"] = {"answer": f"Something went wrong: {e}", "found": False}
        finally:
            self.status["running"] = False
            self.status["sec"] = round(time.time() - self.status["started"], 1)
            self.log()

    def log(self):
        """每題的答案記下來,網頁顯示每個物品「最後一次確認」的結果。"""
        r = self.status["result"] or {}
        rec = {"t": time.strftime("%Y-%m-%d %H:%M:%S"), "mode": self.status["mode"], "q": self.status["q"],
               "target": r.get("target"), "found": r.get("found"), "answer": r.get("answer"),
               "confidence": r.get("confidence"), "crop": r.get("crop"), "full": r.get("full"),
               "sec": self.status["sec"]}
        with open(self.out / "log.jsonl", "a") as fh:
            fh.write(json.dumps(rec, ensure_ascii=False) + "\n")

    def _run(self, q):
        mpath = latest_memory()
        if not mpath:
            raise RuntimeError("No spatial memory yet. Scan the panorama and build the memory first.")
        mem = json.loads(mpath.read_text())
        target, how = self.pick_target(q, mem)
        if not target:
            self.status["result"] = {"answer": "That question doesn't match anything in the room memory.", "found": False}
            return
        name = en(target)
        self.status["target"] = target
        self.status["target_en"] = name
        self.step(f"Target: {name} (by {how})")
        hits = [m for m in mem if m["name"] == target]
        m = max(hits, key=lambda m: (m["seen"], -m["off_center"]))
        self.step(f"Memory: {name} at pan {m['pan']:.1f}°, tilt {m['tilt']:.1f}° "
                  f"(seen {m['seen']}× during the panorama scan)")

        self.step("Turning the camera…")
        img, real = self.shoot(m["pan"], m["tilt"])
        self.step(f"Arrived at pan {real[0]:.1f}°, tilt {real[1]:.1f}°. Accelerator checking the {name.lower()} "
                  f"is still there (simulated Hailo)…")
        xy, cells, cloud = self.locate(img, target)
        stamp = time.strftime("%Y%m%d_%H%M%S")
        cv2.imwrite(str(self.out / f"{stamp}_full.jpg"), img, [cv2.IMWRITE_JPEG_QUALITY, 92])
        if xy is None:
            self.step(f"No {name.lower()} at the remembered spot (cloud {cloud:.1f} s). "
                      f"Demo 2 will search nearby from here.")
            self.status["result"] = {"found": False, "target": target, "target_en": name, "confidence": "medium",
                                     "answer": f"The {name.lower()} isn't where I remember it "
                                               f"(pan {m['pan']:.0f}°, tilt {m['tilt']:.0f}°). It may have been moved.",
                                     "full": f"{stamp}_full.jpg", "crop": None}
            return
        h, w = img.shape[:2]
        dpan = math.degrees(math.atan((xy[0] - 0.5) * w / F_PX))
        dtilt = -math.degrees(math.atan((xy[1] - 0.5) * h / F_PX))
        self.step(f"Found the {name.lower()} in cells {', '.join(cells)} (cloud {cloud:.1f} s), "
                  f"off-center by pan {dpan:+.1f}°, tilt {dtilt:+.1f}°")
        if abs(dpan) > 3 or abs(dtilt) > 3:
            self.step("Re-aiming to center the target…")
            img, real = self.shoot(real[0] + dpan, real[1] + dtilt)
            cv2.imwrite(str(self.out / f"{stamp}_full.jpg"), img, [cv2.IMWRITE_JPEG_QUALITY, 92])
            self.step(f"Centered at pan {real[0]:.1f}°, tilt {real[1]:.1f}°")
        cw, ch = w // ZOOM, h // ZOOM
        x0, y0 = (w - cw) // 2, (h - ch) // 2
        crop = img[y0:y0 + ch, x0:x0 + cw]
        cv2.imwrite(str(self.out / f"{stamp}_crop.jpg"), crop, [cv2.IMWRITE_JPEG_QUALITY, 92])
        self.step(f"Zoomed into the center {ZOOM}×")

        self.step(f"Accelerator reading the image (simulated Hailo, at least {vlm.HAILO_SEC} s)…")
        t0 = time.time()
        prompt = (f"This is a zoomed-in frame from a monitoring pan-tilt camera after it turned toward the "
                  f"{name.lower()}; the target should be near the center. {MODES[self.mode]['tone']}\n"
                  f"The user asked: \"{q}\"\nFirst check whether the {name.lower()} is visible, then answer the "
                  f"question directly in English. If asked where it is, describe it using things in the room "
                  f"(what it sits on, what is next to it), not positions in the image. When reading numbers or hands "
                  f"(such as a clock's hour and minute hands), give the most likely reading; if unsure, set "
                  f"confidence to low and say what is hard to see.")
        ans, _ = vlm.ask(crop, prompt, ANSWER_SCHEMA)
        cloud = self.hailo_wait(t0)
        self.step(f"Done: cloud {cloud:.1f} s, total {time.time() - t0:.1f} s")
        self.status["result"] = {**ans, "target": target, "target_en": name, "pan": real[0], "tilt": real[1],
                                 "full": f"{stamp}_full.jpg", "crop": f"{stamp}_crop.jpg"}
