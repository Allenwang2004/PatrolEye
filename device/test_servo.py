import time
import scservo_sdk as scs

PORT = "/dev/ttyACM0"          # 換成你看到的裝置名稱
port = scs.PortHandler(PORT)
pkt = scs.PacketHandler(0)     # STS 系列用協定 0
assert port.openPort() and port.setBaudRate(1_000_000)

# 掃描 ID 1 到 20
found = [i for i in range(1, 21) if pkt.ping(port, i)[1] == scs.COMM_SUCCESS]
print("找到的馬達 ID:", found)

for sid in found:
    pos, _, _ = pkt.read2ByteTxRx(port, sid, 56)      # 目前位置,0 到 4095
    print(f"ID {sid} 目前位置 {pos}")
    pkt.write1ByteTxRx(port, sid, 40, 1)              # 開啟扭力
    for target in (pos + 100, pos - 100, pos):        # 左右各轉約 9 度再回來
        pkt.write2ByteTxRx(port, sid, 42, target)
        time.sleep(1)
    pkt.write1ByteTxRx(port, sid, 40, 0)              # 關閉扭力

port.closePort()
