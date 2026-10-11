import time
import scservo_sdk as scs

PORT = "/dev/ttyACM0"          # 跟剛才用的一樣
IDS = [7, 8]
port = scs.PortHandler(PORT)
pkt = scs.PacketHandler(0)
assert port.openPort() and port.setBaudRate(1_000_000)

for i in IDS:
    pkt.write1ByteTxRx(port, i, 40, 0)                 # 關閉扭力,可以用手轉

lo = {i: 4095 for i in IDS}
hi = {i: 0 for i in IDS}
print("用手慢慢把兩個軸轉到各自的極限,轉完按 Ctrl+C")
try:
    while True:
        parts = []
        for i in IDS:
            pos, res, _ = pkt.read2ByteTxRx(port, i, 56)
            if res == scs.COMM_SUCCESS:
                lo[i], hi[i] = min(lo[i], pos), max(hi[i], pos)
                parts.append(f"ID {i}: {pos:4d} (最小 {lo[i]:4d} 最大 {hi[i]:4d})")
        print("  ".join(parts), end="\r")
        time.sleep(0.05)
except KeyboardInterrupt:
    print("\n結果:")
    for i in IDS:
        print(f"ID {i}: 最小 {lo[i]}  最大 {hi[i]}")
    port.closePort()
