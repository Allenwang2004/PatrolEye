"""雲台掃描:走一個 pan/tilt 格點,每格停下拍一張,存成資料集。

用法: python scan.py [輸出資料夾]   (預設 scans/<時間>)
"""
import json
import os
import sys
import time
from pathlib import Path

import cv2
import numpy as np

from panilt import PanTilt

# ---- 掃描格點(度) ---------------------------------------------------
# 注意:2026-10-11 起 tilt + = 往上(panilt.py 方向改 -1),下面舊註解的正負號要反過來看
# 注意:2026-10-11 起 tilt 方向改成 + = 往上(panilt.py TILT 方向 -1),舊註解的正負號要反過來看。
# 水平可轉 -101°~+111°。俯仰:鏡頭在 0° 時朝上約 26°,所以 -50° ≈ 仰角 76°、+50° ≈ 俯角 24°;
# 往下超過 +60° 會受阻(見 test_range.py)。視角約 49°×29°,間距 30°×20° 保留約 3 成重疊
PAN_ANGLES = [-100, -70, -40, -10, 20, 50, 80, 110]
TILT_ANGLES = [-50, -30, -10, 10, 30, 50]
SETTLE = 0.6        # 到位後等多久再拍(秒),讓晃動停下來
WIDTH, HEIGHT = 1280, 720
# ---------------------------------------------------------------------


def open_camera():
    cap = cv2.VideoCapture(0, cv2.CAP_V4L2)
    cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*"MJPG"))
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, WIDTH)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, HEIGHT)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    for _ in range(20):                      # 讓自動曝光先穩定
        cap.read()
    return cap


def grab(cap):
    for _ in range(4):                       # 丟掉緩衝區裡移動中拍的舊畫面
        cap.grab()
    ok, frame = cap.read()
    if not ok:
        raise IOError("相機讀取失敗")
    return frame


def save(path, data):
    """每拍一張就寫一次並 fsync,當機也不會整批遺失。"""
    with open(path, "wb") as fh:
        fh.write(data)
        fh.flush()
        os.fsync(fh.fileno())


def main():
    out = Path(sys.argv[1] if len(sys.argv) > 1 else f"scans/{time.strftime('%Y%m%d_%H%M%S')}")
    out.mkdir(parents=True, exist_ok=True)
    cap = open_camera()
    frames = []
    with PanTilt(speed=300) as pt:          # 慢一點,降低伺服電流尖峰(伺服從 Pi 取電)
        for row, tilt in enumerate(TILT_ANGLES):
            # 蛇形走法,減少來回大幅轉動
            pans = PAN_ANGLES if row % 2 == 0 else PAN_ANGLES[::-1]
            for pan in pans:
                pt.move(pan=pan, tilt=tilt)
                time.sleep(SETTLE)
                img = grab(cap)
                real_pan, real_tilt = pt.position()          # 用馬達實際讀回的角度
                name = f"{len(frames):03d}.jpg"
                save(out / name, cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 95])[1].tobytes())
                frames.append({"file": name, "pan": real_pan, "tilt": real_tilt})
                meta = {"width": WIDTH, "height": HEIGHT, "frames": frames}
                save(out / "scan.json", json.dumps(meta, indent=2).encode())
                print(f"{name}  pan {real_pan:6.1f}  tilt {real_tilt:6.1f}")
        pt.move(0, 0)
    cap.release()
    print(f"完成,共 {len(frames)} 張 → {out}")


if __name__ == "__main__":
    main()
