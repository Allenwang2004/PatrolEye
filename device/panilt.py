import time
import scservo_sdk as scs

PORT = "/dev/ttyACM0"
STEP_DEG = 360 / 4096

# ---- 依實際情況修改 -------------------------------------------------
#            ID  中心   最小   最大   方向(轉反了就改成 -1)
PAN_CFG  = (7, 2070, 860, 3394, 1)    # 與伺服內存限位相同,實測 -100°~+110° 全程順暢
TILT_CFG = (8, 2075, 764, 2815, -1)   # 方向 -1:tilt + = 往上看。往下超過 -60° 開始受阻(負載上升、到不了位),限在 -60°
MARGIN = 57          # 離極限保留的安全距離(格),約 5 度
# ---------------------------------------------------------------------


class Axis:
    def __init__(self, sid, center, lo, hi, sign):
        self.sid, self.center, self.sign = sid, center, sign
        self.lo, self.hi = lo + MARGIN, hi - MARGIN

    def to_steps(self, deg):
        steps = round(self.center + self.sign * deg / STEP_DEG)
        return max(self.lo, min(self.hi, steps))        # 超出範圍就停在邊界

    def to_deg(self, steps):
        return self.sign * (steps - self.center) * STEP_DEG

    def range_deg(self):
        a, b = self.to_deg(self.lo), self.to_deg(self.hi)
        return min(a, b), max(a, b)


class PanTilt:
    def __init__(self, port=PORT, speed=600, acc=20):
        self.speed = speed
        self.port = scs.PortHandler(port)
        self.pkt = scs.PacketHandler(0)
        assert self.port.openPort() and self.port.setBaudRate(1_000_000)
        self.pan, self.tilt = Axis(*PAN_CFG), Axis(*TILT_CFG)
        for ax in (self.pan, self.tilt):
            now = self._read(ax)
            self.pkt.write1ByteTxRx(self.port, ax.sid, 41, acc)      # 加速度
            self.pkt.write2ByteTxRx(self.port, ax.sid, 46, speed)    # 速度,格/秒
            self.pkt.write2ByteTxRx(self.port, ax.sid, 42, now)      # 目標先設成現在位置,上力時不會跳
            self.pkt.write1ByteTxRx(self.port, ax.sid, 40, 1)        # 開啟扭力

    def _read(self, ax):
        pos, res, _ = self.pkt.read2ByteTxRx(self.port, ax.sid, 56)
        if res != scs.COMM_SUCCESS:
            raise IOError(f"讀不到 ID {ax.sid}")
        return pos

    def move(self, pan=None, tilt=None, wait=True, timeout=None):
        """角度單位是度,0 是正前方。只給其中一個軸就只動那個軸。"""
        targets = []
        for ax, deg in ((self.pan, pan), (self.tilt, tilt)):
            if deg is not None:
                steps = ax.to_steps(deg)
                self.pkt.write2ByteTxRx(self.port, ax.sid, 42, steps)
                targets.append((ax, steps, self._read(ax)))
        if timeout is None:     # 依距離和速度估,大角度慢速時 4 秒不夠
            dist = max((abs(s - p0) for _, s, p0 in targets), default=0)
            timeout = 2.0 + dist / self.speed * 1.5
        # 到位,或已經停住不動(負載大時會差 1~3° 停下,讀數會抖 1~2 格;實際角度會讀回來存)都算完成
        end = time.time() + timeout
        prev, still = None, 0
        while wait and time.time() < end:
            now = [self._read(ax) for ax, _, _ in targets]
            if all(abs(p - s) < 12 for p, (_, s, _) in zip(now, targets)):
                break
            if prev and all(abs(a - b) <= 2 for a, b in zip(now, prev)):
                still += 1
            else:
                still = 0
            if still >= 10 and all(abs(p - s) < 60 for p, (_, s, _) in zip(now, targets)):
                break
            prev = now
            time.sleep(0.02)

    def position(self):
        return (round(self.pan.to_deg(self._read(self.pan)), 1),
                round(self.tilt.to_deg(self._read(self.tilt)), 1))

    def release(self):
        for ax in (self.pan, self.tilt):
            self.pkt.write1ByteTxRx(self.port, ax.sid, 40, 0)

    def close(self):
        self.release()
        self.port.closePort()

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.close()


if __name__ == "__main__":
    with PanTilt() as pt:
        print("水平可轉範圍(度):", [round(x) for x in pt.pan.range_deg()])
        print("俯仰可轉範圍(度):", [round(x) for x in pt.tilt.range_deg()])
        pt.move(0, 0)
        print("水平 +15 度"); pt.move(pan=15); time.sleep(0.5)
        print("水平 -15 度"); pt.move(pan=-15); time.sleep(0.5)
        pt.move(pan=0)
        print("俯仰 +10 度"); pt.move(tilt=10); time.sleep(0.5)
        print("俯仰 -10 度"); pt.move(tilt=-10); time.sleep(0.5)
        pt.move(0, 0)
        print("目前位置:", pt.position())
