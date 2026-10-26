# PatrolEye v2：App、Supabase 與攝影機

這份是 App、後端、攝影機三邊共用的約定。資料表、RPC、Storage 路徑、指令格式、遮罩座標都以這裡為準；任何一邊要改，先改這份。

## 目標（複賽前完成）

1. 使用者在 App 註冊帳號，掃攝影機的 QR code 綁定。
2. 第一次設定做全域掃描；使用者在全景圖上框出不想被看到的區域。之後攝影機拍到的畫面，這些區域一律是黑的（AI 判讀、錄影、上傳都一樣）。
3. 攝影機自己巡檢；發現異常時錄一段片段（前 10 秒＋後 15 秒），連同文字說明上傳。
4. App 的事件列表即時出現新事件，點開看片段。

## 先不做

- 推播通知：改成 App 開著時事件列表即時更新、頁內提示
- 邀請家人、解除綁定與重置、綁定碼的期限與嘗試次數限制
- Wi-Fi 配網（攝影機已經連上網路）
- 即時串流（不做；只有異常片段）

## 架構

```
攝影機（Pi）                                   Supabase                         手機（Expo App）
 live.py   相機、雲台、遮罩、巡檢、錄片段          Auth：使用者帳號、裝置帳號         登入
   ▲ │ localhost HTTP          outbox/            Postgres＋RLS                    攝影機列表
   │ ▼                                             Storage：panoramas、clips        掃 QR 綁定
 agent.py  登入、心跳、綁定、指令、上傳 ───────▶   Realtime：events、指令、狀態  ◀── 掃描、畫遮罩
                                                    RPC：claim_device               事件列表、看片段
```

- 攝影機不開任何對外的 port；`agent.py` 主動連 Supabase（HTTPS）。`live.py` 只聽 127.0.0.1。
- 每台攝影機在 Supabase Auth 有自己的「裝置帳號」，RLS 用它限制只能讀寫自己的資料；手機上的使用者只看得到自己綁定的攝影機。
- service role key 只用在開發者電腦上的 provision 腳本，不放進 App、也不放進攝影機。

## 名詞

| 名詞 | 定義 |
|---|---|
| `device_id` | 攝影機的 UUID（`devices.id`） |
| 裝置帳號 | email `device-<device_id>@devices.patroleye.local`、32 字元隨機密碼。只存在攝影機的 `device/config/device.json` |
| `device.json` | `{"supabase_url", "supabase_anon_key", "device_id", "email", "password"}`，由 provision 腳本產生 |
| claim code | 8 碼綁定碼，字元集 `23456789ABCDEFGHJKMNPQRSTUVWXYZ`（去掉容易看錯的 0 O 1 I L），由攝影機產生 |
| QR 內容 | `patroleye://claim?d=<device_id>&c=<claim_code>` |

## 資料表（public schema）

| 表 | 主要欄位 | 誰寫 | 誰讀 |
|---|---|---|---|
| `devices` | `id` uuid pk、`device_user_id` uuid（auth.users，唯一）、`owner_id` uuid null、`name`、`room`、`claim_code` null、`created_at`、`claimed_at` | provision 腳本建立；`claim_device` 綁定；擁有者改 name、room | 擁有者、裝置本身 |
| `device_state` | `device_id` pk、`last_seen`、`status`（idle／patrolling／scanning／error）、`masks_version` int、`app_version` | 裝置 | 擁有者、裝置 |
| `device_commands` | `id`、`device_id`、`type`、`payload` jsonb、`status`（pending／running／done／error）、`result` jsonb、`created_at`、`updated_at` | 擁有者新增；裝置更新 status、result | 擁有者、裝置 |
| `scans` | `id`、`device_id`、`pano_path`、`width`、`height`、`pan0`、`pan1`、`tilt0`、`tilt1`、`px_per_deg`、`created_at` | 裝置 | 擁有者、裝置 |
| `masks` | `id`、`device_id`、`scan_id`、`version` int（每台遞增）、`rects` jsonb、`created_at` | 擁有者 | 擁有者、裝置 |
| `events` | `id` uuid（裝置產生）、`device_id`、`ts`、`type`、`severity`、`title`、`detail`、`checkpoint`、`clip_path`、`thumb_path`、`meta` jsonb、`acked_at`、`acked_by` | 裝置新增；擁有者只改 `acked_at`、`acked_by` | 擁有者 |

RPC：

- `claim_device(p_device_id uuid, p_code text)`：使用者呼叫。`owner_id` 為空且 `claim_code` 相符時，設 `owner_id = auth.uid()`、`claimed_at = now()`、`claim_code = null`；否則回錯誤 `invalid_claim`。
- `device_set_claim_code(p_code text)`：裝置呼叫，只在自己還沒被綁定時有效。

## Storage（private bucket）

| bucket | 路徑 | 內容 |
|---|---|---|
| `panoramas` | `<device_id>/<scan_id>.jpg` | 全景圖，設定遮罩時用 |
| `clips` | `<device_id>/<event_id>.mp4`、`<device_id>/<event_id>.jpg` | 異常片段與縮圖 |

裝置只能上傳到自己的 `<device_id>/` 資料夾；使用者只能讀自己攝影機的資料夾，App 用 `createSignedUrl` 取得播放網址。

## 指令（`device_commands.type`）

| type | payload | 攝影機做什麼 | result |
|---|---|---|---|
| `scan` | `{}` | 全域掃描、拼全景、上傳全景、新增一筆 `scans` | `{"scan_id": "..."}` |
| `apply_masks` | `{"mask_id": "...", "version": 3}` | 下載遮罩、存到本機、立刻套用、更新 `device_state.masks_version` | `{"version": 3}` |

狀態流程：App 新增時是 `pending` → 攝影機開始處理改 `running` → 完成 `done`（或 `error`，`result = {"message": "..."}`）。

## 全景與遮罩的座標

全景是等距柱狀投影（`device/panorama.py`），角度和 `scan.json`、`panilt.py` 是同一套（度；tilt 正值朝上）：

- 全景像素 `(x, y)` → `pan = pan0 + x / px_per_deg`、`tilt = tilt1 - y / px_per_deg`
- `masks.rects`：`[{"pan0": -20.5, "pan1": 10.0, "tilt0": -30.0, "tilt1": 5.0}, …]`，`pan0 < pan1`、`tilt0 < tilt1`
- App 畫框：螢幕座標先換成全景像素（乘上 `width / 顯示寬度`），再換成角度。
- 攝影機套用：依目前雲台角度，把每個像素反推成方向角，落在任一個框裡就塗黑（公式見 `CAMERA_TODO.md`）。

## 事件

| 欄位 | 值 |
|---|---|
| `type` | `stove_on`、`person_down`、`gauge_high`、`leak`、`light_fault`、`valve_closed`、`other` |
| `severity` | `info`、`warning`、`critical` |
| `title` | 一句話，App 列表顯示 |
| `detail` | 模型的說明 |
| `checkpoint` | 巡檢點名稱，例如 `STOVE`、`FLOOR`、`PT-101` |
| `meta` | 例如 `{"reading": 7.8, "unit": "bar", "confidence": "high", "looked_closer": true}` |

- 片段：H.264 MP4、最大 1280×720、10 fps、前 10 秒＋後 15 秒（含轉頭和放大），已套遮罩；縮圖 JPG。
- 同一個檢查點、同一種異常，10 分鐘內只送一次。

## 在線狀態

攝影機每 30 秒更新 `device_state.last_seen`；App 判斷 90 秒內有更新就是在線。
