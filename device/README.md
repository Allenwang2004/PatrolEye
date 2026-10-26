# device：攝影機（Raspberry Pi 5）上的程式

## 檔案

| 檔案 | 做什麼 |
|---|---|
| `live.py` | Flask 伺服器（`/home`、`/factory`、`/dev`、`/patrol`）、相機迴圈、雲台控制、掃描、提問 |
| `patrol.py` | 巡檢：教檢查點、記住正常、偵測變化、交給模型判讀、看不清楚就靠近再看、送出報告 |
| `ask.py` | 一句話提問（轉頭找目標、判讀、回答） |
| `scan.py` | 走一個 pan/tilt 格點拍照，存成 `scans/<時間>/` |
| `panorama.py` | 把掃描拼成等距柱狀全景 `pano.jpg` 與角度範圍 `pano.json` |
| `build_memory.py`、`build.py`、`detect3d.py`、`merge.py` | 掃描後處理：物件位置、深度、合併多次掃描 |
| `vlm.py`、`voice.py`、`modes.py` | 視覺語言模型、語音轉文字、居家／工廠模式設定 |
| `panilt.py` | Feetech STS3215 雙軸雲台 |
| `export_depth_onnx.py` | 匯出深度模型到 `models/` |
| `test_servo.py`、`test_range.py`、`find_limit.py`、`query_test.py` | 測試工具 |
| `web/` | `/home`、`/factory`、`/patrol` 的網頁 |
| `viewer/` | 掃描結果的 3D 檢視器（靜態網頁） |
| `start.sh` | 啟動／停止伺服器 |

所有程式都假設工作目錄是 `device/`（`start.sh` 會自己 `cd` 過來）。手動跑工具時先 `cd device`，例如 `python scan.py`。

## 執行期資料（不進 git）

| 路徑 | 內容 | 沒有的話怎麼產生 |
|---|---|---|
| `scans/` | 掃描影像、`pano.jpg`、`pano.json`、`memory.json` | `python scan.py`，再 `python panorama.py scans/<資料夾>`、`python build_memory.py …` |
| `models/` | `depth_metric_indoor.onnx`、`yolov8s-seg.onnx`、`yolov8s-seg.pt` | `python export_depth_onnx.py`；yolov8s-seg 由 Ultralytics 下載後匯出 ONNX |
| `certs/` | 自簽 HTTPS 憑證 | `mkdir -p certs && openssl req -x509 -newkey rsa:2048 -nodes -keyout certs/key.pem -out certs/cert.pem -days 365 -subj "/CN=patroleye"` |
| `logs/`、`asks/`、`patrol/` | 紀錄、提問結果、巡檢設定與照片 | 執行時自動產生 |
| `config/`、`outbox/` | v2：裝置帳號、遮罩、待上傳的事件與片段 | 見 `docs/v2/CAMERA_TODO.md` |

`certs/key.pem` 以前被 commit 過，建議在 Pi 上重新產生一組。

## 從舊的目錄結構升級（Pi 上做一次）

舊版程式放在 repo 根目錄，這一版搬到 `device/`，而且執行期資料不再進 git。直接 `git pull` 會把根目錄裡以前被追蹤的 `scans/`、`models/`、`certs/`、`logs/`、`asks/` 刪掉，所以先備份：

```bash
cd ~/PatrolEye                     # 換成 Pi 上 repo 的位置
git status                         # 先確認沒有未提交的修改
./start.sh stop
mkdir -p ~/patroleye_backup
for d in scans models certs logs asks patrol; do [ -e "$d" ] && cp -a "$d" ~/patroleye_backup/; done
git pull                           # 若提示 untracked files would be overwritten，先把那些檔案移開再 pull
cp -a ~/patroleye_backup/. device/
rm -rf patrol                      # 舊的未追蹤資料夾已經複製進 device/ 了
cd device && ./start.sh
```
