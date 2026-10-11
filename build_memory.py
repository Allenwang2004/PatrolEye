"""第 0 步:全景掃描 → 逐張問視覺模型 → 空間記憶(文字檔,不含照片)。

用法: ~/servo/bin/python build_memory.py scans/<資料夾> [同時幾個請求,預設 3]
輸出: <資料夾>/detections.json(每張的原始回答)、memory.json、memory.txt
"""
import json
import math
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import vlm

F_PX = 1410            # C270 焦距(1280 寬),見 reconstruct-pipeline 校正結果
MERGE_DEG = 12         # 同名物品角度差小於這個就當作同一個

NAMES = "時鐘、平板儀表、水龍頭、水槽、門、櫃門、燈、窗戶、電視、冰箱、椅子、桌子、包包、箱子"
PROMPT = f"""這是居家監控雲台拍的一張照片。列出畫面中值得記住位置的物品(最多 12 個)。
- name:物品名稱,能對應就用這些名字:{NAMES};其他物品用簡短中文名稱
- x, y:物品中心在畫面中的位置,0~1 的比例(左上角是 0,0)
- state:看得出來的狀態,例如 開/關、亮/暗、時鐘的時間、儀表的數值;看不出來就留空
- partial:物品是否被畫面邊緣切到"""
SCHEMA = {
    "type": "object",
    "properties": {"objects": {"type": "array", "items": {
        "type": "object",
        "properties": {"name": {"type": "string"}, "x": {"type": "number"}, "y": {"type": "number"},
                       "state": {"type": "string"}, "partial": {"type": "boolean"}},
        "required": ["name", "x", "y", "state", "partial"]}}},
    "required": ["objects"],
}


def to_angle(fr, x, y, w, h):
    """畫面位置 → 雲台角度(pan 右為 +,tilt 上為 +)。"""
    pan = fr["pan"] + math.degrees(math.atan((x - 0.5) * w / F_PX))
    tilt = fr["tilt"] - math.degrees(math.atan((y - 0.5) * h / F_PX))
    return round(pan, 1), round(tilt, 1)


def merge(dets):
    """同名、角度相近的合成一筆;位置和狀態用最靠近畫面中心、沒被切到的那次。"""
    groups = []
    for d in sorted(dets, key=lambda d: (d["partial"], d["off_center"])):
        for g in groups:
            if g["name"] == d["name"] and math.hypot(g["pan"] - d["pan"], g["tilt"] - d["tilt"]) < MERGE_DEG:
                g["seen"] += 1
                break
        else:
            groups.append({**d, "seen": 1})
    return sorted(groups, key=lambda g: (g["name"], g["pan"]))


def main():
    folder = Path(sys.argv[1])
    workers = int(sys.argv[2]) if len(sys.argv) > 2 else 3
    meta = json.loads((folder / "scan.json").read_text())
    w, h = meta["width"], meta["height"]
    frames = [f for f in meta["frames"] if f["shot"] == 0]
    t0 = time.time()

    def one(fr):
        ans, sec = vlm.ask(folder / fr["file"], PROMPT, SCHEMA)
        print(f"{fr['file']}  pan {fr['pan']:6.1f} tilt {fr['tilt']:5.1f}  {len(ans['objects'])} 個  {sec:.0f}s", flush=True)
        return {"file": fr["file"], "pan": fr["pan"], "tilt": fr["tilt"], "objects": ans["objects"], "sec": sec}

    with ThreadPoolExecutor(workers) as ex:
        raw = list(ex.map(one, frames))
    (folder / "detections.json").write_text(json.dumps(raw, indent=1, ensure_ascii=False))

    dets = []
    for r in raw:
        for o in r["objects"]:
            p, t = to_angle(r, o["x"], o["y"], w, h)
            dets.append({"name": o["name"], "pan": p, "tilt": t, "state": o["state"], "partial": o["partial"],
                         "off_center": round(math.hypot(o["x"] - 0.5, o["y"] - 0.5), 3), "file": r["file"]})
    mem = merge(dets)
    (folder / "memory.json").write_text(json.dumps(mem, indent=1, ensure_ascii=False))
    lines = [f"{m['name']:<8} pan {m['pan']:6.1f}°  tilt {m['tilt']:5.1f}°  {m['state']}  (看到 {m['seen']} 次,{m['file']})"
             for m in mem]
    (folder / "memory.txt").write_text("\n".join(lines) + "\n")
    print("\n".join(lines))
    print(f"\n{len(frames)} 張,雲端實際 {time.time() - t0:.0f} 秒;"
          f"照 Hailo 每張 {vlm.HAILO_SEC} 秒估算 = {len(frames) * vlm.HAILO_SEC / 60:.1f} 分鐘")


if __name__ == "__main__":
    main()
