"""Demo 1 對照測試:同一個問題、同一個模型,只換「給模型看什麼」。

  A1 固定廣角 120°   A2 固定鏡頭看全部(全景壓成一張)   B 固定正前方一張
  C  雲台:查記憶 → 用最靠近目標角度的那張
  D  雲台 + 放大重看:C 再裁出目標附近 1/3 畫面

用法: ~/servo/bin/python query_test.py scans/<資料夾> [questions.json]
questions.json: [{"q": "現在幾點?", "target": "時鐘", "truth": "3:10"}, ...](truth 可省略)
"""
import json
import math
import sys
from pathlib import Path

import cv2

import vlm
from build_memory import F_PX

DEFAULT_Q = [
    {"q": "現在幾點?請讀出時鐘的時間(幾點幾分)。", "target": "時鐘"},
    {"q": "這個時鐘是什麼樣子、放在什麼上面?", "target": "時鐘"},
]
SCHEMA = {
    "type": "object",
    "properties": {"found": {"type": "boolean", "description": "畫面中有沒有看到問題裡的目標"},
                   "answer": {"type": "string"},
                   "confidence": {"type": "string", "enum": ["高", "中", "低"]}},
    "required": ["found", "answer", "confidence"],
}
ZOOM = 3


def find_in_memory(mem, target):
    hits = [m for m in mem if target in m["name"] or m["name"] in target]
    return min(hits, key=lambda m: (m["partial"], m["off_center"])) if hits else None


def nearest_frame(frames, pan, tilt):
    return min(frames, key=lambda f: math.hypot(f["pan"] - pan, f["tilt"] - tilt))


def pixel_of(fr, pan, tilt, w, h):
    """目標角度 → 那張照片裡的位置(0~1)。"""
    x = 0.5 + F_PX * math.tan(math.radians(pan - fr["pan"])) / w
    y = 0.5 - F_PX * math.tan(math.radians(tilt - fr["tilt"])) / h
    return x, y


def main():
    folder = Path(sys.argv[1])
    qs = json.loads(Path(sys.argv[2]).read_text()) if len(sys.argv) > 2 else DEFAULT_Q
    meta = json.loads((folder / "scan.json").read_text())
    w, h = meta["width"], meta["height"]
    frames = [f for f in meta["frames"] if f["shot"] == 0]
    mem = json.loads((folder / "memory.json").read_text())
    results = []
    for q in qs:
        m = find_in_memory(mem, q["target"])
        conds = {"A1 固定廣角120°": (folder / "fixed_wide120.jpg", None),
                 "A2 固定看全部": (folder / "fixed_all.jpg", None),
                 "B 固定正前方": (folder / "fixed_center.jpg", None)}
        if m:
            fr = nearest_frame(frames, m["pan"], m["tilt"])
            x, y = pixel_of(fr, m["pan"], m["tilt"], w, h)
            s = 1 / ZOOM
            x0, y0 = min(max(x - s / 2, 0), 1 - s), min(max(y - s / 2, 0), 1 - s)
            conds["C 雲台+記憶"] = (folder / fr["file"], None)
            conds[f"D 雲台+放大{ZOOM}×"] = (folder / fr["file"], (x0, y0, x0 + s, y0 + s))
            print(f"\n【{q['q']}】記憶:{m['name']} pan {m['pan']}° tilt {m['tilt']}° → 用 {fr['file']}")
        else:
            print(f"\n【{q['q']}】記憶裡沒有「{q['target']}」,只能測固定鏡頭")
        for name, (img, crop) in conds.items():
            ans, sec = vlm.ask(img, q["q"], SCHEMA, crop=crop)
            print(f"  {name:<14} 找到={ans['found']!s:<5} 信心={ans['confidence']}  {ans['answer']}")
            results.append({"q": q["q"], "truth": q.get("truth"), "cond": name, **ans})
    (folder / "query_results.json").write_text(json.dumps(results, indent=1, ensure_ascii=False))


if __name__ == "__main__":
    main()
