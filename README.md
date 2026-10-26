# PatrolEye（巡眼）

An AI camera that spots danger early.

雙軸雲台＋Raspberry Pi 5＋ASUS UGen300 M.2（Hailo-10H）。攝影機自己巡視一個房間、記住正常的樣子，有變化才在裝置上用視覺語言模型判斷：壓力超標、慢慢漏水、爐火沒關、有人跌倒。

## 目錄

| 資料夾 | 內容 |
|---|---|
| `device/` | 攝影機（Pi）上的程式：`live.py`（伺服器、相機、雲台）、`patrol.py`（巡檢）、`ask.py`（一句話提問）、`scan.py`／`panorama.py`（全域掃描與全景）、`vlm.py`、`voice.py`、`web/`、`viewer/`、`start.sh`。說明見 `device/README.md` |
| `bench/` | 測試台：三個螢幕扮演泵浦室、計分板、遙控器。`python3 bench/server.py`，流程見 `docs/DEMO.md` |
| `hardware/` | 機構設計與 Fusion 360 腳本 |
| `video/` | 比賽影片（Remotion）。素材、輸出與舊版不在 git 裡，見 `video/README.md` |
| `docs/` | `DEMO.md`：測試台 demo；`v2/`：新版（App、Supabase、QR 綁定、隱私遮罩、異常片段） |

## 在 Pi 上執行

```bash
cd device
./start.sh            # 啟動；也可以 stop / restart / status / log
```

執行期資料（`device/scans`、`models`、`certs`、`logs`、`asks`、`patrol`）不進 git。**從舊版（程式放在根目錄）升級的 Pi，先照 `device/README.md` 的步驟備份再 `git pull`。**

## 新版（v2，複賽前完成）

整體規劃與 App、後端、攝影機三方共用的約定：`docs/v2/ARCHITECTURE.md`。

| 分支 | 內容 | 待辦 |
|---|---|---|
| `feature/app-supabase` | Expo App 與 Supabase 後端 | `docs/v2/APP_BACKEND_TODO.md` |
| `feature/camera-v2` | 攝影機端：QR 綁定、全域掃描與隱私遮罩、異常片段上傳 | `docs/v2/CAMERA_TODO.md` |
