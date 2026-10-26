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
- [ ] Supabase CLI：`supabase init`、`supabase link --project-ref <ref>`；要在本機測的話 `supabase start`（需要 Docker）

## 2. 資料庫（migration）

- [ ] `supabase migration new init`，內容照下面的草稿調整
- [ ] 建表：`devices`、`device_state`、`device_commands`、`scans`、`masks`、`events`
- [ ] 打開 RLS，加上政策（誰能讀、誰能寫見 ARCHITECTURE.md 的表）
- [ ] RPC：`claim_device`、`device_set_claim_code`
- [ ] Storage：private bucket `panoramas`、`clips` 和它們的政策
- [ ] Realtime：`events`、`device_commands`、`device_state` 加進 `supabase_realtime` publication
- [ ] `supabase db push`
- [ ] 用兩個不同的使用者帳號測：A 看不到 B 的攝影機、事件和片段

草稿（請自己檢查、在本機跑過再推上去）：

```sql
create table public.devices (
  id uuid primary key default gen_random_uuid(),
  device_user_id uuid not null unique references auth.users(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete set null,
  name text,
  room text,
  claim_code text,
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);

create table public.device_state (
  device_id uuid primary key references public.devices(id) on delete cascade,
  last_seen timestamptz,
  status text not null default 'idle',
  masks_version int not null default 0,
  app_version text
);

create table public.device_commands (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  type text not null check (type in ('scan', 'apply_masks')),
  payload jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'running', 'done', 'error')),
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.scans (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  pano_path text not null,
  width int not null,
  height int not null,
  pan0 double precision not null,
  pan1 double precision not null,
  tilt0 double precision not null,
  tilt1 double precision not null,
  px_per_deg double precision not null,
  created_at timestamptz not null default now()
);

create table public.masks (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  scan_id uuid references public.scans(id) on delete set null,
  version int not null,
  rects jsonb not null default '[]',
  created_at timestamptz not null default now(),
  unique (device_id, version)
);

create table public.events (
  id uuid primary key,
  device_id uuid not null references public.devices(id) on delete cascade,
  ts timestamptz not null default now(),
  type text not null,
  severity text not null check (severity in ('info', 'warning', 'critical')),
  title text not null,
  detail text,
  checkpoint text,
  clip_path text,
  thumb_path text,
  meta jsonb not null default '{}',
  acked_at timestamptz,
  acked_by uuid references auth.users(id)
);
create index events_device_ts on public.events (device_id, ts desc);

-- 判斷目前登入的是擁有者，還是這台攝影機自己
create function public.is_owner(d uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from devices where id = d and owner_id = auth.uid());
$$;
create function public.is_device(d uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from devices where id = d and device_user_id = auth.uid());
$$;

alter table public.devices enable row level security;
alter table public.device_state enable row level security;
alter table public.device_commands enable row level security;
alter table public.scans enable row level security;
alter table public.masks enable row level security;
alter table public.events enable row level security;

create policy devices_read on public.devices for select
  using (owner_id = auth.uid() or device_user_id = auth.uid());
create policy devices_owner_update on public.devices for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
-- 正式上線前：限制擁有者只能改 name、room（trigger 或改用 RPC）

create policy state_read on public.device_state for select
  using (public.is_owner(device_id) or public.is_device(device_id));
create policy state_device_insert on public.device_state for insert
  with check (public.is_device(device_id));
create policy state_device_update on public.device_state for update
  using (public.is_device(device_id)) with check (public.is_device(device_id));

create policy cmd_read on public.device_commands for select
  using (public.is_owner(device_id) or public.is_device(device_id));
create policy cmd_owner_insert on public.device_commands for insert
  with check (public.is_owner(device_id));
create policy cmd_device_update on public.device_commands for update
  using (public.is_device(device_id)) with check (public.is_device(device_id));

create policy scans_read on public.scans for select
  using (public.is_owner(device_id) or public.is_device(device_id));
create policy scans_device_insert on public.scans for insert
  with check (public.is_device(device_id));

create policy masks_read on public.masks for select
  using (public.is_owner(device_id) or public.is_device(device_id));
create policy masks_owner_insert on public.masks for insert
  with check (public.is_owner(device_id));

create policy events_read on public.events for select
  using (public.is_owner(device_id));
create policy events_device_insert on public.events for insert
  with check (public.is_device(device_id));
create policy events_owner_ack on public.events for update
  using (public.is_owner(device_id)) with check (public.is_owner(device_id));

create function public.claim_device(p_device_id uuid, p_code text)
returns public.devices language plpgsql security definer set search_path = public as $$
declare d devices;
begin
  update devices
     set owner_id = auth.uid(), claimed_at = now(), claim_code = null
   where id = p_device_id and owner_id is null
     and claim_code is not null and claim_code = upper(p_code)
  returning * into d;
  if d.id is null then
    raise exception 'invalid_claim';
  end if;
  return d;
end $$;

create function public.device_set_claim_code(p_code text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update devices set claim_code = upper(p_code)
   where device_user_id = auth.uid() and owner_id is null;
end $$;

revoke execute on function public.claim_device(uuid, text) from public, anon;
revoke execute on function public.device_set_claim_code(text) from public, anon;
grant execute on function public.claim_device(uuid, text) to authenticated;
grant execute on function public.device_set_claim_code(text) to authenticated;

insert into storage.buckets (id, name, public)
values ('panoramas', 'panoramas', false), ('clips', 'clips', false)
on conflict (id) do nothing;

create policy "device writes own folder" on storage.objects for insert to authenticated
  with check (bucket_id in ('panoramas', 'clips')
              and public.is_device(((storage.foldername(name))[1])::uuid));
create policy "owner reads own devices" on storage.objects for select to authenticated
  using (bucket_id in ('panoramas', 'clips')
         and public.is_owner(((storage.foldername(name))[1])::uuid));

alter publication supabase_realtime add table public.events, public.device_commands, public.device_state;
```

## 3. 建立攝影機的腳本（`provision_device.mjs`）

每台攝影機出貨前跑一次（現在就是每台原型跑一次）：

- [ ] 讀 `supabase/.env` 的 URL 和 service role key
- [ ] `auth.admin.createUser({ email: "device-<uuid>@devices.patroleye.local", password: <32 字元隨機>, email_confirm: true })`
- [ ] 新增 `devices`（`id` 用同一個 uuid、`device_user_id` = 新帳號 id）和 `device_state`
- [ ] 輸出 `device.json`（格式見 ARCHITECTURE.md）→ 複製到攝影機的 `device/config/device.json`

## 4. Expo App

- [ ] `npx create-expo-app@latest app`（預設就是 TypeScript＋expo-router）
- [ ] 套件：`npx expo install expo-camera expo-video react-native-svg react-native-gesture-handler @react-native-async-storage/async-storage react-native-url-polyfill`，再 `npm i @supabase/supabase-js`。這些都能直接在 Expo Go 跑
- [ ] `app/.env`：`EXPO_PUBLIC_SUPABASE_URL`、`EXPO_PUBLIC_SUPABASE_ANON_KEY`（只放 anon key）
- [ ] `lib/supabase.ts`：`createClient`，session 存 AsyncStorage、`autoRefreshToken: true`、`persistSession: true`

畫面：

1. [ ] **登入／註冊**：email＋密碼
2. [ ] **攝影機列表**：`devices`（自己的）＋`device_state`；`last_seen` 在 90 秒內顯示在線，否則離線；顯示 status（巡檢中、掃描中…）
3. [ ] **新增攝影機**：`CameraView` 掃 QR（`barcodeScannerSettings={{ barcodeTypes: ['qr'] }}`）→ 解析 `patroleye://claim?d=&c=` → `rpc('claim_device', { p_device_id, p_code })` → 失敗顯示「綁定碼不對或這台已經被綁定」→ 成功後取名、選房間（更新 `devices.name`、`room`）→ 進設定流程
4. [ ] **設定流程**
   - 說明：「接下來攝影機會轉一圈拍全景，用來讓你選擇不想被看到的區域」，使用者同意才繼續
   - 新增 `device_commands`（`type: 'scan'`）→ 監看這筆指令（Realtime 或每 2 秒查一次）→ `done` 後拿 `result.scan_id`
   - 讀 `scans` 那一筆，`storage.from('panoramas').createSignedUrl(pano_path, 3600)` 顯示全景（全景很寬，要能左右捲動、縮放）
   - 遮罩編輯器：在全景上拖曳畫矩形（gesture handler＋svg），可以刪除；顯示成半透明黑框
   - 儲存：螢幕座標 → 全景像素 → 角度（公式見 ARCHITECTURE.md），新增 `masks`（`version` = 這台目前最大值＋1）→ 新增 `device_commands`（`type: 'apply_masks'`, `payload: { mask_id, version }`）→ 等 `device_state.masks_version` 追上 → 顯示「之後這些區域都會是黑的」
   - 之後可以從攝影機頁面重新進來改遮罩或重新掃描
5. [ ] **事件列表**：自己所有攝影機的 `events`，新的在最上面；縮圖、標題、時間、嚴重程度、是否已確認
   - 訂閱 Realtime（`postgres_changes`，`INSERT`，table `events`）：App 開著時新事件直接出現在最上面，並跳出頁內提示（代替推播）
   - 下拉重新整理；往下捲載入更多
6. [ ] **事件內容**：標題、說明、時間、檢查點、讀數；`expo-video` 播放片段（`createSignedUrl(clip_path, 3600)`）；「我知道了」更新 `acked_at`、`acked_by`
7. [ ] **設定**：登出、改攝影機名稱

## 5. 沒有攝影機也能測（`fake_device.mjs`）

讓 App 不必等攝影機端完成就能跑完整流程：

- [ ] 用 `device.json` 以裝置帳號登入
- [ ] 還沒綁定時：產生 claim code、`rpc('device_set_claim_code')`、在終端機印出 QR 內容（或 QR）
- [ ] 每 30 秒更新 `device_state.last_seen`
- [ ] 收到 `scan`：上傳一張測試全景（可用 `device/scans/<資料夾>/pano.jpg` 和它的 `pano.json`）、新增 `scans`、指令改 `done`
- [ ] 收到 `apply_masks`：把 `device_state.masks_version` 改成那個版本、指令改 `done`
- [ ] 每隔一段時間丟一個假事件：上傳一段測試 mp4 和 jpg 到 `clips/<device_id>/<event_id>.*`，再新增 `events`

## 6. 驗收

1. 新帳號登入 → 掃 QR 綁定 → 列表出現攝影機，顯示在線
2. 設定流程：掃描 → 全景出現 → 框住床 → 儲存 → 顯示已套用
3. 攝影機端製造異常（爐火、跌倒或錶超標）→ 30 秒內事件列表出現新事件 → 點開能播放片段，框住的區域是黑的
4. 按「我知道了」→ 列表狀態更新
5. 用另一個帳號登入 → 看不到這台攝影機和它的事件
