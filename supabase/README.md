# supabase：後端

資料表、RLS、RPC、Storage 都在 `migrations/`；約定見 `docs/v2/ARCHITECTURE.md`。

CLI 裝在這個資料夾的 `node_modules`，指令都在 `supabase/` 裡執行：

```bash
cd supabase
npm install
```

## 設定

```bash
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push
npm run provision                   # 讀 .env，輸出 device.json
```

`.env`（不進 git，只在開發者電腦上）：

```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

## 腳本

| 指令 | 做什麼 |
|---|---|
| `npm run provision` | 建立一台攝影機（裝置帳號、`devices`、`device_state`），輸出 `device.json` → 複製到攝影機的 `device/config/device.json` |
| `npm run fake-device -- [--config device.json] [--pano <掃描資料夾>] [--event-every 120]` | 模擬攝影機：印出綁定 QR、心跳、回應 `scan`／`apply_masks`、定時丟假事件（按 Enter 立刻丟一個）。預設全景是 `device/scans/20261011_031345_normal`，測試片段用 ffmpeg 產生在 `.cache/` |

`device*.json` 裡有裝置帳號的密碼，已在 `.gitignore`。
