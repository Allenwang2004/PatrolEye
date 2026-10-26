# supabase：後端

還沒建立。照 `docs/v2/APP_BACKEND_TODO.md` 第 1–3、5 節：

```bash
supabase init                        # 在 repo 根目錄執行
supabase link --project-ref <ref>
supabase migration new init          # 貼上待辦裡的 SQL 草稿，檢查後再用
supabase db push
```

`supabase/.env`（不進 git，只在開發者電腦上）：

```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

`scripts/provision_device.mjs` 用 service role 建立攝影機帳號並輸出 `device.json`；`scripts/fake_device.mjs` 在沒有攝影機時模擬攝影機。
