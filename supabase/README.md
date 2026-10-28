# supabase: backend

Tables, RLS, RPCs and Storage are all in `migrations/`; the contract is in `docs/v2/ARCHITECTURE.md`.

The CLI is installed in this folder's `node_modules`, so run every command inside `supabase/`:

```bash
cd supabase
npm install
```

## Setup

```bash
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push
npm run provision                   # reads .env, writes device.json
```

`.env` (not in git, only on the developer's computer):

```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

## Scripts

| Command | What it does |
|---|---|
| `npm run provision` | Creates a camera (device account, `devices`, `device_state`) and writes `device.json`; copy it to the camera's `device/config/device.json` |
| `npm run fake-device -- [--config device.json] [--pano <scan folder>] [--event-every 120]` | Simulates a camera: prints the pairing QR, sends heartbeats, answers `scan` / `apply_masks`, and sends fake events on a timer (press Enter to send one now). The default panorama is `device/scans/20261011_031345_normal`; the test clip is generated with ffmpeg in `.cache/` |

`device*.json` holds the device account's password and is in `.gitignore`.
