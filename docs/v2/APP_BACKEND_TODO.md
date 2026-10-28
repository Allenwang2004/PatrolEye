# App and Supabase backend todo (`feature/app-supabase`)

Read `docs/v2/ARCHITECTURE.md` first: tables, RPCs, Storage paths and command formats are all defined there, and the camera side follows the same document.

Scope: accounts, QR pairing, global scan and masks, event list and clip playback. No push notifications, family invites or unpairing.

## Layout

```
supabase/
  migrations/<timestamp>_init.sql   Tables, RLS, RPCs, Storage policies
  scripts/provision_device.mjs      Creates a camera and writes device.json
  scripts/fake_device.mjs           Simulates a camera when there isn't one (for testing the app)
app/                                Expo (TypeScript, expo-router)
```

## 1. Supabase project

- [ ] Create the project (region Tokyo or Singapore) and note the Project URL, anon key and service role key
- [ ] Keep the service role key only in `supabase/.env` on your own computer (already in `.gitignore`), never in the app or on the camera
- [ ] Auth: enable email + password; turn off email confirmation during development to make testing easier
- [x] Supabase CLI: `supabase init` (the CLI is installed in `supabase/node_modules`; use `npx supabase` inside `supabase/`)
- [ ] `npx supabase link --project-ref <ref>`

## 2. Database (migration)

- [x] `supabase migration new init`, adapted from the original draft
- [x] Tables: `devices`, `device_state`, `device_commands`, `scans`, `masks`, `events`
- [x] Enable RLS and add policies (who can read and write is in the table in ARCHITECTURE.md)
- [x] RPCs: `claim_device`, `device_set_claim_code`
- [x] Storage: private buckets `panoramas` and `clips` and their policies
- [x] Realtime: add `events`, `device_commands` and `device_state` to the `supabase_realtime` publication
- [ ] `supabase db push`
- [x] Test with two different user accounts: A can't see B's cameras, events or clips

Done: `supabase/migrations/20261026155457_init.sql`. Differences from the original draft:

- Column-level grants: owners can only change `devices.name`, `room` and `events.acked_at`, `acked_by` (`acked_by` can only be themselves); devices can only change a command's `status` and `result`; inserting a command can't set `status`
- `masks.version` is set by a database trigger (this camera's current maximum + 1, with no collisions on concurrent saves); any value the app sends is ignored
- `device_commands.updated_at` is updated by a trigger
- Storage policies compare folder names as text (paths that aren't a uuid are simply rejected rather than raising an error); a device can overwrite its own files (upsert)
- Buckets restrict file types: `panoramas` accepts only JPG, `clips` accepts MP4 and JPG, 50 MB per file
- `claim_device` trims surrounding whitespace before comparing; `device_set_claim_code` checks the 8-character length and the alphabet
- `type` and `status` have check constraints (values in ARCHITECTURE.md)

## 3. Camera provisioning script (`provision_device.mjs`)

Run once per camera before it ships (for now, once per prototype):

- [x] Read the URL and service role key from `supabase/.env`
- [x] `auth.admin.createUser({ email: "device-<uuid>@devices.patroleye.local", password: <32 random characters>, email_confirm: true })`
- [x] Insert `devices` (`id` is the same uuid, `device_user_id` = the new account's id) and `device_state`
- [x] Write `device.json` (format in ARCHITECTURE.md) and copy it to the camera's `device/config/device.json`

## 4. Expo app

- [x] `npx create-expo-app@latest app` (TypeScript + expo-router by default; SDK 58, routes in `app/src/app/`)
- [x] Packages: `npx expo install expo-camera expo-video react-native-svg react-native-gesture-handler @react-native-async-storage/async-storage react-native-url-polyfill`, then `npm i @supabase/supabase-js`. All of these run in Expo Go
- [x] `app/.env`: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (anon key only)
- [x] `src/lib/supabase.ts`: `createClient` with the session in AsyncStorage, `autoRefreshToken: true`, `persistSession: true`

Screens:

1. [x] **Sign in / sign up**: email + password
2. [x] **Camera list**: `devices` (your own) + `device_state`; online if `last_seen` is within 90 seconds, otherwise offline; show the status (patrolling, scanning, ...)
3. [x] **Add camera**: scan the QR with `CameraView` (`barcodeScannerSettings={{ barcodeTypes: ['qr'] }}`), parse `patroleye://claim?d=&c=`, call `rpc('claim_device', { p_device_id, p_code })`; on failure show "The claim code is wrong or this camera is already paired"; on success name it and pick a room (update `devices.name`, `room`), then go to setup
4. [x] **Setup flow**
   - Explain: "The camera will now turn around to take a panorama, so you can choose areas you don't want it to see"; continue only once the user agrees
   - Insert a `device_commands` row (`type: 'scan'`), watch it (Realtime or poll every 2 seconds), and take `result.scan_id` once it is `done`
   - Read that `scans` row and show the panorama with `storage.from('panoramas').createSignedUrl(pano_path, 3600)` (the panorama is wide, so it needs horizontal scrolling and zoom)
   - Mask editor: drag on the panorama to draw rectangles (gesture handler + svg), which can be deleted; shown as translucent black boxes
   - Save: screen coordinates to panorama pixels to angles (formula in ARCHITECTURE.md), insert `masks` (`version` is set by the database; use the returned value), insert `device_commands` (`type: 'apply_masks'`, `payload: { mask_id, version }`), wait for `device_state.masks_version` to catch up, then show "These areas will be black from now on"
   - Later the user can come back from the camera page to change the masks or rescan
5. [x] **Event list**: `events` from all of your cameras, newest first; thumbnail, title, time, severity, acknowledged or not
   - Subscribe to Realtime (`postgres_changes`, `INSERT`, table `events`): while the app is open new events appear at the top and an in-app alert pops up (in place of push notifications)
   - Pull to refresh; load more on scroll
6. [x] **Event details**: title, description, time, checkpoint, reading; play the clip with `expo-video` (`createSignedUrl(clip_path, 3600)`); "Got it" updates `acked_at` and `acked_by`
7. [x] **Settings**: sign out, rename cameras

## 5. Testing without a camera (`fake_device.mjs`)

Lets the app run the whole flow without waiting for the camera side:

- [x] Sign in as the device account from `device.json`
- [x] While unpaired: generate a claim code, call `rpc('device_set_claim_code')`, print the QR content (or the QR) in the terminal
- [x] Update `device_state.last_seen` every 30 seconds
- [x] On `scan`: upload a test panorama (e.g. `device/scans/<folder>/pano.jpg` and its `pano.json`), insert `scans`, set the command to `done`
- [x] On `apply_masks`: set `device_state.masks_version` to that version and the command to `done`
- [x] Send a fake event every so often: upload a test mp4 and jpg to `clips/<device_id>/<event_id>.*`, then insert `events`

## 6. Acceptance

1. Sign in with a new account, scan the QR to pair, and the camera appears in the list as online
2. Setup flow: scan, the panorama appears, box the bed, save, and it shows as applied
3. Cause an abnormality on the camera side (stove fire, a fall or a gauge over its limit); within 30 seconds a new event appears in the list, and opening it plays the clip with the boxed areas black
4. Press "Got it" and the list status updates
5. Sign in with another account: this camera and its events are not visible
