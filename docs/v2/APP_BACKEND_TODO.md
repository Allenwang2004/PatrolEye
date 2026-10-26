# App 與 Supabase 後端待辦（`feature/app-supabase`）

先讀 `docs/v2/ARCHITECTURE.md`：資料表、RPC、Storage 路徑、指令格式都定在那裡，攝影機端照同一份做。

範圍：帳號、QR 綁定、全域掃描與遮罩、事件列表與片段播放。不做推播、邀請家人、解除綁定。

## 目錄

```
supabase/
  migrations/<時間>_init.sql      資料表、RLS、RPC、Storage 政策
  scripts/provision_device.mjs    建立一台攝影機，輸出 device.json
  scripts/fake_device.mjs         沒有攝影機時模擬攝影機（測 App 用）
app/                              Expo（TypeScript、expo-router）
```

## 1. Supabase 專案

- [ ] 建立專案（區域選 Tokyo 或 Singapore），記下 Project URL、anon key、service role key
- [ ] service role key 只放在自己電腦的 `supabase/.env`（已在 `.gitignore`），不放進 App、不放進攝影機
- [ ] Auth：開 email＋密碼；開發期間關掉 email 確認，比較好測
- [x] Supabase CLI：`supabase init`（CLI 裝在 `supabase/node_modules`，在 `supabase/` 裡用 `npx supabase`）
- [ ] `npx supabase link --project-ref <ref>`

## 2. 資料庫（migration）

- [x] `supabase migration new init`，內容照原本的草稿調整
- [x] 建表：`devices`、`device_state`、`device_commands`、`scans`、`masks`、`events`
- [x] 打開 RLS，加上政策（誰能讀、誰能寫見 ARCHITECTURE.md 的表）
- [x] RPC：`claim_device`、`device_set_claim_code`
- [x] Storage：private bucket `panoramas`、`clips` 和它們的政策
- [x] Realtime：`events`、`device_commands`、`device_state` 加進 `supabase_realtime` publication
- [ ] `supabase db push`
- [x] 用兩個不同的使用者帳號測：A 看不到 B 的攝影機、事件和片段

已完成：`supabase/migrations/20261026155457_init.sql`。和原本草稿的差別：

- 欄位層級權限：擁有者只能改 `devices.name`、`room` 和 `events.acked_at`、`acked_by`（`acked_by` 只能是自己）；裝置只能改指令的 `status`、`result`；新增指令時不能指定 `status`
- `masks.version` 由資料庫 trigger 設定（這台目前最大值＋1，同時存也不會撞號），App 送的值會被忽略
- `device_commands.updated_at` 由 trigger 更新
- Storage 政策用文字比對資料夾名稱（不是 uuid 的路徑直接拒絕，不會報錯）；裝置可以覆寫自己的檔案（upsert）
- bucket 限制檔案類型：`panoramas` 只收 JPG，`clips` 收 MP4、JPG，單檔 50 MB
- `claim_device` 會去掉頭尾空白再比對；`device_set_claim_code` 檢查 8 碼和字元集
- `type`、`status` 加上 check（值見 ARCHITECTURE.md）

## 3. 建立攝影機的腳本（`provision_device.mjs`）

每台攝影機出貨前跑一次（現在就是每台原型跑一次）：

- [x] 讀 `supabase/.env` 的 URL 和 service role key
- [x] `auth.admin.createUser({ email: "device-<uuid>@devices.patroleye.local", password: <32 字元隨機>, email_confirm: true })`
- [x] 新增 `devices`（`id` 用同一個 uuid、`device_user_id` = 新帳號 id）和 `device_state`
- [x] 輸出 `device.json`（格式見 ARCHITECTURE.md）→ 複製到攝影機的 `device/config/device.json`

## 4. Expo App

- [x] `npx create-expo-app@latest app`（預設就是 TypeScript＋expo-router；SDK 58，路由在 `app/src/app/`）
- [x] 套件：`npx expo install expo-camera expo-video react-native-svg react-native-gesture-handler @react-native-async-storage/async-storage react-native-url-polyfill`，再 `npm i @supabase/supabase-js`。這些都能直接在 Expo Go 跑
- [x] `app/.env`：`EXPO_PUBLIC_SUPABASE_URL`、`EXPO_PUBLIC_SUPABASE_ANON_KEY`（只放 anon key）
- [x] `src/lib/supabase.ts`：`createClient`，session 存 AsyncStorage、`autoRefreshToken: true`、`persistSession: true`

畫面：

1. [x] **登入／註冊**：email＋密碼
2. [x] **攝影機列表**：`devices`（自己的）＋`device_state`；`last_seen` 在 90 秒內顯示在線，否則離線；顯示 status（巡檢中、掃描中…）
3. [x] **新增攝影機**：`CameraView` 掃 QR（`barcodeScannerSettings={{ barcodeTypes: ['qr'] }}`）→ 解析 `patroleye://claim?d=&c=` → `rpc('claim_device', { p_device_id, p_code })` → 失敗顯示「綁定碼不對或這台已經被綁定」→ 成功後取名、選房間（更新 `devices.name`、`room`）→ 進設定流程
4. [x] **設定流程**
   - 說明：「接下來攝影機會轉一圈拍全景，用來讓你選擇不想被看到的區域」，使用者同意才繼續
   - 新增 `device_commands`（`type: 'scan'`）→ 監看這筆指令（Realtime 或每 2 秒查一次）→ `done` 後拿 `result.scan_id`
   - 讀 `scans` 那一筆，`storage.from('panoramas').createSignedUrl(pano_path, 3600)` 顯示全景（全景很寬，要能左右捲動、縮放）
   - 遮罩編輯器：在全景上拖曳畫矩形（gesture handler＋svg），可以刪除；顯示成半透明黑框
   - 儲存：螢幕座標 → 全景像素 → 角度（公式見 ARCHITECTURE.md），新增 `masks`（`version` 由資料庫設定，用回傳的值）→ 新增 `device_commands`（`type: 'apply_masks'`, `payload: { mask_id, version }`）→ 等 `device_state.masks_version` 追上 → 顯示「之後這些區域都會是黑的」
   - 之後可以從攝影機頁面重新進來改遮罩或重新掃描
5. [x] **事件列表**：自己所有攝影機的 `events`，新的在最上面；縮圖、標題、時間、嚴重程度、是否已確認
   - 訂閱 Realtime（`postgres_changes`，`INSERT`，table `events`）：App 開著時新事件直接出現在最上面，並跳出頁內提示（代替推播）
   - 下拉重新整理；往下捲載入更多
6. [x] **事件內容**：標題、說明、時間、檢查點、讀數；`expo-video` 播放片段（`createSignedUrl(clip_path, 3600)`）；「我知道了」更新 `acked_at`、`acked_by`
7. [x] **設定**：登出、改攝影機名稱

## 5. 沒有攝影機也能測（`fake_device.mjs`）

讓 App 不必等攝影機端完成就能跑完整流程：

- [x] 用 `device.json` 以裝置帳號登入
- [x] 還沒綁定時：產生 claim code、`rpc('device_set_claim_code')`、在終端機印出 QR 內容（或 QR）
- [x] 每 30 秒更新 `device_state.last_seen`
- [x] 收到 `scan`：上傳一張測試全景（可用 `device/scans/<資料夾>/pano.jpg` 和它的 `pano.json`）、新增 `scans`、指令改 `done`
- [x] 收到 `apply_masks`：把 `device_state.masks_version` 改成那個版本、指令改 `done`
- [x] 每隔一段時間丟一個假事件：上傳一段測試 mp4 和 jpg 到 `clips/<device_id>/<event_id>.*`，再新增 `events`

## 6. 驗收

1. 新帳號登入 → 掃 QR 綁定 → 列表出現攝影機，顯示在線
2. 設定流程：掃描 → 全景出現 → 框住床 → 儲存 → 顯示已套用
3. 攝影機端製造異常（爐火、跌倒或錶超標）→ 30 秒內事件列表出現新事件 → 點開能播放片段，框住的區域是黑的
4. 按「我知道了」→ 列表狀態更新
5. 用另一個帳號登入 → 看不到這台攝影機和它的事件
