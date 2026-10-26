# PatrolEye 比賽影片（Remotion）

v12，178.9 秒（不到 3 分鐘），1920×1080、30 fps，英文旁白與字幕已配好（字幕燒在畫面上）。

主軸是「危險預防」：壓力超標、慢慢漏水、爐火沒關，這些危險都不會動，所以一般 AI 攝影機看不到，PatrolEye 會主動去看，只送文字出來。v11 把開場縮成一句 “An AI camera that spots danger early.”，居家痛點的兩則新聞換成 2026 年的；v12 改了現有做法的 AI 攝影機旁白（GPU）和照顧者那句（沒辦法整天盯著畫面）。

## 影片架構

| 時間 | 段落 | 內容 |
|---|---|---|
| 0:00 | 開場 | 實拍原型轉頭 → Logo，旁白念 “PatrolEye.” → 標語一行，旁白念 “An AI camera that spots danger early.”（念到 danger early 時這兩個字變橘色） |
| 0:06 | 工廠痛點 | 泵浦室平面圖（Pump Room）、巡檢表：漏抄、抄錯、太晚發現；旁白 “So a pressure past its limit, or a slow leak, gets noticed hours too late.” |
| 0:22 | 現有做法 | 每個錶裝感測器、巡檢機器人、AI 攝影機。第三張卡是 AI cameras／People and pets only，旁白 “Today's AI cameras spot people and pets, but judging danger needs a GPU-class model.” |
| 0:37 | 居家痛點 | “At the same time, another problem is growing.” → 台灣 713,600 位 65 歲以上長者獨居 → 聽力和記憶退化：傍晚鍋子忘在爐上冒煙、住警器響了她聽不到，旁邊放兩則 2026 年的真實新聞標題（TVBS 2026/9/17、三立 2026/10/16）→ 隔天早上她跌倒，電話沒人接，下次探訪還要兩天；旁白 “Caregivers can't watch a camera all day, so by the time anyone notices, it's often too late.” |
| 1:00 | 真實原型 | “So we built PatrolEye to check where danger starts, and warn you in words.” 鏡頭特寫 C3 → 雲台轉動 A1_2 |
| 1:13 | 兩個版本 | 工廠版：深度攝影機／居家版：webcam |
| 1:20 | 工廠情境 | 泵浦室動畫：每小時巡 22 個點；“When a pressure creeps past its limit, it zooms in, reads the dial, and warns the shift lead.” → 地上新出現一灘水 → 交班提問 |
| 1:37 | 實測（真實畫面） | 三個螢幕搭的泵浦室：注入 PT-101 異常 → PatrolEye 轉過去讀錶 → FOUND → 3/3、誤差約 1%、只送文字 |
| 1:53 | 居家巡視 | 替照顧者巡：起床了嗎？爐子關了嗎？→ 發現她倒在地上，照顧者手機收到文字警報 |
| 2:07 | 居家提問 | “Besides waiting for its reports, her caregiver can just ask the camera to check.” 提問 → 等待段落加速 8 倍（畫面上有標示）→ 回答。手機上的建議問題換成 “Is she up and moving? / Is the stove off? / Anyone on the floor?”，網址列蓋掉 |
| 2:18 | 硬體 → 實際部署 | Fusion 爆炸圖、UGen300 M.2 / Hailo-10H、40 TOPS／8 GB → 縮小版 → 吸頂版＋房間剖面 → 影像留在裝置、只送文字 |
| 2:48 | 結尾 | “One camera that catches danger early, so nobody has to watch.” 三張卡依序打勾：A pressure past its limit／A slow leak／A stove left on → Logo，旁白與標語 “Private at home. Confidential at work.”；GitHub 網址 |

## 開始

```bash
cd ~/PatrolEye/video
npm install
npm run studio      # 瀏覽器預覽
npm run render      # 輸出 out/PatrolEye.mp4
CAPTIONS=1 node scripts/stills.mjs out/chk 40 130   # 輸出幾張靜態畫面（秒數，含開場 6.0 秒）；不加 CAPTIONS=1 就不含字幕
```

## 實拍素材

`public/real/` 是原檔轉成 H.264 30fps 的版本：

| 檔案 | 來源 | 用在哪 |
|---|---|---|
| `a1_1.mp4` | A1_1 | 開場（從第 34.6 秒） |
| `c3.mp4` | C3.MP4 | 原型段開頭，鏡頭特寫 |
| `a1_2.mp4` | A1_2 | 原型段雲台轉動（從 0.4 秒）、兩個版本的居家版、居家提問（從 17.5 秒，雲台轉過來） |
| `realsense.mp4` | Realsense.MP4 | 兩個版本的工廠版 |
| `a4.mp4` | A4.MP4 | 居家提問：對手機說 “Hey, is the stove closed?” |
| `a3.mp4`、`a3_last.png` | A3.MOV | 居家提問：手機 App（7.5–31.5 秒以 8 倍速播放，接 31.5 秒的回答） |
| `bench_*.mp4` | shoot/ 的 camera、board、machine | 實測段，見 `shoot/bench_cut/cut.sh` |

剪接點：原型段 `src/scenes/Proto.tsx` 的 `cut`；實測段 `src/scenes/Bench.tsx` 的 `SHOTS`；居家提問 `src/scenes/HomeAsk.tsx` 的 `cut`、`A3_RUN_FROM`、`A3_ANSWER`，手機上蓋掉的建議問題在同一個檔案的 `AppOverlay`。

## 新聞標題

居家痛點段引用的兩則新聞（`src/scenes/HomeProblem.tsx` 的 `News`），畫面上是原標題加英文摘要；標題裡的空格是換行的位置：

- TVBS 新聞網，2026/9/17，〈獨家／8旬嬤燉肉「跑去看醫生」半小時返家 鍋燒黑濃煙密布〉 https://news.tvbs.com.tw/local/4023727
- 三立新聞網，2026/10/16，〈獨居老人慘死火場！防高齡悲劇 政府砸60億欲擋全台70萬獨老死劫〉 https://www.setn.com/news/1923662

## 改旁白

1. 編輯 `tts/script.json`（`text` 是字幕、`say` 是念法；有 `at` 的是固定開口秒數，`minDuration` 是段落最短長度；開場那兩句在 `opening`）
2. 第一次先 `bash tts/get_models.sh` 並 `pip install kokoro-onnx soundfile`
3. `python3 tts/make_vo.py --only hp2`（只重念改過的句子；不加 `--only` 會全部重念）

會更新 `public/audio/`、`src/timing.json`、`out/voiceover_full.wav`、`out/captions.srt`（時間不含開場 6.0 秒）。開場那兩句 `op0.wav`、`op1.wav`（在 script.json 的 `opening`）不在 make_vo.py 的流程裡，要改的話跟我說。

## 檔案

```
src/Video.tsx                 主影片與 props（字幕開關、GitHub 網址）
src/scenes/Opening.tsx        開場（實拍 + Logo + 兩句旁白，OPEN_SEC = 6.0 秒）
src/scenes/Hook.tsx           工廠痛點
src/scenes/Problem.tsx        現有做法（Options）
src/scenes/HomeProblem.tsx    居家痛點（獨居、忘關火與住警器、新聞標題、跌倒、她的一週）
src/scenes/Proto.tsx          實拍原型
src/scenes/Editions.tsx       兩個版本
src/scenes/Plant.tsx          工廠情境動畫
src/scenes/Bench.tsx          實測
src/scenes/HomeRounds.tsx     居家巡視 + 跌倒警報
src/scenes/HomeAsk.tsx        居家提問（實拍，手機畫面加蓋）
src/scenes/HowProduct.tsx     硬體 → 實際部署
src/scenes/Final.tsx          結尾（三種危險 + 打勾、隱私標語）
src/components/HomeRoom.tsx   林奶奶家的剖面圖（爐火、煙、住警器、電話、吸頂 PatrolEye）
src/components/PumpRoom.tsx   泵浦室平面圖
src/components/Icons.tsx      圖示（v10 新增水滴 Drop、火焰 Flame）
src/components/Captions.tsx   字幕樣式
```

## Fusion 立體圖

`public/render/` 是 Fusion 腳本（`~/PatrolEye/hardware/v3/rig_concept_v3.py`）輸出的圖，已裁掉透明邊；`vc_*` 是吸頂版。

## 舊版

`_old_v1` … `_old_v10` 是每次更新前被換掉的檔案，`_old_v10` 是 v12 換掉的 v11 檔案。
