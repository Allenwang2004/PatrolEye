# app: PatrolEye mobile app (Expo)

Expo SDK 58, TypeScript, expo-router. Screens and data flow are in section 4 of `docs/v2/APP_BACKEND_TODO.md`; the tables are in `docs/v2/ARCHITECTURE.md`.

## Getting started

```bash
cd app
npm install
cp .env.example .env      # fill in the Supabase URL and anon key
npx expo start            # scan the QR with Expo Go on the phone; press w for the web version
```

`.env` (not in git):

```
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

Restart `npx expo start` after changing `.env`.

Without a camera, simulate one with `npm run fake-device` in `supabase/` (see `supabase/README.md`). The web version can't scan QR codes; when adding a camera, paste the `patroleye://claim?...` link printed by the fake device.

## Checks

```bash
npm run typecheck
npm run lint
```

## Structure

```
src/app/                  Routes (one screen per file)
  _layout.tsx             Sign-in check (Stack.Protected)
  sign-in.tsx             Sign in / sign up
  (app)/(tabs)/           Camera list, event list, settings
  (app)/add-camera.tsx    Scan the QR to pair, name the camera
  (app)/camera/[id]/      Camera page, scan and mask setup (masks.tsx)
  (app)/event/[id].tsx    Event details, clip playback, acknowledge
src/components/           UI components, mask editor (mask-editor.tsx)
src/lib/                  Supabase client, types, commands, mask coordinate conversion
```

## Notes

- New events appear in the list live through Realtime, and an alert pops up on top of any screen (in place of push notifications); this only works while the app is open.
- The mask editor's gesture config has to stay stable (`useMemo`), otherwise Gesture Handler resets a drag halfway through; see the comments in `mask-editor.tsx`.
- The panorama image must not receive touches directly (`pointerEvents="none"`), otherwise dragging on the web version turns into the browser's image drag.
