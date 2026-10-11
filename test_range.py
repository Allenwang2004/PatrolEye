"""測試雲台可轉範圍:用伺服內存的限位,分段往外轉(50% → 80% → 極限前 5°),
每一步檢查是否到位、負載是否過高,並在最外側各拍一張照片。
結果即時寫入 scans/range_test/log.txt(當機也留得下紀錄)。
"""
import os
import time
from pathlib import Path

import cv2
import scservo_sdk as scs

from panilt import PORT, STEP_DEG, PAN_CFG, TILT_CFG

MARGIN = 57             # 離伺服限位保留約 5°
SPEED, ACC = 250, 10    # 慢速、低加速度,降低電流尖峰
MAX_ERR = 25            # 到位誤差超過這個(格,約 2°)視為卡住
MAX_LOAD = 500          # 負載超過 50% 視為受阻
OUT = Path("scans/range_test")


def log(msg):
    print(msg)
    with open(OUT / "log.txt", "a") as fh:
        fh.write(msg + "\n")
        fh.flush()
        os.fsync(fh.fileno())


class Servo:
    def __init__(self, port, pkt, sid, center, sign):
        self.port, self.pkt, self.sid, self.center, self.sign = port, pkt, sid, center, sign
        self.lo = pkt.read2ByteTxRx(port, sid, 9)[0] + MARGIN
        self.hi = pkt.read2ByteTxRx(port, sid, 11)[0] - MARGIN

    def read(self, addr, n=2):
        f = self.pkt.read2ByteTxRx if n == 2 else self.pkt.read1ByteTxRx
        val, res, _ = f(self.port, self.sid, addr)
        if res != scs.COMM_SUCCESS:
            raise IOError(f"讀不到 ID {self.sid}")
        return val

    def load(self):
        raw = self.read(60)
        return -(raw & 0x3FF) if raw & 0x400 else raw          # bit10 是方向

    def deg(self, steps):
        return self.sign * (steps - self.center) * STEP_DEG

    def steps(self, deg):
        return round(self.center + self.sign * deg / STEP_DEG)


def goto(s, target, timeout=8.0):
    """轉到 target(格),回傳 (是否正常, 實際位置, 過程中最大負載)。"""
    s.pkt.write2ByteTxRx(s.port, s.sid, 42, target)
    end, peak = time.time() + timeout, 0
    while time.time() < end:
        pos, ld = s.read(56), s.load()
        peak = max(peak, abs(ld))
        if abs(ld) > MAX_LOAD:
            return False, pos, peak
        if abs(pos - target) <= 8 and s.read(66, 1) == 0:      # 66: 是否還在移動
            break
        time.sleep(0.03)
    time.sleep(0.3)
    pos = s.read(56)
    return abs(pos - target) <= MAX_ERR, pos, peak


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    cap = cv2.VideoCapture(0, cv2.CAP_V4L2)
    cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*"MJPG"))
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    for _ in range(15):
        cap.read()

    port, pkt = scs.PortHandler(PORT), scs.PacketHandler(0)
    assert port.openPort() and port.setBaudRate(1_000_000)
    pan = Servo(port, pkt, PAN_CFG[0], PAN_CFG[1], PAN_CFG[4])
    tilt = Servo(port, pkt, TILT_CFG[0], TILT_CFG[1], TILT_CFG[4])
    for s in (pan, tilt):
        now = s.read(56)
        pkt.write1ByteTxRx(port, s.sid, 41, ACC)
        pkt.write2ByteTxRx(port, s.sid, 46, SPEED)
        pkt.write2ByteTxRx(port, s.sid, 42, now)
        pkt.write1ByteTxRx(port, s.sid, 40, 1)
        log(f"ID {s.sid}: 測試範圍 {s.deg(s.lo):+.1f}° ~ {s.deg(s.hi):+.1f}°(格 {s.lo}~{s.hi})")

    def shot(name):
        for _ in range(4):
            cap.grab()
        ok, img = cap.read()
        if ok:
            cv2.imwrite(str(OUT / f"{name}.jpg"), img)

    results = {}
    try:
        for name, s, other in (("pan", pan, tilt), ("tilt", tilt, pan)):
            goto(other, other.steps(0))
            goto(s, s.steps(0))
            for end, label in ((s.lo, "min"), (s.hi, "max")):
                for frac in (0.5, 0.8, 1.0):
                    target = round(s.steps(0) + (end - s.steps(0)) * frac)
                    ok, pos, peak = goto(s, target)
                    v = s.read(62, 1) / 10
                    log(f"{name:4s} {label} {int(frac * 100):3d}%  目標 {s.deg(target):+6.1f}°  實際 {s.deg(pos):+6.1f}°  "
                        f"最大負載 {peak / 10:4.1f}%  電壓 {v:.1f}V  {'OK' if ok else '⚠ 停止'}")
                    if not ok:
                        raise RuntimeError(f"{name} 在 {s.deg(pos):+.1f}° 卡住或負載過高")
                results[f"{name}_{label}"] = s.deg(pos)
                shot(f"{name}_{label}")
                goto(s, s.steps(0))
        goto(pan, pan.steps(0))
        goto(tilt, tilt.steps(0))
        shot("center")
        log("完成: " + "  ".join(f"{k} {v:+.1f}°" for k, v in results.items()))
    finally:
        for s in (tilt, pan):                                   # 中途停止也先回正中再放鬆
            try:
                goto(s, s.steps(0))
            except IOError:
                pass
        for s in (pan, tilt):
            pkt.write1ByteTxRx(port, s.sid, 40, 0)
        port.closePort()
        cap.release()


if __name__ == "__main__":
    main()
